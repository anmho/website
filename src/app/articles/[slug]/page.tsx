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
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import CopyCodeBlock from '@/components/CopyCodeBlock';
import {
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { formatDate } from '@/lib/utils';

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

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || 'section';
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s*\{#.*\}\s*$/, '')
    .trim();
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (!node) {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

function extractCodeBlockFromPre(node: ReactNode): {
  code: string;
  className?: string;
} | null {
  const candidate = Array.isArray(node) ? node[0] : node;
  if (isValidElement<{ children?: ReactNode; className?: string }>(candidate)) {
    return {
      code: extractText(candidate.props.children).replace(/\n$/, ''),
      className: candidate.props.className,
    };
  }
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return {
      code: String(candidate).replace(/\n$/, ''),
    };
  }
  return null;
}

function createHeadingIdAssigner() {
  const counts = new Map<string, number>();
  return (headingText: string): string => {
    const base = slugifyHeading(headingText);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };
}

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function stripDuplicateLeadingTitle(markdown: string, articleTitle: string): string {
  const lines = markdown.split('\n');
  if (lines.length === 0) {
    return markdown;
  }

  const firstLine = lines[0].trim();
  const match = /^#\s+(.+?)\s*$/.exec(firstLine);
  if (!match) {
    return markdown;
  }

  const heading = stripInlineMarkdown(match[1]);
  if (normalizeTitle(heading) !== normalizeTitle(articleTitle)) {
    return markdown;
  }

  const rest = lines.slice(1);
  while (rest.length > 0 && rest[0].trim() === '') {
    rest.shift();
  }
  return rest.join('\n');
}

function extractTableOfContents(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const assignId = createHeadingIdAssigner();
  const toc: TocItem[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }

    const match = /^(#{1,3})\s+(.+?)\s*$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const level = match[1].length as 1 | 2 | 3;
    const text = stripInlineMarkdown(match[2]);
    if (!text) {
      continue;
    }

    toc.push({
      id: assignId(text),
      text,
      level,
    });
  }

  return toc;
}

function createArticleMarkdownComponents(
  assignHeadingId: (headingText: string) => string
): Components {
  return {
    h1: ({ node, className, children, ...props }) => {
      const text = extractText(children);
      const id = assignHeadingId(text);
      return (
        <h1
          id={id}
          className={clsx(
            'scroll-mt-32 text-4xl font-medium mt-16 mb-6 text-gray-900 dark:text-gray-100',
            className
          )}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ node, className, children, ...props }) => {
      const text = extractText(children);
      const id = assignHeadingId(text);
      return (
        <h2
          id={id}
          className={clsx(
            'scroll-mt-32 text-3xl font-medium mt-12 mb-5 text-gray-900 dark:text-gray-100',
            className
          )}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ node, className, children, ...props }) => {
      const text = extractText(children);
      const id = assignHeadingId(text);
      return (
        <h3
          id={id}
          className={clsx(
            'scroll-mt-32 text-2xl font-medium mt-10 mb-4 text-gray-900 dark:text-gray-100',
            className
          )}
          {...props}
        >
          {children}
        </h3>
      );
    },
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
    const { className, children, ...rest } = props as MarkdownCodeProps;
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
  },
  pre: ({ node, children }) => {
    const block = extractCodeBlockFromPre(children);
    if (!block) {
      return null;
    }
    return <CopyCodeBlock code={block.code} className={block.className} />;
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
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);
  const content = await getArticleContent(params.slug);
  const processedContent =
    article && content ? stripDuplicateLeadingTitle(content, article.title) : content;
  const toc = processedContent ? extractTableOfContents(processedContent) : [];
  const markdownComponents = createArticleMarkdownComponents(
    createHeadingIdAssigner()
  );

  if (!article) {
    notFound();
  }

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-gray-100">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20 max-w-6xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
            <div className="min-w-0">
              {/* Back link */}
              <Link
                href="/articles"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 text-sm font-mono mb-12 inline-flex items-center gap-2 leading-none transition-colors"
              >
                <span aria-hidden="true" className="relative -top-px">
                  ←
                </span>
                <span>Articles</span>
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
                {processedContent ? (
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                  >
                    {processedContent}
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

            {toc.length > 0 ? (
              <aside className="hidden lg:block">
                <div className="sticky top-28 border-l border-gray-200 dark:border-gray-800 pl-4">
                  <p className="text-xs font-mono uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    On this page
                  </p>
                  <nav aria-label="Table of contents">
                    <ul className="space-y-2">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className={clsx(
                              'block text-sm leading-snug text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors',
                              item.level === 2 && 'pl-3',
                              item.level === 3 && 'pl-6'
                            )}
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>
            ) : null}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
