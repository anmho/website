import 'server-only';

export type SpotifyTokenBundle = {
  accessToken: string | null;
  refreshToken: string;
  expiresAt: string | null;
  scope: string | null;
  tokenType: string | null;
  updatedAt: string;
};

type VaultKvResponse = {
  data?: {
    data?: Partial<SpotifyTokenBundle>;
  };
};

const DEFAULT_SPOTIFY_VAULT_MOUNT = 'secret';
const DEFAULT_SPOTIFY_VAULT_PATH = 'prod/apps/website/spotify';

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

function getVaultKvUrl() {
  const { addr, mount, path } = getVaultConfig();
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
  data: Partial<SpotifyTokenBundle> | undefined
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

export async function readSpotifyTokenBundle() {
  const response = await fetch(getVaultKvUrl(), {
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
  return normalizeTokenBundle(payload.data?.data);
}

export async function writeSpotifyTokenBundle(bundle: SpotifyTokenBundle) {
  const response = await fetch(getVaultKvUrl(), {
    method: 'POST',
    headers: getVaultHeaders(),
    body: JSON.stringify({ data: bundle }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vault write failed with status ${response.status}`);
  }

  return bundle;
}
