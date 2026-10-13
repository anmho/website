import 'server-only';

import { getCache } from '@vercel/functions';

import type { SpotifyNowPlaying } from '@/lib/spotify-types';

const LAST_NOW_PLAYING_KEY = 'last-now-playing';
export const SPOTIFY_NOW_PLAYING_CACHE_TAG = 'spotify-now-playing';
const LAST_NOW_PLAYING_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSpotifyPlaybackCache() {
  return getCache({
    namespace: 'spotify',
  });
}

function normalizeCachedNowPlaying(value: unknown): SpotifyNowPlaying | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const cached = value as Partial<SpotifyNowPlaying>;

  if (typeof cached.title !== 'string' || cached.title.length === 0) {
    return null;
  }

  return {
    isPlaying: false,
    type: cached.type ?? null,
    title: cached.title,
    artists: Array.isArray(cached.artists) ? cached.artists : [],
    album: cached.album ?? null,
    albumArtUrl: cached.albumArtUrl ?? null,
    songUrl: cached.songUrl ?? null,
    progressMs: null,
    durationMs: cached.durationMs ?? null,
    timestamp: cached.timestamp ?? null,
    state: 'idle',
  };
}

export function asRecentlyPlayed(nowPlaying: SpotifyNowPlaying): SpotifyNowPlaying {
  return {
    ...nowPlaying,
    isPlaying: false,
    progressMs: null,
    state: 'idle',
  };
}

export function isCacheableNowPlaying(nowPlaying: SpotifyNowPlaying) {
  return (
    Boolean(nowPlaying.title) &&
    (nowPlaying.state === 'playing' ||
      nowPlaying.state === 'paused' ||
      nowPlaying.state === 'idle')
  );
}

export async function readLastNowPlaying() {
  try {
    const cached = await getSpotifyPlaybackCache().get(LAST_NOW_PLAYING_KEY);
    return normalizeCachedNowPlaying(cached);
  } catch (error) {
    console.error('[spotify-cache]', {
      event: 'read_failed',
      error,
    });
    return null;
  }
}

export async function writeLastNowPlaying(nowPlaying: SpotifyNowPlaying) {
  if (!isCacheableNowPlaying(nowPlaying)) {
    return;
  }

  try {
    await getSpotifyPlaybackCache().set(
      LAST_NOW_PLAYING_KEY,
      asRecentlyPlayed(nowPlaying),
      {
        ttl: LAST_NOW_PLAYING_TTL_SECONDS,
        tags: [SPOTIFY_NOW_PLAYING_CACHE_TAG],
        name: 'Spotify last now-playing',
      }
    );
    console.info('[spotify-cache]', {
      event: 'write_succeeded',
      state: nowPlaying.state,
      hasTitle: Boolean(nowPlaying.title),
    });
  } catch (error) {
    console.error('[spotify-cache]', {
      event: 'write_failed',
      error,
    });
  }
}
