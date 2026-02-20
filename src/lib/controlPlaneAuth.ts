import { NextRequest } from 'next/server';

export function getAuthError(req: NextRequest): string | null {
  const required = process.env.ADMIN_API_KEY;
  if (!required) {
    return 'server misconfigured: ADMIN_API_KEY is required';
  }
  const got = req.headers.get('x-api-key');
  if (!got || got !== required) {
    return 'unauthorized';
  }
  return null;
}
