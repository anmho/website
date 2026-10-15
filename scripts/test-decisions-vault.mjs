import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/decisionsVault.server.ts', import.meta.url), 'utf8').replace("import 'server-only';", '');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { getDecisionsApiKey, readDecisionsSecret } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const originalFetch = globalThis.fetch;
const savedEnv = { ...process.env };
try {
  delete process.env.OPENAI_API_KEY;
  delete process.env.VAULT_ADDR;
  delete process.env.VAULT_TOKEN;
  globalThis.fetch = async () => { throw new Error('Unexpected request'); };
  assert.equal(await getDecisionsApiKey(), null);
  process.env.OPENAI_API_KEY = 'test-environment-key';
  assert.equal(await getDecisionsApiKey(), 'test-environment-key');
  delete process.env.OPENAI_API_KEY;
  process.env.VAULT_ADDR = 'https://vault.example.test/';
  process.env.VAULT_TOKEN = 'test-vault-token';
  process.env.VAULT_NAMESPACE = 'test';
  delete process.env.DECISIONS_VAULT_MOUNT;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://vault.example.test/v1/secret/data/prod/apps/website/openai-decisions');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    assert.equal(options.headers['X-Vault-Namespace'], 'test');
    return Response.json({ data: { data: { api_key: 'test-key' } } });
  };
  assert.equal(await getDecisionsApiKey(), 'test-key');
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.equal(await readDecisionsSecret('decisions-example'), null);
  globalThis.fetch = async () => new Response('sensitive upstream error', { status: 403 });
  await assert.rejects(getDecisionsApiKey, { message: 'Decision configuration unavailable.' });
  globalThis.fetch = async () => Response.json({ data: { data: [] } });
  assert.equal(await getDecisionsApiKey(), null);
  console.log('Vault configuration checks passed.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of ['OPENAI_API_KEY', 'VAULT_ADDR', 'VAULT_TOKEN', 'VAULT_NAMESPACE', 'DECISIONS_VAULT_MOUNT']) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}
