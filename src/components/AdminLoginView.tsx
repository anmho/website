'use client';

import SectionContainer from '@/components/SectionContainer';
import type { AdminAuthMode } from '@/lib/adminAuth';

export default function AdminLoginView({ mode }: { mode: AdminAuthMode }) {
  return (
    <main className="min-h-screen w-full text-gray-900 dark:text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-20">
        <SectionContainer>
          <div className="mx-auto max-w-xl">
            <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Private studio / admin</p>
            <h1 className="max-w-lg text-5xl leading-[0.98] tracking-[-0.06em] sm:text-7xl">Enter the values lab.</h1>
            <p className="mt-8 max-w-lg text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:text-xl">The Decisions page uses the complete Tenet set, including entries marked private. It is only available to the site administrator.</p>
            {mode === 'cloudflare' ? (
              <div className="mt-12 border-y border-gray-200 py-8 sm:py-10 dark:border-[#252525]">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Cloudflare Access is required</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Sign in with the identity provider configured for this site, then return here.</p>
                <a href="/cdn-cgi/access/login" className="mt-6 inline-flex items-center justify-center rounded-sm bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">Continue with Cloudflare Access</a>
              </div>
            ) : (
              <div className="mt-12 border-y border-amber-300/60 py-8 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:text-amber-200">Admin authentication is not configured. Set the Cloudflare Access team domain and application audience on the server before deploying this private area.</div>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
