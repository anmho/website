# Project Guidelines

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, build, etc.)

## Email Templates

Email templates are located in `src/lib/email/templates/` and use React Email with Tailwind CSS for styling consistency.

### Setup
- **Package**: `@react-email/components` + `@react-email/tailwind`
- **Email Service**: Resend (`resend` package)
- Wrap templates in `<Tailwind>` component to use Tailwind classes

### Creating New Templates
```tsx
import { Html, Head, Body, Tailwind, ... } from '@react-email/components';

export function MyEmailTemplate({ props }) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          {/* Use Tailwind classes */}
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Testing Emails
- Preview: `GET /api/email/preview` (dev only)
- Send test: `POST /api/email/send-test` with `Authorization: Bearer {CRON_SECRET}`

### Cron Jobs
- Configured in `vercel.json`
- Daily article email runs at 8 AM Pacific (`0 16 * * *` UTC)

## Mistake Log Policy
1. Record each mistake made during implementation in both `AGENTS.md` and `CLAUDE.md`.
2. For each mistake, include: what was wrong, why it happened, and the preventive guardrail added.
3. Apply the guardrail immediately in the same change set when possible.

### Mistake Log
- 2026-05-26 ANM-393: Initially passed marquee text as multiline JSX children, which could have introduced whitespace into the measured and rendered song detail text. This happened while refactoring plain text lines into a reusable marquee wrapper. Guardrail: pass marquee content as an explicit `text` string prop so measurement and rendering use the exact Spotify detail string.
- 2026-05-26 ANM-393: Typed marquee CSS custom properties with `satisfies`, but React's `style` prop still rejected the object as incompatible with `CSSProperties`. This happened because custom CSS variables are not part of the standard React style property map. Guardrail: cast the custom-property object to `CSSProperties` at the style assignment boundary and verify with `tsc --noEmit`.
- 2026-05-26 ANM-393: Initially carried the stale branch's now-playing error `Cache-Control` header while updating the success cadence. This happened because the worktree started behind `origin/main`. Guardrail: compare ANM-393 changes against fetched `origin/main` before publishing and preserve unrelated route behavior.
- 2026-05-26 ANM-393: Initially added the marquee animation as new global CSS/keyframes instead of using the site's existing component-level animation stack. This happened while focusing on the overflow measurement behavior and not the local animation convention. Guardrail: keep component-specific motion in `framer-motion`/Tailwind classes unless a shared global style is already established.
- 2026-06-29: Initially created the Spotify loading PR body with unescaped Markdown backticks inside a shell command, causing zsh to try to execute pieces of the PR text. This happened because the command mixed Markdown formatting with double-quoted shell arguments. Guardrail: use single-quoted PR bodies without shell-active Markdown, or pass longer Markdown through a body file/stdin path that cannot execute inline text.
- 2026-09-22: Initially ran a curl timing loop with an unquoted query-string URL; the local zsh run returned `no matches found` and skipped that measurement. zsh documents unquoted `?` as a filename-generation pattern and reports an error when it has no match ([zsh filename-generation docs](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation)). Guardrail: quote every URL containing query parameters in shell-based performance checks.
- 2026-10-12: Initially made the editor browser regression script assert the new editor state after a fixed 250ms wait, shorter than the chooser's 300ms transition, so it read the still-visible chooser. This happened because the test synchronized on time instead of the rendered state. Guardrail: wait for a state-specific locator (with an animation-sized timeout) before asserting UI transitions.
- 2026-10-12: Initially made the editor regression check look for the chooser eyebrow after selecting Watch, even though the editor intentionally replaces that chooser with the live-preview header. This happened because the assertion reused selection-screen copy instead of checking the post-selection state. Guardrail: assert the rendered state’s own label and controls after each format transition.
- 2026-10-12: Initially made the Lessons UI check use a non-exact text selector for “Timeless reminder”, which matched the label, textarea contents, and rendered quote. This happened because starter Markdown intentionally reused the section phrase. Guardrail: use exact or role-scoped selectors when visible copy can also occur in editable content.
