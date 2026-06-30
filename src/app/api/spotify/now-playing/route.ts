import { getCachedNowPlaying, SPOTIFY_NOW_PLAYING_CACHE_SECONDS } from '@/lib/spotify';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = SPOTIFY_NOW_PLAYING_CACHE_SECONDS;
export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();

  try {
    const nowPlaying = await getCachedNowPlaying();
    console.info('[spotify-now-playing]', {
      event: 'request_succeeded',
      durationMs: Date.now() - startedAt,
      state: nowPlaying.state,
      hasTitle: Boolean(nowPlaying.title),
      isPlaying: nowPlaying.isPlaying,
    });

    return NextResponse.json(nowPlaying, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${SPOTIFY_NOW_PLAYING_CACHE_SECONDS}, stale-while-revalidate=${SPOTIFY_NOW_PLAYING_CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error('[spotify-now-playing]', {
      event: 'request_failed',
      durationMs: Date.now() - startedAt,
      error,
    });

    return NextResponse.json(
      {
        ...EMPTY_SPOTIFY_NOW_PLAYING,
        state: 'error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  }
}
