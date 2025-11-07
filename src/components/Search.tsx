'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import articlesData from '@/assets/static/json/articles.json';
import notesData from '@/assets/static/json/notes.json';

interface SearchItem {
  slug: string;
  title: string;
  excerpt?: string;
  type: 'article' | 'note' | 'page';
  date?: string;
  path: string;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const router = useRouter();

  // Combine articles, notes, and pages into searchable items
  const allItems: SearchItem[] = useMemo(
    () => [
      // Pages
      {
        slug: 'articles',
        title: 'Articles',
        excerpt: 'In-depth articles on building scalable systems',
        type: 'page' as const,
        path: '/articles',
      },
      {
        slug: 'notes',
        title: 'Notes',
        excerpt: 'Quick thoughts, learnings, and observations',
        type: 'page' as const,
        path: '/notes',
      },
      {
        slug: 'projects',
        title: 'Projects',
        excerpt: 'A collection of projects showcasing my work',
        type: 'page' as const,
        path: '/projects',
      },
      {
        slug: 'about',
        title: 'About',
        excerpt: 'Learn more about me and get in touch',
        type: 'page' as const,
        path: '/about',
      },
      // Articles
      ...articlesData.map((article) => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        type: 'article' as const,
        date: article.date,
        path: `/articles/${article.slug}`,
      })),
      // Notes
      ...notesData.map((note) => ({
        slug: note.slug,
        title: note.title,
        excerpt: note.excerpt,
        type: 'note' as const,
        date: note.date,
        path: `/notes/${note.slug}`,
      })),
    ],
    []
  );

  // Handle blur effect delay
  useEffect(() => {
    if (open) {
      // Delay blur to avoid pop-in after animation
      const timer = setTimeout(() => {
        setShowBlur(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setShowBlur(false);
    }
  }, [open]);

  // Handle CMD+K / CTRL+K shortcut and ESC
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  const handleSelect = (item: SearchItem) => {
    setOpen(false);
    router.push(item.path);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay with refined blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed inset-0 z-50 backdrop-blur-md',
              'dark:bg-black/50 bg-black/30'
            )}
            onClick={() => setOpen(false)}
          />

          {/* Command Palette with Apple-esque design */}
          <div className="fixed inset-0 flex items-start justify-center pt-32 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.5,
              }}
              className="w-full max-w-2xl mx-4 pointer-events-auto"
            >
              <div
                className={cn(
                  'overflow-hidden flex flex-col',
                  showBlur && 'backdrop-blur-xl',
                  'dark:bg-gray-900/80 bg-white/90',
                  'dark:border-gray-700/50 border-gray-200/50',
                  'rounded-2xl border shadow-2xl',
                  'dark:shadow-black/50 shadow-black/10',
                  'transition-[backdrop-filter] duration-200'
                )}
              >
                <Command
                  className={cn('overflow-hidden flex flex-col')}
                  filter={(value, search) => {
                    const item = allItems.find(
                      (i) => `${i.type}-${i.slug}` === value
                    );
                    if (!item) return 0;
                    const titleMatch = item.title
                      .toLowerCase()
                      .includes(search.toLowerCase());
                    const excerptMatch = item.excerpt
                      ?.toLowerCase()
                      .includes(search.toLowerCase());
                    if (titleMatch) return 2;
                    if (excerptMatch) return 1;
                    return 0;
                  }}
                >
                  <div
                    className={cn(
                      'flex items-center px-5 py-4 flex-shrink-0',
                      'dark:border-gray-700/30 border-gray-200/50 border-b'
                    )}
                  >
                    <FiSearch
                      className={cn(
                        'mr-3 flex-shrink-0',
                        'dark:text-gray-400 text-gray-500'
                      )}
                      size={18}
                    />
                    <Command.Input
                      placeholder="Search articles, notes, and pages..."
                      className={cn(
                        'flex-1 bg-transparent outline-none text-base font-normal',
                        'dark:text-white text-gray-900',
                        'dark:placeholder-gray-500 placeholder-gray-400'
                      )}
                    />
                    <kbd
                      className={cn(
                        'hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md',
                        'dark:text-gray-400 text-gray-500',
                        'dark:bg-gray-800/50 bg-gray-100/80',
                        'dark:border-gray-700/50 border-gray-200/50 border'
                      )}
                    >
                      ESC
                    </kbd>
                  </div>
                  <Command.List
                    className={cn(
                      'max-h-[32rem] overflow-y-auto overflow-x-hidden p-2',
                      'flex-1 min-h-0'
                    )}
                  >
                    <Command.Empty
                      className={cn(
                        'px-4 py-12 text-center text-sm',
                        'dark:text-gray-500 text-gray-500'
                      )}
                    >
                      No results found.
                    </Command.Empty>
                    <Command.Group>
                      {allItems.map((item) => (
                        <Command.Item
                          key={`${item.type}-${item.slug}`}
                          value={`${item.type}-${item.slug}`}
                          onSelect={() => handleSelect(item)}
                          className={cn(
                            'px-4 py-3 rounded-xl cursor-pointer transition-all duration-200',
                            'dark:text-white text-gray-900',
                            'dark:data-[selected]:bg-gray-800/60 data-[selected]:bg-gray-100/80',
                            'dark:hover:bg-gray-800/40 hover:bg-gray-100/60',
                            'my-1'
                          )}
                        >
                          <div className="flex items-start justify-between w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <span
                                  className={cn(
                                    'text-xs font-mono uppercase tracking-wider',
                                    'dark:text-gray-500 text-gray-400'
                                  )}
                                >
                                  {item.type}
                                </span>
                                <span className="font-medium text-sm truncate">
                                  {item.title}
                                </span>
                              </div>
                              {item.excerpt && (
                                <p
                                  className={cn(
                                    'text-xs line-clamp-1',
                                    'dark:text-gray-400 text-gray-500'
                                  )}
                                >
                                  {item.excerpt}
                                </p>
                              )}
                            </div>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </Command.List>
                </Command>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
