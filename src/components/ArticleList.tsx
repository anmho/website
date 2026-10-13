'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

export type ArticleListItem = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
};

export default function ArticleList({ articles }: { articles: ArticleListItem[] }) {
  return (
    <div className="space-y-1">
      {articles.length > 0 ? articles.map((article, index) => <ArticleItem key={article.slug} article={article} index={index} />) : <p className="dark:text-gray-500 text-gray-600 text-sm py-8">No articles yet.</p>}
    </div>
  );
}

function ArticleItem({ article, index }: { article: ArticleListItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <div ref={ref} className="border-b dark:border-gray-900 border-gray-200 py-6 group" style={{ opacity: isInView ? 1 : 0, transition: `opacity 0.6s ease-out ${index * 0.05}s` }}>
      <Link href={`/articles/${article.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
          <div className="dark:text-gray-500 text-gray-500 text-sm font-mono min-w-[140px] pt-1">{formatDate(article.date)}</div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-medium mb-2 dark:group-hover:text-gray-300 group-hover:text-gray-600 transition-colors">{article.title}</h2>
            <p className="dark:text-gray-500 text-gray-600 text-sm sm:text-base leading-relaxed mb-2">{article.excerpt}</p>
            <div className="dark:text-gray-600 text-gray-500 text-xs font-mono">{article.readTime}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
