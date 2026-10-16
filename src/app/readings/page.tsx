import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { formatDate } from '@/lib/utils';
import readingsData from '@/assets/static/json/readings.json';
import { readStaticMarkdown } from '@/lib/staticContent';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdown';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Readings',
  'Books and other readings Andrew Ho is spending time with.',
  '/readings'
);

export const revalidate = 3600;

type Reading = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  coverUrl?: string;
  link?: string;
};

export default async function ReadingsPage() {
  const content = await Promise.all(
    (readingsData as Reading[]).map(async (reading) => ({
      reading,
      body: await readStaticMarkdown('readings', reading.id),
    }))
  );

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
            </div>

            {content.length > 0 ? (
              <div className="space-y-1">
                {content.map(({ reading, body }) => {
                  const readingBody = (
                    <div className="min-w-0 flex-1">
                      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">
                        <time dateTime={reading.date}>{formatDate(reading.date)}</time>
                        <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">/</span>
                        <span>{reading.author}</span>
                      </div>
                      <h2 className="mb-2 text-xl font-medium tracking-tight text-gray-900 transition-colors group-hover:text-gray-600 dark:text-gray-100 dark:group-hover:text-gray-300 sm:text-2xl">
                        {reading.title}
                      </h2>
                      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                        {reading.excerpt}
                      </p>
                      {body ? (
                        <div className="prose prose-sm max-w-2xl dark:prose-invert">
                          <ReactMarkdown remarkPlugins={markdownRemarkPlugins} rehypePlugins={markdownRehypePlugins}>{body}</ReactMarkdown>
                        </div>
                      ) : null}
                      {reading.link ? (
                        <a href={reading.link} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex text-xs font-mono uppercase tracking-[0.18em] text-gray-500 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-950 dark:text-gray-400 dark:decoration-gray-700 dark:hover:text-white">
                          Visit the book site ↗
                        </a>
                      ) : null}
                    </div>
                  );

                  return (
                    <article key={reading.id} className="group border-y border-gray-200 py-10 dark:border-gray-800">
                      <div className={`flex flex-col gap-8 sm:gap-12 ${reading.coverUrl ? 'sm:grid sm:grid-cols-[148px_minmax(0,1fr)]' : ''}`}>
                        {reading.coverUrl ? (
                          <div className="w-32 shrink-0 sm:w-full">
                            <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-gray-300 bg-gray-100 shadow-[0_16px_32px_rgba(0,0,0,0.14)] transition-transform duration-700 group-hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30">
                              <img src={reading.coverUrl} alt={`Cover of ${reading.title}`} className="h-full w-full object-cover" loading="eager" />
                            </div>
                            <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600">First edition</p>
                          </div>
                        ) : null}
                        {readingBody}
                      </div>
                    </article>
                  );
                })}
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
