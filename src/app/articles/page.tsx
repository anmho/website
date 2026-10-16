import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import ArticleList, { type ArticleListItem } from '@/components/ArticleList';
import articlesData from '@/assets/static/json/articles.json';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Articles',
  'Long-form writing by Andrew Ho about applied AI, systems, and backend engineering.',
  '/articles'
);

export const revalidate = 3600;

export default function Articles() {
  const articles = articlesData as ArticleListItem[];

  return (
    <main className="w-full overflow-hidden dark:text-white text-gray-900">
      <Navbar />
      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">Articles</h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl dark:text-gray-400 text-gray-600 -tracking-wide font-light sm:ml-4 mb-20">
              In-depth articles on building scalable systems and backend engineering.
            </p>
            <ArticleList articles={articles} />
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
