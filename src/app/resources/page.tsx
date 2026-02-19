'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import resourcesData from '@/assets/static/json/resources.json';
import { Input } from '@/components/ui/input';
import { FiExternalLink } from 'react-icons/fi';
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

export default function BookmarksPage() {
  const resources = resourcesData as Bookmark[];
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(resources.map((r) => r.category)))],
    [resources]
  );

  const filteredBookmarks = useMemo(() => {
    return resources.filter((resource) => {
      const matchesCategory =
        activeCategory === 'All' || resource.category === activeCategory;
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        resource.title.toLowerCase().includes(normalizedQuery) ||
        resource.description.toLowerCase().includes(normalizedQuery) ||
        resource.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesQuery;
    });
  }, [resources, activeCategory, searchQuery]);

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

            <div className="bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 mb-16 shadow-lg shadow-gray-200/30 dark:shadow-black/20">
              <div className="flex flex-col gap-5">
                <Input
                  type="text"
                  placeholder="Search by title, topic, or tag"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-2xl border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/30 text-base"
                />

                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                        activeCategory === category
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                          : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredBookmarks.length} of {resources.length}{' '}
                  resources
                </div>
              </div>
            </div>

            {filteredBookmarks.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-12">
                Nothing matches that search just yet. Try a different topic or
                reset the filters.
              </div>
            ) : (
              <div className="grid gap-6 sm:gap-8">
                {filteredBookmarks.map((resource) => (
                  <article
                    key={resource.title}
                    className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-black/40 p-6 sm:p-8 shadow-lg shadow-gray-200/40 dark:shadow-black/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div>
                        <p className="uppercase text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                          {resource.format}
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">
                          {resource.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg leading-relaxed">
                          {resource.description}
                        </p>
                      </div>

                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-900/40 transition-all group"
                        aria-label={`Visit ${resource.title}`}
                      >
                        <FiExternalLink
                          size={16}
                          className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4 mt-6">
                      <span>{resource.author}</span>
                      <span className="hidden sm:inline-block">•</span>
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-900 text-xs uppercase tracking-wide">
                        {resource.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                      {resource.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/30"
                        >
                          {tag}
                        </span>
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
