'use client';

import articlesData from '@/assets/static/json/articles.json';
import learningsData from '@/assets/static/json/learnings.json';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import type { SpotifyNowPlaying } from '@/lib/spotify-types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ValidateResponse = {
  ok: boolean;
  issueCount: number;
  issues: Array<{
    scope: 'learnings' | 'articles';
    message: string;
  }>;
};

type ResourceResponse = {
  resources?: Array<{
    url: string;
  }>;
};

const STORAGE_KEY = 'website.admin.apiKey';

const initialLearningForm = {
  question: '',
  answer: '',
  tags: '',
  date: '',
  codeLanguage: '',
  codeSnippet: '',
};

const initialArticleForm = {
  title: '',
  excerpt: '',
  slug: '',
  date: '',
  readTime: '',
  markdownBody: '',
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {label}
        </span>
        {hint ? (
          <span className="text-xs text-gray-500 dark:text-gray-500">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function inputClassName(multiline = false) {
  return cn(
    'w-full rounded-2xl border border-gray-300/80 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100',
    multiline ? 'min-h-[140px] py-3' : 'h-11'
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const classes =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : tone === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
          : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300';

  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs', classes)}>
      {children}
    </span>
  );
}

export default function AdminConsole() {
  const [apiKey, setApiKey] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState('Enter your admin API key to unlock mutations.');
  const [resourceCount, setResourceCount] = useState<number | null>(null);
  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(null);
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);
  const [learningForm, setLearningForm] = useState(initialLearningForm);
  const [learningMessage, setLearningMessage] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState(initialArticleForm);
  const [articleMessage, setArticleMessage] = useState<string | null>(null);
  const [spotifyState, setSpotifyState] = useState<SpotifyNowPlaying | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const articleCount = (articlesData as Array<{ slug: string }>).length;
  const learningCount = (learningsData as Array<{ id: string }>).length;
  const canMutate = authStatus === 'ready' && apiKey.trim().length > 0;

  async function validateKey(candidate: string, persist = true) {
    if (!candidate.trim()) {
      setAuthStatus('idle');
      setAuthMessage('Enter your admin API key to unlock mutations.');
      return;
    }

    setAuthStatus('checking');
    setAuthMessage('Validating API key...');

    try {
      const response = await fetch('/api/admin/validate', {
        headers: {
          'x-api-key': candidate.trim(),
        },
        cache: 'no-store',
      });

      const payload = (await response.json()) as ValidateResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in payload && payload.error ? payload.error : 'Admin validation failed'
        );
      }

      setAuthStatus('ready');
      setAuthMessage('Admin access validated.');
      setValidateResult(payload as ValidateResponse);

      if (persist) {
        window.localStorage.setItem(STORAGE_KEY, candidate.trim());
      }
    } catch (error) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Admin validation failed');
      setValidateResult(null);
      if (persist) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  async function callAdmin<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json()) as T & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `Request failed with status ${response.status}`);
    }

    return payload as T;
  }

  async function refreshValidation() {
    if (!canMutate) return;
    setBusyAction('validate');
    try {
      const payload = await callAdmin<ValidateResponse>('/api/admin/validate', {
        method: 'GET',
      });
      setValidateResult(payload);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshSpotifyState() {
    try {
      const response = await fetch('/api/spotify/now-playing');
      const payload = (await response.json()) as SpotifyNowPlaying;
      setSpotifyState(payload);
    } catch {
      setSpotifyState(null);
    }
  }

  useEffect(() => {
    const storedKey = window.localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      void validateKey(storedKey, false);
    }

    void refreshSpotifyState();

    let active = true;
    const loadResources = async () => {
      try {
        const response = await fetch('/api/resources', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as ResourceResponse;
        if (active && Array.isArray(payload.resources)) {
          setResourceCount(payload.resources.length);
        }
      } catch {
        // Keep the count empty when the resources API is unavailable.
      }
    };

    void loadResources();

    return () => {
      active = false;
    };
  }, []);

  const validationTone = useMemo<'neutral' | 'success' | 'warning'>(() => {
    if (!validateResult) return 'neutral';
    return validateResult.ok ? 'success' : 'warning';
  }, [validateResult]);

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20">
            <div className="mb-12 max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-gray-500">
                Admin
              </p>
              <h1 className="text-5xl font-medium tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl">
                Control plane for site content and Spotify.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
                This page sits on top of the existing admin APIs. Use it to validate content,
                create learnings and articles, ingest bookmarks, and bootstrap Spotify now
                playing.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      Admin access
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Uses the same `ADMIN_API_KEY` expected by the server routes.
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      authStatus === 'ready'
                        ? 'success'
                        : authStatus === 'error'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {authStatus === 'ready'
                      ? 'Authenticated'
                      : authStatus === 'checking'
                        ? 'Checking'
                        : authStatus === 'error'
                          ? 'Rejected'
                          : 'Locked'}
                  </StatusPill>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Paste ADMIN_API_KEY"
                    className={inputClassName()}
                  />
                  <button
                    type="button"
                    onClick={() => void validateKey(apiKey)}
                    className="h-11 rounded-2xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey('');
                      setAuthStatus('idle');
                      setAuthMessage('Enter your admin API key to unlock mutations.');
                      setValidateResult(null);
                      window.localStorage.removeItem(STORAGE_KEY);
                    }}
                    className="h-11 rounded-2xl border border-gray-300 px-4 text-sm text-gray-700 transition hover:border-gray-500 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
                  >
                    Clear
                  </button>
                </div>

                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{authMessage}</p>
              </section>

              <aside className="space-y-6">
                <section className="rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    Current footprint
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-500">
                        Articles
                      </p>
                      <p className="mt-2 text-2xl font-medium">{articleCount}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-500">
                        Learnings
                      </p>
                      <p className="mt-2 text-2xl font-medium">{learningCount}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-500">
                        Bookmarks
                      </p>
                      <p className="mt-2 text-2xl font-medium">
                        {resourceCount === null ? '...' : resourceCount}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                        Spotify
                      </h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Bootstrap OAuth once, then the homepage polls the public now-playing
                        route.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshSpotifyState()}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 transition hover:border-gray-500 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusPill
                      tone={
                        spotifyState?.state === 'playing'
                          ? 'success'
                          : spotifyState?.state === 'unauthorized'
                            ? 'warning'
                            : spotifyState?.state === 'error'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {spotifyState?.state ?? 'unknown'}
                    </StatusPill>
                    {spotifyState?.title ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {spotifyState.title}
                        {spotifyState.artists.length > 0
                          ? ` · ${spotifyState.artists.join(', ')}`
                          : ''}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/spotify/auth"
                      className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
                    >
                      Open Spotify OAuth helper
                    </Link>
                    <a
                      href="/api/spotify/now-playing"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-500 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
                    >
                      Inspect now-playing JSON
                    </a>
                  </div>
                </section>
              </aside>
            </div>

            <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    Content health
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Runs the existing `GET /api/admin/validate` check across learnings and
                    articles metadata.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canMutate || busyAction === 'validate'}
                  onClick={() => void refreshValidation()}
                  className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {busyAction === 'validate' ? 'Running...' : 'Run validation'}
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <StatusPill tone={validationTone}>
                  {validateResult
                    ? validateResult.ok
                      ? 'No issues found'
                      : `${validateResult.issueCount} issue${validateResult.issueCount === 1 ? '' : 's'}`
                    : 'Not run yet'}
                </StatusPill>
              </div>

              {validateResult?.issues.length ? (
                <div className="mt-4 grid gap-3">
                  {validateResult.issues.map((issue) => (
                    <div
                      key={`${issue.scope}-${issue.message}`}
                      className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
                    >
                      <span className="mr-2 font-medium uppercase tracking-wide">
                        {issue.scope}
                      </span>
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-5">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    Add bookmark
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Ingest a URL and let the server extract metadata before saving it to the
                    bookmarks database.
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!canMutate) return;

                    setBusyAction('bookmark');
                    setBookmarkMessage(null);

                    void callAdmin<{ ok: true; url: string; bookmark: { title: string } }>(
                      '/api/admin/bookmarks',
                      {
                        method: 'POST',
                        body: JSON.stringify({ url: bookmarkUrl.trim() }),
                      }
                    )
                      .then((payload) => {
                        setBookmarkMessage(`Saved bookmark: ${payload.bookmark.title}`);
                        setBookmarkUrl('');
                        setResourceCount((count) => (count === null ? count : count + 1));
                      })
                      .catch((error) => {
                        setBookmarkMessage(error instanceof Error ? error.message : 'Bookmark failed');
                      })
                      .finally(() => {
                        setBusyAction(null);
                      });
                  }}
                >
                  <Field label="URL">
                    <input
                      type="url"
                      value={bookmarkUrl}
                      onChange={(event) => setBookmarkUrl(event.target.value)}
                      placeholder="https://..."
                      className={inputClassName()}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={!canMutate || busyAction === 'bookmark'}
                    className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {busyAction === 'bookmark' ? 'Saving...' : 'Save bookmark'}
                  </button>
                </form>

                {bookmarkMessage ? (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {bookmarkMessage}
                  </p>
                ) : null}
              </section>

              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-5">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    Add learning
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Creates a new learning entry in the JSON store.
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!canMutate) return;

                    setBusyAction('learning');
                    setLearningMessage(null);

                    const payload = {
                      question: learningForm.question.trim(),
                      answer: learningForm.answer.trim(),
                      tags: learningForm.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                      ...(learningForm.date.trim() ? { date: learningForm.date.trim() } : {}),
                      ...(learningForm.codeLanguage.trim()
                        ? { codeLanguage: learningForm.codeLanguage.trim() }
                        : {}),
                      ...(learningForm.codeSnippet.trim()
                        ? { codeSnippet: learningForm.codeSnippet }
                        : {}),
                    };

                    void callAdmin<{ learning: { id: string } }>('/api/admin/learnings', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                      .then((response) => {
                        setLearningMessage(`Created learning: ${response.learning.id}`);
                        setLearningForm(initialLearningForm);
                      })
                      .catch((error) => {
                        setLearningMessage(error instanceof Error ? error.message : 'Learning failed');
                      })
                      .finally(() => {
                        setBusyAction(null);
                      });
                  }}
                >
                  <Field label="Question">
                    <input
                      type="text"
                      value={learningForm.question}
                      onChange={(event) =>
                        setLearningForm((current) => ({
                          ...current,
                          question: event.target.value,
                        }))
                      }
                      className={inputClassName()}
                    />
                  </Field>

                  <Field label="Answer">
                    <textarea
                      value={learningForm.answer}
                      onChange={(event) =>
                        setLearningForm((current) => ({
                          ...current,
                          answer: event.target.value,
                        }))
                      }
                      className={inputClassName(true)}
                    />
                  </Field>

                  <Field label="Tags" hint="Comma separated">
                    <input
                      type="text"
                      value={learningForm.tags}
                      onChange={(event) =>
                        setLearningForm((current) => ({
                          ...current,
                          tags: event.target.value,
                        }))
                      }
                      className={inputClassName()}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Date" hint="Optional">
                      <input
                        type="date"
                        value={learningForm.date}
                        onChange={(event) =>
                          setLearningForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className={inputClassName()}
                      />
                    </Field>

                    <Field label="Code language" hint="Optional">
                      <input
                        type="text"
                        value={learningForm.codeLanguage}
                        onChange={(event) =>
                          setLearningForm((current) => ({
                            ...current,
                            codeLanguage: event.target.value,
                          }))
                        }
                        className={inputClassName()}
                      />
                    </Field>
                  </div>

                  <Field label="Code snippet" hint="Optional">
                    <textarea
                      value={learningForm.codeSnippet}
                      onChange={(event) =>
                        setLearningForm((current) => ({
                          ...current,
                          codeSnippet: event.target.value,
                        }))
                      }
                      className={inputClassName(true)}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={!canMutate || busyAction === 'learning'}
                    className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {busyAction === 'learning' ? 'Creating...' : 'Create learning'}
                  </button>
                </form>

                {learningMessage ? (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {learningMessage}
                  </p>
                ) : null}
              </section>

              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-5">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    Add article
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Adds article metadata and writes the markdown file in one request.
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!canMutate) return;

                    setBusyAction('article');
                    setArticleMessage(null);

                    const payload = {
                      title: articleForm.title.trim(),
                      excerpt: articleForm.excerpt.trim(),
                      ...(articleForm.slug.trim() ? { slug: articleForm.slug.trim() } : {}),
                      ...(articleForm.date.trim() ? { date: articleForm.date.trim() } : {}),
                      ...(articleForm.readTime.trim()
                        ? { readTime: articleForm.readTime.trim() }
                        : {}),
                      ...(articleForm.markdownBody.trim()
                        ? { markdownBody: articleForm.markdownBody }
                        : {}),
                    };

                    void callAdmin<{ article: { slug: string } }>('/api/admin/articles', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                      .then((response) => {
                        setArticleMessage(`Created article: ${response.article.slug}`);
                        setArticleForm(initialArticleForm);
                      })
                      .catch((error) => {
                        setArticleMessage(error instanceof Error ? error.message : 'Article failed');
                      })
                      .finally(() => {
                        setBusyAction(null);
                      });
                  }}
                >
                  <Field label="Title">
                    <input
                      type="text"
                      value={articleForm.title}
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className={inputClassName()}
                    />
                  </Field>

                  <Field label="Excerpt">
                    <textarea
                      value={articleForm.excerpt}
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          excerpt: event.target.value,
                        }))
                      }
                      className={inputClassName(true)}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Slug" hint="Optional">
                      <input
                        type="text"
                        value={articleForm.slug}
                        onChange={(event) =>
                          setArticleForm((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                        className={inputClassName()}
                      />
                    </Field>

                    <Field label="Date" hint="Optional">
                      <input
                        type="date"
                        value={articleForm.date}
                        onChange={(event) =>
                          setArticleForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className={inputClassName()}
                      />
                    </Field>

                    <Field label="Read time" hint="Optional">
                      <input
                        type="text"
                        value={articleForm.readTime}
                        onChange={(event) =>
                          setArticleForm((current) => ({
                            ...current,
                            readTime: event.target.value,
                          }))
                        }
                        placeholder="8 min read"
                        className={inputClassName()}
                      />
                    </Field>
                  </div>

                  <Field label="Markdown body" hint="Optional">
                    <textarea
                      value={articleForm.markdownBody}
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          markdownBody: event.target.value,
                        }))
                      }
                      className={inputClassName(true)}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={!canMutate || busyAction === 'article'}
                    className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {busyAction === 'article' ? 'Creating...' : 'Create article'}
                  </button>
                </form>

                {articleMessage ? (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {articleMessage}
                  </p>
                ) : null}
              </section>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
