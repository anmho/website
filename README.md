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
npm run validate:content-search
npm run lint
npm run typecheck
npm run build
npm start
```

## CI Validation

Pull requests run the `Validate` workflow in GitHub Actions. It installs with
`npm ci`, runs `npm run validate:content-search`, then runs the existing
`npm run validate` sequence.

`npm run validate:content-search` compiles the TypeScript validator source at
`scripts/validate-content-search.ts` to `.tmp/scripts/` and runs the compiled
output. The check verifies the static JSON used by the site search, catches
malformed article/note/bookmark/learning metadata, and confirms generated search
entries have titles, paths, and searchable text.
Page generation and markdown rendering are still covered by `npm run build`;
the health check does not require every legacy content metadata entry to have a
markdown body because the current article and note routes handle missing body
content at render time.

If CI fails locally, run:

```bash
npm run validate:content-search
npm run validate
```

## Spotify Now Playing

The home page can show the Spotify track currently playing on your account. It
uses Spotify's documented [Authorization Code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
once to create a token bundle, stores that bundle in Vault, then uses
Spotify's [refresh token flow](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
from Vercel Cron to keep the access token current.

### Environment Variables

Vercel only needs Vault access and the cron guard:

```bash
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token
SPOTIFY_VAULT_MOUNT=secret
SPOTIFY_VAULT_PATH=prod/apps/website/spotify
SPOTIFY_OAUTH_VAULT_PATH=prod/providers/spotify/oauth
CRON_SECRET=your-secret-string
```

`SPOTIFY_OAUTH_VAULT_PATH` is optional and defaults to
`prod/providers/spotify/oauth`. The Spotify OAuth credentials live there. The
secret supports provider-style, camelCase, or env-style keys:

```bash
spotify.client_id=your-client-id
spotify.client_secret=your-client-secret
spotify.redirect_uri.local=https://localhost:3000/api/spotify/callback
spotify.redirect_uri.production=https://www.anmho.com/api/spotify/callback
```

The login and callback routes choose the redirect URI by request host:
`localhost:3000` uses the local HTTPS URI and `www.anmho.com` uses the production URI.
Preview deployments intentionally do not run OAuth bootstrap; they can still
render now-playing once Vault has a token. Register the exact local and
production URIs in the Spotify developer app before OAuth will work. The
callback writes `accessToken`, `refreshToken`, `expiresAt`, `scope`,
`tokenType`, and `updatedAt` into `SPOTIFY_VAULT_PATH`, leaving provider
credentials separate from the website's token bundle.

### OAuth Bootstrap

1. Store `spotify.client_id`, `spotify.client_secret`, `spotify.redirect_uri.local`, and `spotify.redirect_uri.production` in Vault.
2. Start the site locally with `npm run dev:https`.
3. Open `https://localhost:3000/spotify/auth`. The script creates an ignored
   local certificate under `certificates/`; your browser may ask you to approve
   that local certificate the first time.
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
vault kv get -mount=secret prod/providers/spotify/oauth
```

### Verification

```bash
curl -s http://localhost:3000/api/spotify/now-playing | jq
```

Expected stable states are `playing`, `paused`, `idle`, `unauthorized`,
`rate_limited`, and `error`.

Use `npm run validate` for the full local validation sequence before opening a PR.

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
