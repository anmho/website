import 'server-only';

export type SpotifyTokenBundle = {
  accessToken: string | null;
  refreshToken: string;
  expiresAt: string | null;
  scope: string | null;
  tokenType: string | null;
  updatedAt: string;
};

export type SpotifyOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

type SpotifyVaultSecret = Partial<SpotifyTokenBundle> & {
  clientId?: string;
  clientSecret?: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  'spotify.client_id'?: string;
  'spotify.client_secret'?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
};

type VaultKvResponse = {
  data?: {
    data?: SpotifyVaultSecret;
  };
};

const DEFAULT_SPOTIFY_VAULT_MOUNT = 'secret';
const DEFAULT_SPOTIFY_VAULT_PATH = 'prod/apps/website/spotify';
const DEFAULT_SPOTIFY_OAUTH_VAULT_PATH = 'prod/providers/spotify/oauth';

function getVaultConfig() {
  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;

  if (!addr) {
    throw new Error('Missing required Vault environment variable: VAULT_ADDR');
  }

  if (!token) {
    throw new Error('Missing required Vault environment variable: VAULT_TOKEN');
  }

  return {
    addr: addr.replace(/\/$/, ''),
    token,
    namespace: process.env.VAULT_NAMESPACE,
    mount: process.env.SPOTIFY_VAULT_MOUNT ?? DEFAULT_SPOTIFY_VAULT_MOUNT,
    path: process.env.SPOTIFY_VAULT_PATH ?? DEFAULT_SPOTIFY_VAULT_PATH,
  };
}

function getVaultKvUrl(path = getVaultConfig().path) {
  const { addr, mount } = getVaultConfig();
  return `${addr}/v1/${encodeURIComponent(mount)}/data/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function getVaultHeaders() {
  const { token, namespace } = getVaultConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Vault-Token': token,
  };

  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  return headers;
}

function normalizeTokenBundle(
  data: SpotifyVaultSecret | undefined
): SpotifyTokenBundle | null {
  if (!data?.refreshToken) {
    return null;
  }

  return {
    accessToken: data.accessToken ?? null,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt ?? null,
    scope: data.scope ?? null,
    tokenType: data.tokenType ?? null,
    updatedAt: data.updatedAt ?? new Date(0).toISOString(),
  };
}

function normalizeOAuthConfig(data: SpotifyVaultSecret | undefined): SpotifyOAuthConfig | null {
  const clientId =
    data?.clientId ??
    data?.spotifyClientId ??
    data?.['spotify.client_id'] ??
    data?.SPOTIFY_CLIENT_ID;
  const clientSecret =
    data?.clientSecret ??
    data?.spotifyClientSecret ??
    data?.['spotify.client_secret'] ??
    data?.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

async function readSpotifyVaultSecret(path?: string) {
  const response = await fetch(getVaultKvUrl(path), {
    headers: getVaultHeaders(),
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Vault read failed with status ${response.status}`);
  }

  const payload = (await response.json()) as VaultKvResponse;
  return payload.data?.data ?? null;
}

export async function readSpotifyOAuthConfig() {
  const configPath = process.env.SPOTIFY_OAUTH_VAULT_PATH ?? DEFAULT_SPOTIFY_OAUTH_VAULT_PATH;
  const providerConfig = await readSpotifyVaultSecret(configPath);

  if (providerConfig) {
    return normalizeOAuthConfig(providerConfig);
  }

  return normalizeOAuthConfig((await readSpotifyVaultSecret()) ?? undefined);
}

export async function readSpotifyTokenBundle() {
  return normalizeTokenBundle((await readSpotifyVaultSecret()) ?? undefined);
}

export async function writeSpotifyTokenBundle(bundle: SpotifyTokenBundle) {
  const current = await readSpotifyVaultSecret();
  const response = await fetch(getVaultKvUrl(), {
    method: 'POST',
    headers: getVaultHeaders(),
    body: JSON.stringify({ data: { ...current, ...bundle } }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vault write failed with status ${response.status}`);
  }

  return bundle;
}
