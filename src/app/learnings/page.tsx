'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import learningsData from '@/assets/static/json/learnings.json';
import { useMemo, useState, memo } from 'react';
import { formatDate } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { FiSearch } from 'react-icons/fi';

// Module-level cache for parsed markdown (persists across renders)
const markdownCache = new Map<string, React.ReactNode>();

function normalizeEscapedNewlines(text: string): string {
  return text.replace(/\\n/g, '\n');
}

function CachedMarkdown({ id, content }: { id: string; content: string }) {
  const normalized = normalizeEscapedNewlines(content);
  const cacheKey = `${id}:${normalized}`;
  if (!markdownCache.has(cacheKey)) {
    markdownCache.set(cacheKey, <ReactMarkdown>{normalized}</ReactMarkdown>);
  }
  return <>{markdownCache.get(cacheKey)}</>;
}

function InlineCodeTitle({ content }: { content: string }) {
  const normalized = normalizeEscapedNewlines(content);
  const parts = normalized.split(/`([^`]+)`/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={`${part}-${index}`}
            className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono"
          >
            {part}
          </code>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

interface Learning {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  codeLanguage?: string;
  tags?: string[];
  date: string;
}

function parseIsoDayUtc(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day))
    return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Date.UTC(year, month - 1, day);
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
        normalizeEscapedNewlines(learning.answer),
        normalizeEscapedNewlines(learning.codeSnippet || ''),
        tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    // Validate and sort dates strictly (YYYY-MM-DD) in descending order.
    const dated = filtered
      .map((learning) => ({ learning, ts: parseIsoDayUtc(learning.date) }))
      .filter((item): item is { learning: Learning; ts: number } => item.ts !== null)
      .sort((a, b) => b.ts - a.ts);

    const grouped = new Map<string, Learning[]>();
    for (const { learning } of dated) {
      const existing = grouped.get(learning.date);
      if (existing) {
        existing.push(learning);
      } else {
        grouped.set(learning.date, [learning]);
      }
    }

    return Array.from(grouped.entries()).sort((a, b) => {
      const aTs = parseIsoDayUtc(a[0]) ?? 0;
      const bTs = parseIsoDayUtc(b[0]) ?? 0;
      return bTs - aTs;
    });
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

const DateGroup = memo(function DateGroup({
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
  return (
    <div
      style={{
        opacity: 1,
        transition: `opacity 0.2s ease-out ${groupIndex * 0.02}s`,
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
});

const LearningCard = memo(function LearningCard({
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
  return (
    <div
      className="border-l-2 dark:border-gray-700 border-gray-300 pl-6"
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: `opacity 0.2s ease-out ${groupIndex * 0.02 + index * 0.01}s`,
      }}
    >
      <h3 className="text-lg font-medium mb-3 dark:text-white text-gray-900">
        <InlineCodeTitle content={learning.question} />
      </h3>
      <div className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
        <CachedMarkdown id={learning.id} content={learning.answer} />
      </div>

      {learning.codeSnippet && (
        <div className="mt-4 bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm font-mono dark:text-gray-300 text-gray-800">
            <code>{normalizeEscapedNewlines(learning.codeSnippet)}</code>
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
});
