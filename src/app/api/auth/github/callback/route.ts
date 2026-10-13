import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_OAUTH_RETURN_COOKIE,
  ADMIN_OAUTH_STATE_COOKIE,
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getSessionTtlSeconds,
  isAdminOAuthConfigured,
  isAllowedGithubUser,
  safeReturnTo,
} from '@/lib/controlPlaneAuth';

export const runtime = 'nodejs';

type GithubTokenResponse = { access_token?: string; error?: string };
type GithubUser = { id: number; login: string };

function redirectWithError(req: NextRequest, returnTo: string, error: string) {
  const url = new URL(safeReturnTo(returnTo), req.url);
  url.searchParams.set('auth', error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const returnTo = req.cookies.get(ADMIN_OAUTH_RETURN_COOKIE)?.value || '/editor';
  const expectedState = req.cookies.get(ADMIN_OAUTH_STATE_COOKIE)?.value;
  const state = req.nextUrl.searchParams.get('state');
  const code = req.nextUrl.searchParams.get('code');

  if (!isAdminOAuthConfigured()) return redirectWithError(req, returnTo, 'config');
  if (!expectedState || !state || expectedState !== state || !code) {
    return redirectWithError(req, returnTo, 'invalid_state');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'anmho-website-admin',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: new URL('/api/auth/github/callback', req.url).toString(),
      }),
      cache: 'no-store',
    });
    const token = (await tokenResponse.json()) as GithubTokenResponse;
    if (!tokenResponse.ok || !token.access_token) {
      return redirectWithError(req, returnTo, 'token');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.access_token}`,
        'User-Agent': 'anmho-website-admin',
      },
      cache: 'no-store',
    });
    if (!userResponse.ok) return redirectWithError(req, returnTo, 'profile');

    const user = (await userResponse.json()) as GithubUser;
    if (!isAllowedGithubUser(user)) return redirectWithError(req, returnTo, 'denied');

    const session = createAdminSession(String(user.id), user.login);
    if (!session) return redirectWithError(req, returnTo, 'config');

    const response = NextResponse.redirect(new URL(safeReturnTo(returnTo), req.url));
    response.cookies.set(ADMIN_SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionTtlSeconds(),
      path: '/',
    });
    response.cookies.delete(ADMIN_OAUTH_STATE_COOKIE);
    response.cookies.delete(ADMIN_OAUTH_RETURN_COOKIE);
    return response;
  } catch {
    return redirectWithError(req, returnTo, 'callback');
  }
}
