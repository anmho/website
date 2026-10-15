import 'server-only';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { readDecisionsSecret } from '../decisionsVault.server';

let pool: Pool | undefined;
let initializing: Promise<Pool> | undefined;
export async function decisionPool(): Promise<Pool> {
  if (pool) return pool;
  if (!initializing) initializing = (async () => {
    const url = process.env.DECISIONS_DATABASE_URL || (await readDecisionsSecret('decisions-database'))?.database_url;
    if (typeof url !== 'string' || !url) throw new Error('Decision database unavailable.');
    pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 10000 });
    pool.on('error', () => { /* Never log connection strings or private query data. */ });
    attachDatabasePool(pool);
    return pool;
  })().finally(() => { initializing = undefined; });
  return initializing;
}
