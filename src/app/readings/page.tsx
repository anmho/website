import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import OwnerEditorLink from '@/components/OwnerEditorLink';
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

export default async function ReadingsPage() {
  const records = await listContent('reading');
  const content = records.map((record) => ({
    reading: {
      id: record.slug,
      title: record.title,
      date: record.date,
      excerpt: record.excerpt,
      author: typeof record.metadata.author === 'string' ? record.metadata.author : 'Unknown author',
    },
    body: record.body,
  }));

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20 text-left">
            <AnimatedTitle>
              <h1 className="mb-8 text-5xl leading-relaxed tracking-[-0.06em] sm:text-7xl">Readings</h1>
            </AnimatedTitle>
            <p className="mb-20 max-w-xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:ml-4 sm:text-xl">
              Books, papers, and essays worth returning to.
            </p>
            <div className="mb-10 flex flex-wrap items-center gap-5 sm:ml-4">
              <Link
                href="https://www.goodreads.com/user/show/184401794-andrew-ho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-950 dark:text-gray-400 dark:decoration-gray-700 dark:hover:text-white"
              >
                A full list of my readings ↗
              </Link>
              <OwnerEditorLink type="reading" label="Add reading" />
            </div>

            {content.length > 0 ? (
              <div className="space-y-1">
                {content.map(({ reading, body }) => (
                  <article key={reading.id} className="group border-b border-gray-200 py-6 dark:border-gray-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
                      <div className="min-w-[140px] pt-1 text-sm font-mono text-gray-500 dark:text-gray-500">
                        <time dateTime={reading.date}>{formatDate(reading.date)}</time>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">
                          {reading.author}
                        </p>
                        <h2 className="mb-2 text-xl font-medium tracking-tight text-gray-900 transition-colors group-hover:text-gray-600 dark:text-gray-100 dark:group-hover:text-gray-300 sm:text-2xl">
                          {reading.title}
                        </h2>
                        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                          {reading.excerpt}
                        </p>
                        {body ? (
                          <div className="prose prose-sm max-w-2xl dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-t border-gray-200 py-12 dark:border-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">No readings yet.</p>
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
