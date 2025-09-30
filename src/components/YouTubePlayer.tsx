import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';

export enum YouTubePlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5,
}

export enum YouTubePlayerError {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  EMBEDDING_DISABLED = 101,
  EMBEDDING_DISABLED_PRIVATE = 150,
}

export interface YouTubePlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates: () => number[];
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
  onError?: (error: YouTubePlayerError) => void;
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

const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  (
    {
      videoId,
      autoplay = false,
      volume = 50,
      onReady,
      onStateChange,
      onError,
      onTimeUpdate,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const {
      isReady,
      play,
      pause,
      seekTo: seekToPlayer,
      setVolume: setPlayerVolume,
      setPlaybackRate,
      getAvailablePlaybackRates,
      getCurrentTime,
      getDuration,
      playerId: playerElementId,
    } = useYouTubePlayer(videoId, {
      autoplay,
      volume,
      onReady,
      onStateChange,
      onError,
      onTimeUpdate,
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
        play().catch(console.error);
      } else {
        pause();
      }
    }, [autoplay, isReady, play, pause]);

    // Memoize the player API object to prevent unnecessary re-renders
    const playerApi = useMemo<YouTubePlayerRef>(
      () => ({
        play: async () => {
          try {
            await play();
          } catch (error) {
            console.error('Error playing video:', error);
            throw error;
          }
        },
        pause: () => {
          try {
            pause();
          } catch (error) {
            console.error('Error pausing video:', error);
          }
        },
        seekTo: (seconds: number) => {
          try {
            seekToPlayer(seconds);
          } catch (error) {
            console.error('Error seeking video:', error);
          }
        },
        setVolume: (vol: number) => {
          try {
            setPlayerVolume(vol);
          } catch (error) {
            console.error('Error setting volume:', error);
          }
        },
        setPlaybackRate: (rate: number) => {
          try {
            setPlaybackRate(rate);
          } catch (error) {
            console.error('Error setting playback rate:', error);
          }
        },
        getAvailablePlaybackRates: () => {
          try {
            return getAvailablePlaybackRates();
          } catch (error) {
            console.error('Error getting available playback rates:', error);
            return [1];
          }
        },
        getCurrentTime: () => {
          try {
            return getCurrentTime();
          } catch (error) {
            console.error('Error getting current time:', error);
            return 0;
          }
        },
        getDuration: () => {
          try {
            return getDuration();
          } catch (error) {
            console.error('Error getting duration:', error);
            return 0;
          }
        },
        isReady,
      }),
      [
        isReady,
        play,
        pause,
        seekToPlayer,
        setPlayerVolume,
        setPlaybackRate,
        getAvailablePlaybackRates,
        getCurrentTime,
        getDuration,
      ]
    );

    // Expose the player API via ref
    useImperativeHandle(ref, () => playerApi, [playerApi]);

    return (
      <div
        ref={containerRef}
        className={`bg-slate-900 ${className}`}
        style={{ minHeight: '200px', position: 'relative' }}
      >
        {/* YouTube player element - always present */}
        <div
          id={playerElementId}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: isReady ? 1 : 0,
          }}
        />

        {/* Loading overlay */}
        {(!videoId || !isReady) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-slate-400 text-center">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-sm font-orbitron">
                {!videoId ? 'No video selected' : 'Loading YouTube player...'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
