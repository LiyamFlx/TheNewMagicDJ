import { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';

export enum YouTubePlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

export enum YouTubePlayerError {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  EMBEDDING_DISABLED = 101,
  EMBEDDING_DISABLED_PRIVATE = 150
}

export interface YouTubePlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isReady: boolean;
}

interface YouTubePlayerProps {
  videoId: string | null;
  autoplay?: boolean;
  volume?: number;
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onError?: (_error: YouTubePlayerError) => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

declare global {
  interface Window {
    YT: {
      Player: any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  autoplay = false,
  volume = 50,
  onReady,
  onStateChange,
  onError,
  onTimeUpdate,
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isReady,
    play,
    pause,
    seekTo: seekToPlayer,
    setVolume: setPlayerVolume,
    getCurrentTime,
    getDuration,
    playerId: playerElementId
  } = useYouTubePlayer(videoId, {
    autoplay,
    volume,
    onReady,
    onStateChange,
    onError,
    onTimeUpdate
  });

  // Handle volume changes
  useEffect(() => {
    if (isReady) {
      setPlayerVolume(volume);
    }
  }, [volume, isReady, setPlayerVolume]);

  // Handle autoplay
  useEffect(() => {
    if (!isReady) return;

    if (autoplay) {
      play().catch(console._error);
    } else {
      pause();
    }
  }, [autoplay, isReady, play, pause]);

  // Memoize the player API object to prevent unnecessary re-renders
  const playerApi = useMemo<YouTubePlayerRef>(() => ({
    play: async () => {
      try {
        await play();
      } catch (_error) {
        console._error('Error playing video:', _error);
        throw _error;
      }
    },
    pause: () => {
      try {
        pause();
      } catch (_error) {
        console._error('Error pausing video:', _error);
      }
    },
    seekTo: (seconds: number) => {
      try {
        seekToPlayer(seconds);
      } catch (_error) {
        console._error('Error seeking video:', _error);
      }
    },
    setVolume: (vol: number) => {
      try {
        setPlayerVolume(vol);
      } catch (_error) {
        console._error('Error setting volume:', _error);
      }
    },
    getCurrentTime: () => {
      try {
        return getCurrentTime();
      } catch (_error) {
        console._error('Error getting current time:', _error);
        return 0;
      }
    },
    getDuration: () => {
      try {
        return getDuration();
      } catch (_error) {
        console._error('Error getting duration:', _error);
        return 0;
      }
    },
    isReady
  }), [isReady, play, pause, seekToPlayer, setPlayerVolume, getCurrentTime, getDuration]);

  // Expose the player API via ref
  useImperativeHandle(ref, () => playerApi, [playerApi]);

  // Handle loading state
  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm font-orbitron">No video selected</div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm font-orbitron">Loading YouTube player...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={playerElementId}
      className={`bg-slate-900 ${className}`}
      style={{ minHeight: '200px' }}
    />
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
