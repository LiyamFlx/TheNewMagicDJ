import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  canPlay: boolean;
  autoplayBlocked: boolean;
}

export interface AudioControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  load: (src: string) => void;
  retry: () => Promise<void>;
}

const RETRY_DELAYS = [1000, 2000, 4000]; // Progressive retry delays

export function useAudioEngine(): [AudioState, AudioControls] {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    error: null,
    canPlay: false,
    autoplayBlocked: false,
  });

  const retryAttempts = useRef(0);
  const currentSrc = useRef<string>('');

  const updateState = useCallback((updates: Partial<AudioState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = error?.message || String(error);
    logger.error('AudioEngine', `Error in ${context}: ${errorMessage}`, error);

    const appError = errorHandler.createNetworkError(`Audio ${context}`);
    errorHandler.handleError(appError);

    updateState({
      error: errorMessage,
      isLoading: false,
      isPlaying: false
    });
  }, [updateState]);

  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    const handleLoadStart = () => {
      updateState({ isLoading: true, error: null, canPlay: false });
    };

    const handleCanPlay = () => {
      updateState({
        canPlay: true,
        isLoading: false,
        duration: audio.duration || 0
      });
      logger.info('AudioEngine', 'Audio can play', {
        src: audio.src,
        duration: audio.duration
      });
    };

    const handleCanPlayThrough = () => {
      updateState({ canPlay: true, isLoading: false });
      logger.info('AudioEngine', 'Audio can play through', { src: audio.src });
    };

    const handleTimeUpdate = () => {
      updateState({
        currentTime: audio.currentTime,
        duration: audio.duration || 0
      });
    };

    const handlePlay = () => {
      updateState({ isPlaying: true, autoplayBlocked: false });
      logger.info('AudioEngine', 'Audio started playing');
    };

    const handlePause = () => {
      updateState({ isPlaying: false });
      logger.info('AudioEngine', 'Audio paused');
    };

    const handleEnded = () => {
      updateState({ isPlaying: false, currentTime: 0 });
      logger.info('AudioEngine', 'Audio ended');
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;

      let errorMessage = 'Unknown audio error';
      let shouldRetry = false;

      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio';
            shouldRetry = true;
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            break;
        }
      }

      logger.error('AudioEngine', 'Audio element error', {
        code: error?.code,
        message: error?.message,
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState
      });

      updateState({
        error: errorMessage,
        isLoading: false,
        isPlaying: false,
        canPlay: false
      });

      // Auto-retry network errors
      if (shouldRetry && retryAttempts.current < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryAttempts.current];
        retryAttempts.current++;

        logger.info('AudioEngine', `Auto-retrying in ${delay}ms (attempt ${retryAttempts.current})`);

        setTimeout(() => {
          if (currentSrc.current) {
            load(currentSrc.current);
          }
        }, delay);
      }
    };

    const handleLoadedMetadata = () => {
      updateState({ duration: audio.duration || 0 });
      logger.debug('AudioEngine', 'Metadata loaded', { duration: audio.duration });
    };

    const handleWaiting = () => {
      updateState({ isLoading: true });
    };

    const handlePlaying = () => {
      updateState({ isLoading: false });
    };

    // Add all listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [updateState]);

  const initializeAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = state.volume;
      return setupAudioListeners(audioRef.current);
    }
    return () => {};
  }, [state.volume, setupAudioListeners]);

  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current || !state.canPlay) {
      throw new Error('Audio not ready for playback');
    }

    try {
      updateState({ error: null, autoplayBlocked: false });
      await audioRef.current.play();
      retryAttempts.current = 0; // Reset retry count on successful play
    } catch (error: any) {
      // Handle autoplay policy errors
      if (error.name === 'NotAllowedError') {
        logger.warn('AudioEngine', 'Autoplay blocked by browser policy');
        updateState({
          autoplayBlocked: true,
          error: 'Click to enable audio playback'
        });
        throw error;
      } else {
        handleError(error, 'play');
        throw error;
      }
    }
  }, [state.canPlay, updateState, handleError]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && state.canPlay) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
    }
  }, [state.canPlay, state.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    updateState({ volume: clampedVolume });
  }, [updateState]);

  const load = useCallback((src: string) => {
    if (!src) {
      updateState({ error: 'No audio source provided' });
      return;
    }

    currentSrc.current = src;
    retryAttempts.current = 0;

    if (!audioRef.current) {
      initializeAudio();
    }

    if (audioRef.current) {
      updateState({
        isLoading: true,
        error: null,
        canPlay: false,
        autoplayBlocked: false,
        currentTime: 0
      });

      audioRef.current.src = src;
      audioRef.current.load();

      logger.info('AudioEngine', 'Loading audio', { src });
    }
  }, [initializeAudio, updateState]);

  const retry = useCallback(async (): Promise<void> => {
    if (currentSrc.current) {
      logger.info('AudioEngine', 'Manual retry requested');
      load(currentSrc.current);

      // Wait a bit for loading, then try to play
      setTimeout(async () => {
        if (state.canPlay && !state.isPlaying) {
          try {
            await play();
          } catch (error) {
            logger.warn('AudioEngine', 'Retry play failed', error);
          }
        }
      }, 1000);
    }
  }, [currentSrc, load, play, state.canPlay, state.isPlaying]);

  // Initialize audio element on mount
  useEffect(() => {
    const cleanup = initializeAudio();
    return cleanup;
  }, [initializeAudio]);

  // Update volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  const controls: AudioControls = {
    play,
    pause,
    seek,
    setVolume,
    load,
    retry,
  };

  return [state, controls];
}