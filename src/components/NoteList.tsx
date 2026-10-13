'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

export type NoteListItem = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
};

export default function NoteList({ notes }: { notes: NoteListItem[] }) {
  return (
    <div className="space-y-1">
      {notes.length > 0 ? notes.map((note, index) => <NoteItem key={note.slug} note={note} index={index} />) : <p className="dark:text-gray-500 text-gray-600 text-sm py-8">No notes yet.</p>}
    </div>
  );
}

function NoteItem({ note, index }: { note: NoteListItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <div ref={ref} className="border-b dark:border-gray-900 border-gray-200 py-4 group" style={{ opacity: isInView ? 1 : 0, transition: `opacity 0.6s ease-out ${index * 0.05}s` }}>
      <Link href={`/notes/${note.slug}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 gap-2">
          <div className="dark:text-gray-500 text-gray-500 text-xs font-mono min-w-[120px] pt-1">{formatDate(note.date)}</div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-medium mb-1 dark:group-hover:text-gray-300 group-hover:text-gray-600 transition-colors">{note.title}</h2>
            <p className="dark:text-gray-500 text-gray-600 text-sm leading-relaxed">{note.excerpt}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
