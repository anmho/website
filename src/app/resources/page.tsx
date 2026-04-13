'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import resourcesData from '@/assets/static/json/resources.json';
import { FiExternalLink, FiSearch } from 'react-icons/fi';
import { cn } from '@/lib/utils';

type Bookmark = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

const TAG_LIMIT = 24;

export default function BookmarksPage() {
  const [resources, setResources] = useState<Bookmark[]>(resourcesData as Bookmark[]);
  const [activeTag, setActiveTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/resources', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { resources?: Bookmark[] };
        if (alive && Array.isArray(data.resources)) {
          setResources(data.resources);
        }
      } catch {
        // Keep static fallback if API fetch fails.
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const tagFrequencies = useMemo(() => {
    const freq = new Map<string, number>();
    resources.forEach((r) => r.tags.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1)));
    return freq;
  }, [resources]);

  const allTagsSorted = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort((a, b) => (tagFrequencies.get(b) ?? 0) - (tagFrequencies.get(a) ?? 0));
  }, [resources, tagFrequencies]);

  const visibleTags = showAllTags ? allTagsSorted : allTagsSorted.slice(0, TAG_LIMIT);
  const hiddenCount = allTagsSorted.length - TAG_LIMIT;

  const filteredBookmarks = useMemo(() => {
    return resources.filter((resource) => {
      const matchesTag =
        activeTag === 'All' || resource.tags.includes(activeTag);
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        resource.title.toLowerCase().includes(normalizedQuery) ||
        resource.description.toLowerCase().includes(normalizedQuery) ||
        resource.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedQuery)
        );

      return matchesTag && matchesQuery;
    });
  }, [resources, activeTag, searchQuery]);

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Bookmarks
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl text-gray-600 dark:text-gray-400 -tracking-wide font-light sm:ml-4 mb-12">
              A curated library of the articles, guides, and talks I keep
              reaching for when I need inspiration or a refresher.
            </p>

            <div className="mb-12">
              <div className="rounded-full border dark:border-gray-800/80 border-gray-300/80 px-4 h-11 flex items-center gap-3 max-w-xl mb-6">
                <FiSearch size={14} className="dark:text-gray-500 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by title, topic, or tag"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-full w-full bg-transparent outline-none border-0 text-sm placeholder:dark:text-gray-500 placeholder:text-gray-500 dark:text-gray-200 text-gray-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs dark:text-gray-500 text-gray-500 whitespace-nowrap hover:dark:text-gray-300 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTag('All')}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded border transition-colors',
                    activeTag === 'All'
                      ? 'dark:border-gray-500 border-gray-400 dark:text-gray-100 text-gray-900'
                      : 'dark:border-gray-800 border-gray-200 dark:text-gray-500 text-gray-500 hover:dark:border-gray-600 hover:border-gray-400 hover:dark:text-gray-300 hover:text-gray-700'
                  )}
                >
                  All
                </button>
                {visibleTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border transition-colors',
                      activeTag === tag
                        ? 'dark:border-gray-500 border-gray-400 dark:text-gray-100 text-gray-900'
                        : 'dark:border-gray-800 border-gray-200 dark:text-gray-500 text-gray-500 hover:dark:border-gray-600 hover:border-gray-400 hover:dark:text-gray-300 hover:text-gray-700'
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {!showAllTags && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags(true)}
                    className="text-xs px-2 py-0.5 dark:text-gray-600 text-gray-400 hover:dark:text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {showAllTags && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags(false)}
                    className="text-xs px-2 py-0.5 dark:text-gray-600 text-gray-400 hover:dark:text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Show less
                  </button>
                )}
              </div>

              <p className="text-xs dark:text-gray-600 text-gray-400">
                {filteredBookmarks.length} of {resources.length} resources
              </p>
            </div>

            {filteredBookmarks.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-500 text-sm py-12">
                Nothing matches that search. Try a different topic or reset the filters.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-900/80">
                {filteredBookmarks.map((resource) => (
                  <article
                    key={resource.title}
                    className="py-8"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="uppercase text-[10px] tracking-widest text-gray-400 dark:text-gray-600 mb-1.5">
                          {resource.format}
                        </p>
                        <h2 className="text-lg sm:text-xl font-medium mb-1.5 leading-snug">
                          {resource.title}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                          {resource.description}
                        </p>
                      </div>

                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-1"
                        aria-label={`Visit ${resource.title}`}
                      >
                        <FiExternalLink size={15} />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4">
                      <span className="text-xs dark:text-gray-600 text-gray-400">{resource.author}</span>
                      {resource.tags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setActiveTag(tag)}
                          className="text-[11px] dark:text-gray-700 text-gray-400 hover:dark:text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
