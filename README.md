# Personal Website

Andrew Ho's personal website built with Next.js.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- React Icons

## Build

```bash
npm run build
npm start
```

## Spotify Now Playing

The home page can show the Spotify track currently playing on your account. It
uses Spotify's documented [Authorization Code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
once to create a token bundle, stores that bundle in Vault, then uses
Spotify's [refresh token flow](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
from Vercel Cron to keep the access token current.

### Environment Variables

```bash
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token
SPOTIFY_VAULT_MOUNT=secret
SPOTIFY_VAULT_PATH=prod/apps/website/spotify
CRON_SECRET=your-secret-string
```

For Vercel previews and production, set the same variables in the matching
Vercel environment. The preview redirect URI must also be registered in the
Spotify developer app before the OAuth callback will work there.

### OAuth Bootstrap

1. Add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `VAULT_ADDR`, and `VAULT_TOKEN`.
2. Start the site locally with `npm run dev`.
3. Open `http://localhost:3000/spotify/auth`.
4. Click "Authorize Spotify" and complete the Spotify consent flow.
5. The callback writes the token bundle to Vault at `secret/prod/apps/website/spotify` by default.

After that, the browser only calls `/api/spotify/now-playing`. Secrets and token
refreshes stay on the server. The service reads Spotify's
[`/me/player/currently-playing`](https://developer.spotify.com/documentation/web-api/reference/get-users-currently-playing-track)
endpoint and uses
[`/me/player/recently-played`](https://developer.spotify.com/documentation/web-api/reference/get-recently-played)
as an idle fallback. Vercel Cron calls `/api/cron/spotify-refresh` daily to
refresh the Vault-stored token bundle; the now-playing endpoint also refreshes
on demand if the stored access token is expired or close to expiring. If this
project is moved to a Vercel plan that supports hourly cron, the same cron route
can safely be scheduled more frequently.

Vault uses KV v2 syntax. To inspect the stored path with the CLI:

```bash
vault kv get -mount=secret prod/apps/website/spotify
```

### Verification

```bash
curl -s http://localhost:3000/api/spotify/now-playing | jq
```

Expected stable states are `playing`, `paused`, `idle`, `unauthorized`,
`rate_limited`, and `error`.

## CLI

Current status:
- TypeScript/Commander npm CLI is implemented at `tools/websitectl-ts`.

### TypeScript CLI Usage

Build locally:

```bash
npm run cli:build
npm run cli:install
```

Then:

```bash
websitectl setup
websitectl api validate
websitectl api new-learning --question "..." --answer "..." --tags "ts,cli"
websitectl api new-article --title "..." --excerpt "..."
websitectl bookmark add "https://example.com/article"
```

## Daily Article Email

Sends a random curated article from bookmarks daily via email using Resend and Vercel Cron.

### Environment Variables

```bash
RESEND_API_KEY=re_xxx           # Get from resend.com
DAILY_EMAIL_RECIPIENT=you@email.com
CRON_SECRET=your-secret-string
```

### Testing Locally

1. Add env vars to `.env.local`
2. Start dev server: `npm run dev`
3. Preview email template in browser:
   ```
   GET http://localhost:3000/api/email/preview
   ```
4. Send test email:
   ```bash
   curl -X POST http://localhost:3000/api/email/send-test \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Cron Schedule

Configured in `vercel.json` to run daily at 8 AM Pacific (4 PM UTC):
```json
{ "crons": [{ "path": "/api/cron/daily-article", "schedule": "0 16 * * *" }] }
```

### Files

| File | Purpose |
|------|---------|
| `src/lib/articles/random.ts` | Date-seeded random selection |
| `src/lib/email/resend.ts` | Resend client |
| `src/lib/email/templates/DailyArticle.tsx` | Email template (Tailwind) |
| `src/app/api/cron/daily-article/route.ts` | Cron endpoint |
| `src/app/api/email/preview/route.ts` | Dev preview |
| `src/app/api/email/send-test/route.ts` | Manual test endpoint |
