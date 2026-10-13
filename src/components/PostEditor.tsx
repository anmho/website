'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiCode,
  FiEye,
  FiFileText,
  FiHash,
  FiSunrise,
  FiPlayCircle,
  FiSend,
  FiTag,
  FiZap,
} from 'react-icons/fi';
import { useMemo, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import { cn } from '@/lib/utils';

type PostType = 'article' | 'note' | 'learning' | 'watch' | 'reading' | 'lesson';

type Draft = {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  body: string;
  tags: string;
  details: string;
};

function getLocalDate(): string {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localNow.toISOString().slice(0, 10);
}

const DEFAULT_DATE = getLocalDate();

const POST_TYPES: Array<{
  id: PostType;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof FiFileText;
  accent: string;
}> = [
  {
    id: 'article',
    label: 'Article',
    eyebrow: 'Long form',
    description: 'A considered argument, deep dive, or technical walkthrough.',
    icon: FiFileText,
    accent: 'from-sky-400/20 via-transparent to-transparent',
  },
  {
    id: 'note',
    label: 'Note',
    eyebrow: 'Quick thought',
    description: 'A compact idea, observation, or useful reference to keep around.',
    icon: FiBookOpen,
    accent: 'from-amber-300/20 via-transparent to-transparent',
  },
  {
    id: 'learning',
    label: 'Learning',
    eyebrow: 'Daily fragment',
    description: 'A question and answer with the sharp edge of a small discovery.',
    icon: FiZap,
    accent: 'from-fuchsia-400/20 via-transparent to-transparent',
  },
  {
    id: 'watch',
    label: 'Watch',
    eyebrow: 'Movies + video',
    description: 'A film, talk, lecture, or video that left a useful trace.',
    icon: FiPlayCircle,
    accent: 'from-rose-400/20 via-transparent to-transparent',
  },
  {
    id: 'reading',
    label: 'Readings',
    eyebrow: 'Books + papers',
    description: 'A book, paper, or essay with ideas worth carrying forward.',
    icon: FiBookOpen,
    accent: 'from-lime-300/20 via-transparent to-transparent',
  },
  {
    id: 'lesson',
    label: 'Lesson',
    eyebrow: 'Timeless reminder',
    description: 'A personal reminder of timeless lessons, kept close for later.',
    icon: FiSunrise,
    accent: 'from-orange-300/20 via-transparent to-transparent',
  },
];

const DEFAULT_DRAFTS: Record<PostType, Draft> = {
  article: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '8 min read',
    body: '## The central idea\n\nStart with the problem, then walk the reader through the decisions that make the solution work.\n\n```text\nA small detail worth preserving\n```',
    tags: '',
    details: '',
  },
  note: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '5 min read',
    body: 'A compact observation worth returning to. Add context, a useful example, or the link between two ideas.\n\n- One detail\n- One implication',
    tags: '',
    details: '',
  },
  learning: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '',
    body: 'The short answer goes here. Use **bold**, `inline code`, tables, and fenced code blocks exactly as they should appear on the Learnings page.\n\n```ts\nconst useful = true;\n```',
    tags: 'systems, notes',
    details: '',
  },
  watch: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '',
    body: 'What was useful, surprising, or beautifully made?\n\nAdd the note you want to remember, not a plot summary.',
    tags: '',
    details: 'video',
  },
  reading: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '',
    body: 'What is the central idea? What did it change about the way you see the problem?\n\nCapture the parts worth revisiting.',
    tags: '',
    details: '',
  },
  lesson: {
    title: '',
    excerpt: '',
    date: DEFAULT_DATE,
    readTime: '',
    body: '## Keep this close\n\nWrite the lesson in a way that will still be useful when the details of today have faded.\n\n> A timeless reminder is short enough to remember and specific enough to use.',
    tags: '',
    details: '',
  },
};

const markdownComponents: Components = {
  h1: ({ node, className, ...props }) => (
    <h1 className={cn('mb-4 mt-8 text-3xl font-medium leading-tight', className)} {...props} />
  ),
  h2: ({ node, className, ...props }) => (
    <h2 className={cn('mb-3 mt-7 text-2xl font-medium leading-tight', className)} {...props} />
  ),
  h3: ({ node, className, ...props }) => (
    <h3 className={cn('mb-2 mt-5 text-xl font-medium leading-tight', className)} {...props} />
  ),
  p: ({ node, className, ...props }) => (
    <p className={cn('mb-4 leading-relaxed text-gray-700 dark:text-gray-300', className)} {...props} />
  ),
  a: ({ node, className, ...props }) => (
    <a
      className={cn('underline decoration-gray-400 underline-offset-4 transition-colors hover:text-gray-950 dark:hover:text-white', className)}
      {...props}
    />
  ),
  code: ({ node, className, ...props }) => (
    <code
      className={cn('rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-800 dark:bg-gray-900 dark:text-gray-200', className)}
      {...props}
    />
  ),
  pre: ({ node, children }) => (
    <pre className="mb-5 overflow-x-auto rounded-lg border border-gray-200 bg-gray-100/80 p-4 text-sm leading-relaxed dark:border-gray-800 dark:bg-[#111]">
      {children}
    </pre>
  ),
  ul: ({ node, className, ...props }) => (
    <ul className={cn('mb-5 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300', className)} {...props} />
  ),
  ol: ({ node, className, ...props }) => (
    <ol className={cn('mb-5 list-decimal space-y-2 pl-6 text-gray-700 dark:text-gray-300', className)} {...props} />
  ),
  blockquote: ({ node, className, ...props }) => (
    <blockquote className={cn('mb-5 border-l-2 border-gray-300 pl-4 italic text-gray-600 dark:border-gray-700 dark:text-gray-400', className)} {...props} />
  ),
  table: ({ node, className, ...props }) => (
    <div className="mb-5 overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  ),
  th: ({ node, className, ...props }) => (
    <th className={cn('border-b border-gray-300 px-3 py-2 font-semibold dark:border-gray-700', className)} {...props} />
  ),
  td: ({ node, className, ...props }) => (
    <td className={cn('border-b border-gray-200 px-3 py-2 dark:border-gray-800', className)} {...props} />
  ),
};

function MarkdownPreview({ body }: { body: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {body || '*Your rendered preview will appear here.*'}
    </ReactMarkdown>
  );
}

function Preview({ type, draft }: { type: PostType; draft: Draft }) {
  const title = draft.title || (type === 'learning' ? 'What are you learning?' : 'Untitled post');
  const excerpt = draft.excerpt || 'A short description will appear here.';
  const tags = draft.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (type === 'watch') {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0b0b0b]">
        <div className="flex aspect-[16/6] items-center justify-center bg-gradient-to-br from-rose-500/20 via-gray-900 to-gray-950 text-rose-100">
          <FiPlayCircle size={38} strokeWidth={1} />
        </div>
        <div className="p-5">
          <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">{draft.details || 'video'}</p>
          <h3 className="text-2xl font-medium tracking-tight text-gray-950 dark:text-white">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{excerpt}</p>
          <div className="mt-5 border-t border-gray-200 pt-5 text-sm dark:border-gray-800">
            <MarkdownPreview body={draft.body} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'reading') {
    return (
      <div className="border-y border-gray-200 py-6 dark:border-gray-800">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">Reading note</p>
            <h3 className="text-3xl font-medium leading-tight tracking-tight text-gray-950 dark:text-white">{title}</h3>
          </div>
          <FiBookOpen className="mt-1 shrink-0 text-gray-400" size={20} />
        </div>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{draft.details || 'Author or source'} · {draft.date || 'YYYY-MM-DD'}</p>
        <div className="text-base">
          <MarkdownPreview body={draft.body} />
        </div>
      </div>
    );
  }

  if (type === 'lesson') {
    return (
      <div className="border-y border-orange-200/70 py-7 dark:border-orange-950/70">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-orange-700 dark:text-orange-400">Timeless reminder</p>
            <h3 className="text-3xl font-medium leading-tight tracking-tight text-gray-950 dark:text-gray-100">{title}</h3>
          </div>
          <FiSunrise className="mt-1 shrink-0 text-orange-600 dark:text-orange-400" size={21} />
        </div>
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">{excerpt}</p>
        <div className="text-base">
          <MarkdownPreview body={draft.body} />
        </div>
      </div>
    );
  }

  if (type === 'learning') {
    return (
      <div className="border-l-2 border-gray-200 pl-5 dark:border-gray-800">
        <h3 className="mb-3 text-base font-medium leading-snug text-gray-950 dark:text-white">{title}</h3>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownPreview body={draft.body} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(tags.length ? tags : ['your-tag']).map((tag) => (
            <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className={cn('mb-8', type === 'article' ? 'border-b border-gray-200 pb-8 dark:border-gray-800' : '')}>
        <h2 className={cn('font-medium leading-tight tracking-tight text-gray-950 dark:text-gray-100', type === 'article' ? 'text-4xl sm:text-5xl' : 'text-3xl')}>
          {title}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-500">
          <span>{draft.date || 'YYYY-MM-DD'}</span>
          <span aria-hidden="true">•</span>
          <span>{draft.readTime || 'reading time'}</span>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">{excerpt}</p>
      </header>
      <article className={cn(type === 'article' ? 'text-lg' : 'text-base')}>
        <MarkdownPreview body={draft.body} />
      </article>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500 dark:text-gray-500">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-gray-400 dark:text-gray-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export default function PostEditor() {
  const [type, setType] = useState<PostType | null>(null);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFTS.article);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selectedPost = useMemo(() => POST_TYPES.find((post) => post.id === type), [type]);

  const updateDraft = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus(null);
  };

  const selectType = (nextType: PostType) => {
    setType(nextType);
    setDraft({ ...DEFAULT_DRAFTS[nextType], date: getLocalDate() });
    setStatus(null);
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = draft.body.slice(start, end) || 'text';
    const nextBody = `${draft.body.slice(0, start)}${prefix}${selection}${suffix}${draft.body.slice(end)}`;
    updateDraft('body', nextBody);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextStart = start + prefix.length;
      textarea.setSelectionRange(nextStart, nextStart + selection.length);
    });
  };

  const save = async () => {
    if (!type) return;
    if (!draft.title.trim() || !draft.body.trim() || (type !== 'learning' && !draft.excerpt.trim())) {
      setStatus({ kind: 'error', message: 'Add a title, description, and some markdown before saving.' });
      return;
    }
    if (type === 'learning' && !draft.tags.trim()) {
      setStatus({ kind: 'error', message: 'Add at least one comma-separated tag to this learning.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    const endpoint = `/api/admin/${type === 'learning' ? 'learnings' : type === 'reading' ? 'readings' : type === 'lesson' ? 'lessons' : `${type}s`}`;
    const payload = type === 'learning'
      ? {
          question: draft.title,
          answer: draft.body,
          tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          date: draft.date,
        }
      : type === 'watch'
      ? {
          title: draft.title,
          excerpt: draft.excerpt,
          date: draft.date,
          format: draft.details,
          markdownBody: draft.body,
        }
      : type === 'reading'
      ? {
          title: draft.title,
          excerpt: draft.excerpt,
          date: draft.date,
          author: draft.details,
          markdownBody: draft.body,
        }
      : type === 'lesson'
      ? {
          title: draft.title,
          excerpt: draft.excerpt,
          date: draft.date,
          source: draft.details,
          markdownBody: draft.body,
        }
      : {
          title: draft.title,
          excerpt: draft.excerpt,
          date: draft.date,
          readTime: draft.readTime,
          markdownBody: draft.body,
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Could not save this post.');
      }
      setStatus({ kind: 'success', message: `${selectedPost?.label || 'Post'} saved to the site.` });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not save this post.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="pt-24">
        <SectionContainer>
          <div className="py-14 sm:py-20">
            <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.25em] text-gray-500 dark:text-gray-600">Publishing desk / 01—02</p>
                <h1 className="text-5xl font-medium tracking-[-0.06em] sm:text-7xl">Make something worth keeping.</h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  Choose the shape of the idea first. The editor will stay close to the way it will actually live on the site.
                </p>
              </div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-mono text-gray-500 transition-colors hover:text-gray-950 dark:hover:text-white">
                <FiArrowLeft size={14} /> Back home
              </Link>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {!type ? (
                <motion.section
                  key="chooser"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  aria-labelledby="choose-post-type"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h2 id="choose-post-type" className="text-sm font-mono uppercase tracking-[0.18em] text-gray-500">What are you making?</h2>
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-600">Choose one to begin</span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {POST_TYPES.map((post, index) => {
                      const Icon = post.icon;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => selectType(post.id)}
                          className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gray-400 hover:shadow-[0_16px_50px_rgba(0,0,0,0.08)] dark:border-gray-800 dark:bg-[#0b0b0b] dark:hover:border-gray-600 dark:hover:shadow-[0_16px_60px_rgba(0,0,0,0.35)]"
                        >
                          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100', post.accent)} />
                          <div className="relative flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                                <Icon size={19} strokeWidth={1.5} />
                              </span>
                              <span className="text-xs font-mono text-gray-400 dark:text-gray-600">0{index + 1}</span>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">{post.eyebrow}</p>
                              <h3 className="mb-3 text-2xl font-medium tracking-tight">{post.label}</h3>
                              <p className="max-w-xs text-sm leading-relaxed text-gray-600 dark:text-gray-400">{post.description}</p>
                              <span className="mt-6 inline-flex items-center gap-2 text-xs font-mono text-gray-500 transition-transform group-hover:translate-x-1 dark:text-gray-400">Start writing <FiArrowRight size={13} /></span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="editor"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => setType(null)} className="inline-flex items-center gap-2 text-sm font-mono text-gray-500 transition-colors hover:text-gray-950 dark:hover:text-white">
                      <FiArrowLeft size={14} /> Change format
                    </button>
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                      <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live preview</span>
                      <span className="text-gray-300 dark:text-gray-700">/</span>
                      <span>{selectedPost?.label}</span>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#0b0b0b] sm:p-6">
                      <div className="mb-7 flex items-center justify-between">
                        <div>
                          <p className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">02 / Compose</p>
                          <h2 className="text-xl font-medium">The raw idea</h2>
                        </div>
                        <FiCode className="text-gray-400" size={18} />
                      </div>

                      <div className="space-y-5">
                        <Field label={type === 'learning' ? 'Question' : 'Title'}>
                          <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder={type === 'learning' ? 'What are you trying to understand?' : 'A title with a point of view'} className="editor-input text-lg" />
                        </Field>

                        {type !== 'learning' && (
                          <Field label="Description" hint="Shown in lists">
                            <textarea value={draft.excerpt} onChange={(event) => updateDraft('excerpt', event.target.value)} rows={2} placeholder="One sentence that earns the next click" className="editor-input resize-none" />
                          </Field>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Date">
                            <input type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} className="editor-input" />
                          </Field>
                          {type === 'article' || type === 'note' ? (
                            <Field label="Read time">
                              <input value={draft.readTime} onChange={(event) => updateDraft('readTime', event.target.value)} placeholder="8 min read" className="editor-input" />
                            </Field>
                          ) : type === 'learning' ? (
                            <Field label="Tags" hint="comma separated">
                              <input value={draft.tags} onChange={(event) => updateDraft('tags', event.target.value)} placeholder="systems, queues" className="editor-input" />
                            </Field>
                          ) : type === 'lesson' ? (
                            <Field label="Source / context">
                              <input value={draft.details} onChange={(event) => updateDraft('details', event.target.value)} placeholder="A person, place, or idea" className="editor-input" />
                            </Field>
                          ) : (
                            <Field label={type === 'watch' ? 'Kind' : 'Author / source'}>
                              <input value={draft.details} onChange={(event) => updateDraft('details', event.target.value)} placeholder={type === 'watch' ? 'movie or video' : 'Who made it?'} className="editor-input" />
                            </Field>
                          )}
                        </div>

                        <Field label="Markdown" hint="Rendered on the right">
                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111]">
                            <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-2 dark:border-gray-800">
                              <button type="button" onClick={() => insertMarkdown('## ', '')} title="Heading" className="editor-tool"><FiHash size={14} /></button>
                              <button type="button" onClick={() => insertMarkdown('**', '**')} title="Bold" className="editor-tool font-bold">B</button>
                              <button type="button" onClick={() => insertMarkdown('`', '`')} title="Inline code" className="editor-tool font-mono">&lt;/&gt;</button>
                              <button type="button" onClick={() => insertMarkdown('```text\n', '\n```')} title="Code block" className="editor-tool"><FiCode size={14} /></button>
                              <span className="ml-auto px-2 text-[10px] font-mono uppercase tracking-wider text-gray-400">Markdown</span>
                            </div>
                            <textarea ref={editorRef} value={draft.body} onChange={(event) => updateDraft('body', event.target.value)} spellCheck={false} className="min-h-[300px] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-200" placeholder="Write in markdown..." />
                          </div>
                        </Field>

                        {status && (
                          <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', status.kind === 'success' ? 'border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300')}>
                            {status.kind === 'success' ? <FiCheck className="mt-0.5 shrink-0" size={15} /> : <FiEye className="mt-0.5 shrink-0" size={15} />}
                            <span>{status.message}</span>
                          </div>
                        )}

                        <button type="button" onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200">
                          <FiSend size={15} /> {saving ? 'Saving…' : 'Save to site'}
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[620px] rounded-2xl border border-gray-200 bg-[#faf9f6] p-5 dark:border-gray-800 dark:bg-[#070707] sm:p-8 lg:p-10">
                      <div className="mb-8 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"><FiEye size={14} /> Rendered item</div>
                      <Preview type={type} draft={draft} />
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </SectionContainer>
      </div>
      <style jsx global>{`
        .editor-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(229 231 235);
          background: transparent;
          padding: 0.7rem 0.85rem;
          font-size: 0.875rem;
          line-height: 1.5;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .editor-input:focus {
          border-color: rgb(107 114 128);
          box-shadow: 0 0 0 3px rgb(107 114 128 / 0.1);
        }
        .dark .editor-input { border-color: rgb(31 41 55); color: rgb(229 231 235); }
        .dark .editor-input:focus { border-color: rgb(107 114 128); }
        .editor-tool {
          display: inline-flex;
          height: 1.8rem;
          min-width: 1.8rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.4rem;
          color: rgb(107 114 128);
          transition: color 150ms ease, background-color 150ms ease;
        }
        .editor-tool:hover { background: rgb(229 231 235); color: rgb(17 24 39); }
        .dark .editor-tool:hover { background: rgb(31 41 55); color: white; }
      `}</style>
    </main>
  );
}
