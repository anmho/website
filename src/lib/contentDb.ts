import 'server-only';

import postgres from 'postgres';

export const contentTypes = [
  'article',
  'note',
  'learning',
  'lesson',
  'reading',
  'watch',
] as const;

export type ContentType = (typeof contentTypes)[number];

export type ContentRecord = {
  id: string;
  contentType: ContentType;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  readTime: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
};

type ContentInsert = Omit<ContentRecord, 'createdAt' | 'updatedAt'>;

const connectionString = process.env.DATABASE_URL;
let tableReady = false;

function getClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return postgres(connectionString, { max: 1 });
}

export async function ensureContentTable(sql: postgres.Sql): Promise<void> {
  if (tableReady) return;

  await sql`
    create table if not exists content_posts (
      id text primary key,
      content_type text not null check (content_type in ('article', 'note', 'learning', 'lesson', 'reading', 'watch')),
      slug text not null,
      title text not null,
      excerpt text not null default '',
      body text not null default '',
      date date not null,
      read_time text,
      tags text[] not null default '{}',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (content_type, slug)
    )
  `;
  await sql`
    create index if not exists content_posts_type_date_idx
    on content_posts (content_type, date desc, created_at desc)
  `;
  tableReady = true;
}

function mapRow(row: {
  id: string;
  content_type: ContentType;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string | Date;
  read_time: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
}): ContentRecord {
  return {
    id: row.id,
    contentType: row.content_type,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    readTime: row.read_time,
    tags: row.tags || [],
    metadata: row.metadata || {},
  };
}

export async function listContent(contentType: ContentType): Promise<ContentRecord[]> {
  if (!connectionString) return [];

  const sql = getClient();
  try {
    await ensureContentTable(sql);
    const rows = await sql`
      select id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata
      from content_posts
      where content_type = ${contentType}
      order by date desc, created_at desc
    `;
    return rows.map((row) => mapRow(row as never));
  } finally {
    await sql.end();
  }
}

export async function getContent(
  contentType: ContentType,
  slug: string
): Promise<ContentRecord | null> {
  if (!connectionString) return null;

  const sql = getClient();
  try {
    await ensureContentTable(sql);
    const rows = await sql`
      select id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata
      from content_posts
      where content_type = ${contentType} and slug = ${slug}
      limit 1
    `;
    return rows[0] ? mapRow(rows[0] as never) : null;
  } finally {
    await sql.end();
  }
}

export async function createContent(record: ContentInsert): Promise<ContentRecord> {
  const sql = getClient();
  try {
    await ensureContentTable(sql);
    const rows = await sql`
      insert into content_posts (
        id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata
      )
      values (
        ${record.id},
        ${record.contentType},
        ${record.slug},
        ${record.title},
        ${record.excerpt},
        ${record.body},
        ${record.date},
        ${record.readTime},
        ${record.tags},
        ${JSON.stringify(record.metadata)}::jsonb
      )
      returning id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata
    `;
    return mapRow(rows[0] as never);
  } finally {
    await sql.end();
  }
}

export function isContentConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
  );
}
