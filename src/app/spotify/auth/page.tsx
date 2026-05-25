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

export default function SpotifyAuthPage({
  searchParams,
}: {
  searchParams?: { connected?: string; error?: string };
}) {
  const isConnected = searchParams?.connected === '1';
  const hasError = Boolean(searchParams?.error);
  const isUnsupportedOrigin = searchParams?.error === 'unsupported-origin';

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
                Connect Spotify to your website.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
                This is a one-time login flow. The login route reads your Spotify OAuth
                credentials and stable redirect URIs from Vault. OAuth bootstrap is
                supported on localhost and production; preview deployments can render
                the existing Vault token state after production or local setup.
              </p>

              {isConnected ? (
                <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-300">
                  Spotify is connected. Token state was stored in Vault.
                </div>
              ) : null}

              {hasError ? (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                  {isUnsupportedOrigin
                    ? 'Spotify OAuth bootstrap is only supported from localhost:3000 and anmho.com. Preview deployments can still render now-playing once Vault has a token.'
                    : 'Spotify login did not complete. Check the redirect URI, Vault env vars, and server logs, then try again.'}
                </div>
              ) : null}

              <ol className="mt-8 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                <li>
                  1. Create or open an app in the{' '}
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 underline-offset-4 hover:underline dark:text-green-400"
                  >
                    Spotify Developer Dashboard
                  </a>
                  , then copy its Client ID and Client Secret.
                </li>
                <li>2. Register localhost and production callback URLs in the Spotify developer app.</li>
                <li>3. Store Spotify client credentials and redirect URLs in Vault.</li>
                <li>4. Start the OAuth flow and approve access with your Spotify account.</li>
                <li>5. The callback stores token state in Vault and returns here.</li>
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
