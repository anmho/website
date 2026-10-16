import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import NoteList, { type NoteListItem } from '@/components/NoteList';
import notesData from '@/assets/static/json/notes.json';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Notes',
  'Short technical notes and observations by Andrew Ho.',
  '/notes'
);

export const revalidate = 3600;

export default function Notes() {
  const notes = notesData as NoteListItem[];

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
            <NoteList notes={notes} />
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
