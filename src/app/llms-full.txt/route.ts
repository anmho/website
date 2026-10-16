import { NextResponse } from 'next/server';
import articlesData from '@/assets/static/json/articles.json';
import goalsData from '@/assets/static/json/goals.json';
import learningsData from '@/assets/static/json/learnings.json';
import notesData from '@/assets/static/json/notes.json';
import projectsData from '@/assets/static/json/projects.json';
import readingsData from '@/assets/static/json/readings.json';
import resourcesData from '@/assets/static/json/resources.json';
import watchData from '@/assets/static/json/watch.json';
import { getPublicTenets } from '@/lib/tenets';
import { readStaticMarkdown } from '@/lib/staticContent';
import { absoluteUrl, site } from '@/lib/site';

export const runtime = 'nodejs';
export const revalidate = 3600;

type RecordValue = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function pageBlock({
  title,
  url,
  date,
  summary,
  body,
}: {
  title: string;
  url: string;
  date?: string;
  summary?: string;
  body?: string;
}) {
  return [
    `### ${title}`,
    `URL: ${url}`,
    date ? `Date: ${date}` : '',
    summary ? `Summary: ${summary}` : '',
    body?.trim() || '',
  ].filter(Boolean).join('\n');
}

async function markdownBlocks(
  values: unknown[],
  directory: 'articles' | 'notes' | 'readings' | 'watch'
) {
  return Promise.all(values.map(async (value) => {
    const record = (value || {}) as RecordValue;
    const slug = text(record.slug) || text(record.id);
    const title = text(record.title);
    if (!slug || !title) return '';

    return pageBlock({
      title,
      url: absoluteUrl(`/${directory}/${slug}`),
      date: text(record.date),
      summary: text(record.excerpt),
      body: await readStaticMarkdown(directory, slug),
    });
  }));
}

export async function GET() {
  const tenets = await getPublicTenets();
  const [articles, notes, readings, watch] = await Promise.all([
    markdownBlocks(articlesData as unknown[], 'articles'),
    markdownBlocks(notesData as unknown[], 'notes'),
    markdownBlocks(readingsData as unknown[], 'readings'),
    markdownBlocks(watchData as unknown[], 'watch'),
  ]);

  const tenetBlocks = tenets.map((tenet) => pageBlock({
    title: tenet.title,
    url: absoluteUrl(`/tenets#${tenet.id}`),
    date: tenet.date,
    summary: tenet.excerpt,
    body: tenet.body,
  }));

  const learningBlocks = (learningsData as unknown[]).map((value) => {
    const record = value as RecordValue;
    const title = text(record.question) || text(record.title);
    return pageBlock({
      title,
      url: absoluteUrl(`/learnings?q=${encodeURIComponent(title)}`),
      date: text(record.date),
      summary: text(record.answer),
      body: text(record.codeSnippet),
    });
  });

  const resourceBlocks = (resourcesData as unknown[]).map((value) => {
    const record = value as RecordValue;
    const title = text(record.title);
    const url = text(record.url);
    return pageBlock({
      title,
      url: url || absoluteUrl('/resources'),
      summary: [text(record.description), text(record.author), ...list(record.tags)].filter(Boolean).join(' | '),
    });
  });

  const projectBlocks = (projectsData as unknown[]).map((value) => {
    const record = value as RecordValue;
    return pageBlock({
      title: text(record.title),
      url: absoluteUrl('/projects'),
      date: text(record.year),
      summary: [text(record.desc), ...list(record.skills)].filter(Boolean).join(' | '),
    });
  });

  const goalBlocks = (goalsData as unknown[]).map((value) => {
    const record = value as RecordValue;
    return pageBlock({
      title: text(record.title),
      url: absoluteUrl('/goals'),
      date: text(record.date),
      summary: [text(record.summary), ...list(record.tags)].filter(Boolean).join(' | '),
    });
  });

  const content = [
    `# ${site.name}`,
    '',
    site.description,
    '',
    `Canonical site: ${site.url}`,
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
    'This file contains the public content of the site in a plain text format for language models and other automated readers. Follow the page URL when you need the canonical HTML presentation.',
    '',
    '## Public sections',
    `- ${absoluteUrl('/about')}`,
    `- ${absoluteUrl('/articles')}`,
    `- ${absoluteUrl('/notes')}`,
    `- ${absoluteUrl('/learnings')}`,
    `- ${absoluteUrl('/tenets')}`,
    `- ${absoluteUrl('/goals')}`,
    `- ${absoluteUrl('/readings')}`,
    `- ${absoluteUrl('/watch')}`,
    `- ${absoluteUrl('/resources')}`,
    `- ${absoluteUrl('/projects')}`,
    '',
    '## Tenets',
    tenetBlocks.join('\n\n'),
    '',
    '## Articles',
    articles.filter(Boolean).join('\n\n'),
    '',
    '## Notes',
    notes.filter(Boolean).join('\n\n'),
    '',
    '## Readings',
    readings.filter(Boolean).join('\n\n'),
    '',
    '## Watch',
    watch.filter(Boolean).join('\n\n'),
    '',
    '## Learnings',
    learningBlocks.join('\n\n'),
    '',
    '## Bookmarks',
    resourceBlocks.join('\n\n'),
    '',
    '## Projects',
    projectBlocks.join('\n\n'),
    '',
    '## Goals journal',
    goalBlocks.join('\n\n'),
    '',
    '## Agent APIs',
    `- OpenAPI: ${absoluteUrl('/api/openapi')}`,
    `- Public Tenets: ${absoluteUrl('/api/tenets')}`,
    `- Goals API description: ${absoluteUrl('/api/goals')}`,
    `- Perspective API description: ${absoluteUrl('/api/perspective')}`,
    '',
  ].join('\n');

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
