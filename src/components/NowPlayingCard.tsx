'use client';

import { cn } from '@/lib/utils';
import type { SpotifyNowPlaying } from '@/lib/spotify-types';
import { useEffect, useState } from 'react';
import { FaSpotify } from 'react-icons/fa';

const DEFAULT_STATE: SpotifyNowPlaying = {
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
  state: 'idle',
};

function getPlaybackLabel(nowPlaying: SpotifyNowPlaying | null) {
  switch (nowPlaying?.state) {
    case 'playing':
      return 'Playing now';
    case 'paused':
      return 'Paused';
    case 'idle':
      return 'Recently played';
    case 'rate_limited':
      return 'Spotify rate limit';
    case 'unauthorized':
      return 'Spotify auth required';
    case 'error':
      return 'Spotify unavailable';
    default:
      return 'Checking Spotify';
  }
}

export default function NowPlayingCard({ className }: { className?: string }) {
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalMs = 30000;
    let intervalHandle: ReturnType<typeof setInterval> | null = null;

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('/api/spotify/now-playing', {
          cache: 'no-store',
        });

        if (!response.ok) {
          if (isMounted) setNowPlaying({ ...DEFAULT_STATE, state: 'error' });
          return;
        }

        const payload = (await response.json()) as SpotifyNowPlaying;

        if (!isMounted) return;

        setNowPlaying(payload);

        const nextIntervalMs =
          payload.state === 'rate_limited'
            ? Math.max((payload.retryAfterSeconds ?? 60) * 1000, 30000)
            : 30000;

        if (nextIntervalMs !== intervalMs) {
          intervalMs = nextIntervalMs;
          if (intervalHandle) {
            clearInterval(intervalHandle);
          }
          intervalHandle = setInterval(fetchNowPlaying, intervalMs);
        }
      } catch (error) {
        console.error('[hero-spotify]', error);
        if (isMounted) setNowPlaying({ ...DEFAULT_STATE, state: 'error' });
      }
    };

    void fetchNowPlaying();
    intervalHandle = setInterval(fetchNowPlaying, intervalMs);

    return () => {
      isMounted = false;
      if (intervalHandle) {
        clearInterval(intervalHandle);
      }
    };
  }, []);

  const playbackLabel = getPlaybackLabel(nowPlaying);

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md dark:border-white/10 dark:bg-black/35',
        'border-gray-300/70 bg-white/75 text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.65)] dark:text-gray-100',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <FaSpotify className="text-green-500" />
        <span>Spotify now playing</span>
      </div>

      {nowPlaying?.title ? (
        <a
          href={nowPlaying.songUrl || 'https://open.spotify.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          {nowPlaying.albumArtUrl ? (
            <img
              src={nowPlaying.albumArtUrl}
              alt={`${nowPlaying.title} album art`}
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400">
              <FaSpotify size={22} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {nowPlaying.title}
            </p>
            <p className="truncate text-sm text-gray-600 dark:text-gray-400">
              {nowPlaying.artists.join(', ') || nowPlaying.album || 'Spotify'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {playbackLabel}
            </p>
          </div>
        </a>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{playbackLabel}</p>
      )}
    </div>
  );
}
