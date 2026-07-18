import {
  getCachedNowPlaying,
  SPOTIFY_NOW_PLAYING_CACHE_SECONDS,
  SPOTIFY_NOW_PLAYING_STALE_IF_ERROR_SECONDS,
  SPOTIFY_NOW_PLAYING_STALE_SECONDS,
} from '@/lib/spotify';
import {
  readLastNowPlaying,
  SPOTIFY_NOW_PLAYING_CACHE_TAG,
} from '@/lib/spotify-playback-cache';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = SPOTIFY_NOW_PLAYING_CACHE_SECONDS;
export const runtime = 'nodejs';

const VERCEL_CDN_CACHE_CONTROL = [
  `s-maxage=${SPOTIFY_NOW_PLAYING_CACHE_SECONDS}`,
  `stale-while-revalidate=${SPOTIFY_NOW_PLAYING_STALE_SECONDS}`,
  `stale-if-error=${SPOTIFY_NOW_PLAYING_STALE_IF_ERROR_SECONDS}`,
].join(', ');

const SPOTIFY_NOW_PLAYING_HEADERS = {
  'Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': VERCEL_CDN_CACHE_CONTROL,
  'Vercel-Cache-Tag': SPOTIFY_NOW_PLAYING_CACHE_TAG,
};

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
      headers: SPOTIFY_NOW_PLAYING_HEADERS,
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
          'Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': `stale-if-error=${SPOTIFY_NOW_PLAYING_STALE_IF_ERROR_SECONDS}`,
          'Vercel-Cache-Tag': SPOTIFY_NOW_PLAYING_CACHE_TAG,
        },
      }
    );
  }
}
