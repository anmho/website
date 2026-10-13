import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import NoteList, { type NoteListItem } from '@/components/NoteList';
import OwnerEditorLink from '@/components/OwnerEditorLink';
import { listContent } from '@/lib/contentDb';

export const revalidate = 3600;

export default async function Notes() {
  const records = await listContent('note');
  const notes: NoteListItem[] = records.map((record) => ({
    slug: record.slug,
    title: record.title,
    date: record.date,
    excerpt: record.excerpt,
    readTime: record.readTime || '5 min read',
  }));

  return (
    <main className="w-full overflow-hidden dark:text-white text-gray-900">
      <Navbar />
      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-14">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">Notes</h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl dark:text-gray-400 text-gray-600 -tracking-wide font-light sm:ml-4 mb-10">
              Quick thoughts, learnings, and observations.
            </p>
            <div className="mb-8 sm:ml-4"><OwnerEditorLink type="note" label="Add note" /></div>
            <NoteList notes={notes} />
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
