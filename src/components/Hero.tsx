'use client';

import SectionContainer from './SectionContainer';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FaSpotify } from 'react-icons/fa';

type NowPlayingResponse = {
  isPlaying: boolean;
  type: string | null;
  title: string | null;
  artists: string[];
  album: string | null;
  albumArtUrl: string | null;
  songUrl: string | null;
  progressMs: number | null;
  durationMs: number | null;
  timestamp: number | null;
  state: 'playing' | 'paused' | 'idle' | 'unauthorized' | 'rate_limited' | 'error';
  retryAfterSeconds?: number;
};

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalMs = 30000;
    let intervalHandle: ReturnType<typeof setInterval>;

    const startPolling = () => {
      clearInterval(intervalHandle);
      intervalHandle = setInterval(fetchNowPlaying, intervalMs);
    };

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('/api/spotify/now-playing', {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NowPlayingResponse;

        if (isMounted) {
          setNowPlaying(payload);
        }

        if (payload.state === 'rate_limited') {
          intervalMs = Math.max((payload.retryAfterSeconds ?? 60) * 1000, 30000);
          startPolling();
        } else if (intervalMs !== 30000) {
          intervalMs = 30000;
          startPolling();
        }
      } catch (error) {
        console.error('[hero-spotify]', error);
      }
    };

    fetchNowPlaying();
    intervalHandle = setInterval(fetchNowPlaying, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalHandle);
    };
  }, []);

  const playbackLabel =
    nowPlaying?.state === 'playing'
      ? 'Playing now'
      : nowPlaying?.state === 'paused'
        ? 'Paused'
        : nowPlaying?.state === 'idle'
          ? 'Not currently playing'
          : nowPlaying?.state === 'rate_limited'
            ? 'Rate limited by Spotify'
            : nowPlaying?.state === 'unauthorized'
              ? 'Spotify auth required'
              : 'Unavailable';

  return (
    <SectionContainer>
      <div className="relative w-full min-h-[calc(100vh-160px)] py-12 sm:py-16 flex items-center">
        <motion.div
          ref={ref}
          initial={{ y: 100, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{
            duration: 1,
            ease: [0.33, 0.2, 0, 0.9],
          }}
          className="w-full text-left space-y-6"
        >
          <h1 className="text-lg sm:text-xl font-normal tracking-normal leading-relaxed text-slate-100">
            hey - i'm andy.
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            a software engineer focused on applying ai to novel areas. currenly
            ml infra @ snap
          </p>

          <div className="max-w-xl rounded-xl border border-gray-700/70 bg-gray-900/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-300">
              <FaSpotify className="text-green-500" />
              <span>spotify now playing</span>
            </div>

            {nowPlaying?.title ? (
              <a
                href={nowPlaying.songUrl || 'https://open.spotify.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                {nowPlaying.albumArtUrl && (
                  <img
                    src={nowPlaying.albumArtUrl}
                    alt={`${nowPlaying.title} album art`}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-100">{nowPlaying.title}</p>
                  <p className="truncate text-sm text-gray-400">{nowPlaying.artists.join(', ')}</p>
                  <p className="mt-1 text-xs text-gray-500">{playbackLabel}</p>
                </div>
              </a>
            ) : (
              <p className="text-sm text-gray-400">{playbackLabel}</p>
            )}
          </div>
        </motion.div>
      </div>
    </SectionContainer>
  );
}

export default Hero;
