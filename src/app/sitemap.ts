import type { MetadataRoute } from 'next';
import articlesData from '@/assets/static/json/articles.json';
import notesData from '@/assets/static/json/notes.json';
import { absoluteUrl } from '@/lib/site';

type DatedEntry = { slug?: string; id?: string; date?: string };

const sectionPages = [
  { path: '/', priority: 1 },
  { path: '/about', priority: 0.8 },
  { path: '/articles', priority: 0.9 },
  { path: '/notes', priority: 0.8 },
  { path: '/learnings', priority: 0.7 },
  { path: '/tenets', priority: 0.8 },
  { path: '/goals', priority: 0.8 },
  { path: '/readings', priority: 0.6 },
  { path: '/watch', priority: 0.6 },
  { path: '/resources', priority: 0.6 },
  { path: '/projects', priority: 0.7 },
] as const;

function entryUrl(directory: string, entry: DatedEntry) {
  const slug = entry.slug || entry.id;
  return slug ? `/${directory}/${slug}` : null;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = sectionPages.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency: 'weekly' as const,
    priority,
  }));

  const articles = (articlesData as DatedEntry[]).flatMap((article) => {
    const path = entryUrl('articles', article);
    return path
      ? [{ url: absoluteUrl(path), lastModified: article.date, changeFrequency: 'monthly' as const, priority: 0.7 }]
      : [];
  });

  const notes = (notesData as DatedEntry[]).flatMap((note) => {
    const path = entryUrl('notes', note);
    return path
      ? [{ url: absoluteUrl(path), lastModified: note.date, changeFrequency: 'monthly' as const, priority: 0.6 }]
      : [];
  });

  return [...pages, ...articles, ...notes];
}
