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
