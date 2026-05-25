import { getCachedNowPlaying } from '@/lib/spotify';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 30;

export async function GET() {
  try {
    const nowPlaying = await getCachedNowPlaying();

    return NextResponse.json(nowPlaying, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
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
