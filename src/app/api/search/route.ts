import { NextResponse } from 'next/server';
import articlesData from '@/assets/static/json/articles.json';
import notesData from '@/assets/static/json/notes.json';
import learningsData from '@/assets/static/json/learnings.json';
import tenetsData from '@/assets/static/json/tenets.json';
import readingsData from '@/assets/static/json/readings.json';
import watchData from '@/assets/static/json/watch.json';
import resourcesData from '@/assets/static/json/resources.json';
import { isPrivateContent } from '@/lib/contentVisibility';

type SearchItem = {
  slug: string;
  title: string;
  excerpt?: string;
  type: 'article' | 'note' | 'page' | 'bookmark' | 'learning' | 'tenet' | 'reading' | 'watch';
  date?: string;
  path: string;
  external?: boolean;
  searchText: string;
};

type PostMetadata = {
  slug?: string;
  id?: string;
  title: string;
  question?: string;
  answer?: string;
  excerpt?: string;
  description?: string;
  category?: string;
  date?: string;
  body?: string;
  author?: string;
  source?: string;
  format?: string;
  url?: string;
  tags?: string[];
  codeSnippet?: string;
};

const pages: SearchItem[] = [
  { slug: 'articles', title: 'Articles', excerpt: 'In-depth articles on building scalable systems', type: 'page', path: '/articles', searchText: 'articles in-depth articles on building scalable systems' },
  { slug: 'notes', title: 'Notes', excerpt: 'Quick thoughts, learnings, and observations', type: 'page', path: '/notes', searchText: 'notes quick thoughts learnings and observations' },
  { slug: 'learnings', title: 'Learnings', excerpt: 'Daily tidbits and small discoveries', type: 'page', path: '/learnings', searchText: 'learnings daily tidbits and small discoveries' },
  { slug: 'tenets', title: 'Tenets', excerpt: 'Principles worth returning to', type: 'page', path: '/tenets', searchText: 'tenets principles worth returning to' },
  { slug: 'readings', title: 'Readings', excerpt: 'Books, papers, and essays worth returning to', type: 'page', path: '/readings', searchText: 'readings books papers and essays worth returning to' },
  { slug: 'watch', title: 'Watch', excerpt: 'Movies and videos worth spending time with', type: 'page', path: '/watch', searchText: 'watch movies and videos worth spending time with' },
  { slug: 'resources', title: 'Bookmarks', excerpt: 'Saved articles, guides, talks, and references', type: 'page', path: '/resources', searchText: 'bookmarks saved articles guides talks and references resources' },
  { slug: 'projects', title: 'Projects', excerpt: 'A collection of projects showcasing my work', type: 'page', path: '/projects', searchText: 'projects a collection of projects showcasing my work' },
  { slug: 'about', title: 'About', excerpt: 'Learn more about me and get in touch', type: 'page', path: '/about', searchText: 'about learn more about me and get in touch' },
];

function contentPath(type: Exclude<SearchItem['type'], 'page' | 'bookmark'>, slug: string): string {
  const route = type === 'article' ? 'articles' : type === 'note' ? 'notes' : type === 'learning' ? 'learnings' : `${type}s`;
  return `/${route}/${slug}`;
}

function postItem(
  type: Exclude<SearchItem['type'], 'page' | 'bookmark'>,
  post: PostMetadata
): SearchItem {
  const slug = post.slug || post.id || post.title;
  const title = post.title || post.question || '';
  const body = [post.body, post.answer, post.codeSnippet].filter(Boolean).join(' ');
  const excerpt = post.excerpt || post.answer || '';

  return {
    slug,
    title,
    excerpt,
    type,
    date: post.date,
    path: type === 'learning'
      ? `/learnings?q=${encodeURIComponent(title)}#${slug}`
      : contentPath(type, slug),
    searchText: [title, excerpt, body, post.author, post.source, post.format, ...(post.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

export function GET() {
  const contentItems = [
    ...(articlesData as PostMetadata[]).map((post) => postItem('article', post)),
    ...(notesData as PostMetadata[]).map((post) => postItem('note', post)),
    ...(learningsData as PostMetadata[]).map((post) => postItem('learning', post)),
    ...(tenetsData as PostMetadata[])
      .filter((post) => !isPrivateContent(post.tags))
      .map((post) => postItem('tenet', post)),
    ...(readingsData as PostMetadata[]).map((post) => postItem('reading', post)),
    ...(watchData as PostMetadata[]).map((post) => postItem('watch', post)),
  ];

  const bookmarks = (resourcesData as PostMetadata[]).map((bookmark, index): SearchItem => ({
    slug: `${index}-${bookmark.title}`,
    title: bookmark.title,
    excerpt: [bookmark.description, bookmark.author, bookmark.category, bookmark.format, ...(bookmark.tags || [])].filter(Boolean).join(' '),
    type: 'bookmark',
    path: bookmark.url || '',
    external: true,
    searchText: [bookmark.title, bookmark.description, bookmark.author, bookmark.category, bookmark.format, ...(bookmark.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }));

  return NextResponse.json({ items: [...pages, ...contentItems, ...bookmarks] });
}
