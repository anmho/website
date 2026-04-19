import { exchangeCodeForTokens } from '@/lib/spotify';
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
    return NextResponse.json(
      { error: 'Invalid OAuth callback state or code.' },
      { status: 400 }
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const response = NextResponse.json(
      {
        message:
          'OAuth bootstrap successful. Copy refreshToken into SPOTIFY_REFRESH_TOKEN in your environment.',
        refreshToken: tokens.refresh_token ?? null,
        accessTokenExpiresInSeconds: tokens.expires_in,
        grantedScopes: tokens.scope,
      },
      { status: 200 }
    );

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

    return NextResponse.json(
      { error: 'Failed to exchange Spotify code for tokens.' },
      { status: 500 }
    );
  }
}
