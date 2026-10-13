import { NextResponse } from 'next/server';
import { listAllContent } from '@/lib/contentDb';
import { listBookmarksFromDb } from '@/lib/bookmarksDb';

export const runtime = 'nodejs';

type SearchItem = {
  slug: string;
  title: string;
  excerpt?: string;
  type: 'article' | 'note' | 'page' | 'bookmark' | 'learning' | 'lesson' | 'reading' | 'watch';
  date?: string;
  path: string;
  external?: boolean;
  searchText: string;
};

const pages: SearchItem[] = [
  { slug: 'articles', title: 'Articles', excerpt: 'In-depth articles on building scalable systems', type: 'page', path: '/articles', searchText: 'articles in-depth articles on building scalable systems' },
  { slug: 'notes', title: 'Notes', excerpt: 'Quick thoughts, learnings, and observations', type: 'page', path: '/notes', searchText: 'notes quick thoughts learnings and observations' },
  { slug: 'learnings', title: 'Learnings', excerpt: 'Daily tidbits and small discoveries', type: 'page', path: '/learnings', searchText: 'learnings daily tidbits and small discoveries' },
  { slug: 'lessons', title: 'Lessons', excerpt: 'A personal reminder of timeless lessons', type: 'page', path: '/lessons', searchText: 'lessons a personal reminder of timeless lessons' },
  { slug: 'readings', title: 'Readings', excerpt: 'Books, papers, and essays worth returning to', type: 'page', path: '/readings', searchText: 'readings books papers and essays worth returning to' },
  { slug: 'watch', title: 'Watch', excerpt: 'Movies and videos worth spending time with', type: 'page', path: '/watch', searchText: 'watch movies and videos worth spending time with' },
  { slug: 'resources', title: 'Bookmarks', excerpt: 'Saved articles, guides, talks, and references', type: 'page', path: '/resources', searchText: 'bookmarks saved articles guides talks and references resources' },
  { slug: 'projects', title: 'Projects', excerpt: 'A collection of projects showcasing my work', type: 'page', path: '/projects', searchText: 'projects a collection of projects showcasing my work' },
  { slug: 'about', title: 'About', excerpt: 'Learn more about me and get in touch', type: 'page', path: '/about', searchText: 'about learn more about me and get in touch' },
];

function contentPath(type: SearchItem['type'], slug: string): string {
  const route = type === 'article' ? 'articles' : type === 'note' ? 'notes' : type === 'learning' ? 'learnings' : `${type}s`;
  return `/${route}/${slug}`;
}

export async function GET() {
  try {
    const [records, bookmarks] = await Promise.all([
      listAllContent(),
      listBookmarksFromDb(),
    ]);

    const contentItems = records.map((record): SearchItem => ({
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      type: record.contentType,
      date: record.date,
      path: record.contentType === 'learning'
        ? `/learnings?q=${encodeURIComponent(record.title)}#${record.slug}`
        : contentPath(record.contentType, record.slug),
      searchText: [record.title, record.excerpt, record.body, ...record.tags].join(' ').toLowerCase(),
    }));

    const bookmarkItems = bookmarks.map((bookmark, index): SearchItem => ({
      slug: `${index}-${bookmark.url}`,
      title: bookmark.title,
      excerpt: [bookmark.description, bookmark.author, bookmark.category, bookmark.format, ...bookmark.tags].join(' '),
      type: 'bookmark',
      path: bookmark.url,
      external: true,
      searchText: [bookmark.title, bookmark.description, bookmark.author, bookmark.category, bookmark.format, ...bookmark.tags].join(' ').toLowerCase(),
    }));

    return NextResponse.json({ items: [...pages, ...contentItems, ...bookmarkItems] });
  } catch (error) {
    return NextResponse.json({ error: `database unavailable: ${String(error)}` }, { status: 500 });
  }
}
