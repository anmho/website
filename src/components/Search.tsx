'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch } from 'react-icons/fi';
import articlesData from '@/assets/static/json/articles.json';
import notesData from '@/assets/static/json/notes.json';

interface SearchItem {
  slug: string;
  title: string;
  excerpt: string;
  type: 'article' | 'note';
  date: string;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Combine articles and notes into searchable items
  const allItems: SearchItem[] = useMemo(() => [
    ...articlesData.map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      type: 'article' as const,
      date: article.date,
    })),
    ...notesData.map((note) => ({
      slug: note.slug,
      title: note.title,
      excerpt: note.excerpt,
      type: 'note' as const,
      date: note.date,
    })),
  ], []);

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
    router.push(`/${item.type}s/${item.slug}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay with animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette with refined glass effect */}
          <div className="fixed inset-0 flex items-start justify-center pt-32 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.8,
              }}
              className="w-full max-w-2xl mx-4 pointer-events-auto"
            >
              <Command 
                className="bg-gray-900/95 border border-gray-800 rounded-xl shadow-2xl overflow-hidden"
                filter={(value, search) => {
                  const item = allItems.find((i) => 
                    `${i.type}-${i.slug}` === value
                  );
                  if (!item) return 0;
                  const titleMatch = item.title.toLowerCase().includes(search.toLowerCase());
                  const excerptMatch = item.excerpt.toLowerCase().includes(search.toLowerCase());
                  if (titleMatch) return 2;
                  if (excerptMatch) return 1;
                  return 0;
                }}
              >
                  <div className="flex items-center px-4 py-3 border-b border-gray-800">
                    <FiSearch className="text-gray-400 mr-3 flex-shrink-0" size={18} />
                    <Command.Input
                      placeholder="Search articles and notes..."
                      className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-base font-normal"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 bg-gray-800 border border-gray-700 rounded">
                      ESC
                    </kbd>
                  </div>
                  <Command.List className="max-h-[28rem] overflow-y-auto p-2">
                    <Command.Empty className="px-4 py-12 text-center text-gray-400 text-sm">
                      No results found.
                    </Command.Empty>
                    <Command.Group>
                      {allItems.map((item) => (
                        <Command.Item
                          key={`${item.type}-${item.slug}`}
                          value={`${item.type}-${item.slug}`}
                          onSelect={() => handleSelect(item)}
                          className="px-3 py-2.5 rounded-lg cursor-pointer data-[selected]:bg-gray-800 data-[selected]:text-white text-white hover:bg-gray-800/50 transition-all duration-150 my-0.5"
                        >
                          <div className="flex items-start justify-between w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                                  {item.type}
                                </span>
                                <span className="font-medium text-sm truncate">{item.title}</span>
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {item.excerpt}
                              </p>
                            </div>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </Command.List>
                </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
