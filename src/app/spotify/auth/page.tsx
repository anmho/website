import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Spotify OAuth',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SpotifyAuthPage() {
  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex flex-col items-center pt-32">
        <SectionContainer>
          <div className="w-full py-20">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-10">
              <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-gray-500">
                Spotify OAuth
              </p>
              <h1 className="mt-4 text-4xl font-medium tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
                Bootstrap your Spotify refresh token.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
                This is a one-time helper page. After consent, Spotify redirects you to the
                callback route and returns a `refreshToken` you can store as
                `SPOTIFY_REFRESH_TOKEN`.
              </p>

              <ol className="mt-8 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                <li>1. Add Spotify client credentials and the redirect URI to your environment.</li>
                <li>2. Confirm the same callback URL is allowed in the Spotify developer app.</li>
                <li>3. Start the OAuth flow.</li>
                <li>4. Copy the returned `refreshToken` from the callback JSON.</li>
                <li>5. Save it as `SPOTIFY_REFRESH_TOKEN` and redeploy if needed.</li>
              </ol>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/api/spotify/login"
                  className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
                >
                  Authorize Spotify
                </a>
                <Link
                  href="/"
                  className="rounded-2xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-500 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
                >
                  Back home
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Callback route:
                <code className="ml-2 rounded bg-white px-2 py-1 text-xs text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                  /api/spotify/callback
                </code>
              </div>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
