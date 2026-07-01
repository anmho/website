import { getCachedNowPlaying, SPOTIFY_NOW_PLAYING_CACHE_SECONDS } from '@/lib/spotify';
import { readLastNowPlaying } from '@/lib/spotify-playback-cache';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = SPOTIFY_NOW_PLAYING_CACHE_SECONDS;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const cachedOnly = request.nextUrl.searchParams.get('cached') === '1';

  try {
    if (cachedOnly) {
      const cachedNowPlaying = await readLastNowPlaying();
      console.info('[spotify-now-playing]', {
        event: 'cache_request_succeeded',
        durationMs: Date.now() - startedAt,
        hit: Boolean(cachedNowPlaying),
      });

      return NextResponse.json(cachedNowPlaying ?? EMPTY_SPOTIFY_NOW_PLAYING, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

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
