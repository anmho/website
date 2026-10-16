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
npm run lint
npm run typecheck
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

## Content

Published content is checked into the repository. Articles and notes use JSON
metadata in `src/assets/static/json/` and Markdown bodies in
`src/assets/content/articles/` and `src/assets/content/notes/`. Tenets,
readings, watch entries, and the Goals changelog follow the same pattern in
their respective directories. Edit those files directly and deploy the
resulting commit; Next.js pre-renders the public pages from the checked-in
content.

The Goals timeline calculates age at each entry date from the server-only
`BIRTH_DATE=YYYY-MM-DD` environment variable. The exact birthday is never
returned by the page or API. The decision reflection API also requires
`OPENAI_API_KEY`; set `OPENAI_GOALS_MODEL` or `OPENAI_API_BASE_URL` only when
you need to override the defaults.

Decision Studio can read its configuration from Vault using the existing
server-only `VAULT_ADDR`, `VAULT_TOKEN`, and optional `VAULT_NAMESPACE`.
The runtime token needs read access to only these KV v2 paths for this feature:

- `secret/data/prod/apps/website/openai-decisions`, field `api_key`
- `secret/data/prod/apps/website/decisions-example`, field `example_json`

Use a restricted runtime token, not an operator or root token. The mount can
be overridden with `DECISIONS_VAULT_MOUNT`. Reads occur after admin authentication,
are not cached, and time out after five seconds. An unavailable key returns a
generic 503; an unavailable Vault example read fails the page rather than
silently substituting invented context. Rotate expiring provider keys in Vault.
Explicit `OPENAI_API_KEY` and `DECISIONS_EXAMPLE_JSON` environment values take
precedence when present. Never expose any of these credentials to client code.

The public Perspective API answers questions in a first-person approximation of Andrew's considered perspective. It retrieves relevant public Tenets, articles, notes, readings, learnings, projects, goals, and saved resources before calling the configured model:

```bash
curl -s http://localhost:3000/api/perspective \
  -H 'Content-Type: application/json' \
  -d '{"question":"Should I optimize for more money or a more interesting life?"}' | jq
```

Set `OPENAI_ASK_MODEL` to override the default model. Private Tenets and private personal context are excluded from this route.

The optional server-only `DECISIONS_EXAMPLE_JSON` environment variable prefills
the decision form after admin authentication. Its JSON shape is
`{"decision":"Which option should I pursue?","options":[{"label":"Option A","messages":["Source-labeled fact"]},{"label":"Option B","messages":[]}]}`.
Keep personal context in deployment secrets, never in Git or a `NEXT_PUBLIC_`
variable. The input supports 2 to 8 options, up to 12 notes per option,
4,000 characters per note and 8,000 combined note characters per option.
Invalid or missing configuration leaves a blank form. Editing the form does
not save history and loading it does not invoke the model. Only submission
sends the edited context and tenets to the configured model provider.

The private Decisions page is available at `/decisions` behind Cloudflare
Access. Configure the Cloudflare Access application to protect the site host,
then set these server-only values on the origin:

```bash
CLOUDFLARE_ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUD=your-cloudflare-application-audience
# Optional defense-in-depth allowlist, comma separated.
CLOUDFLARE_ACCESS_ALLOWED_EMAILS=you@example.com
OPENAI_API_KEY=your-api-key
OPENAI_DECISIONS_MODEL=gpt-6-luna
# Optional rendered fallback for JavaScript-heavy product pages.
FIRECRAWL_API_KEY=fc-your-api-key
```

The app validates the `Cf-Access-Jwt-Assertion` header against Cloudflare's
JWKS endpoint, including the issuer and application audience. Cloudflare Access
must proxy the production host for this assertion to be present. There is no
password fallback: the private route fails closed unless Cloudflare Access is
configured and the request carries a valid Access assertion.

### Product Wishlist

The private product wishlist is available at `/wishlist` after Cloudflare Access
authentication. Paste a public product URL to import its page metadata, with no
LLM call involved. The import first uses local metadata, JSON-LD, microdata, and
regex extraction, then uses Firecrawl only when price is missing so
JavaScript-heavy pages can be rendered without slowing common imports. Set
`FIRECRAWL_API_KEY` to enable that fallback. The list supports status tracking,
add/remove, drag-and-drop priority ordering, and keyboard reordering with Alt
plus the arrow keys. Edits are saved in the current browser's local storage.
The checked-in seed file is `src/assets/static/json/wishlist.json`; connect a
durable data store before relying on the list across browsers or devices.

The private route calls the [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions)
and includes Tenets tagged `private` in its values lens. [ChatGPT subscriptions
and API Platform billing are separate](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform),
so the Decisions API requires API Platform access and credits.

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
