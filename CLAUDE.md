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
- 2026-06-05 ANM-394: Printed token-bearing environment variables while checking GitHub auth availability. This happened because the auth check used a broad `env | rg` command instead of a presence-only test. Guardrail: check secret availability with presence-only shell expansion such as `${GH_TOKEN:+set}` and never print token-bearing environment lines.
- 2026-06-04 ANM-394: Initially tried to prevent theme flicker with a separate bootstrap script outside React, which added a second theme system and drew review feedback. This happened while optimizing for pre-hydration behavior instead of keeping theme ownership in the existing provider. Guardrail: keep theme class changes in `ThemeContext` unless the project already has an approved bootstrap path, and make hero text readable with explicit light/dark classes.
- 2026-05-26 ANM-393: Initially passed marquee text as multiline JSX children, which could have introduced whitespace into the measured and rendered song detail text. This happened while refactoring plain text lines into a reusable marquee wrapper. Guardrail: pass marquee content as an explicit `text` string prop so measurement and rendering use the exact Spotify detail string.
- 2026-05-26 ANM-393: Typed marquee CSS custom properties with `satisfies`, but React's `style` prop still rejected the object as incompatible with `CSSProperties`. This happened because custom CSS variables are not part of the standard React style property map. Guardrail: cast the custom-property object to `CSSProperties` at the style assignment boundary and verify with `tsc --noEmit`.
- 2026-05-26 ANM-393: Initially carried the stale branch's now-playing error `Cache-Control` header while updating the success cadence. This happened because the worktree started behind `origin/main`. Guardrail: compare ANM-393 changes against fetched `origin/main` before publishing and preserve unrelated route behavior.
- 2026-05-26 ANM-393: Initially added the marquee animation as new global CSS/keyframes instead of using the site's existing component-level animation stack. This happened while focusing on the overflow measurement behavior and not the local animation convention. Guardrail: keep component-specific motion in `framer-motion`/Tailwind classes unless a shared global style is already established.
- 2026-06-29: Initially created the Spotify loading PR body with unescaped Markdown backticks inside a shell command, causing zsh to try to execute pieces of the PR text. This happened because the command mixed Markdown formatting with double-quoted shell arguments. Guardrail: use single-quoted PR bodies without shell-active Markdown, or pass longer Markdown through a body file/stdin path that cannot execute inline text.
