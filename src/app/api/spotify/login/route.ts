import { getSpotifyAuthorizeUrl } from '@/lib/spotify';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const STATE_COOKIE = 'spotify_oauth_state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const state = randomUUID();
    const redirectUri = new URL('/api/spotify/callback', request.url).toString();
    const authorizeUrl = await getSpotifyAuthorizeUrl(state, redirectUri);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error('[spotify-login]', error);
    return NextResponse.redirect(new URL('/spotify/auth?error=config', request.url));
  }
}
