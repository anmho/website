'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import articlesData from '@/assets/static/json/articles.json';
import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

interface Article {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

export default function Articles() {
  const articles = articlesData as Article[];

  return (
    <main className="w-full overflow-hidden dark:text-white text-gray-900">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Articles
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl dark:text-gray-400 text-gray-600 -tracking-wide font-light sm:ml-4 mb-20">
              In-depth articles on building scalable systems and backend
              engineering.
            </p>

            <div className="space-y-1">
              {articles.length > 0 ? (
                articles.map((article, index) => (
                  <ArticleItem
                    key={article.slug}
                    article={article}
                    index={index}
                  />
                ))
              ) : (
                <p className="dark:text-gray-500 text-gray-600 text-sm py-8">
                  No articles yet.
                </p>
              )}
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function ArticleItem({ article, index }: { article: Article; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      className="border-b dark:border-gray-900 border-gray-200 py-6 group"
      style={{
        opacity: isInView ? 1 : 0,
        transition: `opacity 0.6s ease-out ${index * 0.05}s`,
      }}
    >
      <Link href={`/articles/${article.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
          <div className="dark:text-gray-500 text-gray-500 text-sm font-mono min-w-[140px] pt-1">
            {formatDate(article.date)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-medium mb-2 dark:group-hover:text-gray-300 group-hover:text-gray-600 transition-colors">
              {article.title}
            </h2>
            <p className="dark:text-gray-500 text-gray-600 text-sm sm:text-base leading-relaxed mb-2">
              {article.excerpt}
            </p>
            <div className="dark:text-gray-600 text-gray-500 text-xs font-mono">
              {article.readTime}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
