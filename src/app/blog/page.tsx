'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import notesData from '@/assets/static/json/notes.json';
import articlesData from '@/assets/static/json/articles.json';
import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

export default function Blog() {
  const notes = notesData as Post[];
  const articles = articlesData as Post[];

  return (
    <main className="w-full overflow-hidden text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Blog
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl text-gray-400 -tracking-wide font-light sm:ml-4 mb-20">
              Thoughts, insights, and learnings from building scalable systems.
            </p>

            {/* Articles Section */}
            <section className="mb-32">
              <h2 className="text-3xl sm:text-4xl font-medium mb-12 text-gray-200 border-b border-gray-800 pb-4">
                Articles
              </h2>
              <div className="space-y-1">
                {articles.length > 0 ? (
                  articles.map((article, index) => (
                    <PostItem
                      key={article.slug}
                      post={article}
                      index={index}
                      type="articles"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-8">No articles yet.</p>
                )}
              </div>
            </section>

            {/* Notes Section */}
            <section>
              <h2 className="text-3xl sm:text-4xl font-medium mb-12 text-gray-200 border-b border-gray-800 pb-4">
                Notes
              </h2>
              <div className="space-y-1">
                {notes.length > 0 ? (
                  notes.map((note, index) => (
                    <PostItem
                      key={note.slug}
                      post={note}
                      index={index}
                      type="notes"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-8">No notes yet.</p>
                )}
              </div>
            </section>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function PostItem({
  post,
  index,
  type,
}: {
  post: Post;
  index: number;
  type: 'articles' | 'notes';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      className="border-b border-gray-900 py-6 group"
      style={{
        opacity: isInView ? 1 : 0,
        transition: `opacity 0.6s ease-out ${index * 0.05}s`,
      }}
    >
      <Link href={`/${type}/${post.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
          <div className="text-gray-500 text-sm font-mono min-w-[140px] pt-1">
            {formatDate(post.date)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-medium mb-2 group-hover:text-gray-300 transition-colors">
              {post.title}
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-2">
              {post.excerpt}
            </p>
            <div className="text-gray-600 text-xs font-mono">
              {post.readTime}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
