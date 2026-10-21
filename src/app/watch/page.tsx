import ReactMarkdown from 'react-markdown';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { formatDate } from '@/lib/utils';
import watchData from '@/assets/static/json/watch.json';
import { readStaticMarkdown } from '@/lib/staticContent';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdown';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Watch',
  'Talks and videos worth spending time with, collected by Andrew Ho.',
  '/watch'
);

export const revalidate = 3600;

export default async function WatchPage() {
  const records = await Promise.all((watchData as Array<{
    id: string;
    title: string;
    date: string;
    excerpt: string;
    format?: string;
    posterUrl?: string;
  }>).map(async (record) => ({
    ...record,
    body: await readStaticMarkdown('watch', record.id),
  })));

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20 text-left">
            <AnimatedTitle>
              <h1 className="mb-8 text-5xl leading-relaxed tracking-[-0.06em] sm:text-7xl">Watch</h1>
            </AnimatedTitle>
            <p className="mb-20 max-w-xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:ml-4 sm:text-xl">
              Movies and videos worth spending time with.
            </p>
            {records.length > 0 ? (
              <div className="space-y-1">
                {records.map((record) => (
                  <article key={record.id} className="group border-b border-gray-200 py-6 dark:border-gray-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
                      <div className="min-w-[140px] pt-1 text-sm font-mono text-gray-500 dark:text-gray-500">
                        <time dateTime={record.date}>{formatDate(record.date)}</time>
                      </div>
                      <div className={`min-w-0 flex-1 ${record.posterUrl ? 'sm:grid sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-8' : ''}`}>
                        {record.posterUrl ? (
                          <div className="w-24 shrink-0 sm:w-full">
                            <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                              <img src={record.posterUrl} alt={`Poster for ${record.title}`} className="h-full w-full object-cover" loading="eager" />
                            </div>
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">
                            {record.format || 'Video'}
                          </p>
                          <h2 className="mb-2 text-xl font-medium tracking-tight text-gray-900 transition-colors group-hover:text-gray-600 dark:text-gray-100 dark:group-hover:text-gray-300 sm:text-2xl">
                            {record.title}
                          </h2>
                          <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                            {record.excerpt}
                          </p>
                          <div className="prose prose-sm max-w-2xl dark:prose-invert">
                            <ReactMarkdown remarkPlugins={markdownRemarkPlugins} rehypePlugins={markdownRehypePlugins}>{record.body}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-t border-gray-200 py-12 dark:border-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">No watch items yet.</p>
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
