// Operator-only migration/import helper. Never logs credentials or private documents.
import pg from 'pg';
import { readFile } from 'node:fs/promises';
const command = process.argv[2];
if (!['migrate', 'import'].includes(command)) throw Error('Usage: node scripts/decisions-db.mjs migrate|import');
const url = process.env.DECISIONS_DATABASE_URL;
if (!url) throw Error('DECISIONS_DATABASE_URL is required.');
if (command === 'migrate' && new URL(url).hostname.includes('-pooler')) throw Error('Use a direct connection for migrations.');
const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
try {
  if (command === 'migrate') {
    await pool.query(await readFile(new URL('../migrations/001_decisions.sql', import.meta.url), 'utf8'));
    console.log('Decision schema migration applied.');
  } else {
    const owner = process.env.DECISIONS_OWNER_EMAIL?.trim().toLowerCase();
    if (!owner || !owner.includes('@')) throw Error('DECISIONS_OWNER_EMAIL is required.');
    let input = '';
    for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 130000) throw Error('Import too large.'); }
    const { id, document } = JSON.parse(input);
    // Run with node --import tsx so the operator import shares server validation.
    const domain = await import('../src/lib/decisions/domain.ts');
    const parsed = domain.parseDecision(document);
    const result = await pool.query('INSERT INTO private_decisions(owner,id,document) VALUES($1,$2,$3) ON CONFLICT(owner,id) DO NOTHING RETURNING id', [owner, domain.id(id), JSON.stringify(parsed)]);
    console.log(JSON.stringify({ id, created: result.rowCount === 1, existingPreserved: result.rowCount === 0 }));
  }
} catch { console.error('Database operation failed. Sensitive diagnostics suppressed.'); process.exitCode = 1; }
finally { await pool.end(); }
