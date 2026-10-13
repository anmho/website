import Link from 'next/link';
import { readFile } from 'fs/promises';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import readingsData from '@/assets/static/json/readings.json';
import { formatDate } from '@/lib/utils';
import { listContent } from '@/lib/contentDb';

export const revalidate = 3600;

type Reading = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
};

async function getReadingContent(id: string): Promise<string | null> {
  try {
    return await readFile(
      join(process.cwd(), 'src', 'assets', 'content', 'readings', `${id}.md`),
      'utf-8'
    );
  } catch {
    return null;
  }
}

export default async function ReadingsPage() {
  const legacyReadings = readingsData as Reading[];
  const records = await listContent('reading');
  const content = records.length
    ? records.map((record) => ({
        reading: {
          id: record.id,
          title: record.title,
          date: record.date,
          excerpt: record.excerpt,
          author: typeof record.metadata.author === 'string' ? record.metadata.author : 'Unknown author',
        },
        body: record.body,
      }))
    : await Promise.all(
        legacyReadings.map(async (reading) => ({ reading, body: await getReadingContent(reading.id) }))
      );

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20">
            <AnimatedTitle>
              <h1 className="mb-8 text-5xl leading-relaxed tracking-[-0.06em] sm:text-7xl">Readings</h1>
            </AnimatedTitle>
            <p className="mb-20 max-w-xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:ml-4 sm:text-xl">
              Books, papers, and essays worth returning to.
            </p>

            {content.length > 0 ? (
              <div className="space-y-10">
                {content.map(({ reading, body }) => (
                  <article key={reading.id} className="border-y border-gray-200 py-7 dark:border-gray-800">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">
                      <time dateTime={reading.date}>{formatDate(reading.date)}</time>
                      <span>· {reading.author}</span>
                    </div>
                    <h2 className="mb-3 text-2xl font-medium tracking-tight text-gray-950 dark:text-gray-100">
                      {reading.title}
                    </h2>
                    <p className="mb-5 max-w-2xl leading-relaxed text-gray-600 dark:text-gray-400">{reading.excerpt}</p>
                    {body ? (
                      <div className="prose prose-sm max-w-2xl dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-800">
                <p className="text-lg text-gray-700 dark:text-gray-300">No readings yet.</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                  Add the first one from the{' '}
                  <Link href="/editor" className="underline underline-offset-4 transition-colors hover:text-gray-950 dark:hover:text-white">
                    editor
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
