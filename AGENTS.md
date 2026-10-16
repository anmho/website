# Agent Guidelines

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Authored Copy

Use commas, colons, semicolons, parentheses, or separate sentences instead of em dashes in site copy, documentation, and UI text.

Keep tenets direct. Avoid self-referential commentary such as “I take this as a reminder,” repeated disclaimers, and explanations of what a tenet is not. Preserve distinct ideas, meaningful tradeoffs, and concise source attribution; do not force entries into a shared template or length.

Use direct YouTube links for movie scenes, not ClipCafe. Prefer the user's supplied video when available.

## Email Templates

Email templates use **React Email with Tailwind CSS** for consistency with the main site styling.

### Key Files
- `src/lib/email/templates/` - Email template components
- `src/lib/email/resend.ts` - Resend client
- `src/lib/articles/random.ts` - Article selection logic
- `src/app/api/cron/daily-article/route.ts` - Cron endpoint
- `src/app/api/email/preview/route.ts` - Dev preview
- `src/app/api/email/send-test/route.ts` - Test endpoint

### Template Requirements
1. Use `<Tailwind>` wrapper from `@react-email/tailwind`
2. Use standard Tailwind utility classes
3. Keep styling consistent with site design (gray-900 text, rounded corners, etc.)

### Environment Variables
```
RESEND_API_KEY=re_xxx
DAILY_EMAIL_RECIPIENT=email@example.com
CRON_SECRET=your-secret
```

### Rendering
Always pre-render to HTML before sending:
```tsx
import { render } from '@react-email/components';
const html = await render(MyTemplate({ props }));
await resend.emails.send({ html, ... });
```

## Frontend Safety Checks
1. Never leave incomplete JSX ternaries (`condition ? (...)`) without a `: (...)` branch.
2. Prefer `condition && (...)` for single-branch rendering to reduce syntax mistakes.
3. After JSX refactors, run a quick TypeScript/compile check before finalizing.

## Markdown Rendering Guardrails
1. Treat inline and block code as separate render paths:
2. Inline code must render only in the `code` renderer.
3. Fenced code blocks must render only in the `pre` renderer.
4. Never use `code` renderer fallback logic to guess block-vs-inline.
5. If copy buttons are used, attach them only to `pre` (fenced code blocks), never inline code.
6. Before finalizing markdown renderer changes, verify:
7. Inline backticks inside headings/paragraphs/lists render inline.
8. Fenced blocks render with copy button.
9. Run a TypeScript compile check.

## Reliability Skill (Mandatory)
1. Do a targeted regression sweep after UI renderer changes.
2. Search all markdown renderers (`ReactMarkdown` usages) and confirm consistent behavior.
3. Validate with one inline-code example and one fenced-code example in rendered pages.
4. If behavior is ambiguous, inspect source markdown and renderer output before patching.

## Mistake Log Policy
1. Record each mistake made during implementation in both `AGENTS.md` and `CLAUDE.md`.
2. For each mistake, include: what was wrong, why it happened, and the preventive guardrail added.
3. Apply the guardrail immediately in the same change set when possible.

### Mistake Log
- 2026-10-15: The Goals regression initially tested inline Markdown on an article containing only fenced code, so the assertion failed on missing fixture content. This happened before verifying both example types in the source. Guardrail: inspect the fixture Markdown first and select an article with verified inline and fenced examples before running renderer checks.
- 2026-10-15: A route-discovery command used optional unquoted globs, so zsh stopped when no sitemap file matched. This happened because file discovery was mixed into search arguments. Guardrail: discover optional routes with `rg --files` and quoted patterns before searching their contents.
- 2026-10-15: Tenet copy accumulated defensive explanations and meta-commentary that diluted the user's voice. This happened while adding caveats around personal heuristics and citations. Guardrail: state the idea directly, keep qualifications that change its meaning, and use concise attribution instead of narrating the editorial intent.
- 2026-10-15: Initially used `gt log --short`, which the installed CLI rejected because short is a subcommand. Guardrail: use the documented `gt log short` syntax and check subcommand help before adding flags.
- 2026-10-15: Initially imported `src/assets/static/json/skills.json` into the personal knowledge loader even though the file is an empty placeholder, so the production build failed while TypeScript still passed. This happened because the JSON file was discovered by filename and its contents were not validated before adding it as a static import. Guardrail: inspect and validate every static JSON source before importing it, and run a production build after adding new content imports.
- 2026-06-05 ANM-394: Printed token-bearing environment variables while checking GitHub auth availability. This happened because the auth check used a broad `env | rg` command instead of a presence-only test. Guardrail: check secret availability with presence-only shell expansion such as `${GH_TOKEN:+set}` and never print token-bearing environment lines.
- 2026-06-04 ANM-394: Initially tried to prevent theme flicker with a separate bootstrap script outside React, which added a second theme system and drew review feedback. This happened while optimizing for pre-hydration behavior instead of keeping theme ownership in the existing provider. Guardrail: keep theme class changes in `ThemeContext` unless the project already has an approved bootstrap path, and make hero text readable with explicit light/dark classes.
- 2026-05-26 ANM-393: Initially passed marquee text as multiline JSX children, which could have introduced whitespace into the measured and rendered song detail text. This happened while refactoring plain text lines into a reusable marquee wrapper. Guardrail: pass marquee content as an explicit `text` string prop so measurement and rendering use the exact Spotify detail string.
- 2026-05-26 ANM-393: Typed marquee CSS custom properties with `satisfies`, but React's `style` prop still rejected the object as incompatible with `CSSProperties`. This happened because custom CSS variables are not part of the standard React style property map. Guardrail: cast the custom-property object to `CSSProperties` at the style assignment boundary and verify with `tsc --noEmit`.
- 2026-05-26 ANM-393: Initially carried the stale branch's now-playing error `Cache-Control` header while updating the success cadence. This happened because the worktree started behind `origin/main`. Guardrail: compare ANM-393 changes against fetched `origin/main` before publishing and preserve unrelated route behavior.
- 2026-05-26 ANM-393: Initially added the marquee animation as new global CSS/keyframes instead of using the site's existing component-level animation stack. This happened while focusing on the overflow measurement behavior and not the local animation convention. Guardrail: keep component-specific motion in `framer-motion`/Tailwind classes unless a shared global style is already established.
- 2026-06-29: Initially created the Spotify loading PR body with unescaped Markdown backticks inside a shell command, causing zsh to try to execute pieces of the PR text. This happened because the command mixed Markdown formatting with double-quoted shell arguments. Guardrail: use single-quoted PR bodies without shell-active Markdown, or pass longer Markdown through a body file/stdin path that cannot execute inline text.
- 2026-09-22: Initially ran a curl timing loop with an unquoted query-string URL; the local zsh run returned `no matches found` and skipped that measurement. zsh documents unquoted `?` as a filename-generation pattern and reports an error when it has no match ([zsh filename-generation docs](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation)). Guardrail: quote every URL containing query parameters in shell-based performance checks.
- 2026-10-12: Initially made the editor browser regression script assert the new editor state after a fixed 250ms wait, shorter than the chooser's 300ms transition, so it read the still-visible chooser. This happened because the test synchronized on time instead of the rendered state. Guardrail: wait for a state-specific locator (with an animation-sized timeout) before asserting UI transitions.
- 2026-10-12: Initially made the editor regression check look for the chooser eyebrow after selecting Watch, even though the editor intentionally replaces that chooser with the live-preview header. This happened because the assertion reused selection-screen copy instead of checking the post-selection state. Guardrail: assert the rendered state’s own label and controls after each format transition.
- 2026-10-12: Initially made the Lessons UI check use a non-exact text selector for “Timeless reminder”, which matched the label, textarea contents, and rendered quote. This happened because starter Markdown intentionally reused the section phrase. Guardrail: use exact or role-scoped selectors when visible copy can also occur in editable content.
- 2026-10-12: Initially ran the Playwright regression script directly without the required server wrapper, so it attempted to connect to an unopened port. This happened because the test script was treated as self-hosting when the repository harness owns server startup. Guardrail: run browser checks through `with_server.py --server ... --port ... -- <script>` after validating the harness help output.
- 2026-10-13: Initially made the content seed insert-only, so a partial production seed could leave published Markdown-backed entries missing from the database and return 404s after the hard cutover. This happened because `ON CONFLICT DO NOTHING` was treated as idempotent backfill even though it cannot repair empty or missing legacy fields. Guardrail: make content reconciliation insert missing rows, fill only empty legacy fields, and document/rerun the backfill after partial migrations.
- 2026-10-13: Initially queried the GitHub deployments endpoint with an unquoted `?per_page=10` URL, so zsh treated the query marker as filename generation and aborted the probe. This happened while checking deployment metadata from the shell. Guardrail: quote every shell URL containing query parameters, including GitHub API paths.
- 2026-10-13: Initially inspected a bracketed Next.js route with an unquoted shell path, so zsh treated `[slug]` as filename expansion and stopped the combined inspection. This happened while auditing the CMS route dependencies. Guardrail: quote every shell path containing Next.js dynamic-route brackets.
- 2026-10-13: Initially combined a shell `for` loop with an inline redirection in the loop's file list, which caused zsh to stop parsing the inspection command. This happened while reading several route files in one pass. Guardrail: keep loop input lists and command redirections syntactically separate, and run a shorter command when shell structure is ambiguous.
- 2026-10-13: Initially read Next.js dynamic route params synchronously, so the rebuilt article and note pages returned 404 under Next 16 where `params` is a Promise. This happened while restoring the Markdown-backed dynamic routes from the database implementation. Guardrail: type App Router dynamic `params` as `Promise<...>` and await it before reading route values; verify one article and one note over HTTP.
- 2026-10-13: Initially used the zsh read-only variable name `status` for an HTTP response code in a route smoke test, so the shell rejected the test before making requests. This happened while checking the restored static routes. Guardrail: use descriptive names such as `http_code` for shell variables that may collide with special/read-only names.
- 2026-10-13: Initially tried to delete and recreate the same route file in one `apply_patch`, which the patch validator rejected while renaming Lessons to Tenets. This happened because the rename was bundled with the surrounding content changes. Guardrail: split delete/recreate operations for the same path into separate patches.
- 2026-10-13: Initially added an underline to the active desktop navigation group, which made the grouped navigation look heavier than the site's floating, text-first menu language. This happened because a generic active-link treatment was applied without checking the restored mobile menu and existing visual hierarchy. Guardrail: keep navigation active states to restrained text color/weight changes unless the established navigation design explicitly calls for a rule.
- 2026-10-13: Initially used an unbraced zsh variable next to a colon in a Git history inspection command (`"$commit_ref:..."`), which zsh parsed as an invalid parameter expansion. This happened while iterating over historical commits with `git show`. Guardrail: brace shell variables whenever punctuation follows them, especially for Git object paths (`"${commit_ref}:path"`), and keep history probes syntactically minimal.
- 2026-10-13: Initially invoked the browser-test helper as a repository-relative path even though the selected skill bundles it under its own `scripts/` directory. This happened because the skill examples use a generic path rather than a repository-specific location. Guardrail: resolve bundled helper paths from the selected skill directory before invoking them, then run their help command from that absolute path.
- 2026-10-13: Initially attributed a perceived font regression to the static-content cutover before comparing the font declarations across the change. This happened because the forced-theme layout change was nearby and visual evidence was ambiguous. Guardrail: verify font imports and computed font-family against the last known-good revision before assigning a visual regression to a commit.
- 2026-10-13: Initially attempted to create a repair branch before checking for locally modified instruction files, so Git correctly rejected the checkout. This happened because the required mistake-log edit was made before establishing the branch. Guardrail: run `git status --short` before branch switches and preserve intentional tracked edits with a path-scoped stash when needed.
- 2026-10-13: Initially restored a cookie read in the root layout while investigating a visual regression, which made all routes dynamically rendered and violated the static-page publishing model. This happened because the earlier layout was treated as a visual baseline without rechecking the static-rendering requirement. Guardrail: after any root-layout data access change, inspect the production build route table and retain static rendering unless the user explicitly authorizes dynamic pages.
- 2026-10-13: Initially asserted the mobile drawer's animated children immediately after triggering the opener, so the regression script raced React's state commit and observed no drawer. This happened because a click acknowledgement was treated as proof that the conditional dialog had mounted. Guardrail: wait for the drawer's dialog selector before inspecting its animated descendants in browser checks.
- 2026-10-13: Initially targeted the same instruction file twice in one patch while adding a guardrail, which the patch tool rejected. This happened because the paired documentation update was assembled without checking for duplicate file operations. Guardrail: consolidate all hunks for each file into one patch operation before applying it.
- 2026-10-13: Initially tried to remove temporary browser-test artifacts with `rm`, which the command guard correctly rejected. This happened because the generated artifacts were treated as disposable instead of following the repository edit constraints. Guardrail: delete text artifacts with `apply_patch` and move generated binary artifacts to a `mktemp` directory when they must be removed from the worktree.
- 2026-10-13: Initially retried commits after resolving a multi-commit cherry-pick conflict, unaware that `git cherry-pick --continue` had already applied the queued remaining commits. This happened because the original cherry-pick sequencer state was not rechecked before issuing a second cherry-pick command. Guardrail: after resolving a multi-commit cherry-pick, inspect `git log --oneline` and `git status --short` before applying any remaining commits manually.
- 2026-10-13: Initially passed the create-only `--no-interactive` option to `linear issue update`, so the CLI rejected the ticket update before any write occurred. This happened because create and update commands were treated as having interchangeable flags. Guardrail: inspect the specific Linear subcommand help before a mutation and use only the flags it documents.
- 2026-10-13: Initially verified the desktop navigation with a Playwright menu locator that assumed an accessible name the menu did not expose, so the check timed out. This happened because the menu's visual trigger label was confused with the menu's computed accessible name. Guardrail: use stable component ids for menu containers when their accessible names are not explicitly defined.
- 2026-10-13: Initially tested the development server through `127.0.0.1`, which blocked Next development assets as cross-origin and left the navigation unhydrated. This happened because the local test URL did not match the development server's allowed origin. Guardrail: verify client interaction with a production server or use its canonical local origin when development assets need to hydrate.
- 2026-10-13: Initially gave the desktop navigation group menu a separate, short scale animation instead of the site's established top-down fade and staggered menu entrance. This happened because the unboxed visual treatment was adjusted without carrying over the motion language of the existing navigation drawer. Guardrail: when adding or changing navigation disclosure, reuse the existing navigation easing, timing, and item stagger; verify the open and close states visually against the mobile menu.
- 2026-10-14: Initially used an unquoted `.env*` glob in a zsh search command, so zsh reported `no matches found` before the search ran. This happened because an optional environment-file pattern was passed directly to the shell. Guardrail: quote optional globs or use `rg --files` with explicit `-g` patterns when probing for files that may not exist.
- 2026-10-15: Initially ran a browser regression against the legacy local-password auth path after the admin surface had moved to Cloudflare Access, so the harness stalled on a missing authenticated decision form. This happened because the test fixture and auth policy were not updated together. Guardrail: keep admin auth Cloudflare-only and configure the local browser harness with a signed mock Access assertion before exercising protected pages.

## Source-Backed Claims
1. When adding factual claims, back them up with a credible source and cite it explicitly.
2. Avoid time-sensitive or performance claims without a source or a clear caveat.
