import { useState, useEffect, useRef, useCallback } from 'react';
import {
  YouTubePlayerState,
  YouTubePlayerError,
} from '../components/YouTubePlayer';

interface UseYouTubePlayerOptions {
  autoplay?: boolean;
  volume?: number;
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onError?: (_error: YouTubePlayerError) => void;
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

  // Load YouTube API
  useEffect(() => {
    if (!videoId) return;

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const originalOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (originalOnYouTubeIframeAPIReady) originalOnYouTubeIframeAPIReady();

      const player = new window.YT.Player(playerId.current, {
        videoId,
        playerVars: {
          autoplay: options.autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          volume: options.volume || 50,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            readyPromiseRef.current?.resolve();
            options.onReady?.();
          },
          onStateChange: (event: any) => {
            options.onStateChange?.(event.data);
          },
          onError: (event: any) => {
            options.onError?.(event.data);
          },
        },
      });

      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      window.onYouTubeIframeAPIReady = originalOnYouTubeIframeAPIReady;
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [videoId, options.autoplay, options.volume]);

  const play = useCallback(async () => {
    if (!isReady) {
      await readyPromiseRef.current?.promise;
    }
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
  }, [isReady]);

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
    seekTo,
    getCurrentTime,
    getDuration,
    playerId: playerId.current,
    waitForReady: () => readyPromiseRef.current?.promise || Promise.resolve(),
  };
};
