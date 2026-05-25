export type NowPlayingState =
  | 'playing'
  | 'paused'
  | 'idle'
  | 'unauthorized'
  | 'rate_limited'
  | 'error';

export type SpotifyNowPlaying = {
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
  state: NowPlayingState;
  retryAfterSeconds?: number;
};

export const EMPTY_SPOTIFY_NOW_PLAYING: SpotifyNowPlaying = {
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
