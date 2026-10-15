'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import SectionContainer from '@/components/SectionContainer';
import Navbar from '@/components/Navbar';

type DecisionTenet = { id: string; title: string; private: boolean };
type DecisionProbability = { value: string; probability: number };
type DecisionAnswer = { choice: string; probabilities: unknown; confidence: unknown };
type DecisionResult = { answer: DecisionAnswer; model: string; tenets: DecisionTenet[] };
type OptionThread = { id: string; label: string; messages: string[]; draft: string };

function probabilitiesOf(value: unknown): DecisionProbability[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DecisionProbability => (
    Boolean(item) && typeof item === 'object' && typeof (item as DecisionProbability).value === 'string' && typeof (item as DecisionProbability).probability === 'number'
  ));
}

function newOption(id: number): OptionThread {
  return { id: `option-${id}`, label: '', messages: [], draft: '' };
}

const starters = [
  'Which opportunity should I commit to next?',
  'Should I protect my current stability or take the more ambitious path?',
  'What should I say no to so I can focus on the life I want?',
];

export default function DecisionsView({ tenets }: { tenets: DecisionTenet[] }) {
  const [decision, setDecision] = useState('');
  const [options, setOptions] = useState<OptionThread[]>([newOption(1), newOption(2)]);
  const [state, setState] = useState('');
  const [constraints, setConstraints] = useState('');
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const updateOption = (id: string, update: Partial<OptionThread>) => {
    setOptions((current) => current.map((option) => option.id === id ? { ...option, ...update } : option));
  };

  const addContext = (id: string) => {
    setOptions((current) => current.map((option) => {
      if (option.id !== id || !option.draft.trim() || option.messages.length >= 12) return option;
      return { ...option, messages: [...option.messages, option.draft.trim()], draft: '' };
    }));
  };

  const handleContextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      addContext(id);
    }
  };

  const choose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const preparedOptions = options
      .map((option) => ({ ...option, label: option.label.trim(), draft: option.draft.trim() }))
      .filter((option) => option.label);

    if (decision.trim().length < 10 || preparedOptions.length < 2) {
      setError('Describe the decision and give it at least two named options.');
      return;
    }
    if (preparedOptions.some((option) => option.draft)) {
      setError('Add each pending context note to its option thread before comparing.');
      return;
    }

    const labels = preparedOptions.map((option) => option.label);
    if (new Set(labels).size !== labels.length) {
      setError('Give each option a distinct name.');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          options: preparedOptions.map((option) => ({ value: option.label, context: option.messages })),
          state,
          constraints,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as DecisionResult | { error?: string } | null;
      if (!response.ok) throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Decision failed.');
      if (!payload || !('answer' in payload)) throw new Error('Decision returned an unexpected response.');
      setResult(payload);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      setError(caughtError instanceof Error ? caughtError.message : 'Decision failed.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  };

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20 text-left">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Private studio / Decisions API</p>
                <h1 className="max-w-3xl text-5xl leading-[0.98] tracking-[-0.06em] sm:text-7xl">Think out loud, then choose.</h1>
                <p className="mt-8 max-w-2xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:text-xl">Give the decision a question. Give each path its own conversation. The model compares the context you collected through the complete Tenet set.</p>
              </div>
              <button type="button" onClick={logout} className="self-start rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">Sign out</button>
            </div>

            <form onSubmit={choose} className="mt-16 rounded-[2rem] border border-gray-200 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 dark:border-gray-800 dark:bg-gray-950/70 dark:shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label htmlFor="decision" className="text-sm font-medium">What are you deciding?</label><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600">POST /api/decisions</span></div>
              <textarea id="decision" value={decision} onChange={(event) => setDecision(event.target.value)} placeholder="I am deciding whether..." maxLength={4000} rows={4} className="mt-5 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-base leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white" />

              <div className="mt-10 flex items-end justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800"><div><p className="text-sm font-medium">Open a thread for each option</p><p className="mt-1 text-xs leading-relaxed text-gray-500">Dump in facts, feelings, memories, risks, and reasons. Press Ctrl or Cmd + Enter to add a note.</p></div><button type="button" disabled={options.length >= 8} onClick={() => setOptions((current) => [...current, newOption(current.length + 1)])} className="shrink-0 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">+ Add option</button></div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {options.map((option, index) => <OptionThreadCard key={option.id} option={option} index={index} onChange={updateOption} onAddContext={addContext} onContextKeyDown={handleContextKeyDown} />)}
              </div>

              <div className="mt-8 grid gap-5 border-t border-gray-200 pt-8 sm:grid-cols-2 dark:border-gray-800">
                <div><label htmlFor="state" className="block text-sm font-medium">Current state <span className="font-normal text-gray-400">(optional)</span></label><textarea id="state" value={state} onChange={(event) => setState(event.target.value)} placeholder="What is true right now?" maxLength={4000} rows={4} className="mt-3 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white" /></div>
                <div><label htmlFor="constraints" className="block text-sm font-medium">Constraints <span className="font-normal text-gray-400">(optional)</span></label><textarea id="constraints" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="What must the choice respect?" maxLength={4000} rows={4} className="mt-3 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white" /></div>
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-gray-500">Private Tenets are included in this request.</p><button type="submit" disabled={isLoading} className="rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">{isLoading ? 'Choosing…' : 'Compare these paths'}</button></div>
              {error ? <p role="alert" className="mt-5 rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
            </form>

            <div className="mt-12 grid gap-10 border-t border-gray-200 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)] dark:border-gray-900">
              <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Try a starting point</p><div className="mt-4 flex flex-wrap gap-2">{starters.map((starter) => <button key={starter} type="button" onClick={() => setDecision(starter)} className="rounded-full border border-gray-200 px-3 py-2 text-left text-xs leading-relaxed text-gray-600 transition-colors hover:border-amber-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-white">{starter}</button>)}</div></div>
              <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Complete Tenets in the lens</p><div className="mt-4 flex flex-wrap gap-2">{tenets.map((tenet) => <span key={tenet.id} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">{tenet.title}{tenet.private ? ' · private' : ''}</span>)}</div></div>
            </div>

            {result ? <section aria-live="polite" className="mt-16 border-t border-gray-200 pt-10 dark:border-gray-900"><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">The answer</p><h2 className="mt-4 max-w-3xl text-4xl leading-tight tracking-[-0.04em] sm:text-6xl">{result.answer.choice}</h2><p className="mt-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">This is the path that best matches the complete Tenet set as interpreted by the Decisions API. It is a values lens, not certainty or professional advice. Model: <span className="font-mono">{result.model}</span>.</p>{probabilitiesOf(result.answer.probabilities).length > 0 ? <div className="mt-10 max-w-2xl space-y-4"><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Distribution</p>{probabilitiesOf(result.answer.probabilities).map((item) => <div key={item.value}><div className="flex justify-between gap-4 text-sm"><span>{item.value}</span><span className="font-mono text-gray-500">{Math.round(item.probability * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%` }} /></div></div>)}</div> : null}</section> : null}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function OptionThreadCard({ option, index, onChange, onAddContext, onContextKeyDown }: { option: OptionThread; index: number; onChange: (id: string, update: Partial<OptionThread>) => void; onAddContext: (id: string) => void; onContextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>, id: string) => void }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div className="flex items-center gap-3"><span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">0{index + 1}</span><input aria-label={`Option ${index + 1} name`} value={option.label} onChange={(event) => onChange(option.id, { label: event.target.value })} placeholder={`Option ${index + 1}`} maxLength={200} className="min-w-0 flex-1 bg-transparent text-lg tracking-tight outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600" /></div></div>
      <div className="min-h-36 space-y-3 px-5 py-5">{option.messages.length > 0 ? option.messages.map((message, messageIndex) => <div key={`${option.id}-${messageIndex}`} className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 shadow-sm dark:bg-gray-950 dark:text-gray-300"><p className="mb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600">Context {String(messageIndex + 1).padStart(2, '0')}</p>{message}</div>) : <p className="text-sm leading-relaxed text-gray-400 dark:text-gray-600">No context yet. Start dumping what this path means to you.</p>}</div>
      <div className="border-t border-gray-200 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-950/40"><textarea aria-label={`Add context to option ${index + 1}`} value={option.draft} onChange={(event) => onChange(option.id, { draft: event.target.value })} onKeyDown={(event) => onContextKeyDown(event, option.id)} placeholder="Add context, evidence, doubts, or a memory..." maxLength={4000} rows={3} className="w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-600" /><button type="button" onClick={() => onAddContext(option.id)} disabled={!option.draft.trim() || option.messages.length >= 12} className="mt-3 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-600 transition-colors hover:border-amber-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:text-white">Add to thread</button></div>
    </article>
  );
}
