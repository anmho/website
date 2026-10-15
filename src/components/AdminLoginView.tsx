'use client';

import { useState, type FormEvent } from 'react';
import SectionContainer from '@/components/SectionContainer';

export default function AdminLoginView() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Could not sign in.');
      window.location.assign('/decisions');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not sign in.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full text-gray-900 dark:text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-20">
        <SectionContainer>
          <div className="mx-auto max-w-xl">
            <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Private studio / admin</p>
            <h1 className="max-w-lg text-5xl leading-[0.98] tracking-[-0.06em] sm:text-7xl">Enter the values lab.</h1>
            <p className="mt-8 max-w-lg text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:text-xl">The Decisions page uses the complete Tenet set, including entries marked private. It is only available to the site administrator.</p>
            <form onSubmit={login} className="mt-12 rounded-[2rem] border border-gray-200 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 dark:border-gray-800 dark:bg-gray-950/70 dark:shadow-black/20">
              <label htmlFor="admin-password" className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin password</label>
              <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-white" required />
              <button type="submit" disabled={isLoading} className="mt-6 w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">{isLoading ? 'Signing in…' : 'Continue'}</button>
              {error ? <p role="alert" className="mt-5 rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
            </form>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
