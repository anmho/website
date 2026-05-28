# Agent Guidelines

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

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
- 2026-05-26 ANM-393: Initially passed marquee text as multiline JSX children, which could have introduced whitespace into the measured and rendered song detail text. This happened while refactoring plain text lines into a reusable marquee wrapper. Guardrail: pass marquee content as an explicit `text` string prop so measurement and rendering use the exact Spotify detail string.
- 2026-05-26 ANM-393: Typed marquee CSS custom properties with `satisfies`, but React's `style` prop still rejected the object as incompatible with `CSSProperties`. This happened because custom CSS variables are not part of the standard React style property map. Guardrail: cast the custom-property object to `CSSProperties` at the style assignment boundary and verify with `tsc --noEmit`.
- 2026-05-26 ANM-393: Initially carried the stale branch's now-playing error `Cache-Control` header while updating the success cadence. This happened because the worktree started behind `origin/main`. Guardrail: compare ANM-393 changes against fetched `origin/main` before publishing and preserve unrelated route behavior.
- 2026-05-26 ANM-393: Initially added the marquee animation as new global CSS/keyframes instead of using the site's existing component-level animation stack. This happened while focusing on the overflow measurement behavior and not the local animation convention. Guardrail: keep component-specific motion in `framer-motion`/Tailwind classes unless a shared global style is already established.

## Source-Backed Claims
1. When adding factual claims, back them up with a credible source and cite it explicitly.
2. Avoid time-sensitive or performance claims without a source or a clear caveat.
