import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { logger } from '../utils/logger';

interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  volume?: number;
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onError?: (error: YouTubePlayerError) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  className?: string;
}

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

interface YouTubePlayerAPI {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoLoadedFraction(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          height?: string | number;
          width?: string | number;
          videoId: string;
          playerVars?: Record<string, any>;
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: any) => void;
            onError?: (event: any) => void;
          };
        }
      ) => YouTubePlayerAPI;
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

export interface YouTubePlayerRef {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seekTo(seconds: number): void;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getState(): YouTubePlayerState;
  isReady(): boolean;
  waitForReady(): Promise<void>;
}

const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  autoplay = false,
  volume = 50,
  onReady,
  onStateChange,
  onError,
  onProgress,
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerAPI | null>(null);
  const progressIntervalRef = useRef<number>();
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const readyPromiseRef = useRef<{
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  const MAX_RETRIES = 3;
  const playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;

  // Create a new ready promise when player is being initialized
  const createReadyPromise = useCallback(() => {
    let resolve: () => void;
    let reject: (error: Error) => void;

    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    readyPromiseRef.current = {
      promise,
      resolve: resolve!,
      reject: reject!
    };

    return promise;
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      setIsAPIReady(true);
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkAPI = () => {
        if (window.YT?.Player) {
          setIsAPIReady(true);
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    window.onYouTubeIframeAPIReady = () => {
      logger.info('YouTubePlayer', 'YouTube IFrame API loaded');
      setIsAPIReady(true);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove global callback
      if (window.onYouTubeIframeAPIReady) {
        delete window.onYouTubeIframeAPIReady;
      }
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isAPIReady || !containerRef.current || !videoId) {
      return;
    }

    // Create ready promise for this initialization
    createReadyPromise();

    // Clear any existing player
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        logger.warn('YouTubePlayer', 'Error destroying previous player', error);
      }
      playerRef.current = null;
      setIsPlayerReady(false);
    }

    // Create container element for YouTube player
    const playerElement = document.createElement('div');
    playerElement.id = playerId;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(playerElement);

    try {
      logger.info('YouTubePlayer', 'Initializing player', { videoId, autoplay, volume });

      const player = new window.YT.Player(playerId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0, // Hide YouTube controls for DJ interface
          disablekb: 1, // Disable keyboard controls
          enablejsapi: 1,
          fs: 0, // Disable fullscreen
          iv_load_policy: 3, // Hide video annotations
          modestbranding: 1, // Remove YouTube logo
          playsinline: 1, // Play inline on mobile
          rel: 0, // Don't show related videos
          showinfo: 0, // Hide video info
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            logger.info('YouTubePlayer', 'Player ready', { videoId });
            setIsPlayerReady(true);
            setPlayerError(null);
            setRetryCount(0);

            // Set initial volume
            try {
              event.target.setVolume(volume);
            } catch (error) {
              logger.warn('YouTubePlayer', 'Failed to set initial volume', error);
            }

            // Resolve the ready promise
            if (readyPromiseRef.current) {
              readyPromiseRef.current.resolve();
            }

            onReady?.();
          },
          onStateChange: (event: any) => {
            const state = event.data as YouTubePlayerState;
            logger.debug('YouTubePlayer', 'State changed', { state, videoId });

            onStateChange?.(state);

            // Start/stop progress tracking
            if (state === YouTubePlayerState.PLAYING) {
              startProgressTracking();
            } else {
              stopProgressTracking();
            }
          },
          onError: (event: any) => {
            const errorCode = event.data as YouTubePlayerError;
            let errorMessage = 'Unknown YouTube error';

            switch (errorCode) {
              case YouTubePlayerError.INVALID_PARAM:
                errorMessage = 'Invalid video parameters';
                break;
              case YouTubePlayerError.HTML5_ERROR:
                errorMessage = 'HTML5 player error';
                break;
              case YouTubePlayerError.VIDEO_NOT_FOUND:
                errorMessage = 'Video not found or removed';
                break;
              case YouTubePlayerError.EMBEDDING_DISABLED:
              case YouTubePlayerError.EMBEDDING_DISABLED_PRIVATE:
                errorMessage = 'Video embedding disabled';
                break;
            }

            logger.error('YouTubePlayer', 'Player error', { errorCode, errorMessage, videoId });
            setPlayerError(errorMessage);

            // Reject the ready promise
            if (readyPromiseRef.current) {
              readyPromiseRef.current.reject(new Error(errorMessage));
            }

            onError?.(errorCode);

            // Retry on certain errors
            if (errorCode === YouTubePlayerError.HTML5_ERROR && retryCount < MAX_RETRIES) {
              logger.info('YouTubePlayer', 'Retrying after HTML5 error', { retryCount: retryCount + 1 });
              setRetryCount(prev => prev + 1);
              setTimeout(() => {
                initializePlayer();
              }, 2000 * (retryCount + 1)); // Exponential backoff
            }
          }
        }
      });

      playerRef.current = player;

    } catch (error) {
      logger.error('YouTubePlayer', 'Failed to initialize player', { error, videoId });
      setPlayerError('Failed to initialize YouTube player');

      // Reject the ready promise on initialization failure
      if (readyPromiseRef.current) {
        readyPromiseRef.current.reject(new Error('Failed to initialize YouTube player'));
      }
    }
  }, [isAPIReady, videoId, autoplay, createReadyPromise]);

  const initializePlayer = useCallback(() => {
    // Force re-initialization by updating a dummy state
    setIsPlayerReady(false);
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = window.setInterval(() => {
      if (playerRef.current && isPlayerReady) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          onProgress?.(currentTime, duration);
        } catch (error) {
          logger.warn('YouTubePlayer', 'Error getting progress', error);
        }
      }
    }, 1000);
  }, [isPlayerReady, onProgress]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = undefined;
    }
  }, []);

  // Update volume when prop changes
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.setVolume(volume);
      } catch (error) {
        logger.warn('YouTubePlayer', 'Failed to set volume', error);
      }
    }
  }, [volume, isPlayerReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          logger.warn('YouTubePlayer', 'Error cleaning up player', error);
        }
      }
    };
  }, []);

  // Expose imperative API to parent components
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.playVideo();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to play', error);
          throw error;
        }
      } else {
        throw new Error('YouTube player not ready');
      }
    },
    pause: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.pauseVideo();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to pause', error);
        }
      }
    },
    stop: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.stopVideo();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to stop', error);
        }
      }
    },
    seekTo: (seconds: number) => {
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.seekTo(seconds, true);
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to seek', error);
        }
      }
    },
    setVolume: (vol: number) => {
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.setVolume(Math.max(0, Math.min(100, vol)));
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to set volume', error);
        }
      }
    },
    getVolume: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          return playerRef.current.getVolume();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to get volume', error);
        }
      }
      return 0;
    },
    getCurrentTime: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          return playerRef.current.getCurrentTime();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to get current time', error);
        }
      }
      return 0;
    },
    getDuration: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          return playerRef.current.getDuration();
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to get duration', error);
        }
      }
      return 0;
    },
    getState: () => {
      if (playerRef.current && isPlayerReady) {
        try {
          return playerRef.current.getPlayerState() as YouTubePlayerState;
        } catch (error) {
          logger.error('YouTubePlayer', 'Failed to get state', error);
        }
      }
      return YouTubePlayerState.UNSTARTED;
    },
    isReady: () => isPlayerReady,
    waitForReady: async () => {
      if (isPlayerReady) {
        return Promise.resolve();
      }

      if (readyPromiseRef.current) {
        return readyPromiseRef.current.promise;
      }

      // If no promise exists, player might not be initializing
      throw new Error('YouTube player not initializing');
    }
  }), [isPlayerReady]);

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="text-slate-400 text-center">
          <div className="text-sm font-orbitron">No video ID provided</div>
        </div>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="text-red-400 text-center">
          <div className="text-sm font-orbitron">{playerError}</div>
          {retryCount < MAX_RETRIES && (
            <div className="text-xs text-slate-400 mt-1">
              Retrying... ({retryCount + 1}/{MAX_RETRIES})
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAPIReady) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm font-orbitron">Loading YouTube API...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 ${className}`}
      style={{ minHeight: '200px' }}
    />
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;