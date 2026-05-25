import { storeSpotifyTokensFromCode } from '@/lib/spotify';
import { NextRequest, NextResponse } from 'next/server';

const STATE_COOKIE = 'spotify_oauth_state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getRequestOrigin(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const protocol =
    request.headers.get('x-forwarded-proto') ?? url.protocol.replace(/:$/, '');

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stateFromCookie = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !stateFromCookie || state !== stateFromCookie) {
    return NextResponse.redirect(new URL('/spotify/auth?error=state', origin));
  }

  try {
    await storeSpotifyTokensFromCode(code, origin);

    const response = NextResponse.redirect(new URL('/?spotify=connected', origin));

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

    return NextResponse.redirect(new URL('/spotify/auth?error=callback', origin));
  }
}
