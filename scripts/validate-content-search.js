const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const issues = [];

function issue(scope, message) {
  issues.push({ scope, message });
}

function readJsonArray(scope, relPath) {
  const fullPath = path.join(root, relPath);

  try {
    const value = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!Array.isArray(value)) {
      issue(scope, `${relPath}: expected an array`);
      return [];
    }
    return value;
  } catch (error) {
    issue(scope, `${relPath}: ${error.message}`);
    return [];
  }
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validateUnique(scope, items, field) {
  const seen = new Map();

  items.forEach((item, index) => {
    const value = item[field];
    if (!hasText(value)) {
      return;
    }

    if (seen.has(value)) {
      issue(scope, `${scope}[${index}]: duplicate ${field} ${value}`);
      return;
    }

    seen.set(value, index);
  });
}

function validateRequiredText(scope, item, index, fields) {
  fields.forEach((field) => {
    if (!hasText(item[field])) {
      issue(scope, `${scope}[${index}]: missing ${field}`);
    }
  });
}

function validateLearnings(learnings) {
  validateUnique('learnings', learnings, 'id');

  learnings.forEach((learning, index) => {
    validateRequiredText('learnings', learning, index, [
      'id',
      'question',
      'answer',
      'date',
    ]);

    if (!Array.isArray(learning.tags) || learning.tags.length === 0) {
      issue('learnings', `learnings[${index}]: missing tags`);
    }

    if (!isISODate(learning.date)) {
      issue('learnings', `learnings[${index}]: invalid date`);
    }
  });
}

function validateArticles(articles) {
  validateUnique('articles', articles, 'slug');

  articles.forEach((article, index) => {
    validateRequiredText('articles', article, index, [
      'slug',
      'title',
      'excerpt',
      'readTime',
      'date',
    ]);

    if (!isISODate(article.date)) {
      issue('articles', `articles[${index}]: invalid date`);
    }

    if (hasText(article.slug)) {
      const relPath = `src/assets/content/articles/${article.slug}.md`;
      if (!fs.existsSync(path.join(root, relPath))) {
        issue('articles', `missing markdown file: ${relPath}`);
      }
    }
  });
}

function validateNotes(notes) {
  validateUnique('notes', notes, 'slug');

  notes.forEach((note, index) => {
    validateRequiredText('notes', note, index, [
      'slug',
      'title',
      'excerpt',
      'readTime',
      'date',
    ]);

    if (!isISODate(note.date)) {
      issue('notes', `notes[${index}]: invalid date`);
    }
  });
}

function validateSearchItems(articles, notes) {
  const staticPages = [
    {
      slug: 'articles',
      title: 'Articles',
      excerpt: 'In-depth articles on building scalable systems',
      type: 'page',
      path: '/articles',
    },
    {
      slug: 'notes',
      title: 'Notes',
      excerpt: 'Quick thoughts, learnings, and observations',
      type: 'page',
      path: '/notes',
    },
    {
      slug: 'projects',
      title: 'Projects',
      excerpt: 'A collection of projects showcasing my work',
      type: 'page',
      path: '/projects',
    },
    {
      slug: 'about',
      title: 'About',
      excerpt: 'Learn more about me and get in touch',
      type: 'page',
      path: '/about',
    },
  ];

  const searchItems = [
    ...staticPages,
    ...articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      type: 'article',
      date: article.date,
      path: `/articles/${article.slug}`,
    })),
    ...notes.map((note) => ({
      slug: note.slug,
      title: note.title,
      excerpt: note.excerpt,
      type: 'note',
      date: note.date,
      path: `/notes/${note.slug}`,
    })),
  ];

  const paths = new Map();

  searchItems.forEach((item, index) => {
    validateRequiredText('search', item, index, ['slug', 'title', 'path']);

    if (!['article', 'note', 'page'].includes(item.type)) {
      issue('search', `search[${index}]: invalid type ${item.type}`);
    }

    if (hasText(item.path) && !item.path.startsWith('/')) {
      issue('search', `search[${index}]: path must start with /`);
    }

    if (hasText(item.path)) {
      if (paths.has(item.path)) {
        issue('search', `search[${index}]: duplicate path ${item.path}`);
      } else {
        paths.set(item.path, index);
      }
    }
  });

  return searchItems.length;
}

const learnings = readJsonArray('learnings', 'src/assets/static/json/learnings.json');
const articles = readJsonArray('articles', 'src/assets/static/json/articles.json');
const notes = readJsonArray('notes', 'src/assets/static/json/notes.json');

validateLearnings(learnings);
validateArticles(articles);
validateNotes(notes);
const searchCount = validateSearchItems(articles, notes);

if (issues.length > 0) {
  console.error('Content/search validation failed:');
  issues.forEach(({ scope, message }) => {
    console.error(`- ${scope}: ${message}`);
  });
  process.exit(1);
}

console.log(
  `Content/search validation passed (${learnings.length} learnings, ${articles.length} articles, ${notes.length} notes, ${searchCount} search items).`
);
