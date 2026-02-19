import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import notesData from '@/assets/static/json/notes.json';
import Link from 'next/link';
import { readFile } from 'fs/promises';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import { formatDate } from '@/lib/utils';

interface Note {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

interface NotePageProps {
  params: {
    slug: string;
  };
}

async function getNote(slug: string): Promise<Note | null> {
  const notes = notesData as Note[];
  return notes.find((note) => note.slug === slug) || null;
}

async function getNoteContent(slug: string): Promise<string | null> {
  try {
    const contentPath = join(
      process.cwd(),
      'src',
      'assets',
      'content',
      'notes',
      `${slug}.md`
    );
    const content = await readFile(contentPath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const notes = notesData as Note[];
  return notes.map((note) => ({
    slug: note.slug,
  }));
}

export default async function NotePage({ params }: NotePageProps) {
  const note = await getNote(params.slug);
  const content = await getNoteContent(params.slug);

  if (!note) {
    notFound();
  }

  type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
    inline?: boolean;
    children?: ReactNode;
  };

  const noteMarkdownComponents: Components = {
    h1: ({ node, className, ...props }) => (
      <h1
        className={clsx(
          'text-3xl font-medium mt-10 mb-4 text-gray-900 dark:text-gray-100',
          className
        )}
        {...props}
      />
    ),
    h2: ({ node, className, ...props }) => (
      <h2
        className={clsx(
          'text-2xl font-medium mt-8 mb-3 text-gray-900 dark:text-gray-100',
          className
        )}
        {...props}
      />
    ),
    h3: ({ node, className, ...props }) => (
      <h3
        className={clsx(
          'text-xl font-medium mt-6 mb-2 text-gray-900 dark:text-gray-100',
          className
        )}
        {...props}
      />
    ),
    p: ({ node, className, ...props }) => (
      <p
        className={clsx(
          'mb-3 leading-relaxed text-gray-700 dark:text-gray-300',
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
      const { inline, className, children, ...rest } =
        props as MarkdownCodeProps;

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
        <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
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
          'list-disc pl-5 mb-3 text-gray-700 dark:text-gray-300 space-y-1.5',
          className
        )}
        {...props}
      />
    ),
    ol: ({ node, className, ...props }) => (
      <ol
        className={clsx(
          'list-decimal pl-5 mb-3 text-gray-700 dark:text-gray-300 space-y-1.5',
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
          'border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-600 dark:text-gray-300 mb-4',
          className
        )}
        {...props}
      />
    ),
  };

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-gray-100">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20 max-w-3xl">
            {/* Back link */}
            <Link
              href="/notes"
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 text-sm font-mono mb-6 inline-block transition-colors"
            >
              ← Notes
            </Link>

            {/* Note header */}
            <header className="mb-8">
              <AnimatedTitle>
                <h1 className="sm:text-4xl text-3xl font-medium -tracking-wider leading-tight mb-4 text-gray-900 dark:text-gray-100">
                  {note.title}
                </h1>
              </AnimatedTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-600 dark:text-gray-400 text-xs font-mono">
                <time dateTime={note.date}>{formatDate(note.date)}</time>
                {note.readTime && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>{note.readTime}</span>
                  </>
                )}
              </div>
            </header>

            {/* Note content */}
            <article className="prose dark:prose-invert max-w-none">
              {content ? (
                <ReactMarkdown components={noteMarkdownComponents}>
                  {content}
                </ReactMarkdown>
              ) : (
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <p className="mb-4">{note.excerpt}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Content coming soon. Create a markdown file at{' '}
                    <code className="text-gray-800 dark:text-gray-300">
                      src/assets/content/notes/{note.slug}.md
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
