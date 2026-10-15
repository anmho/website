// Run after npm run build, with DECISIONS_TEST_DATABASE_URL pointing to an isolated database.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import assert from 'node:assert/strict';

if (!process.env.DECISIONS_TEST_DATABASE_URL) throw Error('Isolated DECISIONS_TEST_DATABASE_URL required.');
const origin = 'http://localhost:55440';
const issuer = 'http://127.0.0.1:55441';
const owner = 'cli-test@example.invalid';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'RS256', use: 'sig' };
const jwks = createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
await new Promise(resolve => jwks.listen(55441, '127.0.0.1', resolve));
const token = await new SignJWT({ email: owner }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(issuer).setAudience('test-audience').setSubject('cli-test').setIssuedAt().setExpirationTime('5m').sign(privateKey);
const env = { ...process.env, DECISIONS_DATABASE_URL: process.env.DECISIONS_TEST_DATABASE_URL, CLOUDFLARE_ACCESS_TEAM_DOMAIN: issuer, CLOUDFLARE_ACCESS_AUD: 'test-audience', CLOUDFLARE_ACCESS_ALLOWED_EMAILS: owner };
// Explicitly remove real provider and Vault access from the test server.
for (const name of ['VAULT_TOKEN', 'OPENAI_API_KEY', 'VAULT_ADDR']) delete env[name];
let logs = '';
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '55440'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
app.stdout.on('data', chunk => { logs += chunk; }); app.stderr.on('data', chunk => { logs += chunk; });
async function cli(args, body, auth = token) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/decisions/cli.mjs', ...args], { env: { ...env, DECISIONS_URL: origin, CLOUDFLARE_ACCESS_TOKEN: auth }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { error += c; });
    child.on('error', reject); child.on('close', code => resolve({ code, output, error }));
    child.stdin.end(body === undefined ? '' : JSON.stringify(body));
  });
}
const decisionId = `cli-test-${Date.now()}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw Error('Test server exited.');
    try { if ((await fetch(`${origin}/api/decisions`)).status === 401) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Server must become ready');
  assert.notEqual((await cli(['get'], undefined, 'not-a-valid-jwt')).code, 0);
  const draft = { title: 'CLI test', question: 'Which option fits?', options: {} };
  const put = await cli(['put', decisionId, '--file', '-', '--revision', '0'], draft);
  assert.equal(put.code, 0, put.error);
  assert.equal(JSON.parse(put.output).revision, 1);
  for (const option of ['a', 'b']) assert.equal((await cli(['options', 'put', decisionId, option, '--file', '-'], { label: option })).code, 0);
  const context = { text: 'User-reported impression', kind: 'personal_assessment', source: { type: 'user_report', basis: 'Conversation' }, recorded_at: '2026-10-15' };
  assert.equal((await cli(['context', 'put', decisionId, 'trust', '--option', 'a', '--file', '-'], context)).code, 0);
  const get = await cli(['context', 'get', decisionId, 'trust', '--option', 'a']);
  assert.equal(JSON.parse(get.output).text, context.text);
  assert.equal((await cli(['context', 'delete', decisionId, 'trust', '--option', 'a'])).code, 0);
  assert.notEqual((await cli(['context', 'get', decisionId, 'trust', '--option', 'a'])).code, 0);
  const evaluation = await cli(['evaluate', decisionId]);
  assert.notEqual(evaluation.code, 0);
  assert.match(evaluation.error, /503/);
  assert.equal((await cli(['delete', decisionId])).code, 0);
  console.log('Signed Cloudflare JWT + production Next server + CLI + Postgres flow passed. No model call made.');
} finally {
  await cli(['delete', decisionId]).catch(() => {});
  app.kill('SIGTERM');
  await new Promise(resolve => app.exitCode !== null ? resolve() : app.once('exit', resolve));
  await new Promise(resolve => jwks.close(resolve));
  // Do not dump server logs, which can contain request data.
  void logs;
}
