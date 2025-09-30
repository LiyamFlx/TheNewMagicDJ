import { useState, useEffect, useRef, useCallback } from 'react';
import {
  YouTubePlayerState,
  YouTubePlayerError,
} from '../components/YouTubePlayer';
import { audioUnlockService } from '../utils/audioUnlock';

interface UseYouTubePlayerOptions {
  autoplay?: boolean;
  volume?: number;
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onError?: (error: YouTubePlayerError) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const useYouTubePlayer = (
  videoId: string | null,
  options: UseYouTubePlayerOptions = {}
) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const readyPromiseRef = useRef<{
    resolve: () => void;
    promise: Promise<void>;
  } | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout>();
  const playerId = useRef(
    `youtube-player-${Math.random().toString(36).substr(2, 9)}`
  );

  // Initialize ready promise
  useEffect(() => {
    let resolve: () => void;
    const promise = new Promise<void>(res => {
      resolve = res;
    });
    readyPromiseRef.current = { resolve: resolve!, promise };
    return () => {
      readyPromiseRef.current = null;
    };
  }, []);

  // Handle time updates
  useEffect(() => {
    if (!isReady || !options.onTimeUpdate) return;

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        options.onTimeUpdate?.(currentTime);
      }
    }, 1000);

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [isReady, options.onTimeUpdate]);

  // Load YouTube API with robust readiness + retry
  useEffect(() => {
    if (!videoId) {
      console.log('YouTube Player: No videoId provided');
      return;
    }

    console.log('YouTube Player: Starting initialization for videoId:', videoId);
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const createPlayer = () => {
      console.log('YouTube Player: Attempting to create player, YT available:', !!window.YT, 'YT.Player available:', !!(window.YT && window.YT.Player));
      if (!window.YT || !window.YT.Player) return false;
      try {
        const el = document.getElementById(playerId.current);
        console.log('YouTube Player: Player element found:', !!el, 'Element ID:', playerId.current);
        if (!el) return false;
        console.log('YouTube Player: Creating new YT.Player instance...');
        const player = new window.YT.Player(playerId.current, {
          videoId,
          playerVars: {
            autoplay: 0, // Disable autoplay to comply with browser policies
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            // Remove volume from playerVars as it should be set via API
          },
          events: {
            onReady: () => {
              console.log('YouTube Player: onReady event fired');
              // Set volume after player is ready
              if (playerRef.current && options.volume !== undefined) {
                playerRef.current.setVolume(options.volume);
              }
              setIsReady(true);
              readyPromiseRef.current?.resolve();
              options.onReady?.();
            },
            onStateChange: (event: any) => {
              console.log('YouTube Player: State change:', event.data);
              options.onStateChange?.(event.data);
            },
            onError: (event: any) => {
              console.error('YouTube Player: Error event:', event.data);
              options.onError?.(event.data);
              // Attempt a soft recreate once on player error
              if (!isReady && retry < 2) {
                retry++;
                console.log('YouTube Player: Retrying due to error, attempt:', retry);
                retryTimer = setTimeout(() => {
                  try { playerRef.current?.destroy?.(); } catch {}
                  playerRef.current = null;
                  createPlayer();
                }, 500 * retry);
              }
            },
          },
        });
        console.log('YouTube Player: YT.Player instance created successfully');
        playerRef.current = player;
        return true;
      } catch (error) {
        console.error('YouTube Player: Error creating player:', error);
        return false;
      }
    };

    const ensureApiLoaded = () => {
      console.log('YouTube Player: ensureApiLoaded called, YT available:', !!window.YT);
      if (window.YT && window.YT.Player) {
        console.log('YouTube Player: API already loaded, attempting to create player');
        if (!createPlayer() && retry < 3) {
          retry++;
          console.log('YouTube Player: Create player failed, retrying...', retry);
          retryTimer = setTimeout(ensureApiLoaded, 300 * retry);
        }
        return;
      }
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      console.log('YouTube Player: Existing script found:', !!existingScript);
      if (!existingScript) {
        console.log('YouTube Player: Loading YouTube IFrame API script');
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const original = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube Player: onYouTubeIframeAPIReady fired');
        if (original) original();
        createPlayer();
      };

      // Fallback if onYouTubeIframeAPIReady never fires
      retryTimer = setTimeout(() => {
        console.log('YouTube Player: Fallback timeout triggered, checking API status');
        if (!window.YT || !window.YT.Player) {
          console.log('YouTube Player: API still not ready, retrying...');
          ensureApiLoaded();
        }
      }, 800);
    };

    ensureApiLoaded();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      // do not clobber global handler if others rely on it
    };
  }, [videoId, options.autoplay, options.volume, isReady, options.onReady, options.onStateChange, options.onError]);

  const play = useCallback(async () => {
    // Check if audio is unlocked, show prompt if needed
    if (!audioUnlockService.isAudioUnlocked()) {
      console.log('Audio not unlocked, showing interaction prompt');
      audioUnlockService.showInteractionPrompt();
      await audioUnlockService.waitForUnlock();
    }

    if (!isReady) {
      await readyPromiseRef.current?.promise;
    }

    if (playerRef.current) {
      try {
        // Ensure volume is set before playing
        if (options.volume !== undefined) {
          playerRef.current.setVolume(options.volume);
        }

        const result = playerRef.current.playVideo();

        // For debugging: log play attempt
        console.log('YouTube player play() called', {
          playerState: playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : 'unknown',
          volume: playerRef.current.getVolume ? playerRef.current.getVolume() : 'unknown',
          videoId,
          audioUnlocked: audioUnlockService.isAudioUnlocked()
        });

        return result;
      } catch (error) {
        console.error('YouTube player play error:', error);
        // Try to handle autoplay policy errors
        throw error;
      }
    }
  }, [isReady, options.volume, videoId]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch {}
    }
  }, []);

  const getAvailablePlaybackRates = useCallback((): number[] => {
    if (playerRef.current && typeof playerRef.current.getAvailablePlaybackRates === 'function') {
      try {
        return playerRef.current.getAvailablePlaybackRates() as number[];
      } catch {
        return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
      }
    }
    return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
    }
  }, []);

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, []);

  const getDuration = useCallback((): number => {
    if (playerRef.current) {
      return playerRef.current.getDuration();
    }
    return 0;
  }, []);

  return {
    isReady,
    play,
    pause,
    setVolume,
    setPlaybackRate,
    getAvailablePlaybackRates,
    seekTo,
    getCurrentTime,
    getDuration,
    playerId: playerId.current,
    waitForReady: () => readyPromiseRef.current?.promise || Promise.resolve(),
  };
};
