import { useState, useEffect, useRef, useCallback } from 'react';
import {
  YouTubePlayerState,
  YouTubePlayerError,
} from '../components/YouTubePlayer';
import { audioUnlockService } from '../utils/audioUnlock';
import { logger } from '../utils/logger';

const log = {
  debug: (msg: string, data?: any) => logger.debug('YouTubePlayer', msg, data),
  info: (msg: string, data?: any) => logger.info('YouTubePlayer', msg, data),
  warn: (msg: string, data?: any) => logger.warn('YouTubePlayer', msg, data),
  error: (msg: string, err?: any) => logger.error('YouTubePlayer', msg, err),
};

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
      log.debug('No videoId provided');
      return;
    }

    log.info('Starting initialization', { videoId });
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const createPlayer = () => {
      log.debug('Attempting to create player', { ytAvailable: !!window.YT, ytPlayerAvailable: !!(window.YT && window.YT.Player) });
      if (!window.YT || !window.YT.Player) return false;
      try {
        const el = document.getElementById(playerId.current);
        log.debug('Player element lookup', { found: !!el, elementId: playerId.current });
        if (!el) return false;
        log.debug('Creating new YT.Player instance');
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
              log.info('Player ready');
              // Set volume after player is ready
              if (playerRef.current && options.volume !== undefined) {
                playerRef.current.setVolume(options.volume);
              }
              setIsReady(true);
              readyPromiseRef.current?.resolve();
              options.onReady?.();
            },
            onStateChange: (event: any) => {
              log.debug('State change', { state: event.data });
              options.onStateChange?.(event.data);
            },
            onError: (event: any) => {
              log.error('Player error', { errorCode: event.data });
              options.onError?.(event.data);
              // Attempt a soft recreate once on player error
              if (!isReady && retry < 2) {
                retry++;
                log.warn('Retrying due to error', { attempt: retry });
                retryTimer = setTimeout(() => {
                  try { playerRef.current?.destroy?.(); } catch {}
                  playerRef.current = null;
                  createPlayer();
                }, 500 * retry);
              }
            },
          },
        });
        log.info('YT.Player instance created');
        playerRef.current = player;
        return true;
      } catch (error) {
        log.error('Error creating player', error);
        return false;
      }
    };

    const ensureApiLoaded = () => {
      log.debug('ensureApiLoaded', { ytAvailable: !!window.YT });
      if (window.YT && window.YT.Player) {
        log.debug('API already loaded, creating player');
        if (!createPlayer() && retry < 3) {
          retry++;
          log.warn('Create player failed, retrying', { attempt: retry });
          retryTimer = setTimeout(ensureApiLoaded, 300 * retry);
        }
        return;
      }
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      log.debug('Existing API script', { found: !!existingScript });
      if (!existingScript) {
        log.info('Loading YouTube IFrame API script');
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const original = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        log.info('onYouTubeIframeAPIReady fired');
        if (original) original();
        createPlayer();
      };

      // Fallback if onYouTubeIframeAPIReady never fires
      retryTimer = setTimeout(() => {
        log.debug('Fallback timeout triggered');
        if (!window.YT || !window.YT.Player) {
          log.warn('API still not ready, retrying');
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
      log.info('Audio not unlocked, showing interaction prompt');
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

        log.debug('play() called', {
          playerState: playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : 'unknown',
          videoId,
        });

        return result;
      } catch (error) {
        log.error('play() error', error);
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
