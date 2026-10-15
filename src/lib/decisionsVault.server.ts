import 'server-only';

// These paths are deliberately fixed: request data must never select a secret.
export async function readDecisionsSecret(path: 'openai-decisions' | 'decisions-example'): Promise<Record<string, unknown> | null> {
  const address = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  if (!address || !token) return null;
  const headers: Record<string, string> = { 'X-Vault-Token': token };
  if (process.env.VAULT_NAMESPACE) headers['X-Vault-Namespace'] = process.env.VAULT_NAMESPACE;
  const mount = encodeURIComponent(process.env.DECISIONS_VAULT_MOUNT || 'secret');
  const response = await fetch(
    `${address.replace(/\/$/, '')}/v1/${mount}/data/prod/apps/website/${path}`,
    { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Decision configuration unavailable.');
  const payload = await response.json();
  const data = payload?.data?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

export async function getDecisionsApiKey(): Promise<string | null> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const secret = await readDecisionsSecret('openai-decisions');
  return typeof secret?.api_key === 'string' && secret.api_key ? secret.api_key : null;
}
