import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { canonical, DecisionError, inputHash, parseDecision, replaceResource, type Decision, type Resource } from './domain';

export type RecordRow = { id: string; document: Decision; revision: number; created_at: string; updated_at: string };
export type Evaluation = { id: string; decision_id: string; input_hash: string; snapshot: unknown; status: 'pending' | 'complete' | 'failed'; result: unknown; created_at: string };
export class DecisionStore {
  constructor(private pool: Pool) {}
  async list(owner: string) {
    return (await this.pool.query('SELECT id, document->>\'title\' AS title, revision, updated_at FROM private_decisions WHERE owner=$1 ORDER BY updated_at DESC LIMIT 200', [owner])).rows;
  }
  async get(owner: string, decisionId: string): Promise<RecordRow> {
    const row = (await this.pool.query('SELECT id, document, revision, created_at, updated_at FROM private_decisions WHERE owner=$1 AND id=$2', [owner, decisionId])).rows[0];
    if (!row) throw new DecisionError(404, 'Decision not found.');
    return row;
  }
  async mutate(owner: string, decisionId: string, resource: Resource, value: unknown, remove: boolean, expected?: number): Promise<RecordRow | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize creation as well as updates; a missing row cannot be locked with FOR UPDATE.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify([owner, decisionId])]);
      const prior = (await client.query('SELECT * FROM private_decisions WHERE owner=$1 AND id=$2 FOR UPDATE', [owner, decisionId])).rows[0];
      if (expected !== undefined && expected !== (prior?.revision ?? 0)) throw new DecisionError(409, 'Revision changed. GET the decision before retrying.');
      if (!prior && resource.type !== 'decision') throw new DecisionError(404, 'Decision not found.');
      if (resource.type === 'decision' && remove) {
        await client.query('DELETE FROM private_decisions WHERE owner=$1 AND id=$2', [owner, decisionId]);
        await client.query('COMMIT');
        return null;
      }
      const document = resource.type === 'decision' ? parseDecision(value) : replaceResource(prior.document, resource, value, remove);
      if (prior && canonical(prior.document) === canonical(document)) {
        await client.query('COMMIT');
        const { owner: ignored, ...row } = prior; void ignored;
        return row;
      }
      const row = (await client.query(`INSERT INTO private_decisions(owner,id,document) VALUES($1,$2,$3)
        ON CONFLICT(owner,id) DO UPDATE SET document=EXCLUDED.document, revision=private_decisions.revision+1, updated_at=now()
        RETURNING id,document,revision,created_at,updated_at`, [owner, decisionId, JSON.stringify(document)])).rows[0];
      await client.query('COMMIT');
      return row;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async evaluations(owner: string, decisionId: string, evaluationId?: string) {
    if (evaluationId) {
      const result = await this.pool.query('SELECT id,decision_id,input_hash,snapshot,status,result,created_at,completed_at FROM private_decision_evaluations WHERE owner=$1 AND decision_id=$2 AND id=$3', [owner, decisionId, evaluationId]);
      if (!result.rows[0]) throw new DecisionError(404, 'Evaluation not found.');
      return result.rows[0];
    }
    return (await this.pool.query('SELECT id,decision_id,input_hash,status,result,created_at,completed_at FROM private_decision_evaluations WHERE owner=$1 AND decision_id=$2 ORDER BY created_at DESC LIMIT 100', [owner, decisionId])).rows;
  }
  async claim(owner: string, decisionId: string, values: unknown, model: string, policy: string, dailyLimit: number): Promise<{ evaluation: Evaluation; claimed: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 1))', [owner]);
      const row = (await client.query('SELECT document,revision FROM private_decisions WHERE owner=$1 AND id=$2 FOR SHARE', [owner, decisionId])).rows[0];
      if (!row) throw new DecisionError(404, 'Decision not found.');
      const document = parseDecision(row.document);
      if (Object.keys(document.options).length < 2) throw new DecisionError(400, 'At least two options are required to evaluate.');
      const input = { document, values, model, policy };
      const hash = inputHash(input);
      const existing = (await client.query('SELECT * FROM private_decision_evaluations WHERE owner=$1 AND decision_id=$2 AND input_hash=$3', [owner, decisionId, hash])).rows[0];
      if (existing) { await client.query('COMMIT'); return { evaluation: existing, claimed: false }; }
      const budget = await client.query(`INSERT INTO private_decision_usage(owner,day,calls) VALUES($1,(now() AT TIME ZONE 'UTC')::date,1)
        ON CONFLICT(owner,day) DO UPDATE SET calls=private_decision_usage.calls+1 WHERE private_decision_usage.calls < $2 RETURNING calls`, [owner, dailyLimit]);
      if (!budget.rows.length) throw new DecisionError(429, 'Daily evaluation limit reached. Cached results remain available.');
      const evaluation = (await client.query(`INSERT INTO private_decision_evaluations(id,owner,decision_id,input_hash,snapshot,status)
        VALUES($1,$2,$3,$4,$5,'pending') RETURNING *`, [randomUUID(), owner, decisionId, hash, JSON.stringify({ ...input, revision: row.revision })])).rows[0];
      await client.query('COMMIT');
      return { evaluation, claimed: true };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async finish(owner: string, evaluationId: string, result: unknown, failed: boolean) {
    const row = (await this.pool.query(`UPDATE private_decision_evaluations SET result=$3,status=$4,completed_at=now()
      WHERE owner=$1 AND id=$2 AND status='pending' RETURNING id,decision_id,input_hash,status,result,created_at,completed_at`, [owner, evaluationId, JSON.stringify(result), failed ? 'failed' : 'complete'])).rows[0];
    if (!row) throw new DecisionError(409, 'Evaluation no longer pending.');
    return row;
  }
}
