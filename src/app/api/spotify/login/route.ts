import {
  getSpotifyAuthorizeUrl,
  UnsupportedSpotifyOAuthOriginError,
} from '@/lib/spotify';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const STATE_COOKIE = 'spotify_oauth_state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const protocol =
    request.headers.get('x-forwarded-proto') ?? url.protocol.replace(/:$/, '');

  return `${protocol}://${host}`;
}

export async function GET(request: Request) {
  const origin = getRequestOrigin(request);

  try {
    const state = randomUUID();
    const authorizeUrl = await getSpotifyAuthorizeUrl(state, origin);

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
    if (error instanceof UnsupportedSpotifyOAuthOriginError) {
      return NextResponse.redirect(
        new URL('/spotify/auth?error=unsupported-origin', origin)
      );
    }

    console.error('[spotify-login]', error);

    return NextResponse.redirect(new URL('/spotify/auth?error=config', origin));
  }
}
