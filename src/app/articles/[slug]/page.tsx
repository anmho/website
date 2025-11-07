import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import articlesData from '@/assets/static/json/articles.json';
import Link from 'next/link';
import { readFile } from 'fs/promises';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface Article {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

async function getArticle(slug: string): Promise<Article | null> {
  const articles = articlesData as Article[];
  return articles.find((article) => article.slug === slug) || null;
}

async function getArticleContent(slug: string): Promise<string | null> {
  try {
    const contentPath = join(
      process.cwd(),
      'src',
      'assets',
      'content',
      'articles',
      `${slug}.md`
    );
    const content = await readFile(contentPath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateStaticParams() {
  const articles = articlesData as Article[];
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: ReactNode;
};

const articleMarkdownComponents: Components = {
  h1: ({ node, className, ...props }) => (
    <h1
      className={clsx(
        'text-4xl font-medium mt-16 mb-6 text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    />
  ),
  h2: ({ node, className, ...props }) => (
    <h2
      className={clsx(
        'text-3xl font-medium mt-12 mb-5 text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    />
  ),
  h3: ({ node, className, ...props }) => (
    <h3
      className={clsx(
        'text-2xl font-medium mt-10 mb-4 text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    />
  ),
  p: ({ node, className, ...props }) => (
    <p
      className={clsx(
        'mb-6 leading-relaxed text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    />
  ),
  a: ({ node, className, ...props }) => (
    <a
      className={clsx(
        'text-blue-600 hover:text-blue-800 dark:text-gray-200 dark:hover:text-white underline transition-colors',
        className
      )}
      {...props}
    />
  ),
  code: (props) => {
    const { inline, className, children, ...rest } = props as MarkdownCodeProps;

    if (inline) {
      return (
        <code
          className={clsx(
            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono',
            className
          )}
          {...rest}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto mb-6">
        <code
          className={clsx(
            'text-sm font-mono text-gray-800 dark:text-gray-200',
            className
          )}
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </code>
      </pre>
    );
  },
  ul: ({ node, className, ...props }) => (
    <ul
      className={clsx(
        'list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2',
        className
      )}
      {...props}
    />
  ),
  ol: ({ node, className, ...props }) => (
    <ol
      className={clsx(
        'list-decimal pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2',
        className
      )}
      {...props}
    />
  ),
  li: ({ node, className, ...props }) => (
    <li
      className={clsx(
        'leading-relaxed text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    />
  ),
  blockquote: ({ node, className, ...props }) => (
    <blockquote
      className={clsx(
        'border-l-4 border-gray-300 dark:border-gray-700 pl-6 italic text-gray-600 dark:text-gray-300 mb-6',
        className
      )}
      {...props}
    />
  ),
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);
  const content = await getArticleContent(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-gray-100">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20 max-w-4xl mx-auto">
            {/* Back link */}
            <Link
              href="/articles"
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 text-sm font-mono mb-12 inline-block transition-colors"
            >
              ← Articles
            </Link>

            {/* Article header */}
            <header className="mb-16">
              <AnimatedTitle>
                <h1 className="sm:text-6xl text-4xl font-medium -tracking-wider leading-tight mb-8 text-gray-900 dark:text-gray-100">
                  {article.title}
                </h1>
              </AnimatedTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-gray-600 dark:text-gray-400 text-sm font-mono">
                <time dateTime={article.date}>{formatDate(article.date)}</time>
                <span className="hidden sm:inline">•</span>
                <span>{article.readTime}</span>
              </div>
            </header>

            {/* Article content */}
            <article className="prose prose-lg dark:prose-invert max-w-none">
              {content ? (
                <ReactMarkdown components={articleMarkdownComponents}>
                  {content}
                </ReactMarkdown>
              ) : (
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <p className="mb-6 text-lg">{article.excerpt}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Content coming soon. Create a markdown file at{' '}
                    <code className="text-gray-800 bg-gray-100 dark:text-gray-300 dark:bg-gray-900 px-1.5 py-0.5 rounded">
                      src/assets/content/articles/{article.slug}.md
                    </code>
                  </p>
                </div>
              )}
            </article>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
