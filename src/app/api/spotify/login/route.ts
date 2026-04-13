import { getSpotifyAuthorizeUrl } from '@/lib/spotify';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const STATE_COOKIE = 'spotify_oauth_state';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = randomUUID();
  const authorizeUrl = getSpotifyAuthorizeUrl(state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
