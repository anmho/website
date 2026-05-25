'use client';

import { cn } from '@/lib/utils';
import type { SpotifyNowPlaying } from '@/lib/spotify-types';
import { useEffect, useState } from 'react';
import { FaPause, FaSpotify } from 'react-icons/fa';

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

const MIN_INITIAL_LOADING_MS = 1200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      return 'Checking now';
  }
}

function getCardTitle(nowPlaying: SpotifyNowPlaying | null) {
  switch (nowPlaying?.state) {
    case 'playing':
      return 'Currently listening to';
    case 'paused':
      return 'Paused on';
    case 'idle':
      return nowPlaying.title ? 'Recently listened to' : 'Not listening right now';
    case 'rate_limited':
      return 'Spotify rate limited';
    case 'unauthorized':
      return 'Spotify auth required';
    case 'error':
      return 'Spotify unavailable';
    default:
      return '';
  }
}

function PlaybackEqualizer() {
  return (
    <span
      className="flex h-4 items-end gap-0.5"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="spotify-equalizer-bar block w-1 rounded-full bg-green-400"
        />
      ))}
    </span>
  );
}

function NowPlayingSkeleton() {
  return (
    <div className="relative flex items-center gap-3" aria-label="Loading Spotify playback">
      <div className="spotify-skeleton-wave h-14 w-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="spotify-skeleton-wave h-3.5 w-3/4 rounded-full" />
        <div className="spotify-skeleton-wave h-3 w-1/2 rounded-full" />
        <div className="spotify-skeleton-wave h-2.5 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function NowPlayingCard({ className }: { className?: string }) {
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(null);

  useEffect(() => {
    let isMounted = true;
    let initialLoadComplete = false;
    const initialLoadStartedAt = Date.now();
    let intervalMs = 15000;
    let intervalHandle: ReturnType<typeof setInterval> | null = null;

    const finishInitialLoading = async () => {
      if (initialLoadComplete) return;

      const elapsedMs = Date.now() - initialLoadStartedAt;
      const remainingMs = MIN_INITIAL_LOADING_MS - elapsedMs;

      if (remainingMs > 0) {
        await sleep(remainingMs);
      }

      initialLoadComplete = true;
    };

    const setResolvedNowPlaying = async (nextState: SpotifyNowPlaying) => {
      await finishInitialLoading();
      if (isMounted) {
        setNowPlaying(nextState);
      }
    };

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('/api/spotify/now-playing', {
          cache: 'no-store',
        });

        if (!response.ok) {
          await setResolvedNowPlaying({ ...DEFAULT_STATE, state: 'error' });
          return;
        }

        const payload = (await response.json()) as SpotifyNowPlaying;

        if (!isMounted) return;

        await setResolvedNowPlaying(payload);

        const nextIntervalMs =
          payload.state === 'rate_limited'
            ? Math.max((payload.retryAfterSeconds ?? 60) * 1000, 30000)
            : 15000;

        if (nextIntervalMs !== intervalMs) {
          intervalMs = nextIntervalMs;
          if (intervalHandle) {
            clearInterval(intervalHandle);
          }
          intervalHandle = setInterval(fetchNowPlaying, intervalMs);
        }
      } catch (error) {
        console.error('[hero-spotify]', error);
        await setResolvedNowPlaying({ ...DEFAULT_STATE, state: 'error' });
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
  const cardTitle = getCardTitle(nowPlaying);
  const isPlaying = nowPlaying?.state === 'playing';
  const isPaused = nowPlaying?.state === 'paused';
  const isLoading = nowPlaying === null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md dark:border-white/10 dark:bg-black/35',
        'border-gray-300/70 bg-white/75 text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.65)] dark:text-gray-100',
        isPlaying &&
          'border-green-500/30 shadow-[0_20px_70px_-44px_rgba(34,197,94,0.7)]',
        className
      )}
    >
      {isPlaying ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(34,197,94,0.14),transparent_34%)]"
          aria-hidden="true"
        />
      ) : null}

      <div className="relative mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <FaSpotify
          className={cn(
            'text-green-500',
            isPlaying && 'drop-shadow-[0_0_8px_rgba(34,197,94,0.55)]',
            !isPlaying && !isLoading && 'opacity-80'
          )}
        />
        {isLoading ? (
          <span className="spotify-skeleton-wave h-3 w-36 rounded-full" aria-hidden="true" />
        ) : (
          <span>{cardTitle}</span>
        )}
        {isPlaying ? <PlaybackEqualizer /> : null}
        {isPaused ? <FaPause className="text-[10px] text-gray-500 dark:text-gray-500" /> : null}
      </div>

      {isLoading ? (
        <NowPlayingSkeleton />
      ) : nowPlaying?.title ? (
        <a
          href={nowPlaying.songUrl || 'https://open.spotify.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          {nowPlaying.albumArtUrl ? (
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              {isPlaying ? (
                <span
                  className="spotify-album-pulse absolute inset-0 rounded-xl border border-green-400/50"
                  aria-hidden="true"
                />
              ) : null}
              <img
                src={nowPlaying.albumArtUrl}
                alt={`${nowPlaying.title} album art`}
                className="relative h-14 w-14 rounded-xl object-cover"
              />
            </span>
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
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{playbackLabel}</p>
          {nowPlaying?.state === 'unauthorized' ? (
            <a
              href="/spotify/auth"
              className="inline-flex rounded-xl border border-green-500/30 px-3 py-1.5 text-sm font-medium text-green-600 transition hover:border-green-500/60 hover:bg-green-500/10 dark:text-green-400"
            >
              Connect Spotify
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
