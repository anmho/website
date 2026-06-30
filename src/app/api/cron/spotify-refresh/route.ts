import { refreshStoredSpotifyAccessToken } from '@/lib/spotify';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokenBundle = await refreshStoredSpotifyAccessToken();
    console.info('[spotify-refresh-cron]', {
      event: 'request_succeeded',
      durationMs: Date.now() - startedAt,
      expiresAt: tokenBundle.expiresAt,
      updatedAt: tokenBundle.updatedAt,
      hasAccessToken: Boolean(tokenBundle.accessToken),
      hasRefreshToken: Boolean(tokenBundle.refreshToken),
    });

    return NextResponse.json({
      success: true,
      expiresAt: tokenBundle.expiresAt,
      updatedAt: tokenBundle.updatedAt,
    });
  } catch (error) {
    console.error('[spotify-refresh-cron]', {
      event: 'request_failed',
      durationMs: Date.now() - startedAt,
      error,
    });

    return NextResponse.json(
      { error: 'Failed to refresh Spotify token' },
      { status: 500 }
    );
  }
}
