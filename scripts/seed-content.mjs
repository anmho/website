import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
}

const root = process.cwd();
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const readMarkdown = async (relativePath) => {
  try {
    return await fs.readFile(path.join(root, relativePath), 'utf8');
  } catch {
    return '';
  }
};
const slugify = (value) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const sql = postgres(connectionString, { max: 1 });
let count = 0;
try {
  const migration = await fs.readFile('db/migrations/0001_content_posts.sql', 'utf8');
  await sql.unsafe(migration);

  const articles = await readJson('src/assets/static/json/articles.json');
  const notes = await readJson('src/assets/static/json/notes.json');
  const learnings = await readJson('src/assets/static/json/learnings.json');

  for (const article of articles) {
    await sql`
      insert into content_posts (id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata)
      values (${article.slug}, 'article', ${article.slug}, ${article.title}, ${article.excerpt}, ${await readMarkdown(`src/assets/content/articles/${article.slug}.md`)}, ${article.date}, ${article.readTime}, ${[]}, ${JSON.stringify({})}::jsonb)
      on conflict (content_type, slug) do nothing
    `;
    count += 1;
  }

  for (const note of notes) {
    await sql`
      insert into content_posts (id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata)
      values (${note.slug}, 'note', ${note.slug}, ${note.title}, ${note.excerpt}, ${await readMarkdown(`src/assets/content/notes/${note.slug}.md`)}, ${note.date}, ${note.readTime}, ${[]}, ${JSON.stringify({})}::jsonb)
      on conflict (content_type, slug) do nothing
    `;
    count += 1;
  }

  for (const learning of learnings) {
    const metadata = {
      ...(learning.codeSnippet ? { codeSnippet: learning.codeSnippet } : {}),
      ...(learning.codeLanguage ? { codeLanguage: learning.codeLanguage } : {}),
    };
    await sql`
      insert into content_posts (id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata)
      values (${learning.id}, 'learning', ${learning.id}, ${learning.question}, '', ${learning.answer}, ${learning.date}, ${null}, ${learning.tags || []}, ${JSON.stringify(metadata)}::jsonb)
      on conflict (content_type, slug) do nothing
    `;
    count += 1;
  }

  console.log(`seeded ${count} legacy content records (existing records were left unchanged)`);
} finally {
  await sql.end();
}
