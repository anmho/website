import { storeSpotifyTokensFromCode } from '@/lib/spotify';
import { NextRequest, NextResponse } from 'next/server';

const STATE_COOKIE = 'spotify_oauth_state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stateFromCookie = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !stateFromCookie || state !== stateFromCookie) {
    return NextResponse.redirect(new URL('/spotify/auth?error=state', request.url));
  }

  try {
    await storeSpotifyTokensFromCode(code);

    const response = NextResponse.redirect(new URL('/spotify/auth?connected=1', request.url));

    response.cookies.set(STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[spotify-callback]', error);

    return NextResponse.redirect(new URL('/spotify/auth?error=callback', request.url));
  }
}
