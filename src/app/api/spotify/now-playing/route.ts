import { getNowPlaying } from '@/lib/spotify';
import { EMPTY_SPOTIFY_NOW_PLAYING } from '@/lib/spotify-types';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const nowPlaying = await getNowPlaying();

    return NextResponse.json(nowPlaying, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
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
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
