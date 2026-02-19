'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import notesData from '@/assets/static/json/notes.json';
import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

interface Note {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

export default function Notes() {
  const notes = notesData as Note[];

  return (
    <main className="w-full overflow-hidden dark:text-white text-gray-900">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Notes
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl dark:text-gray-400 text-gray-600 -tracking-wide font-light sm:ml-4 mb-20">
              Quick thoughts, learnings, and observations.
            </p>

            <div className="space-y-1">
              {notes.length > 0 ? (
                notes.map((note, index) => (
                  <NoteItem key={note.slug} note={note} index={index} />
                ))
              ) : (
                <p className="dark:text-gray-500 text-gray-600 text-sm py-8">
                  No notes yet.
                </p>
              )}
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function NoteItem({ note, index }: { note: Note; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      className="border-b dark:border-gray-900 border-gray-200 py-4 group"
      style={{
        opacity: isInView ? 1 : 0,
        transition: `opacity 0.6s ease-out ${index * 0.05}s`,
      }}
    >
      <Link href={`/notes/${note.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
          <div className="dark:text-gray-500 text-gray-500 text-xs font-mono min-w-[120px] pt-1">
            {formatDate(note.date)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-medium mb-1 dark:group-hover:text-gray-300 group-hover:text-gray-600 transition-colors">
              {note.title}
            </h2>
            <p className="dark:text-gray-500 text-gray-600 text-sm leading-relaxed">
              {note.excerpt}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
