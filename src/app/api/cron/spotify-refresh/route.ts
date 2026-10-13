import { refreshStoredSpotifyAccessToken } from '@/lib/spotify';
import { SPOTIFY_NOW_PLAYING_CACHE_TAG } from '@/lib/spotify-playback-cache';
import { invalidateByTag } from '@vercel/functions';
import { revalidateTag } from 'next/cache';
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
    let invalidatedNowPlaying = true;

    try {
      revalidateTag(SPOTIFY_NOW_PLAYING_CACHE_TAG);
      await invalidateByTag(SPOTIFY_NOW_PLAYING_CACHE_TAG);
    } catch (error) {
      invalidatedNowPlaying = false;
      console.error('[spotify-refresh-cron]', {
        event: 'cache_invalidation_failed',
        durationMs: Date.now() - startedAt,
        tag: SPOTIFY_NOW_PLAYING_CACHE_TAG,
        error,
      });
    }

    console.info('[spotify-refresh-cron]', {
      event: 'request_succeeded',
      durationMs: Date.now() - startedAt,
      expiresAt: tokenBundle.expiresAt,
      updatedAt: tokenBundle.updatedAt,
      hasAccessToken: Boolean(tokenBundle.accessToken),
      hasRefreshToken: Boolean(tokenBundle.refreshToken),
      invalidatedNowPlaying,
    });

    return NextResponse.json({
      success: true,
      expiresAt: tokenBundle.expiresAt,
      updatedAt: tokenBundle.updatedAt,
      invalidatedNowPlaying,
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
