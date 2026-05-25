import 'server-only';

import {
  EMPTY_SPOTIFY_NOW_PLAYING,
  type NowPlayingState,
  type SpotifyNowPlaying,
} from '@/lib/spotify-types';
import {
  readSpotifyOAuthConfig,
  readSpotifyTokenBundle,
  type SpotifyTokenBundle,
  writeSpotifyTokenBundle,
} from '@/lib/spotify-vault';

type SpotifyAccessTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyErrorPayload = {
  error?: {
    status?: number;
    message?: string;
  };
};

type SpotifyArtist = { name: string };

type SpotifyTrackItem = {
  type: 'track';
  name: string;
  duration_ms: number;
  external_urls?: { spotify?: string };
  artists: SpotifyArtist[];
  album?: {
    name?: string;
    images?: Array<{ url: string; width?: number; height?: number }>;
  };
};

type SpotifyEpisodeItem = {
  type: 'episode';
  name: string;
  duration_ms: number;
  external_urls?: { spotify?: string };
  show?: {
    name?: string;
    publisher?: string;
    images?: Array<{ url: string; width?: number; height?: number }>;
  };
};

type SpotifyItem = SpotifyTrackItem | SpotifyEpisodeItem;

type SpotifyCurrentlyPlayingResponse = {
  is_playing: boolean;
  timestamp: number;
  progress_ms: number | null;
  item: SpotifyItem | null;
};

type SpotifyRecentlyPlayedResponse = {
  items: Array<{
    played_at: string;
    track: SpotifyTrackItem;
  }>;
};

export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
];

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_CURRENTLY_PLAYING_ENDPOINT =
  'https://api.spotify.com/v1/me/player/currently-playing';
const SPOTIFY_RECENTLY_PLAYED_ENDPOINT =
  'https://api.spotify.com/v1/me/player/recently-played?limit=1';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const LOCAL_SPOTIFY_HOST = 'localhost:3000';
const PRODUCTION_SPOTIFY_HOST = 'anmho.com';

export class UnsupportedSpotifyOAuthOriginError extends Error {
  constructor(origin: string) {
    super(`Spotify OAuth bootstrap is not supported from ${origin}.`);
    this.name = 'UnsupportedSpotifyOAuthOriginError';
  }
}

function getAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function getSpotifyOAuthConfig() {
  const config = await readSpotifyOAuthConfig();

  if (!config) {
    throw new Error('Spotify OAuth config is not configured in Vault.');
  }

  return config;
}

function getSpotifyOAuthOrigin(requestUrl: string) {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

function getSpotifyRedirectUriForRequest(
  requestUrl: string,
  config: Awaited<ReturnType<typeof getSpotifyOAuthConfig>>
) {
  const url = new URL(requestUrl);

  if (url.host === LOCAL_SPOTIFY_HOST) {
    if (!config.localRedirectUri) {
      throw new Error('Spotify local redirect URI is not configured in Vault.');
    }

    return config.localRedirectUri;
  }

  if (url.hostname === PRODUCTION_SPOTIFY_HOST) {
    if (!config.productionRedirectUri) {
      throw new Error('Spotify production redirect URI is not configured in Vault.');
    }

    return config.productionRedirectUri;
  }

  throw new UnsupportedSpotifyOAuthOriginError(getSpotifyOAuthOrigin(requestUrl));
}

function normalizeItem(
  item: SpotifyItem,
  state: NowPlayingState,
  isPlaying: boolean,
  progressMs: number | null,
  timestamp: number | null
): SpotifyNowPlaying {
  if (item.type === 'episode') {
    return {
      isPlaying,
      type: item.type,
      title: item.name,
      artists: item.show?.publisher ? [item.show.publisher] : [],
      album: item.show?.name ?? null,
      albumArtUrl: item.show?.images?.[0]?.url ?? null,
      songUrl: item.external_urls?.spotify ?? null,
      progressMs,
      durationMs: item.duration_ms ?? null,
      timestamp,
      state,
    };
  }

  return {
    isPlaying,
    type: item.type,
    title: item.name,
    artists: item.artists.map((artist) => artist.name),
    album: item.album?.name ?? null,
    albumArtUrl: item.album?.images?.[0]?.url ?? null,
    songUrl: item.external_urls?.spotify ?? null,
    progressMs,
    durationMs: item.duration_ms ?? null,
    timestamp,
    state,
  };
}

async function parseSpotifyError(response: Response) {
  const fallback = `Spotify API request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as SpotifyErrorPayload;
    return payload.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getSpotifyAuthorizeUrl(state: string, requestUrl: string) {
  const config = await getSpotifyOAuthConfig();
  const redirectUri = getSpotifyRedirectUriForRequest(requestUrl, config);

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(' '),
    state,
    show_dialog: 'false',
  });

  return `${SPOTIFY_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, requestUrl: string) {
  const config = await getSpotifyOAuthConfig();
  const redirectUri = getSpotifyRedirectUriForRequest(requestUrl, config);

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(config.clientId, config.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await parseSpotifyError(response);
    throw new Error(`Failed to exchange Spotify code: ${message}`);
  }

  return (await response.json()) as SpotifyAccessTokenResponse;
}

function getExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function isTokenFresh(bundle: SpotifyTokenBundle) {
  if (!bundle.accessToken || !bundle.expiresAt) {
    return false;
  }

  return Date.parse(bundle.expiresAt) - TOKEN_REFRESH_BUFFER_MS > Date.now();
}

export async function storeSpotifyTokensFromCode(code: string, requestUrl: string) {
  const tokens = await exchangeCodeForTokens(code, requestUrl);

  if (!tokens.refresh_token) {
    throw new Error('Spotify did not return a refresh token.');
  }

  return writeSpotifyTokenBundle({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: getExpiresAt(tokens.expires_in),
    scope: tokens.scope,
    tokenType: tokens.token_type,
    updatedAt: new Date().toISOString(),
  });
}

export async function refreshSpotifyAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = await getSpotifyOAuthConfig();

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await parseSpotifyError(response);
    throw new Error(`Failed to refresh Spotify token: ${message}`);
  }

  const payload = (await response.json()) as SpotifyAccessTokenResponse;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresIn: payload.expires_in,
    scope: payload.scope,
    tokenType: payload.token_type,
  };
}

export async function refreshStoredSpotifyAccessToken() {
  const current = await readSpotifyTokenBundle();

  if (!current) {
    throw new Error('Spotify token bundle is not configured in Vault.');
  }

  const refreshed = await refreshSpotifyAccessToken(current.refreshToken);

  return writeSpotifyTokenBundle({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: getExpiresAt(refreshed.expiresIn),
    scope: refreshed.scope ?? current.scope,
    tokenType: refreshed.tokenType ?? current.tokenType,
    updatedAt: new Date().toISOString(),
  });
}

async function getStoredSpotifyAccessToken() {
  let current;

  try {
    current = await readSpotifyTokenBundle();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Missing required Vault environment variable:')
    ) {
      return null;
    }

    throw error;
  }

  if (!current) {
    return null;
  }

  if (isTokenFresh(current)) {
    return current.accessToken;
  }

  const refreshed = await refreshStoredSpotifyAccessToken();
  return refreshed.accessToken;
}

async function getRecentlyPlayed(accessToken: string): Promise<SpotifyNowPlaying | null> {
  const response = await fetch(SPOTIFY_RECENTLY_PLAYED_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SpotifyRecentlyPlayedResponse;
  const latest = payload.items[0];

  if (!latest) {
    return null;
  }

  return normalizeItem(latest.track, 'idle', false, null, Date.parse(latest.played_at));
}

export async function getNowPlaying(): Promise<SpotifyNowPlaying> {
  const accessToken = await getStoredSpotifyAccessToken();

  if (!accessToken) {
    return {
      ...EMPTY_SPOTIFY_NOW_PLAYING,
      state: 'unauthorized',
    };
  }

  const response = await fetch(SPOTIFY_CURRENTLY_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (response.status === 204) {
    return (await getRecentlyPlayed(accessToken)) ?? EMPTY_SPOTIFY_NOW_PLAYING;
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ...EMPTY_SPOTIFY_NOW_PLAYING,
      state: 'unauthorized',
    };
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '60');

    return {
      ...EMPTY_SPOTIFY_NOW_PLAYING,
      state: 'rate_limited',
      retryAfterSeconds: Number.isNaN(retryAfter) ? 60 : retryAfter,
    };
  }

  if (!response.ok) {
    return {
      ...EMPTY_SPOTIFY_NOW_PLAYING,
      state: 'error',
    };
  }

  const payload = (await response.json()) as SpotifyCurrentlyPlayingResponse;

  if (!payload.item) {
    return {
      ...EMPTY_SPOTIFY_NOW_PLAYING,
      timestamp: payload.timestamp ?? null,
    };
  }

  return normalizeItem(
    payload.item,
    payload.is_playing ? 'playing' : 'paused',
    payload.is_playing,
    payload.progress_ms,
    payload.timestamp
  );
}
