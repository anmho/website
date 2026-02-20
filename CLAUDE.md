# Project Guidelines

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
