import { getCachedNowPlaying } from '@/lib/spotify';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextResponse } from 'next/server';

const NOW_PLAYING_REVALIDATE_SECONDS = 10;

export const dynamic = 'force-dynamic';
export const revalidate = NOW_PLAYING_REVALIDATE_SECONDS;
export const runtime = 'nodejs';

export async function GET() {
  try {
    const nowPlaying = await getCachedNowPlaying();

    return NextResponse.json(nowPlaying, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${NOW_PLAYING_REVALIDATE_SECONDS}, stale-while-revalidate=${NOW_PLAYING_REVALIDATE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error('[spotify-now-playing]', error);

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
