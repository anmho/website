'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import notesData from '@/assets/static/json/notes.json';
import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

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
    <main className="w-full overflow-hidden text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Notes
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl text-gray-400 -tracking-wide font-light sm:ml-4 mb-20">
              Quick thoughts, learnings, and observations.
            </p>

            <div className="space-y-1">
              {notes.length > 0 ? (
                notes.map((note, index) => (
                  <NoteItem key={note.slug} note={note} index={index} />
                ))
              ) : (
                <p className="text-gray-500 text-sm py-8">No notes yet.</p>
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={ref}
      className="border-b border-gray-900 py-4 group"
      style={{
        opacity: isInView ? 1 : 0,
        transition: `opacity 0.6s ease-out ${index * 0.05}s`,
      }}
    >
      <Link href={`/notes/${note.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
          <div className="text-gray-500 text-xs font-mono min-w-[120px] pt-1">
            {formatDate(note.date)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-medium mb-1 group-hover:text-gray-300 transition-colors">
              {note.title}
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              {note.excerpt}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
