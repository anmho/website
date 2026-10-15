import { DecisionError, id, MAX_BYTES, type Resource } from './domain';
import type { DecisionStore } from './store';
import { evaluate } from './evaluate';

type Dependencies = {
  authenticate: (request: Request) => Promise<string | null>;
  store: () => Promise<DecisionStore>;
  values: () => Promise<unknown>;
  key: () => Promise<string | null>;
  model: () => string;
  dailyLimit: () => number;
};
async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new DecisionError(415, 'Use application/json.');
  const reader = request.body?.getReader();
  if (!reader) throw new DecisionError(400, 'JSON body required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new DecisionError(413, 'Body exceeds 128 KB.'); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DecisionError(400, 'Invalid JSON.'); }
}
function resourceFor(parts: string[]): Resource | null {
  if (!parts.length) return { type: 'decision' };
  if (parts.length === 2 && parts[0] === 'options') return { type: 'option', optionId: id(parts[1]) };
  if (parts.length === 2 && parts[0] === 'context') return { type: 'context', contextId: id(parts[1]) };
  if (parts.length === 4 && parts[0] === 'options' && parts[2] === 'context') return { type: 'context', optionId: id(parts[1]), contextId: id(parts[3]) };
  return null;
}
function own(object: object, key: string) { return Object.hasOwn(object, key); }
export function createDecisionHandler(deps: Dependencies) {
  return async function handle(request: Request, path: string[]) {
    const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Cf-Access-Jwt-Assertion' };
    const json = (data: unknown, status = 200, extra = {}) => Response.json(data, { status, headers: { ...headers, ...extra } });
    try {
      const owner = await deps.authenticate(request);
      if (!owner) return json({ error: 'Admin authentication required.' }, 401);
      const method = request.method;
      if (!['GET', 'PUT', 'DELETE', 'POST'].includes(method)) throw new DecisionError(405, 'Method not allowed.');
      if (method !== 'GET') {
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin) throw new DecisionError(403, 'Cross-origin mutations are not permitted.');
      }
      const store = await deps.store();
      if (!path.length) {
        if (method !== 'GET') throw new DecisionError(405, 'Use PUT /api/decisions/:id.');
        return json(await store.list(owner));
      }
      const decisionId = id(path[0]);
      const parts = path.slice(1);
      if (parts[0] === 'evaluate' && parts.length === 1) {
        if (method !== 'POST') throw new DecisionError(405, 'Evaluation requires POST.');
        const key = await deps.key();
        if (!key) throw new DecisionError(503, 'Decision provider configuration unavailable.');
        const result = await evaluate(store, owner, decisionId, await deps.values(), key, deps.model(), deps.dailyLimit());
        return json(result, result.status === 'pending' ? 202 : 200);
      }
      if (parts[0] === 'evaluations' && parts.length <= 2) {
        if (method !== 'GET') throw new DecisionError(405, 'Evaluations are read-only.');
        if (parts[1] && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1])) throw new DecisionError(400, 'Invalid evaluation ID.');
        await store.get(owner, decisionId);
        return json(await store.evaluations(owner, decisionId, parts[1]));
      }
      const resource = resourceFor(parts);
      if (method === 'GET') {
        const row = await store.get(owner, decisionId);
        const doc = row.document;
        let data: unknown;
        if (!parts.length) data = row;
        else if (parts.length === 1 && parts[0] === 'options') data = doc.options;
        else if (parts.length === 1 && parts[0] === 'context') data = doc.context;
        else if (resource?.type === 'option') data = own(doc.options, resource.optionId) ? doc.options[resource.optionId] : undefined;
        else if (parts.length === 3 && parts[0] === 'options' && parts[2] === 'context') data = own(doc.options, id(parts[1])) ? doc.options[parts[1]].context : undefined;
        else if (resource?.type === 'context') {
          const collection = resource.optionId ? (own(doc.options, resource.optionId) ? doc.options[resource.optionId].context : undefined) : doc.context;
          data = collection && own(collection, resource.contextId) ? collection[resource.contextId] : undefined;
        }
        if (data === undefined) throw new DecisionError(404, 'Resource not found.');
        return json(data, 200, { ETag: `"${row.revision}"` });
      }
      if (!resource) throw new DecisionError(404, 'Resource not found.');
      if (method !== 'PUT' && method !== 'DELETE') throw new DecisionError(405, 'Use GET, PUT or DELETE.');
      const match = request.headers.get('if-match');
      if (match !== null && !/^"\d+"$/.test(match)) throw new DecisionError(400, 'If-Match must be a quoted decision revision.');
      const expected = match === null ? undefined : Number(match.slice(1, -1));
      if (expected !== undefined && !Number.isSafeInteger(expected)) throw new DecisionError(400, 'Invalid revision.');
      const row = await store.mutate(owner, decisionId, resource, method === 'PUT' ? await readBody(request) : null, method === 'DELETE', expected);
      return json(row, 200, row ? { ETag: `"${row.revision}"` } : {});
    } catch (error) {
      return json({ error: error instanceof DecisionError ? error.message : 'Decision service unavailable.' }, error instanceof DecisionError ? error.status : 503);
    }
  };
}
