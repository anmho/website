import 'server-only';

import articlesData from '@/assets/static/json/articles.json';
import goalsData from '@/assets/static/json/goals.json';
import learningsData from '@/assets/static/json/learnings.json';
import notesData from '@/assets/static/json/notes.json';
import projectsData from '@/assets/static/json/projects.json';
import readingsData from '@/assets/static/json/readings.json';
import resourcesData from '@/assets/static/json/resources.json';
import watchData from '@/assets/static/json/watch.json';
import { getPublicTenets, type PublicTenet } from '@/lib/tenets';
import { readStaticMarkdown } from '@/lib/staticContent';

type JsonRecord = Record<string, unknown>;

export type KnowledgeType =
  | 'article'
  | 'note'
  | 'reading'
  | 'tenet'
  | 'watch'
  | 'learning'
  | 'resource'
  | 'project'
  | 'goal';

export type KnowledgeDocument = {
  id: string;
  title: string;
  type: KnowledgeType;
  path: string;
  text: string;
};

export type RetrievedKnowledge = KnowledgeDocument & {
  score: number;
  excerpt: string;
};

const stopWords = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'been', 'being', 'but', 'can',
  'could', 'did', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'into',
  'its', 'just', 'more', 'most', 'much', 'not', 'of', 'on', 'or', 'our', 'should',
  'some', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'to',
  'was', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would',
  'you', 'your',
]);

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

function slugFor(post: JsonRecord): string {
  return asText(post.slug) || asText(post.id) || asText(post.title);
}

function markdownPath(type: KnowledgeType, slug: string): string {
  const directory = type === 'article'
    ? 'articles'
    : type === 'note'
      ? 'notes'
      : type === 'tenet'
        ? 'tenets'
        : type === 'reading'
          ? 'readings'
          : 'watch';
  return `/${directory}/${slug}`;
}

function jsonDocument(
  post: JsonRecord,
  type: KnowledgeType,
  path: string,
  fields: string[]
): KnowledgeDocument | null {
  const title = asText(post.title) || asText(post.question);
  const id = slugFor(post);
  if (!title || !id) return null;

  const text = [
    title,
    ...fields,
    ...asTextList(post.tags),
    ...asTextList(post.skills),
    ...asTextList(post.blurb),
  ].filter(Boolean).join('\n');

  return { id, title, type, path, text };
}

async function markdownDocuments(
  posts: unknown[],
  type: Extract<KnowledgeType, 'article' | 'note' | 'reading' | 'watch'>
): Promise<KnowledgeDocument[]> {
  return Promise.all(
    posts.map(async (value) => {
      const post = (value || {}) as JsonRecord;
      const id = slugFor(post);
      const title = asText(post.title);
      if (!id || !title) return null;

      const directory = type === 'article'
        ? 'articles'
        : type === 'note'
          ? 'notes'
          : type === 'reading'
            ? 'readings'
            : 'watch';
      const body = await readStaticMarkdown(directory, id);
      const metadata = [
        title,
        asText(post.excerpt),
        asText(post.author),
        asText(post.source),
        asText(post.format),
        ...asTextList(post.tags),
      ].filter(Boolean).join('\n');

      return {
        id,
        title,
        type,
        path: markdownPath(type, id),
        text: `${metadata}\n${body}`,
      };
    })
  ).then((documents) => documents.filter((document) => document !== null) as KnowledgeDocument[]);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function excerptFor(document: KnowledgeDocument, queryTokens: string[]): string {
  const text = document.text.replace(/\s+/g, ' ').trim();
  if (text.length <= 900) return text;

  const normalized = text.toLowerCase();
  const matchToken = queryTokens.find((token) => normalized.includes(token));
  const matchIndex = matchToken ? normalized.indexOf(matchToken) : 0;
  const start = Math.max(0, Math.min(matchIndex - 260, text.length - 900));
  const prefix = start > 0 ? '…' : '';
  const suffix = start + 900 < text.length ? '…' : '';
  return `${prefix}${text.slice(start, start + 900)}${suffix}`;
}

function scoreDocument(document: KnowledgeDocument, queryTokens: string[], query: string): number {
  const titleTokens = new Set(tokenize(document.title));
  const textTokens = tokenize(document.text);
  const tokenCounts = new Map<string, number>();
  for (const token of textTokens) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);

  let score = document.title.toLowerCase().includes(query.toLowerCase()) ? 12 : 0;
  for (const token of queryTokens) {
    const count = tokenCounts.get(token) || 0;
    if (count === 0) continue;
    score += titleTokens.has(token) ? 8 : 2;
    score += Math.min(count, 4) * 0.5;
  }
  return score;
}

function tenetDocuments(tenets: PublicTenet[]): KnowledgeDocument[] {
  return tenets.map((tenet) => ({
    id: tenet.id,
    title: tenet.title,
    type: 'tenet',
    path: `/tenets/${tenet.id}`,
    text: [tenet.title, tenet.excerpt, tenet.source, tenet.body].filter(Boolean).join('\n'),
  }));
}

export async function getPersonalKnowledge(): Promise<KnowledgeDocument[]> {
  const publicTenets = await getPublicTenets();
  const [articles, notes, readings, watch] = await Promise.all([
    markdownDocuments(articlesData as unknown[], 'article'),
    markdownDocuments(notesData as unknown[], 'note'),
    markdownDocuments(readingsData as unknown[], 'reading'),
    markdownDocuments(watchData as unknown[], 'watch'),
  ]);

  const learnings = (learningsData as unknown[])
    .map((value) => {
      const post = value as JsonRecord;
      return jsonDocument(post, 'learning', `/learnings?q=${encodeURIComponent(asText(post.question) || asText(post.title))}#${slugFor(post)}`, [
        asText(post.question), asText(post.answer), asText(post.codeSnippet), asText(post.category),
      ]);
    })
    .filter((document): document is KnowledgeDocument => Boolean(document));

  const resources = (resourcesData as unknown[])
    .map((value) => {
      const post = value as JsonRecord;
      return jsonDocument(post, 'resource', asText(post.url), [
        asText(post.description), asText(post.author), asText(post.category), asText(post.format),
      ]);
    })
    .filter((document): document is KnowledgeDocument => Boolean(document));

  const projects = (projectsData as unknown[])
    .map((value) => {
      const post = value as JsonRecord;
      return jsonDocument(post, 'project', asText(post.websiteUrl) || asText(post.repoUrl) || '/projects', [
        asText(post.desc), asText(post.year),
      ]);
    })
    .filter((document): document is KnowledgeDocument => Boolean(document));

  const goals = (goalsData as unknown[])
    .map((value) => {
      const post = value as JsonRecord;
      return jsonDocument(post, 'goal', '/goals', [asText(post.summary), asText(post.date)]);
    })
    .filter((document): document is KnowledgeDocument => Boolean(document));

  return [
    ...tenetDocuments(publicTenets),
    ...articles,
    ...notes,
    ...readings,
    ...watch,
    ...learnings,
    ...resources,
    ...projects,
    ...goals,
  ];
}

export function retrievePersonalKnowledge(
  documents: KnowledgeDocument[],
  query: string,
  limit = 8
): RetrievedKnowledge[] {
  const queryTokens = Array.from(new Set(tokenize(query)));
  return documents
    .map((document) => ({
      ...document,
      score: scoreDocument(document, queryTokens, query),
      excerpt: excerptFor(document, queryTokens),
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}
