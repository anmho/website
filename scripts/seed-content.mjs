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
const sql = postgres(connectionString, { max: 1 });
let count = 0;
try {
  for (const migrationFile of ['0001_content_posts.sql', '0002_bookmarks.sql']) {
    const migration = await fs.readFile(`db/migrations/${migrationFile}`, 'utf8');
    await sql.unsafe(migration);
  }

  const articles = await readJson('src/assets/static/json/articles.json');
  const notes = await readJson('src/assets/static/json/notes.json');
  const learnings = await readJson('src/assets/static/json/learnings.json');
  const lessons = await readJson('src/assets/static/json/lessons.json');
  const readings = await readJson('src/assets/static/json/readings.json');
  const watch = await readJson('src/assets/static/json/watch.json');
  const bookmarks = await readJson('src/assets/static/json/resources.json');

  const seedContent = async ({ type, items, getSlug, getTitle, getExcerpt, getDate, getBody, getReadTime, getTags, getMetadata }) => {
    for (const item of items) {
      const slug = getSlug(item);
      const excerpt = getExcerpt(item);
      const body = await getBody(item, slug, excerpt);
      await sql`
        insert into content_posts (id, content_type, slug, title, excerpt, body, date, read_time, tags, metadata)
        values (${type + ':' + slug}, ${type}, ${slug}, ${getTitle(item)}, ${excerpt}, ${body}, ${getDate(item)}, ${getReadTime(item)}, ${getTags(item)}, ${JSON.stringify(getMetadata(item))}::jsonb)
        on conflict (content_type, slug) do nothing
      `;
      count += 1;
    }
  };

  const markdownBody = (directory) => async (item, slug, excerpt) =>
    (await readMarkdown(`src/assets/content/${directory}/${slug}.md`)) || excerpt;

  await seedContent({
    type: 'article', items: articles, getSlug: (item) => item.slug,
    getTitle: (item) => item.title, getExcerpt: (item) => item.excerpt, getDate: (item) => item.date,
    getBody: markdownBody('articles'), getReadTime: (item) => item.readTime || '8 min read',
    getTags: () => [], getMetadata: () => {},
  });
  await seedContent({
    type: 'note', items: notes, getSlug: (item) => item.slug,
    getTitle: (item) => item.title, getExcerpt: (item) => item.excerpt, getDate: (item) => item.date,
    getBody: markdownBody('notes'), getReadTime: (item) => item.readTime || '5 min read',
    getTags: () => [], getMetadata: () => {},
  });
  await seedContent({
    type: 'learning', items: learnings, getSlug: (item) => item.id,
    getTitle: (item) => item.question, getExcerpt: () => '', getDate: (item) => item.date,
    getBody: (item) => item.answer, getReadTime: () => null, getTags: (item) => item.tags || [],
    getMetadata: (item) => ({
      ...(item.codeSnippet ? { codeSnippet: item.codeSnippet } : {}),
      ...(item.codeLanguage ? { codeLanguage: item.codeLanguage } : {}),
    }),
  });
  await seedContent({
    type: 'lesson', items: lessons, getSlug: (item) => item.id,
    getTitle: (item) => item.title, getExcerpt: (item) => item.excerpt, getDate: (item) => item.date,
    getBody: markdownBody('lessons'), getReadTime: () => null, getTags: () => [],
    getMetadata: (item) => item.source ? { source: item.source } : {},
  });
  await seedContent({
    type: 'reading', items: readings, getSlug: (item) => item.id,
    getTitle: (item) => item.title, getExcerpt: (item) => item.excerpt, getDate: (item) => item.date,
    getBody: markdownBody('readings'), getReadTime: () => null, getTags: () => [],
    getMetadata: (item) => ({ author: item.author || 'Unknown author' }),
  });
  await seedContent({
    type: 'watch', items: watch, getSlug: (item) => item.id,
    getTitle: (item) => item.title, getExcerpt: (item) => item.excerpt, getDate: (item) => item.date,
    getBody: markdownBody('watch'), getReadTime: () => null, getTags: () => [],
    getMetadata: (item) => ({ format: item.format || 'video' }),
  });

  for (const bookmark of bookmarks) {
    await sql`
      insert into bookmarks (url, title, description, category, format, author, tags)
      values (${bookmark.url}, ${bookmark.title}, ${bookmark.description}, ${bookmark.category}, ${bookmark.format}, ${bookmark.author}, ${bookmark.tags || []})
      on conflict (url) do nothing
    `;
    count += 1;
  }

  console.log(`seeded ${count} legacy database records (existing records were left unchanged)`);
} finally {
  await sql.end();
}
