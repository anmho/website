import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import notesData from '@/assets/static/json/notes.json';
import Link from 'next/link';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

  return (
    <main className="w-full overflow-hidden text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20 max-w-3xl">
            {/* Back link */}
            <Link
              href="/notes"
              className="text-gray-500 hover:text-gray-300 text-sm font-mono mb-6 inline-block transition-colors"
            >
              ← Notes
            </Link>

            {/* Note header */}
            <header className="mb-8">
              <AnimatedTitle>
                <h1 className="sm:text-4xl text-3xl font-medium -tracking-wider leading-tight mb-4">
                  {note.title}
                </h1>
              </AnimatedTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-500 text-xs font-mono">
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
            <article className="prose prose-invert max-w-none">
              {content ? (
                <div
                  className="note-content text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: content
                      .split('\n')
                      .map((line) => {
                        // Simple markdown-like rendering for notes
                        if (line.startsWith('## ')) {
                          return `<h2 class="text-2xl font-medium mt-8 mb-3">${line.slice(
                            3
                          )}</h2>`;
                        }
                        if (line.startsWith('### ')) {
                          return `<h3 class="text-xl font-medium mt-6 mb-2">${line.slice(
                            4
                          )}</h3>`;
                        }
                        if (line.trim() === '') {
                          return '<p class="mb-3"></p>';
                        }
                        return `<p class="mb-3 leading-relaxed">${line}</p>`;
                      })
                      .join(''),
                  }}
                />
              ) : (
                <div className="text-gray-400 leading-relaxed">
                  <p className="mb-4">{note.excerpt}</p>
                  <p className="text-sm text-gray-500 italic">
                    Content coming soon. Create a markdown file at{' '}
                    <code className="text-gray-400">
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
