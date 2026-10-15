import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: 'Admin auth is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
