# Agent Guidelines

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
