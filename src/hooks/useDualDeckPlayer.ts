import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioSource } from '../services/audioSourceService';

export interface DeckState {
  // Playback state
  currentTime: number;
  duration: number;
  progress: number;
  isPlaying: boolean;

  // Source management
  currentSource: AudioSource | null;
  sources: AudioSource[];
  currentIndex: number;

  // Audio settings
  volume: number;

  // UI state
  isLoading: boolean;
  error: Error | null;

  // DJ features
  cuePoints: number[];
  bpm?: number;
  isSynced: boolean;
}

interface UseDualDeckPlayerProps {
  // Initial configuration
  initialVolume?: number;
  initialSources?: {
    deckA?: AudioSource[];
    deckB?: AudioSource[];
  };

  // Callbacks
  onDeckAStateChange?: (state: DeckState) => void;
  onDeckBStateChange?: (state: DeckState) => void;
  onError?: (error: Error, deck: 'deckA' | 'deckB') => void;
  onTrackEnd?: (deck: 'deckA' | 'deckB') => void;

  // Features
  _enableBPMDetection?: boolean;
  _enableAutoSync?: boolean;
}

export function useDualDeckPlayer({
  initialVolume = 75,
  initialSources = {},
  onDeckAStateChange,
  onDeckBStateChange,
  onError,
  onTrackEnd,
}: UseDualDeckPlayerProps = {}) {
  // State for both decks
  const [deckA, setDeckA] = useState<DeckState>(() =>
    createInitialDeckState(initialVolume, initialSources.deckA)
  );

  const [deckB, setDeckB] = useState<DeckState>(() =>
    createInitialDeckState(initialVolume, initialSources.deckB)
  );

  // Refs for audio elements and cleanup
  const audioRefs = useRef<{
    deckA: HTMLAudioElement | null;
    deckB: HTMLAudioElement | null;
  }>({ deckA: null, deckB: null });

  // Update parent components when state changes
  useEffect(() => {
    onDeckAStateChange?.(deckA);
  }, [deckA, onDeckAStateChange]);

  useEffect(() => {
    onDeckBStateChange?.(deckB);
  }, [deckB, onDeckBStateChange]);

  // Helper to update deck state
  const updateDeckState = useCallback((deckId: 'deckA' | 'deckB', updates: Partial<DeckState>) => {
    const updater = deckId === 'deckA' ? setDeckA : setDeckB;
    updater(prev => ({
      ...prev,
      ...updates,
      error: updates.error !== undefined ? updates.error : null,
    }));
  }, []);

  // Initialize audio elements
  useEffect(() => {
    audioRefs.current = {
      deckA: new Audio(),
      deckB: new Audio(),
    };

    const setupAudioListeners = (deckId: 'deckA' | 'deckB') => {
      const audio = audioRefs.current[deckId];
      if (!audio) return;

      const updateTime = () => {
        const currentTime = audio.currentTime;
        const progress = audio.duration ? (currentTime / audio.duration) * 100 : 0;
        updateDeckState(deckId, { currentTime, progress });
      };

      const handleLoadedMetadata = () => {
        updateDeckState(deckId, {
          duration: audio.duration,
          progress: 0,
          isLoading: false
        });
      };

      const handleEnded = () => {
        updateDeckState(deckId, { isPlaying: false });
        onTrackEnd?.(deckId);
      };

      const handleError = () => {
        const error = new Error(`Audio playback error on ${deckId}`);
        updateDeckState(deckId, {
          error,
          isLoading: false,
          isPlaying: false
        });
        onError?.(error, deckId);
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    };

    const cleanupA = setupAudioListeners('deckA');
    const cleanupB = setupAudioListeners('deckB');

    return () => {
      cleanupA?.();
      cleanupB?.();
      audioRefs.current.deckA?.pause();
      audioRefs.current.deckB?.pause();
      audioRefs.current.deckA = null;
      audioRefs.current.deckB = null;
    };
  }, [onError, onTrackEnd, updateDeckState]);

  // Load sources for a deck
  const loadSources = useCallback((deckId: 'deckA' | 'deckB', sources: AudioSource[], startIndex = 0) => {
    if (!sources.length) return;

    const validIndex = Math.max(0, Math.min(startIndex, sources.length - 1));
    const currentSource = sources[validIndex];

    updateDeckState(deckId, {
      sources,
      currentIndex: validIndex,
      currentSource,
      currentTime: 0,
      progress: 0,
      isLoading: true,
      error: null,
    });

    const audio = audioRefs.current[deckId];
    if (audio && currentSource) {
      audio.src = currentSource.url;
      audio.load();
    }
  }, [updateDeckState]);

  // Play/pause control
  const play = useCallback(async (deckId: 'deckA' | 'deckB') => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;

    try {
      await audio.play();
      updateDeckState(deckId, { isPlaying: true });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Playback failed');
      updateDeckState(deckId, {
        error: err,
        isPlaying: false
      });
      onError?.(err, deckId);
    }
  }, [onError, updateDeckState]);

  const pause = useCallback((deckId: 'deckA' | 'deckB') => {
    const audio = audioRefs.current[deckId];
    if (audio) {
      audio.pause();
      updateDeckState(deckId, { isPlaying: false });
    }
  }, [updateDeckState]);

  // Volume control
  const setVolume = useCallback((deckId: 'deckA' | 'deckB', volume: number) => {
    const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
    const audio = audioRefs.current[deckId];

    if (audio) {
      audio.volume = normalizedVolume;
    }

    updateDeckState(deckId, { volume });
  }, [updateDeckState]);

  // Playback control
  const seek = useCallback((deckId: 'deckA' | 'deckB', time: number) => {
    const audio = audioRefs.current[deckId];
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
      updateDeckState(deckId, {
        currentTime: audio.currentTime
      });
    }
  }, [updateDeckState]);

  // Source management
  const setSourceIndex = useCallback((deckId: 'deckA' | 'deckB', index: number) => {
    const deck = deckId === 'deckA' ? deckA : deckB;

    if (index >= 0 && index < deck.sources.length) {
      updateDeckState(deckId, {
        currentIndex: index,
        currentSource: deck.sources[index],
        currentTime: 0,
        progress: 0,
        isLoading: true
      });

      const audio = audioRefs.current[deckId];
      if (audio && deck.sources[index]) {
        audio.src = deck.sources[index].url;
        audio.load();
      }
    }
  }, [deckA, deckB, updateDeckState]);

  // Cue points
  const addCuePoint = useCallback((deckId: 'deckA' | 'deckB', time: number) => {
    const deck = deckId === 'deckA' ? deckA : deckB;
    if (!deck.cuePoints.includes(time)) {
      const newCuePoints = [...deck.cuePoints, time].sort((a, b) => a - b);
      updateDeckState(deckId, { cuePoints: newCuePoints });
    }
  }, [deckA, deckB, updateDeckState]);

  const clearCuePoints = useCallback((deckId: 'deckA' | 'deckB') => {
    updateDeckState(deckId, { cuePoints: [] });
  }, [updateDeckState]);

  // Get deck state and controls
  const getDeck = useCallback((deckId: 'deckA' | 'deckB') => ({
    state: deckId === 'deckA' ? deckA : deckB,
    controls: {
      play: () => play(deckId),
      pause: () => pause(deckId),
      seek: (time: number) => seek(deckId, time),
      setVolume: (volume: number) => setVolume(deckId, volume),
      loadSources: (sources: AudioSource[], index = 0) => loadSources(deckId, sources, index),
      setSourceIndex: (index: number) => setSourceIndex(deckId, index),
      addCuePoint: (time: number) => addCuePoint(deckId, time),
      clearCuePoints: () => clearCuePoints(deckId),
    }
  }), [
    deckA,
    deckB,
    play,
    pause,
    seek,
    setVolume,
    loadSources,
    setSourceIndex,
    addCuePoint,
    clearCuePoints
  ]);

  // Crossfader control
  const setCrossfader = useCallback((value: number) => {
    // Normalize to 0-1 range
    const normalized = Math.max(-1, Math.min(1, value / 100));

    // Calculate volumes based on crossfader position
    const deckAVolume = normalized <= 0 ? 1 : 1 - normalized;
    const deckBVolume = normalized >= 0 ? 1 : 1 + normalized;

    // Apply volumes
    setVolume('deckA', deckA.volume * deckAVolume * 100);
    setVolume('deckB', deckB.volume * deckBVolume * 100);
  }, [deckA.volume, deckB.volume, setVolume]);

  // Master volume control
  const setMasterVolume = useCallback((volume: number) => {
    setVolume('deckA', volume);
    setVolume('deckB', volume);
  }, [setVolume]);

  // Sync decks
  const syncDecks = useCallback(() => {
    if (deckA.isPlaying && deckB.isPlaying) {
      // If both decks are playing, sync BPM and phase
      // This is a placeholder - actual BPM sync would be more complex
      if (deckB.currentTime > 0) {
        seek('deckB', deckA.currentTime % (deckB.duration || 1));
      }
    }
  }, [deckA.isPlaying, deckB.isPlaying, deckA.currentTime, deckB.duration, deckB.currentTime, seek]);

  return {
    // Individual deck access
    deckA: getDeck('deckA'),
    deckB: getDeck('deckB'),

    // Combined controls
    isPlaying: deckA.isPlaying || deckB.isPlaying,

    // Crossfading
    setCrossfader,

    // Master controls
    setMasterVolume,

    // Sync controls
    syncDecks,
  };
}

// Helper function to create initial deck state
function createInitialDeckState(
  initialVolume: number,
  initialSources: AudioSource[] = []
): DeckState {
  return {
    // Playback state
    currentTime: 0,
    duration: 0,
    progress: 0,
    isPlaying: false,

    // Source management
    currentSource: initialSources[0] || null,
    sources: initialSources,
    currentIndex: initialSources.length > 0 ? 0 : -1,

    // Audio settings
    volume: initialVolume,

    // UI state
    isLoading: false,
    error: null,

    // DJ features
    cuePoints: [],
    bpm: undefined,
    isSynced: false,
  };
}
