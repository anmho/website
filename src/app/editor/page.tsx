import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import PostEditor from '@/components/PostEditor';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSession,
  isAdminOAuthConfigured,
} from '@/lib/controlPlaneAuth';

export const metadata: Metadata = {
  title: 'Editor — Andrew Ho',
  description: 'Create articles, notes, and learnings in a live markdown editor.',
};

export const dynamic = 'force-dynamic';

type EditorPageProps = {
  searchParams?: {
    auth?: string;
  };
};

export default function EditorPage({ searchParams }: EditorPageProps) {
  const session = getAdminSession(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  if (session) return <PostEditor />;

  const authMessage = searchParams?.auth === 'denied'
    ? 'That GitHub account is not on the private editor allowlist.'
    : searchParams?.auth
    ? 'GitHub sign-in could not be completed. Try again.'
    : isAdminOAuthConfigured()
    ? 'Sign in with the allowlisted GitHub account to continue.'
    : 'GitHub OAuth is not configured for this deployment yet.';

  return (
    <main className="min-h-screen overflow-hidden text-gray-900 dark:text-white">
      <Navbar />
      <div className="pt-24">
        <SectionContainer>
          <div className="flex min-h-[70vh] items-center justify-center py-20">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-[#0b0b0b] sm:p-10">
              <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.25em] text-gray-500">Private publishing desk</p>
              <h1 className="text-4xl font-medium tracking-[-0.05em]">Editor access</h1>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">{authMessage}</p>
              {isAdminOAuthConfigured() ? (
                <a
                  href="/api/auth/github/login?returnTo=%2Feditor"
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  Continue with GitHub
                </a>
              ) : null}
              <div className="mt-6">
                <Link href="/" className="text-sm text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-950 dark:hover:text-white">
                  Back home
                </Link>
              </div>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
