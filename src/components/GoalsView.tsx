'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import { formatDate } from '@/lib/utils';

export type GoalTenet = {
  id: string;
  title: string;
  excerpt: string;
  source?: string;
};

export type GoalJournalEntry = {
  id: string;
  date: string;
  kind: 'goal' | 'shift' | 'reflection';
  title: string;
  summary: string;
  tags?: string[];
  age?: number | null;
};

type GoalReflection = {
  recommendation: string;
  reasoning: string;
  alignedTenets: Array<{ title: string; reasoning: string }>;
  tensions: string[];
  nextSteps: string[];
  questions: string[];
};

type GoalResponse = {
  reflection: GoalReflection;
};

const starterGoals = [
  'Should I pursue this opportunity, even if it costs me stability?',
  'What should I optimize for in the next phase of my life?',
  'Is this a hard problem worth committing to for the long term?',
];

const notionGoalsUrl = 'https://app.notion.com/p/Goals-40074d166b9f80c1861fc5d04c821b1b';

export default function GoalsView({ tenets, entries }: { tenets: GoalTenet[]; entries: GoalJournalEntry[] }) {
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [reflection, setReflection] = useState<GoalReflection | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const reflect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (goal.trim().length < 10) {
      setError('Give the decision enough detail to think about.');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setReflection(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, context }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as
        | GoalResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Reflection failed.');
      }

      if (!payload || !('reflection' in payload)) {
        throw new Error('Reflection returned an unexpected response.');
      }

      setReflection(payload.reflection);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      setError(caughtError instanceof Error ? caughtError.message : 'Reflection failed.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20 text-left">
            <div className="grid gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
              <div>
                <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                  Private goals studio
                </p>
                <h1 className="max-w-3xl text-5xl leading-[0.98] tracking-[-0.06em] sm:text-7xl">
                  Make the goal answer to the life.
                </h1>
                <p className="mt-8 max-w-xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:text-xl">
                  Bring a decision here. The reflection uses the complete Tenet set as a values lens, then returns alignment, tension, and a next move.
                </p>
              </div>
              <div className="border-l border-gray-300 pl-6 text-sm leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">
                  The boundary
                </p>
                <p className="mt-4">
                  This is a private thinking partner, not an oracle. It should not replace professional advice for high-stakes decisions.
                </p>
              </div>
            </div>

            <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <a
                href={notionGoalsUrl}
                target="_blank"
                rel="noreferrer"
                className="group col-span-full flex flex-col justify-between gap-6 rounded-[2rem] border border-amber-200/80 bg-amber-50/70 p-6 transition-colors hover:border-amber-400 sm:flex-row sm:items-center sm:p-8 dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Current checklist</p>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
                    The live goals hierarchy, leaf checklists, and personal context live in the private Notion page.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-gray-900 transition-transform group-hover:translate-x-1 dark:text-white">Open goals in Notion ↗</span>
              </a>

              <form onSubmit={reflect} className="rounded-[2rem] border border-gray-200 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 dark:border-gray-800 dark:bg-gray-950/70 dark:shadow-black/20">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="goal" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    What are you trying to decide?
                  </label>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600">
                    POST /api/goals
                  </span>
                </div>
                <textarea
                  id="goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="I am deciding whether..."
                  maxLength={4000}
                  rows={6}
                  className="mt-5 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-base leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-600"
                />
                <label htmlFor="context" className="mt-6 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Context <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="What constraints, tradeoffs, or facts matter?"
                  maxLength={4000}
                  rows={3}
                  className="mt-3 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-600"
                />
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-500">
                    Your goal is sent only when you ask for a reflection.
                  </p>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {isLoading ? 'Thinking…' : 'Reflect on this'}
                  </button>
                </div>
                {error ? (
                  <p role="alert" className="mt-5 rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </p>
                ) : null}
              </form>

              <div className="space-y-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                  Try a starting point
                </p>
                {starterGoals.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => setGoal(starter)}
                    className="group block w-full border-b border-gray-200 pb-4 text-left text-sm leading-relaxed text-gray-600 transition-colors hover:text-gray-900 dark:border-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <span className="mr-2 text-amber-600 transition-transform group-hover:mr-3 dark:text-amber-400">↳</span>
                    {starter}
                  </button>
                ))}
                <div className="pt-8">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                    Public Tenets in the lens
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tenets.map((tenet) => (
                      <span key={tenet.id} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
                        {tenet.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {reflection ? (
              <section aria-live="polite" className="mt-16 border-t border-gray-200 pt-10 dark:border-gray-900">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Reflection</p>
                    <h2 className="mt-4 max-w-3xl text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">{reflection.recommendation}</h2>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">{reflection.reasoning}</p>
                  </div>
                  <div className="space-y-8">
                    <ResultList title="Next moves" items={reflection.nextSteps} />
                    <ResultList title="Questions to keep open" items={reflection.questions} />
                  </div>
                </div>
                <div className="mt-12 grid gap-8 border-t border-gray-200 pt-8 md:grid-cols-2 dark:border-gray-900">
                  <ResultList title="Where the Tenets agree" items={reflection.alignedTenets.map((item) => `${item.title}: ${item.reasoning}`)} />
                  <ResultList title="Where they create tension" items={reflection.tensions} />
                </div>
              </section>
            ) : null}

            <section aria-labelledby="goal-changelog" className="mt-24 border-t border-gray-200 pt-10 dark:border-gray-900">
              <div className="grid gap-6 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:items-end">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Journal / changelog</p>
                  <h2 id="goal-changelog" className="mt-4 text-3xl tracking-[-0.04em] sm:text-5xl">A life in revision.</h2>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Goals are also a record of changing taste. Each entry marks something I wanted, noticed, or chose to reconsider.
                </p>
              </div>

              {entries.length > 0 ? (
                <div className="relative mt-12 ml-2 border-l border-gray-200 dark:border-gray-800">
                  {entries.map((entry) => (
                    <article key={entry.id} className="relative pb-12 pl-8 last:pb-0 sm:pl-12">
                      <span aria-hidden="true" className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-white dark:bg-amber-400 dark:ring-gray-950" />
                      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                          {entry.age !== null && entry.age !== undefined ? (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">Age {entry.age}</p>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">{entry.kind}</p>
                          <h3 className="mt-2 text-xl tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">{entry.title}</h3>
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">{entry.summary}</p>
                          {entry.tags?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {entry.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-gray-500 dark:border-gray-800 dark:text-gray-500">{tag}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-12 border-t border-gray-200 pt-8 text-sm text-gray-600 dark:border-gray-900 dark:text-gray-400">No journal entries yet.</p>
              )}
              <p className="mt-10 text-xs leading-relaxed text-gray-400 dark:text-gray-600">
                Age is derived from the private server-side <code className="font-mono">BIRTH_DATE</code> setting. The birthday itself is never published.
              </p>
            </section>

            <div className="mt-16 grid gap-6 border-t border-gray-200 pt-8 text-sm dark:border-gray-900 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">Agent interface</p>
                <p className="mt-3 max-w-2xl leading-relaxed text-gray-600 dark:text-gray-400">
                  Agents can discover the same public Tenets and structured reflection contract without scraping the page.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                <a href="/api/tenets" className="rounded-full border border-gray-200 px-3 py-2 text-gray-600 hover:border-gray-400 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-600">GET /api/tenets</a>
                <a href="/api/openapi" className="rounded-full border border-gray-200 px-3 py-2 text-gray-600 hover:border-gray-400 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-600">OpenAPI</a>
              </div>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3">
            <span className="font-mono text-amber-600 dark:text-amber-400">{String(index + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
