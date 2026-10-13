import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_OAUTH_RETURN_COOKIE,
  ADMIN_OAUTH_STATE_COOKIE,
  createOAuthState,
  getOAuthStateTtlSeconds,
  isAdminOAuthConfigured,
  safeReturnTo,
} from '@/lib/controlPlaneAuth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isAdminOAuthConfigured()) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured for the private editor' },
      { status: 500 }
    );
  }

  const state = createOAuthState();
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'));
  const redirectUri = new URL('/api/auth/github/callback', req.url).toString();
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', process.env.GITHUB_OAUTH_CLIENT_ID as string);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: getOAuthStateTtlSeconds(),
    path: '/',
  };
  response.cookies.set(ADMIN_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(ADMIN_OAUTH_RETURN_COOKIE, returnTo, cookieOptions);
  return response;
}
