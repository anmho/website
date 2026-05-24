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

## Validation

CI runs the website validation workflow in `.github/workflows/ci.yml` on pull
requests and pushes to `main`.

Debug the same checks locally:

```bash
npm run content:check
npm run typecheck
npm run build
```

`npm run content:check` validates the existing content integrity rules for
learnings and articles, including article markdown file presence, plus note
metadata used by the search dialog. It also assembles the same article, note,
and page entries used by search to catch missing titles, invalid paths, and
duplicate routes before deploy.

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
