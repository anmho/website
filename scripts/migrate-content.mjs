import fs from 'node:fs/promises';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
}

const sql = postgres(connectionString, { max: 1 });
try {
  for (const migrationFile of ['0001_content_posts.sql', '0002_bookmarks.sql']) {
    const migration = await fs.readFile(`db/migrations/${migrationFile}`, 'utf8');
    await sql.unsafe(migration);
  }
  console.log('content_posts and bookmarks tables are ready');
} finally {
  await sql.end();
}
