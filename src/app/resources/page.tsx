import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { FiExternalLink } from 'react-icons/fi';
import resourcesData from '@/assets/static/json/resources.json';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Bookmarks',
  'A curated library of articles, guides, and talks collected by Andrew Ho.',
  '/resources'
);

export const revalidate = 3600;

type Bookmark = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

export default function BookmarksPage() {
  const resources = resourcesData as Bookmark[];

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">Bookmarks</h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl text-gray-600 dark:text-gray-400 -tracking-wide font-light sm:ml-4 mb-12">
              A curated library of the articles, guides, and talks I keep reaching for when I need inspiration or a refresher.
            </p>

            {resources.length > 0 ? (
              <div className="flex flex-col gap-4">
                {resources.map((resource) => (
                  <article key={resource.url} className="rounded-xl border border-gray-200 dark:border-gray-800/80 bg-white/60 dark:bg-white/[0.03] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="uppercase text-[10px] tracking-widest text-gray-400 dark:text-gray-600 mb-1.5">{resource.format}</p>
                        <h2 className="text-lg sm:text-xl font-medium mb-1.5 leading-snug">{resource.title}</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{resource.description}</p>
                      </div>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-1" aria-label={`Visit ${resource.title}`}>
                        <FiExternalLink size={15} />
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                      <span className="text-xs dark:text-gray-500 text-gray-400">{resource.author}</span>
                      {resource.tags.slice(0, 5).map((tag) => <span key={tag} className="text-xs dark:text-gray-600 text-gray-400">{tag}</span>)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-t border-gray-200 py-12 dark:border-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">No bookmarks yet.</p>
              </div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
