import articlesData from '../assets/static/json/articles.json';
import notesData from '../assets/static/json/notes.json';
import resourcesData from '../assets/static/json/resources.json';
import learningsData from '../assets/static/json/learnings.json';

export type SearchItem = {
  slug: string;
  title: string;
  excerpt?: string;
  type: 'article' | 'note' | 'page' | 'bookmark' | 'learning';
  date?: string;
  path: string;
  external?: boolean;
  searchText: string;
};

type Article = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

type Note = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

type Bookmark = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

type Learning = {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  tags?: string[];
  date: string;
};

function buildSearchParam(value: string) {
  return encodeURIComponent(value);
}

function normalizeSearchText(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ').toLowerCase();
}

export function buildSearchItems(): SearchItem[] {
  return [
    {
      slug: 'articles',
      title: 'Articles',
      excerpt: 'In-depth articles on building scalable systems',
      type: 'page',
      path: '/articles',
      searchText: normalizeSearchText(
        'Articles',
        'In-depth articles on building scalable systems'
      ),
    },
    {
      slug: 'notes',
      title: 'Notes',
      excerpt: 'Quick thoughts, learnings, and observations',
      type: 'page',
      path: '/notes',
      searchText: normalizeSearchText(
        'Notes',
        'Quick thoughts, learnings, and observations'
      ),
    },
    {
      slug: 'resources',
      title: 'Bookmarks',
      excerpt: 'Saved articles, guides, talks, and references',
      type: 'page',
      path: '/resources',
      searchText: normalizeSearchText(
        'Bookmarks',
        'Saved articles, guides, talks, and references',
        'resources'
      ),
    },
    {
      slug: 'learnings',
      title: 'Learnings',
      excerpt: 'Daily tidbits and small discoveries',
      type: 'page',
      path: '/learnings',
      searchText: normalizeSearchText(
        'Learnings',
        'Daily tidbits and small discoveries'
      ),
    },
    {
      slug: 'projects',
      title: 'Projects',
      excerpt: 'A collection of projects showcasing my work',
      type: 'page',
      path: '/projects',
      searchText: normalizeSearchText(
        'Projects',
        'A collection of projects showcasing my work'
      ),
    },
    {
      slug: 'about',
      title: 'About',
      excerpt: 'Learn more about me and get in touch',
      type: 'page',
      path: '/about',
      searchText: normalizeSearchText(
        'About',
        'Learn more about me and get in touch'
      ),
    },
    ...(articlesData as Article[]).map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      type: 'article' as const,
      date: article.date,
      path: `/articles/${article.slug}`,
      searchText: normalizeSearchText(article.title, article.excerpt),
    })),
    ...(notesData as Note[]).map((note) => ({
      slug: note.slug,
      title: note.title,
      excerpt: note.excerpt,
      type: 'note' as const,
      date: note.date,
      path: `/notes/${note.slug}`,
      searchText: normalizeSearchText(note.title, note.excerpt),
    })),
    ...(resourcesData as Bookmark[]).map((resource, index) => ({
      slug: `${index}-${resource.url}`,
      title: resource.title,
      excerpt: [
        resource.description,
        resource.author,
        resource.category,
        resource.format,
        ...resource.tags,
      ].join(' '),
      type: 'bookmark' as const,
      path: resource.url,
      external: true,
      searchText: normalizeSearchText(
        resource.title,
        resource.description,
        resource.author,
        resource.category,
        resource.format,
        ...resource.tags
      ),
    })),
    ...(learningsData as Learning[]).map((learning) => ({
      slug: learning.id,
      title: learning.question,
      excerpt: [
        learning.answer,
        learning.codeSnippet ?? '',
        ...(learning.tags ?? []),
      ].join(' '),
      type: 'learning' as const,
      date: learning.date,
      path: `/learnings?q=${buildSearchParam(learning.question)}#${learning.id}`,
      searchText: normalizeSearchText(
        learning.question,
        learning.answer,
        learning.codeSnippet,
        ...(learning.tags ?? [])
      ),
    })),
  ];
}
