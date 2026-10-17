import ReactMarkdown from 'react-markdown';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
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
            <h1 className="text-5xl tracking-[-0.06em] sm:text-7xl">Readings</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
              Notes on books and essays worth returning to.
            </p>

            {content.length > 0 ? (
              <div className="mt-20 divide-y divide-gray-200 dark:divide-gray-800">
                {content.map(({ reading, body }) => {
                  const readingBody = (
                    <div className="min-w-0 flex-1">
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                        <span>{reading.author}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={reading.date}>{formatDate(reading.date)}</time>
                      </div>
                      <h2 className="text-2xl tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
                        {reading.title}
                      </h2>
                      {body ? (
                        <div className="prose prose-sm mt-5 max-w-2xl dark:prose-invert">
                          <ReactMarkdown remarkPlugins={markdownRemarkPlugins} rehypePlugins={markdownRehypePlugins}>{body}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                          {reading.excerpt}
                        </p>
                      )}
                    </div>
                  );

                  return (
                    <article key={reading.id} className="py-12 first:pt-0 last:pb-0">
                      <div className={`flex flex-col gap-8 sm:gap-10 ${reading.coverUrl ? 'sm:grid sm:grid-cols-[120px_minmax(0,1fr)]' : ''}`}>
                        {reading.coverUrl ? (
                          <div className="w-24 shrink-0 sm:w-full">
                            <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                              <img src={reading.coverUrl} alt={`Cover of ${reading.title}`} className="h-full w-full object-cover" loading="eager" />
                            </div>
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
