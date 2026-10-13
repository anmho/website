import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { formatDate } from '@/lib/utils';
import tenetsData from '@/assets/static/json/tenets.json';
import { readStaticMarkdown } from '@/lib/staticContent';

export const revalidate = 3600;

type Tenet = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  source?: string;
};

export default async function TenetsPage() {
  const content = await Promise.all(
    (tenetsData as Tenet[]).map(async (tenet) => ({
      tenet,
      body: await readStaticMarkdown('tenets', tenet.id),
    }))
  );

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20 text-left">
            <AnimatedTitle>
              <h1 className="mb-8 text-5xl leading-relaxed tracking-[-0.06em] sm:text-7xl">Tenets</h1>
            </AnimatedTitle>
            <p className="mb-20 max-w-xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:ml-4 sm:text-xl">
              Principles worth returning to.
            </p>
            {content.length > 0 ? (
              <div className="space-y-1">
                {content.map(({ tenet, body }) => (
                  <article key={tenet.id} className="group border-b border-gray-200 py-6 dark:border-gray-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
                      <div className="min-w-[140px] pt-1 text-sm font-mono text-gray-500 dark:text-gray-500">
                        <time dateTime={tenet.date}>{formatDate(tenet.date)}</time>
                      </div>
                      <div className="min-w-0 flex-1">
                        {tenet.source ? (
                          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">
                            {tenet.source}
                          </p>
                        ) : null}
                        <h2 className="mb-2 text-xl font-medium tracking-tight text-gray-900 transition-colors group-hover:text-gray-600 dark:text-gray-100 dark:group-hover:text-gray-300 sm:text-2xl">
                          {tenet.title}
                        </h2>
                        {body ? (
                          <div className="prose prose-sm max-w-2xl dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                            {tenet.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-t border-gray-200 py-12 dark:border-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">No tenets yet.</p>
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
