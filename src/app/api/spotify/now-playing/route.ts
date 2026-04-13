import { getNowPlaying } from '@/lib/spotify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
        isPlaying: false,
        type: null,
        title: null,
        artists: [],
        album: null,
        albumArtUrl: null,
        songUrl: null,
        progressMs: null,
        durationMs: null,
        timestamp: null,
        state: 'error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
