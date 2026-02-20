'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import learningsData from '@/assets/static/json/learnings.json';
import { useMemo, useState, memo } from 'react';
import { formatDate } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { FiSearch } from 'react-icons/fi';

interface Learning {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  codeLanguage?: string;
  tags?: string[];
  date: string;
}

export default function Learnings() {
  const learnings = learningsData as Learning[];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const dateGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = learnings.filter((learning) => {
      const tags = learning.tags || [];
      const matchesTags = selectedTags.every((tag) => tags.includes(tag));
      if (!matchesTags) return false;
      if (!q) return true;

      const haystack = [
        learning.question,
        learning.answer,
        learning.codeSnippet || '',
        tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    // Sort by date descending
    const sorted = filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Group by date
    const grouped = sorted.reduce(
      (acc, learning) => {
        if (!acc[learning.date]) {
          acc[learning.date] = [];
        }
        acc[learning.date].push(learning);
        return acc;
      },
      {} as Record<string, Learning[]>
    );

    return Object.entries(grouped);
  }, [learnings, query, selectedTags]);

  const addTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <main className="w-full overflow-hidden dark:text-white text-gray-900">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Learnings
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl dark:text-gray-400 text-gray-600 -tracking-wide font-light sm:ml-4 mb-20">
              Daily tidbits and small discoveries.
            </p>

            <div className="mb-12 max-w-xl">
              <div className="rounded-full border dark:border-gray-800/80 border-gray-300/80 dark:bg-transparent bg-transparent px-4 h-11 flex items-center gap-3">
                <FiSearch
                  size={14}
                  className="dark:text-gray-500 text-gray-500 flex-shrink-0"
                />
                <input
                  type="text"
                  placeholder="Search learnings..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-full w-full bg-transparent outline-none border-0 text-sm placeholder:dark:text-gray-500 placeholder:text-gray-500 dark:text-gray-200 text-gray-800"
                />
                {(selectedTags.length > 0 || query.trim().length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTags([]);
                      setQuery('');
                    }}
                    className="text-xs dark:text-gray-500 text-gray-500 whitespace-nowrap hover:dark:text-gray-300 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-xs px-3 py-1 rounded-full border dark:border-gray-700 border-gray-300 dark:bg-gray-800 bg-gray-200 dark:text-gray-300 text-gray-700"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-12">
              {dateGroups.length > 0 ? (
                dateGroups.map(([date, learnings], groupIndex) => (
                  <DateGroup
                    key={date}
                    date={date}
                    learnings={learnings}
                    groupIndex={groupIndex}
                    onTagClick={addTag}
                  />
                ))
              ) : (
                <p className="dark:text-gray-500 text-gray-600 text-sm py-8">
                  No learnings match those tags.
                </p>
              )}
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function DateGroup({
  date,
  learnings,
  groupIndex,
  onTagClick,
}: {
  date: string;
  learnings: Learning[];
  groupIndex: number;
  onTagClick: (tag: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      style={{
        opacity: isInView ? 1 : 0,
        transition: `opacity 0.6s ease-out ${groupIndex * 0.1}s`,
      }}
    >
      <div className="sticky top-24 z-10 py-2 backdrop-blur-sm bg-white/80 dark:bg-black/80">
        <span className="dark:text-gray-500 text-gray-500 text-xs font-mono">
          {formatDate(date)}
        </span>
      </div>
      <div className="space-y-6 mt-4">
        {learnings.map((learning, index) => (
          <LearningCard
            key={learning.id}
            learning={learning}
            index={index}
            groupIndex={groupIndex}
            onTagClick={onTagClick}
          />
        ))}
      </div>
    </div>
  );
}

function LearningCard({
  learning,
  index,
  groupIndex,
  onTagClick,
}: {
  learning: Learning;
  index: number;
  groupIndex: number;
  onTagClick: (tag: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      className="border-l-2 dark:border-gray-700 border-gray-300 pl-6"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 0.6s ease-out ${groupIndex * 0.1 + index * 0.05}s, transform 0.6s ease-out ${groupIndex * 0.1 + index * 0.05}s`,
      }}
    >
      <h3 className="text-lg font-medium mb-3 dark:text-white text-gray-900">
        {learning.question}
      </h3>
      <div className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{learning.answer}</ReactMarkdown>
      </div>

      {learning.codeSnippet && (
        <div className="mt-4 bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm font-mono dark:text-gray-300 text-gray-800">
            <code>{learning.codeSnippet}</code>
          </pre>
        </div>
      )}

      {learning.tags && learning.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {learning.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="text-xs px-2 py-1 rounded-full dark:bg-gray-800 bg-gray-200 dark:text-gray-400 text-gray-600 hover:dark:text-gray-200 hover:text-gray-900 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
