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

Displays your currently playing Spotify track in the hero section with server-side token refresh and normalized playback states.

### Environment Variables

```bash
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
SPOTIFY_REFRESH_TOKEN=refresh-token-from-bootstrap
```

### OAuth Bootstrap (one-time)

1. Create a Spotify app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add your callback URL (for example: `http://localhost:3000/api/spotify/callback`) to the app settings.
3. Start your app and open the OAuth helper page:
   ```
   http://localhost:3000/spotify/auth
   ```
4. Click **Authorize Spotify** (this calls `GET /api/spotify/login`).
5. Complete consent. The callback response includes a `refreshToken`.
6. Save that token as `SPOTIFY_REFRESH_TOKEN` in your environment.

Direct bootstrap endpoint (if you prefer raw route):
   ```
   GET /api/spotify/login
   ```

### Runtime behavior

- Frontend polls `GET /api/spotify/now-playing` every 30 seconds.
- Backend refreshes access tokens server-side using the stored refresh token.
- If nothing is currently playing, backend falls back to the most recently played track.
- Response states: `playing`, `paused`, `idle`, `unauthorized`, `rate_limited`, `error`.

### Verify it works (local + preview)

1. Open OAuth bootstrap:
   ```bash
   open http://localhost:3000/api/spotify/login
   ```
2. After consent, copy `refreshToken` from callback JSON and set `SPOTIFY_REFRESH_TOKEN`.
3. Confirm API response shape:
   ```bash
   curl -s http://localhost:3000/api/spotify/now-playing | jq
   ```
4. Play or pause a song in Spotify and repeat step 3:
   - `state: "playing"` while active playback
   - `state: "paused"` when paused
   - `state: "idle"` when no active playback (may return recently played track fields)
5. Open homepage and confirm hero card updates within 30 seconds.

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
