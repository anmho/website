import { promises as fs } from 'fs';
import path from 'path';

const LEARNINGS_PATH = path.join(
  process.cwd(),
  'src/assets/static/json/learnings.json'
);
const ARTICLES_PATH = path.join(
  process.cwd(),
  'src/assets/static/json/articles.json'
);
const ARTICLE_DIR = path.join(process.cwd(), 'src/assets/content/articles');

export type Learning = {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  codeLanguage?: string;
  tags: string[];
  date: string;
};

export type ArticleMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
};

export type ValidationIssue = { scope: 'learnings' | 'articles'; message: string };

export function slugify(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

export async function readLearnings(): Promise<Learning[]> {
  const raw = await fs.readFile(LEARNINGS_PATH, 'utf-8');
  return JSON.parse(raw) as Learning[];
}

export async function writeLearnings(learnings: Learning[]): Promise<void> {
  await fs.writeFile(LEARNINGS_PATH, `${JSON.stringify(learnings, null, 2)}\n`);
}

export async function readArticlesMeta(): Promise<ArticleMeta[]> {
  const raw = await fs.readFile(ARTICLES_PATH, 'utf-8');
  return JSON.parse(raw) as ArticleMeta[];
}

export async function writeArticlesMeta(articles: ArticleMeta[]): Promise<void> {
  await fs.writeFile(ARTICLES_PATH, `${JSON.stringify(articles, null, 2)}\n`);
}

export async function articleMarkdownExists(slug: string): Promise<boolean> {
  const full = path.join(ARTICLE_DIR, `${slug}.md`);
  try {
    await fs.stat(full);
    return true;
  } catch {
    return false;
  }
}

export async function writeArticleMarkdown(
  slug: string,
  title: string,
  body?: string
): Promise<string> {
  const full = path.join(ARTICLE_DIR, `${slug}.md`);
  const text =
    body?.trim() ||
    `---\ntitle: ${title}\n---\n\n# ${title}\n\nWrite your article here.\n`;
  await fs.writeFile(full, text.endsWith('\n') ? text : `${text}\n`);
  return full;
}

export async function validateContent(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const learnings = await readLearnings();
  const articles = await readArticlesMeta();

  const learningIDs = new Set<string>();
  learnings.forEach((l, idx) => {
    const p = `learnings[${idx}]`;
    if (!l.id?.trim()) issues.push({ scope: 'learnings', message: `${p}: missing id` });
    if (!l.question?.trim())
      issues.push({ scope: 'learnings', message: `${p}: missing question` });
    if (!l.answer?.trim()) issues.push({ scope: 'learnings', message: `${p}: missing answer` });
    if (!Array.isArray(l.tags) || l.tags.length === 0) {
      issues.push({ scope: 'learnings', message: `${p}: missing tags` });
    }
    if (!isISODate(l.date)) issues.push({ scope: 'learnings', message: `${p}: invalid date` });
    if (learningIDs.has(l.id)) {
      issues.push({ scope: 'learnings', message: `${p}: duplicate id ${l.id}` });
    }
    learningIDs.add(l.id);
  });

  const slugs = new Set<string>();
  articles.forEach((a, idx) => {
    const p = `articles[${idx}]`;
    if (!a.slug?.trim()) issues.push({ scope: 'articles', message: `${p}: missing slug` });
    if (!a.title?.trim()) issues.push({ scope: 'articles', message: `${p}: missing title` });
    if (!a.excerpt?.trim()) issues.push({ scope: 'articles', message: `${p}: missing excerpt` });
    if (!a.readTime?.trim()) issues.push({ scope: 'articles', message: `${p}: missing readTime` });
    if (!isISODate(a.date)) issues.push({ scope: 'articles', message: `${p}: invalid date` });
    if (slugs.has(a.slug)) issues.push({ scope: 'articles', message: `${p}: duplicate slug ${a.slug}` });
    slugs.add(a.slug);
  });

  for (const a of articles) {
    // Keep sequential I/O explicit so error messages map cleanly to a slug.
    // eslint-disable-next-line no-await-in-loop
    const ok = await articleMarkdownExists(a.slug);
    if (!ok) {
      issues.push({
        scope: 'articles',
        message: `missing markdown file: src/assets/content/articles/${a.slug}.md`,
      });
    }
  }

  return issues;
}
