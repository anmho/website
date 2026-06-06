import { readFileSync } from 'fs';
import path from 'path';
import { buildSearchItems } from '../src/lib/searchData';

type Issue = {
  scope: string;
  message: string;
};

type Article = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
};

type Note = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

type Bookmark = {
  title: string;
  url: string;
  description: string;
  tags: string[];
  author?: string;
  category?: string;
  format?: string;
};

type Learning = {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  tags: string[];
  date: string;
};

const root = process.cwd();
const issues: Issue[] = [];

function readJsonArray<T>(relativePath: string): T[] {
  const fullPath = path.join(root, relativePath);
  try {
    const parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }

    issues.push({
      scope: relativePath,
      message: 'expected top-level JSON array',
    });
  } catch (error) {
    issues.push({
      scope: relativePath,
      message: `failed to parse JSON: ${String(error)}`,
    });
  }

  return [];
}

function requireText(scope: string, value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  issues.push({ scope, message: `missing ${field}` });
  return '';
}

function requireArray(scope: string, value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  issues.push({ scope, message: `${field} must be an array` });
  return [];
}

function assertUnique(scope: string, values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) {
      issues.push({ scope, message: `duplicate ${label}: ${value}` });
    }
    seen.add(value);
  }
}

const articles = readJsonArray<Article>('src/assets/static/json/articles.json');
const notes = readJsonArray<Note>('src/assets/static/json/notes.json');
const bookmarks = readJsonArray<Bookmark>('src/assets/static/json/resources.json');
const learnings = readJsonArray<Learning>('src/assets/static/json/learnings.json');

articles.forEach((article, index) => {
  const scope = `articles[${index}]`;
  requireText(scope, article.slug, 'slug');
  requireText(scope, article.title, 'title');
  requireText(scope, article.excerpt, 'excerpt');
  requireText(scope, article.readTime, 'readTime');
  requireText(scope, article.date, 'date');
});
assertUnique('articles', articles.map((article) => article.slug), 'slug');

notes.forEach((note, index) => {
  const scope = `notes[${index}]`;
  requireText(scope, note.slug, 'slug');
  requireText(scope, note.title, 'title');
  requireText(scope, note.excerpt, 'excerpt');
  requireText(scope, note.date, 'date');
});
assertUnique('notes', notes.map((note) => note.slug), 'slug');

bookmarks.forEach((bookmark, index) => {
  const scope = `resources[${index}]`;
  requireText(scope, bookmark.title, 'title');
  const url = requireText(scope, bookmark.url, 'url');
  requireText(scope, bookmark.description, 'description');
  requireArray(scope, bookmark.tags, 'tags');
  if (url) {
    try {
      new URL(url);
    } catch {
      issues.push({ scope, message: `invalid url: ${url}` });
    }
  }
});
assertUnique('resources', bookmarks.map((bookmark) => bookmark.url), 'url');

learnings.forEach((learning, index) => {
  const scope = `learnings[${index}]`;
  requireText(scope, learning.id, 'id');
  requireText(scope, learning.question, 'question');
  requireText(scope, learning.answer, 'answer');
  requireArray(scope, learning.tags, 'tags');
  requireText(scope, learning.date, 'date');
});
assertUnique('learnings', learnings.map((learning) => learning.id), 'id');

const searchItems = buildSearchItems();

searchItems.forEach((item) => {
  const scope = `${item.type}:${item.slug}`;
  if (!item.title?.trim()) {
    issues.push({ scope, message: 'search item missing title' });
  }
  if (!item.path?.trim()) {
    issues.push({ scope, message: 'search item missing path' });
  }
  if (!item.searchText?.trim()) {
    issues.push({ scope, message: 'search item missing searchable text' });
  }
});

assertUnique(
  'search',
  searchItems.filter((item) => item.path.startsWith('/')).map((item) => item.path),
  'internal path'
);

if (issues.length > 0) {
  console.error('Content/search validation failed:');
  for (const issue of issues) {
    console.error(`- ${issue.scope}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  [
    'Content/search validation passed:',
    `${articles.length} articles`,
    `${notes.length} notes`,
    `${bookmarks.length} bookmarks`,
    `${learnings.length} learnings`,
    `${searchItems.length} search items`,
  ].join(' ')
);
