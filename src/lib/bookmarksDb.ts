import postgres from 'postgres';

export type BookmarkRecord = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail fast only when functions are called; keep module load safe for non-DB routes.
}

function getClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return postgres(connectionString, { max: 1 });
}

let tableReady = false;

async function ensureBookmarksTable(sql: postgres.Sql) {
  if (tableReady) return;
  await sql`
    create table if not exists bookmarks (
      id bigserial primary key,
      url text not null unique,
      title text not null,
      description text not null,
      category text not null,
      format text not null,
      author text not null,
      tags text[] not null default '{}',
      created_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

export async function upsertBookmark(record: BookmarkRecord): Promise<void> {
  const sql = getClient();
  try {
    await ensureBookmarksTable(sql);
    await sql`
      insert into bookmarks (url, title, description, category, format, author, tags)
      values (
        ${record.url},
        ${record.title},
        ${record.description},
        ${record.category},
        ${record.format},
        ${record.author},
        ${record.tags}
      )
      on conflict (url) do update set
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        format = excluded.format,
        author = excluded.author,
        tags = excluded.tags
    `;
  } finally {
    await sql.end();
  }
}

export async function listBookmarksFromDb(): Promise<BookmarkRecord[]> {
  const sql = getClient();
  try {
    await ensureBookmarksTable(sql);
    const rows = await sql<BookmarkRecord[]>`
      select title, description, category, format, url, author, tags
      from bookmarks
      order by created_at desc
    `;
    return rows;
  } finally {
    await sql.end();
  }
}
