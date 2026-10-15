import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { parseDecision, parseContext, canonical, inputHash, replaceResource, DecisionError } from '../src/lib/decisions/domain';
import { DecisionStore } from '../src/lib/decisions/store';
import { evaluate, POLICY } from '../src/lib/decisions/evaluate';
import { createDecisionHandler } from '../src/lib/decisions/http';

const entry = { text: 'I respect this team.', kind: 'personal_assessment', source: { type: 'user_report', basis: 'Conversation' }, recorded_at: '2026-10-15' };
const draft = { title: 'Test choice', question: 'Which option fits?', context: {}, options: { a: { label: 'A', context: {} }, b: { label: 'B', context: {} } } };
test('validation, canonical hashing and full replacement', () => {
  const parsed = parseDecision(draft);
  assert.equal(parsed.state, '');
  assert.equal(inputHash({ a: 1, b: 2 }), inputHash({ b: 2, a: 1 }));
  assert.throws(() => parseContext({ ...entry, kind: 'fact' }), DecisionError);
  assert.throws(() => parseContext({ ...entry, surprise: 1 }), DecisionError);
  assert.throws(() => parseDecision({ ...draft, state: 'x'.repeat(9000) }), DecisionError);
  assert.throws(() => replaceResource(parsed, { type: 'context', optionId: 'missing', contextId: 'x' }, entry), DecisionError);
  const next = replaceResource(parsed, { type: 'context', contextId: 'trust' }, entry);
  assert.equal(next.context.trust.text, entry.text);
  assert.deepEqual(parsed.context, {});
  const deleted = replaceResource(next, { type: 'context', contextId: 'trust' }, null, true);
  assert.deepEqual(deleted.context, {});
  const tricky = replaceResource(parsed, { type: 'context', contextId: 'constructor' }, entry);
  assert.equal(Object.entries(tricky.context).find(([key]) => key === 'constructor')?.[1].text, entry.text);
  assert.equal(canonical(parsed), canonical(parseDecision(parsed)));
});

const url = process.env.DECISIONS_TEST_DATABASE_URL;
const pool = url ? new Pool({ connectionString: url, max: 10 }) : null;
after(async () => { await pool?.end(); });
test('Postgres CRUD, HTTP ownership, concurrency, quota, snapshots and evaluation cache', { skip: !pool }, async () => {
  const db = pool!;
  await db.query(await readFile(new URL('../migrations/001_decisions.sql', import.meta.url), 'utf8'));
  const store = new DecisionStore(db);
  const owner = `test-${Date.now()}@example.invalid`;
  const decisionId = 'test-choice';
  try {
    const created = await store.mutate(owner, decisionId, { type: 'decision' }, draft, false, 0);
    assert.equal(created?.revision, 1);
    assert.equal((await store.mutate(owner, decisionId, { type: 'decision' }, draft, false))?.revision, 1);
    await assert.rejects(store.get('other@example.invalid', decisionId), { status: 404 });
    await assert.rejects(store.mutate(owner, decisionId, { type: 'decision' }, draft, false, 0), { status: 409 });
    await Promise.all(['one', 'two'].map(contextId => store.mutate(owner, decisionId, { type: 'context', contextId }, entry, false)));
    assert.equal(Object.keys((await store.get(owner, decisionId)).document.context).length, 2);
    const before = (await store.get(owner, decisionId)).revision;
    const writes = await Promise.allSettled(['three', 'four'].map(contextId => store.mutate(owner, decisionId, { type: 'context', contextId }, entry, false, before)));
    assert.equal(writes.filter(r => r.status === 'fulfilled').length, 1);

    let calls = 0;
    const fetcher: typeof fetch = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 20)); return Response.json({ answers: [{ type: 'choice', name: 'choice', choice: 'a', confidence: 0.7 }] }); };
    const values = [{ title: 'Value', body: 'Value text' }];
    const results = await Promise.all(Array.from({ length: 8 }, () => evaluate(store, owner, decisionId, values, 'test-key', 'test-model', 3, fetcher)));
    assert.equal(calls, 1);
    assert.equal(new Set(results.map(r => r.id)).size, 1);
    const cached = await evaluate(store, owner, decisionId, values, 'test-key', 'test-model', 3, fetcher);
    assert.equal(cached.status, 'complete'); assert.equal(cached.cached, true); assert.equal(calls, 1);
    const saved = await store.evaluations(owner, decisionId, cached.id);
    assert.deepEqual(saved.snapshot.values, values);
    assert.equal(saved.snapshot.policy, POLICY);
    await assert.rejects(store.evaluations('other@example.invalid', decisionId, cached.id), { status: 404 });
    const changed = await evaluate(store, owner, decisionId, ['changed value'], 'test-key', 'test-model', 3, fetcher);
    assert.notEqual(changed.id, cached.id); assert.equal(calls, 2);
    const failedFetch: typeof fetch = async () => { calls++; throw Error('ambiguous timeout'); };
    const failed = await evaluate(store, owner, decisionId, ['third'], 'test-key', 'test-model', 3, failedFetch);
    assert.equal(failed.status, 'failed');
    assert.equal((await evaluate(store, owner, decisionId, ['third'], 'test-key', 'test-model', 3, failedFetch)).cached, true);
    assert.equal(calls, 3);
    await assert.rejects(evaluate(store, owner, decisionId, ['fourth'], 'test-key', 'test-model', 3, fetcher), { status: 429 });

    let accesses = 0;
    const handler = createDecisionHandler({ authenticate: async r => r.headers.get('x-test-owner'), store: async () => { accesses++; return store; }, values: async () => values, key: async () => null, model: () => 'test', dailyLimit: () => 3 });
    assert.equal((await handler(new Request('https://example.test/api/decisions'), [])).status, 401);
    assert.equal(accesses, 0);
    const request = (method = 'GET', body?: unknown, extra = {}) => new Request('https://example.test/api/decisions/test-choice', { method, headers: { 'x-test-owner': owner, 'content-type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal((await handler(request(), [decisionId])).status, 200);
    assert.equal((await handler(request(), [decisionId, 'context', 'toString'])).status, 404);
    assert.equal((await handler(request('PUT', entry, { origin: 'https://evil.test' }), [decisionId, 'context', 'x'])).status, 403);
    assert.equal((await handler(request('PUT', entry), [decisionId, 'options', 'a', 'context', 'x'])).status, 200);
    assert.equal((await handler(request(), [decisionId, 'options', 'a', 'context', 'x'])).status, 200);
    assert.equal((await handler(request('DELETE'), [decisionId, 'options', 'a', 'context', 'x'])).status, 200);
    assert.equal((await handler(request(), [decisionId, 'options', 'a', 'context', 'x'])).status, 404);
    assert.equal((await handler(request('PUT', { broken: true }), [decisionId])).status, 400);
    assert.equal((await handler(request('PUT', draft, { 'if-match': '"0"' }), [decisionId])).status, 409);
    assert.equal((await handler(request('POST'), [decisionId, 'evaluate'])).status, 503);
    assert.equal((await handler(request(), [decisionId, 'evaluate'])).status, 405);
    const read = await handler(request(), [decisionId]);
    assert.equal(read.headers.get('cache-control'), 'private, no-store');
    await store.mutate(owner, decisionId, { type: 'decision' }, null, true);
    await store.mutate(owner, decisionId, { type: 'decision' }, draft, false);
    await assert.rejects(evaluate(store, owner, decisionId, ['new'], 'test-key', 'test-model', 3, fetcher), { status: 429 });
  } finally {
    await db.query('DELETE FROM private_decisions WHERE owner=$1', [owner]);
    await db.query('DELETE FROM private_decision_usage WHERE owner=$1', [owner]);
  }
});
