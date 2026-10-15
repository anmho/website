#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const HELP = `decisions [options|context|evaluations] get <decision-id> [item-id]
decisions [options|context] put <decision-id> [item-id] --file object.json
decisions [options|context] delete <decision-id> [item-id]
decisions get                           List decisions
decisions evaluate <decision-id>        Evaluate or retrieve cached evaluation

--option <id>   Scope context to an option (otherwise shared)
--file <path>   JSON input; use - for stdin
--revision <n>  Conditional mutation against the decision revision (0 creates only)
--url <origin>  Default DECISIONS_URL or https://anmho.com

Authentication: CLOUDFLARE_ACCESS_TOKEN, or cloudflared access token --app <origin>.
Use cloudflared access login <origin> first if needed. Tokens are never printed.
PUT replaces the entire addressed object. GET before replacing to preserve fields.
DELETE decision removes its options, context and evaluation history.
No automatic retries or model calls on GET. Output is JSON.
`;
function validId(value) {
  if (!value || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value)) throw Error('An ID must contain 1 to 80 letters, digits, underscores or hyphens.');
  return value;
}
export function parseCommand(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    file: { type: 'string' }, option: { type: 'string' }, revision: { type: 'string' }, url: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) return { help: true };
  const parts = [...positionals];
  const collection = ['options', 'context', 'evaluations'].includes(parts[0]) ? parts.shift() : null;
  const verb = parts.shift();
  if (!['get', 'put', 'delete', 'evaluate'].includes(verb)) throw Error(HELP);
  if (parts.length > (collection ? 2 : 1)) throw Error('Too many arguments.');
  const [decision, item] = parts;
  if (!decision && !(verb === 'get' && !collection)) throw Error('Decision ID required.');
  if (collection && verb === 'evaluate') throw Error('Use decisions evaluate <decision-id>.');
  if (collection === 'evaluations' && verb !== 'get') throw Error('Evaluations are read-only.');
  if (collection && ['put', 'delete'].includes(verb) && !item) throw Error('Item ID required.');
  if (values.option && collection !== 'context') throw Error('--option applies only to context.');
  if (verb === 'put' && !values.file) throw Error('PUT requires --file.');
  if (verb !== 'put' && values.file) throw Error('--file applies only to PUT.');
  if (values.revision && (!['put', 'delete'].includes(verb) || !/^\d+$/.test(values.revision) || !Number.isSafeInteger(Number(values.revision)))) throw Error('Invalid --revision.');
  const path = decision ? [validId(decision)] : [];
  if (collection === 'context' && values.option) path.push('options', validId(values.option));
  if (collection) path.push(collection);
  if (item) path.push(validId(item));
  if (verb === 'evaluate') path.push('evaluate');
  return { method: { get: 'GET', put: 'PUT', delete: 'DELETE', evaluate: 'POST' }[verb], path, values };
}
export async function main(args = process.argv.slice(2), env = process.env) {
  const command = parseCommand(args);
  if (command.help) { console.log(HELP); return; }
  const base = new URL(command.values.url || env.DECISIONS_URL || 'https://anmho.com');
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/') throw Error('Use an origin URL without credentials, path, query or fragment.');
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw Error('HTTPS is required outside localhost.');
  let body;
  if (command.method === 'PUT') {
    if (command.values.file === '-') {
      body = '';
      for await (const chunk of process.stdin) { body += chunk; if (Buffer.byteLength(body) > 128000) throw Error('Input exceeds 128 KB.'); }
    } else body = await readFile(command.values.file, 'utf8');
    if (Buffer.byteLength(body) > 128000) throw Error('Input exceeds 128 KB.');
    JSON.parse(body);
  }
  let token = env.CLOUDFLARE_ACCESS_TOKEN;
  if (!token) {
    try { token = execFileSync('cloudflared', ['access', 'token', '--app', base.origin], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 }).trim(); }
    catch { throw Error('Cloudflare login required. Run cloudflared access login with your configured site origin.'); }
  }
  if (!token) throw Error('Cloudflare Access token missing.');
  const headers = { 'Cf-Access-Token': token, 'Cf-Access-Jwt-Assertion': token, 'Content-Type': 'application/json', Accept: 'application/json' };
  if (command.values.revision !== undefined) headers['If-Match'] = `"${command.values.revision}"`;
  const url = `${base.origin}/api/decisions${command.path.length ? '/' + command.path.map(encodeURIComponent).join('/') : ''}`;
  let response;
  try { response = await fetch(url, { method: command.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(60000) }); }
  catch { throw Error('Request failed or timed out. GET evaluations to check before requesting another evaluation.'); }
  if (response.status >= 300 && response.status < 400) throw Error('Authentication redirect received. Refresh your Cloudflare login.');
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error(`HTTP ${response.status}: expected JSON. Check deployment and Cloudflare authentication.`);
  const payload = await response.json();
  if (!response.ok) throw Error(`HTTP ${response.status}: ${payload.error || 'Request failed.'}`);
  console.log(JSON.stringify(payload, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
