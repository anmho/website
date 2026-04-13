import Link from 'next/link';

export default function SpotifyAuthPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-24 text-gray-100">
      <h1 className="text-2xl font-semibold">Spotify OAuth Bootstrap</h1>
      <p className="mt-3 text-sm text-gray-400">
        Use this one-time page to authorize your Spotify account and mint a refresh token for server-side
        use.
      </p>

      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-gray-300">
        <li>Ensure your `.env.local` includes Spotify client credentials and redirect URI.</li>
        <li>Click “Authorize Spotify”.</li>
        <li>
          After Spotify redirects back to <code>/api/spotify/callback</code>, copy the returned{' '}
          <code>refreshToken</code>.
        </li>
        <li>Set that value as `SPOTIFY_REFRESH_TOKEN` in your environment.</li>
      </ol>

      <div className="mt-8">
        <Link
          href="/api/spotify/login"
          className="inline-flex rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
        >
          Authorize Spotify
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        After this one-time consent, the backend continuously refreshes Spotify access tokens using the
        stored refresh token.
      </p>
    </main>
  );
}
