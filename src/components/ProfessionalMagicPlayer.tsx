import { useEffect, useRef, useCallback, useReducer, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Headphones,
  Settings,
  ArrowLeft,
  Square,
  Menu,
  X,
  List,
  Activity,
  Music,
  Zap,
  Radio,
  Crosshair,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Playlist, Session, Track } from '../types';
import MagicDancer from './MagicDancer';
import PlaylistEditor from './PlaylistEditor';
import YouTubePlayer, { YouTubePlayerRef, YouTubePlayerState } from './YouTubePlayer';
import AudioDebugger from './AudioDebugger';
import { audioSourceService, AudioSource } from '../services/audioSourceService';
import { logger } from '../utils/logger';
import { throttle } from '../utils/debounce';
import { formatTimeClock } from '../utils/format';

interface ProfessionalMagicPlayerProps {
  playlist: Playlist | null;
  session: Session | null;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  onSessionEnd: () => void;
  onBack: () => void;
}

// Consolidated state interface using useReducer
interface PlayerState {
  // Track management
  currentTrackIndex: number;

  // Audio state
  currentTime: number;
  duration: number;
  isLoading: boolean;

  // Volumes and mixing
  volumes: {
    deckA: number;
    deckB: number;
    master: number;
    crossfader: number; // -100 to 100
  };

  // Progress tracking
  progress: {
    deckA: number;
    deckB: number;
  };

  // Audio sources
  sources: {
    deckA: AudioSource[];
    deckB: AudioSource[];
    deckAIndex: number;
    deckBIndex: number;
    deckACurrent: AudioSource | null;
    deckBCurrent: AudioSource | null;
  };

  // Settings
  settings: {
    bpmSync: boolean;
    autoMix: boolean;
    shuffle: boolean;
    repeat: boolean;
  };

  // UI state
  ui: {
    mobileMenuOpen: boolean;
    showPlaylistEditor: boolean;
    showMagicDancer: boolean;
    showUnmuteOverlay: boolean;
    showSettings: boolean;
    showAudioDebugger: boolean;
  };

  // Error handling
  error: {
    message: string | null;
    isDegraded: boolean;
  };

  // Player readiness
  readiness: {
    youtubeA: boolean;
    youtubeB: boolean;
  };

  // Cue points
  cuePoints: {
    deckA: number[];
    deckB: number[];
  };
}

type PlayerAction =
  | { type: 'SET_TRACK_INDEX'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TIME'; payload: { currentTime: number; duration?: number } }
  | { type: 'SET_VOLUME'; payload: { deck: 'deckA' | 'deckB' | 'master' | 'crossfader'; value: number } }
  | { type: 'SET_PROGRESS'; payload: { deck: 'deckA' | 'deckB'; value: number } }
  | { type: 'SET_SOURCES'; payload: { deck: 'deckA' | 'deckB'; sources: AudioSource[]; index?: number } }
  | { type: 'SET_SOURCE_INDEX'; payload: { deck: 'deckA' | 'deckB'; index: number } }
  | { type: 'SET_SETTING'; payload: { key: keyof PlayerState['settings']; value: boolean } }
  | { type: 'SET_UI'; payload: { key: keyof PlayerState['ui']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { message: string | null; isDegraded?: boolean } }
  | { type: 'SET_READINESS'; payload: { player: 'youtubeA' | 'youtubeB'; ready: boolean } }
  | { type: 'ADD_CUE_POINT'; payload: { deck: 'deckA' | 'deckB'; position: number } }
  | { type: 'CLEAR_CUE_POINTS'; payload: { deck: 'deckA' | 'deckB' } }
  | { type: 'RESET_ERROR' };

const initialState: PlayerState = {
  currentTrackIndex: 0,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  volumes: {
    deckA: 85,
    deckB: 0,
    master: 75,
    crossfader: -50,
  },
  progress: {
    deckA: 0,
    deckB: 0,
  },
  sources: {
    deckA: [],
    deckB: [],
    deckAIndex: 0,
    deckBIndex: 0,
    deckACurrent: null,
    deckBCurrent: null,
  },
  settings: {
    bpmSync: true,
    autoMix: false,
    shuffle: false,
    repeat: false,
  },
  ui: {
    mobileMenuOpen: false,
    showPlaylistEditor: false,
    showMagicDancer: true,
    showUnmuteOverlay: false,
    showSettings: false,
    showAudioDebugger: false,
  },
  error: {
    message: null,
    isDegraded: false,
  },
  readiness: {
    youtubeA: false,
    youtubeB: false,
  },
  cuePoints: {
    deckA: [],
    deckB: [],
  },
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_TRACK_INDEX':
      return {
        ...state,
        currentTrackIndex: action.payload,
        progress: { ...state.progress, deckA: 0 },
        currentTime: 0,
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_TIME':
      return {
        ...state,
        currentTime: action.payload.currentTime,
        ...(action.payload.duration !== undefined && { duration: action.payload.duration }),
      };

    case 'SET_VOLUME':
      return {
        ...state,
        volumes: { ...state.volumes, [action.payload.deck]: action.payload.value },
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, [action.payload.deck]: action.payload.value },
      };

    case 'SET_SOURCES':
      const deckKey = action.payload.deck === 'deckA' ? 'deckA' : 'deckB';
      const indexKey = action.payload.deck === 'deckA' ? 'deckAIndex' : 'deckBIndex';
      const currentKey = action.payload.deck === 'deckA' ? 'deckACurrent' : 'deckBCurrent';

      return {
        ...state,
        sources: {
          ...state.sources,
          [deckKey]: action.payload.sources,
          [indexKey]: action.payload.index ?? 0,
          [currentKey]: action.payload.sources[action.payload.index ?? 0] || null,
        },
      };

    case 'SET_SOURCE_INDEX':
      const deck = action.payload.deck === 'deckA' ? 'deckA' : 'deckB';
      const sources = state.sources[deck];
      const current = action.payload.deck === 'deckA' ? 'deckACurrent' : 'deckBCurrent';
      const index = action.payload.deck === 'deckA' ? 'deckAIndex' : 'deckBIndex';

      return {
        ...state,
        sources: {
          ...state.sources,
          [index]: action.payload.index,
          [current]: sources[action.payload.index] || null,
        },
      };

    case 'SET_SETTING':
      return {
        ...state,
        settings: { ...state.settings, [action.payload.key]: action.payload.value },
      };

    case 'SET_UI':
      return {
        ...state,
        ui: { ...state.ui, [action.payload.key]: action.payload.value },
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: {
          message: action.payload.message,
          isDegraded: action.payload.isDegraded ?? state.error.isDegraded,
        },
      };

    case 'SET_READINESS':
      return {
        ...state,
        readiness: { ...state.readiness, [action.payload.player]: action.payload.ready },
      };

    case 'ADD_CUE_POINT':
      return {
        ...state,
        cuePoints: {
          ...state.cuePoints,
          [action.payload.deck]: [...state.cuePoints[action.payload.deck], action.payload.position],
        },
      };

    case 'CLEAR_CUE_POINTS':
      return {
        ...state,
        cuePoints: {
          ...state.cuePoints,
          [action.payload.deck]: [],
        },
      };

    case 'RESET_ERROR':
      return {
        ...state,
        error: { message: null, isDegraded: false },
      };

    default:
      return state;
  }
}

// Custom hook for resource cleanup
const useResourceCleanup = () => {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.push(fn);
  }, []);

  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(fn => {
        try {
          fn();
        } catch (error) {
          logger.warn('ProfessionalMagicPlayer', 'Cleanup function failed', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup };
};

// Custom hook for audio source management
const useAudioSources = () => {
  const loadAudioSources = useCallback(async (track: Track): Promise<AudioSource[]> => {
    try {
      logger.info('ProfessionalMagicPlayer', 'Loading audio sources for track', {
        trackId: track.id,
        trackTitle: track.title
      });

      const sources = await audioSourceService.getAudioSourcesForTrack(track);
      logger.info('ProfessionalMagicPlayer', 'Audio sources loaded', {
        trackId: track.id,
        sourceCount: sources.length,
        sourceTypes: sources.map(s => s.type)
      });

      return sources;
    } catch (error) {
      logger.error('ProfessionalMagicPlayer', 'Failed to load audio sources', {
        trackId: track.id,
        error
      });
      return [];
    }
  }, []);

  return { loadAudioSources };
};

// Custom hook for waveform generation
const useWaveform = () => {
  const waveformDataA = useRef<number[]>([]);
  const waveformDataB = useRef<number[]>([]);

  const generateWaveformData = useCallback((width: number): number[] => {
    const bars = Math.floor(width / 3);
    const data: number[] = [];

    for (let i = 0; i < bars; i++) {
      const frequency = (i / bars) * 10 + 1;
      const baseAmplitude = Math.sin(frequency * 0.5) * 0.3 + 0.7;
      data.push(baseAmplitude);
    }

    return data;
  }, []);

  const updateWaveformData = useCallback((deck: 'A' | 'B', track: Track | undefined) => {
    if (track) {
      const data = generateWaveformData(320);
      if (deck === 'A') {
        waveformDataA.current = data;
      } else {
        waveformDataB.current = data;
      }
    }
  }, [generateWaveformData]);

  return { waveformDataA, waveformDataB, updateWaveformData };
};

const ProfessionalMagicPlayer: React.FC<ProfessionalMagicPlayerProps> = ({
  playlist,
  session,
  isPlaying,
  onPlayPause,
  onSessionEnd,
  onBack,
}) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const { addCleanup } = useResourceCleanup();
  const { loadAudioSources } = useAudioSources();
  const { waveformDataA, waveformDataB, updateWaveformData } = useWaveform();

  // Refs for audio and YouTube players
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const youtubeARef = useRef<YouTubePlayerRef | null>(null);
  const youtubeBRef = useRef<YouTubePlayerRef | null>(null);

  // Canvas refs for waveform
  const waveformCanvasA = useRef<HTMLCanvasElement>(null);
  const waveformCanvasB = useRef<HTMLCanvasElement>(null);

  // Interval refs
  const autoMixIntervalRef = useRef<number>();
  const fadeIntervalRef = useRef<number>();

  // Memoized current and next tracks
  const currentTrack = useMemo(() => playlist?.tracks[state.currentTrackIndex], [playlist, state.currentTrackIndex]);
  const nextTrack = useMemo(() => playlist?.tracks[state.currentTrackIndex + 1], [playlist, state.currentTrackIndex]);

  // Memoized volume calculations for performance
  const volumeCalculations = useMemo(() => {
    const { volumes } = state;
    const deckAVol = (volumes.deckA / 100) * (volumes.master / 100);
    const deckBVol = (volumes.deckB / 100) * (volumes.master / 100);

    const crossfadeA = volumes.crossfader <= 0 ? 1 : Math.max(0, 1 - volumes.crossfader / 100);
    const crossfadeB = volumes.crossfader >= 0 ? 1 : Math.max(0, 1 + volumes.crossfader / 100);

    return {
      deckA: Math.max(0, Math.min(1, deckAVol * crossfadeA)),
      deckB: Math.max(0, Math.min(1, deckBVol * crossfadeB)),
    };
  }, [state.volumes]);

  // Error auto-clear effect
  useEffect(() => {
    if (state.error.message) {
      const timeout = setTimeout(() => {
        dispatch({ type: 'RESET_ERROR' });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state.error.message]);

  // Log session information
  useEffect(() => {
    if (session?.id) {
      logger.info('ProfessionalMagicPlayer', 'Session active', {
        sessionId: session.id,
      });
    }
  }, [session?.id]);

  // Update waveform data when tracks change
  useEffect(() => {
    updateWaveformData('A', currentTrack);
  }, [currentTrack, updateWaveformData]);

  useEffect(() => {
    updateWaveformData('B', nextTrack);
  }, [nextTrack, updateWaveformData]);

  // Audio cleanup utility
  const cleanupAudioElement = useCallback((audio: HTMLAudioElement) => {
    try {
      audio.pause();
      audio.currentTime = 0;

      // Remove all event listeners
      const events = ['loadedmetadata', 'canplaythrough', 'timeupdate', 'ended', 'error'];
      events.forEach(event => {
        audio.removeEventListener(event, () => { });
      });

      audio.src = '';
      audio.load();

      logger.debug('ProfessionalMagicPlayer', 'Audio element cleaned up successfully');
    } catch (error) {
      logger.warn('ProfessionalMagicPlayer', 'Error during audio cleanup', error);
    }
  }, []);

  // Handle track end
  const handleTrackEnd = useCallback(() => {
    if (state.settings.repeat && state.currentTrackIndex === (playlist?.tracks.length ?? 0) - 1) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: 0 });
      return;
    }

    if (state.currentTrackIndex < (playlist?.tracks.length ?? 0) - 1) {
      let nextIndex = state.currentTrackIndex + 1;

      if (state.settings.shuffle) {
        const availableIndices = Array.from({ length: playlist?.tracks.length ?? 0 }, (_, i) => i)
          .filter(i => i !== state.currentTrackIndex);
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? nextIndex;
      }

      dispatch({ type: 'SET_TRACK_INDEX', payload: nextIndex });
    } else if (state.settings.repeat) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: 0 });
    } else {
      onSessionEnd();
    }
  }, [state.currentTrackIndex, state.settings.shuffle, state.settings.repeat, playlist?.tracks.length, onSessionEnd]);

  // Handle source errors with retry logic and rate limiting
  const errorCountRef = useRef<{[key: string]: number}>({});
  const handleSourceError = useCallback((deck: 'A' | 'B', error: any) => {
    const sources = deck === 'A' ? state.sources.deckA : state.sources.deckB;
    const currentIndex = deck === 'A' ? state.sources.deckAIndex : state.sources.deckBIndex;

    // Rate limit error logging (max 3 errors per deck)
    const errorKey = `deck${deck}`;
    errorCountRef.current[errorKey] = (errorCountRef.current[errorKey] || 0) + 1;

    if (errorCountRef.current[errorKey] <= 3) {
      logger.warn('ProfessionalMagicPlayer', `Audio source error on deck ${deck} (${errorCountRef.current[errorKey]}/3)`, {
        error: error?.message || 'Unknown error',
        currentIndex,
        totalSources: sources.length
      });
    }

    // Try next source
    const nextIndex = currentIndex + 1;
    if (nextIndex < sources.length && errorCountRef.current[errorKey] <= 5) {
      dispatch({ type: 'SET_SOURCE_INDEX', payload: { deck: deck === 'A' ? 'deckA' : 'deckB', index: nextIndex } });
    } else {
      // No more sources available or too many errors
      dispatch({
        type: 'SET_ERROR',
        payload: {
          message: `Audio unavailable for deck ${deck}`,
          isDegraded: true
        }
      });
      // Reset error count for future attempts
      errorCountRef.current[errorKey] = 0;
    }
  }, [state.sources]);

  // Load sources for current track
  useEffect(() => {
    if (!currentTrack) {
      dispatch({ type: 'SET_SOURCES', payload: { deck: 'deckA', sources: [] } });
      return;
    }

    // Ensure track has proper metadata structure
    if (!currentTrack.meta) {
      currentTrack.meta = {};
    }

    let cancelled = false;

    const loadSources = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const sources = await loadAudioSources(currentTrack);

        // Validate sources have proper URLs
        const validSources = sources.filter(source => {
          if (!source.url || typeof source.url !== 'string') return false;
          // Check for valid audio URLs (direct audio files or generated blobs)
          return source.url.startsWith('blob:') ||
                 source.url.startsWith('data:audio/') ||
                 source.url.match(/\.(mp3|wav|m4a|ogg|aac)$/i) ||
                 source.url.startsWith('https://');
        });

        if (!cancelled) {
          if (validSources.length > 0) {
            dispatch({ type: 'SET_SOURCES', payload: { deck: 'deckA', sources: validSources, index: 0 } });
          } else {
            dispatch({
              type: 'SET_ERROR',
              payload: {
                message: 'No valid audio sources available',
                isDegraded: true
              }
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'SET_ERROR',
            payload: {
              message: 'Failed to load audio sources',
              isDegraded: true
            }
          });
        }
      } finally {
        if (!cancelled) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    loadSources();

    return () => {
      cancelled = true;
    };
  }, [currentTrack, loadAudioSources]);

  // Load sources for next track
  useEffect(() => {
    if (!nextTrack) {
      dispatch({ type: 'SET_SOURCES', payload: { deck: 'deckB', sources: [] } });
      return;
    }

    let cancelled = false;

    const loadSources = async () => {
      try {
        const sources = await loadAudioSources(nextTrack);

        if (!cancelled && sources.length > 0) {
          dispatch({ type: 'SET_SOURCES', payload: { deck: 'deckB', sources, index: 0 } });
        }
      } catch (error) {
        // Silently fail for deck B sources
        logger.warn('ProfessionalMagicPlayer', 'Failed to load deck B sources', error);
      }
    };

    loadSources();

    return () => {
      cancelled = true;
    };
  }, [nextTrack, loadAudioSources]);

  // Initialize Audio A
  useEffect(() => {
    const { deckA, deckACurrent } = state.sources;

    if (!deckACurrent || deckA.length === 0) {
      return;
    }

    // Clean up existing audio
    if (audioARef.current) {
      cleanupAudioElement(audioARef.current);
      audioARef.current = null;
    }

    // Skip YouTube sources - iframe player handles audio
    if (deckACurrent.type === 'youtube') {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({
        type: 'SET_TIME', payload: {
          currentTime: 0,
          duration: deckACurrent.duration || 180
        }
      });
      return;
    }

    // Create HTML audio element
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volumeCalculations.deckA;

    // Validate and set source
    if (!deckACurrent.url || typeof deckACurrent.url !== 'string') {
      handleSourceError('A', new Error('Invalid audio source URL'));
      return;
    }

    audio.src = deckACurrent.url;

    // Validate that src was set
    if (!audio.src) {
      handleSourceError('A', new Error('Empty audio src'));
      return;
    }

    // Event listeners
    const onLoadedMetadata = () => {
      const duration = audio.duration || deckACurrent.duration || 180;
      dispatch({ type: 'SET_TIME', payload: { currentTime: 0, duration } });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const onTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', payload: { currentTime: audio.currentTime } });
      const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckA', value: progress } });
    };

    const onError = () => {
      dispatch({ type: 'SET_LOADING', payload: false });
      handleSourceError('A', new Error('Audio load failed'));
    };

    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', onError);

    audioARef.current = audio;
    dispatch({ type: 'SET_LOADING', payload: true });

    // Cleanup function
    const cleanup = () => {
      if (audio) {
        cleanupAudioElement(audio);
      }
    };

    addCleanup(cleanup);

    return cleanup;
  }, [state.sources.deckACurrent, volumeCalculations.deckA, cleanupAudioElement, handleSourceError, handleTrackEnd, addCleanup]);

  // Initialize Audio B
  useEffect(() => {
    const { deckB, deckBCurrent } = state.sources;

    if (!deckBCurrent || deckB.length === 0) {
      return;
    }

    // Clean up existing audio
    if (audioBRef.current) {
      cleanupAudioElement(audioBRef.current);
      audioBRef.current = null;
    }

    // Skip YouTube sources for deck B - iframe player handles audio
    if (deckBCurrent.type === 'youtube') {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({
        type: 'SET_TIME', payload: {
          currentTime: 0,
          duration: deckBCurrent.duration || 180
        }
      });
      return;
    }

    // Create HTML audio element
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = volumeCalculations.deckB;

    try {
      audio.src = deckBCurrent.url;
    } catch (error) {
      handleSourceError('B', error);
      return;
    }

    // Event listeners
    const onTimeUpdate = () => {
      const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckB', value: progress } });
    };

    const onError = (e: Event) => {
      handleSourceError('B', (e.target as HTMLAudioElement).error);
    };

    // Add listeners
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('error', onError);

    audioBRef.current = audio;

    // Cleanup function
    const cleanup = () => {
      if (audio) {
        cleanupAudioElement(audio);
      }
    };

    addCleanup(cleanup);

    return cleanup;
  }, [state.sources.deckBCurrent, volumeCalculations.deckB, cleanupAudioElement, handleSourceError, addCleanup]);

  // Volume update effect
  useEffect(() => {
    if (audioARef.current) {
      audioARef.current.volume = volumeCalculations.deckA;
    }
    if (audioBRef.current) {
      audioBRef.current.volume = volumeCalculations.deckB;
    }
  }, [volumeCalculations]);

  // Play/pause control
  useEffect(() => {
    const handlePlayPause = async () => {
      const audio = audioARef.current;

      if (!audio) {
        return;
      }

      try {
        if (isPlaying) {
          await audio.play();
          dispatch({ type: 'SET_UI', payload: { key: 'showUnmuteOverlay', value: false } });
        } else {
          audio.pause();
        }
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          dispatch({ type: 'SET_UI', payload: { key: 'showUnmuteOverlay', value: true } });
        } else {
          dispatch({ type: 'SET_ERROR', payload: { message: 'Playback failed', isDegraded: false } });
        }
      }
    };

    handlePlayPause();
  }, [isPlaying]);

  // Auto mix functionality
  useEffect(() => {
    if (autoMixIntervalRef.current) {
      clearInterval(autoMixIntervalRef.current);
    }

    if (isPlaying && state.settings.autoMix && nextTrack) {
      autoMixIntervalRef.current = window.setInterval(() => {
        const audio = audioARef.current;
        if (audio && audio.duration > 0) {
          const progress = (audio.currentTime / audio.duration) * 100;
          if (progress >= 75) {
            handleAutoTransition();
          }
        }
      }, 1000);

      addCleanup(() => {
        if (autoMixIntervalRef.current) {
          clearInterval(autoMixIntervalRef.current);
        }
      });
    }

    return () => {
      if (autoMixIntervalRef.current) {
        clearInterval(autoMixIntervalRef.current);
      }
    };
  }, [isPlaying, state.settings.autoMix, nextTrack, addCleanup]);

  // Waveform animation with performance optimization
  useEffect(() => {
    let animationId: number;
    let lastUpdate = 0;

    const animate = (timestamp: number) => {
      // Throttle to 30fps for better performance
      if (timestamp - lastUpdate >= 33) {
        const shouldUpdateA = isPlaying || state.progress.deckA !== lastUpdate;
        const shouldUpdateB = isPlaying || state.progress.deckB !== lastUpdate;

        if (shouldUpdateA) {
          drawWaveform(
            waveformCanvasA.current,
            currentTrack,
            state.progress.deckA,
            'green',
            waveformDataA.current
          );
        }

        if (shouldUpdateB) {
          drawWaveform(
            waveformCanvasB.current,
            nextTrack,
            state.progress.deckB,
            'purple',
            waveformDataB.current
          );
        }

        lastUpdate = timestamp;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    addCleanup(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    });

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentTrack, nextTrack, state.progress, isPlaying, addCleanup]);

  // Enhanced waveform drawing function
  const drawWaveform = useCallback((
    canvas: HTMLCanvasElement | null,
    track: Track | undefined,
    progress: number,
    color: 'green' | 'purple',
    waveformData: number[]
  ) => {
    if (!canvas || !track || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerY = height / 2;
    const progressWidth = (width * progress) / 100;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Animation timing
    const time = Date.now() * 0.001;
    const energyMultiplier = isPlaying ? (track.energy ?? 0.5) : 0.3;

    // Draw waveform bars
    for (let i = 0; i < waveformData.length; i++) {
      const x = i * 3;
      const baseAmplitude = waveformData[i];
      const animatedAmplitude = baseAmplitude * energyMultiplier *
        (1 + Math.sin(time * 2 + i * 0.1) * 0.1);
      const barHeight = (height * animatedAmplitude) / 2;

      // Determine colors
      const isPlayed = x < progressWidth;
      let fillColor, shadowColor;

      if (color === 'green') {
        fillColor = isPlayed ? '#e879f9' : 'rgba(232, 121, 249, 0.3)';
        shadowColor = isPlayed ? 'rgba(232, 121, 249, 0.8)' : 'rgba(232, 121, 249, 0.2)';
      } else {
        fillColor = isPlayed ? '#22d3ee' : 'rgba(34, 211, 238, 0.3)';
        shadowColor = isPlayed ? 'rgba(34, 211, 238, 0.8)' : 'rgba(34, 211, 238, 0.2)';
      }

      // Draw bar with glow
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, centerY - barHeight / 2, 2, barHeight);
      ctx.shadowBlur = 0;
    }

    // Draw cue points
    const cuePoints = color === 'green' ? state.cuePoints.deckA : state.cuePoints.deckB;
    cuePoints.forEach(cuePosition => {
      const cueX = (width * cuePosition) / 100;
      ctx.strokeStyle = color === 'green' ? '#fbbf24' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(Math.round(cueX), 0);
      ctx.lineTo(Math.round(cueX), height);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw playhead
    ctx.strokeStyle = color === 'green' ? '#e879f9' : '#22d3ee';
    ctx.lineWidth = 3;
    ctx.shadowColor = color === 'green' ? 'rgba(232, 121, 249, 1)' : 'rgba(34, 211, 238, 1)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(Math.round(progressWidth), 0);
    ctx.lineTo(Math.round(progressWidth), height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw BPM markers with safety checks
    const trackBpm = track.bpm;
    if (trackBpm && trackBpm > 0) {
      const trackDuration = track.duration || 180;
      const beatInterval = (60 / trackBpm) * (width / trackDuration);

      if (beatInterval > 0 && beatInterval < width && !isNaN(beatInterval)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let beat = 0; beat < width; beat += beatInterval) {
          if (beat <= width) {
            ctx.beginPath();
            ctx.moveTo(Math.round(beat), height - 10);
            ctx.lineTo(Math.round(beat), height);
            ctx.stroke();
          }
        }
      }
    }
  }, [isPlaying, state.cuePoints]);

  // Enhanced auto transition with proper cleanup
  const handleAutoTransition = useCallback(() => {
    const audioB = audioBRef.current;
    if (!nextTrack || !audioB) return;

    // Clear any existing fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audioB.play().catch(e => {
      logger.error('Next track play failed', e);
    });

    fadeIntervalRef.current = window.setInterval(() => {
      dispatch({
        type: 'SET_VOLUME', payload: {
          deck: 'crossfader',
          value: Math.min(50, state.volumes.crossfader + 15)
        }
      });

      if (state.volumes.crossfader >= 50) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
        dispatch({ type: 'SET_TRACK_INDEX', payload: state.currentTrackIndex + 1 });
        dispatch({ type: 'SET_VOLUME', payload: { deck: 'crossfader', value: -50 } });
        dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckB', value: 0 } });
      }
    }, 150);

    addCleanup(() => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    });
  }, [nextTrack, state.volumes.crossfader, state.currentTrackIndex, addCleanup]);

  // Throttled callbacks for better performance
  const throttledOnPlayPause = useMemo(() =>
    throttle((playing: boolean) => {
      onPlayPause(playing);
    }, 250)
    , [onPlayPause]);

  // Handler functions
  const handleSeek = useCallback((percentage: number) => {
    const audio = audioARef.current;
    const maxDuration = state.duration || (currentTrack?.duration ?? 180);

    if (audio && maxDuration > 0 && audio.readyState >= 2) {
      const newTime = (percentage / 100) * maxDuration;
      const clampedTime = Math.min(newTime, maxDuration);
      audio.currentTime = clampedTime;
      dispatch({ type: 'SET_TIME', payload: { currentTime: clampedTime } });
    }
  }, [state.duration, currentTrack]);

  const handleSkipForward = useCallback(() => {
    if (state.currentTrackIndex < (playlist?.tracks.length ?? 0) - 1) {
      const newIndex = state.currentTrackIndex + 1;
      logger.info('ProfessionalMagicPlayer', 'Skipping forward', {
        from: state.currentTrackIndex,
        to: newIndex,
        currentTrack: currentTrack?.title,
        nextTrack: playlist?.tracks[newIndex]?.title,
      });
      dispatch({ type: 'SET_TRACK_INDEX', payload: newIndex });
    }
  }, [state.currentTrackIndex, playlist, currentTrack]);

  const handleSkipBack = useCallback(() => {
    if (state.currentTrackIndex > 0) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: state.currentTrackIndex - 1 });
    }
  }, [state.currentTrackIndex]);

  const handleUnmute = useCallback(() => {
    dispatch({ type: 'SET_UI', payload: { key: 'showUnmuteOverlay', value: false } });
    onPlayPause(true);
  }, [onPlayPause]);

  const handleTrackSelect = useCallback((index: number) => {
    dispatch({ type: 'SET_TRACK_INDEX', payload: index });
  }, []);

  const handleTrackRemove = useCallback((index: number) => {
    if (!playlist) return;

    const newTracks = playlist.tracks.filter((_, i) => i !== index);
    const updatedPlaylist = { ...playlist, tracks: newTracks };

    // Propagate changes to parent
    handlePlaylistUpdate(updatedPlaylist);

    if (index < state.currentTrackIndex) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: state.currentTrackIndex - 1 });
    } else if (index === state.currentTrackIndex && index >= newTracks.length) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: Math.max(0, newTracks.length - 1) });
    }
  }, [playlist, state.currentTrackIndex]);

  const handleTrackReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!playlist) return;

    const newTracks = [...playlist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);

    const updatedPlaylist = { ...playlist, tracks: newTracks };
    handlePlaylistUpdate(updatedPlaylist);

    if (fromIndex === state.currentTrackIndex) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: toIndex });
    } else if (fromIndex < state.currentTrackIndex && toIndex >= state.currentTrackIndex) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: state.currentTrackIndex - 1 });
    } else if (fromIndex > state.currentTrackIndex && toIndex <= state.currentTrackIndex) {
      dispatch({ type: 'SET_TRACK_INDEX', payload: state.currentTrackIndex + 1 });
    }
  }, [playlist, state.currentTrackIndex]);

  const handlePlaylistUpdate = useCallback((updatedPlaylist: Playlist) => {
    // In a real app this would update the parent state
    logger.info('ProfessionalMagicPlayer', 'Playlist updated', { playlistId: updatedPlaylist.id });
  }, []);

  const addCuePoint = useCallback((deck: 'deckA' | 'deckB', position: number) => {
    dispatch({ type: 'ADD_CUE_POINT', payload: { deck, position } });
    logger.info('ProfessionalMagicPlayer', 'Cue point added', { deck, position });
  }, []);

  const clearCuePoints = useCallback((deck: 'deckA' | 'deckB') => {
    dispatch({ type: 'CLEAR_CUE_POINTS', payload: { deck } });
  }, []);

  // Deck B Control Handlers
  const [deckBPlaying, setDeckBPlaying] = useState(false);

  const handleDeckBSkipBack = useCallback(() => {
    const { deckB, deckBIndex } = state.sources;
    if (deckBIndex > 0 && deckB.length > 0) {
      dispatch({ type: 'SET_SOURCE_INDEX', payload: { deck: 'deckB', index: deckBIndex - 1 } });
      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckB', value: 0 } });
      setDeckBPlaying(false);
      logger.info('ProfessionalMagicPlayer', 'Deck B skip back', {
        from: deckBIndex,
        to: deckBIndex - 1,
        total: deckB.length
      });
    }
  }, [state.sources]);

  const handleDeckBSkipForward = useCallback(() => {
    const { deckB, deckBIndex } = state.sources;
    if (deckBIndex < deckB.length - 1 && deckB.length > 0) {
      dispatch({ type: 'SET_SOURCE_INDEX', payload: { deck: 'deckB', index: deckBIndex + 1 } });
      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckB', value: 0 } });
      setDeckBPlaying(false);
      logger.info('ProfessionalMagicPlayer', 'Deck B skip forward', {
        from: deckBIndex,
        to: deckBIndex + 1,
        total: deckB.length
      });
    }
  }, [state.sources]);

  const handleDeckBPlayPause = useCallback((shouldPlay: boolean) => {
    const { deckBCurrent } = state.sources;
    if (!deckBCurrent) return;

    // Update state first to ensure UI responsiveness
    setDeckBPlaying(shouldPlay);

    try {
      if (deckBCurrent.type === 'youtube' && youtubeBRef.current) {
        if (shouldPlay) {
          youtubeBRef.current.play();
        } else {
          youtubeBRef.current.pause();
        }
        logger.info('ProfessionalMagicPlayer', 'Deck B YouTube playback', { shouldPlay });
      } else if (deckBCurrent.type === 'spotify' && audioBRef.current) {
        if (shouldPlay) {
          audioBRef.current.play().catch(error => {
            handleSourceError('B', error);
            setDeckBPlaying(false);
          });
        } else {
          audioBRef.current.pause();
        }
        logger.info('ProfessionalMagicPlayer', 'Deck B audio playback', { shouldPlay });
      }
    } catch (error) {
      logger.error('ProfessionalMagicPlayer', 'Deck B playback error', error);
      handleSourceError('B', error);
      setDeckBPlaying(false);
    }
  }, [state.sources, handleSourceError]);

  const throttledDeckBPlayPause = useMemo(() =>
    throttle((playing: boolean) => {
      handleDeckBPlayPause(playing);
    }, 250)
    , [handleDeckBPlayPause]);

  // Note: jumpToCue function removed as it was unused

  // Early return for loading state
  if (!playlist || !currentTrack) {
    return (
      <div className="min-h-screen gradient-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-fuchsia-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-neon-pink"></div>
          <p className="text-white font-orbitron">Loading playlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-primary overflow-hidden font-orbitron relative">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-glass nav-sticky">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            aria-label="Go back to playlist selection"
            className="glass-button hover-lift flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12"
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 text-fuchsia-400" />
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'mobileMenuOpen', value: !state.ui.mobileMenuOpen } })}
            aria-label={state.ui.mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            className="lg:hidden glass-button hover-lift flex items-center justify-center w-10 h-10"
          >
            {state.ui.mobileMenuOpen ? (
              <X className="w-5 h-5 text-fuchsia-400" />
            ) : (
              <Menu className="w-5 h-5 text-fuchsia-400" />
            )}
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 glass-card flex items-center justify-center shadow-neon-pink animate-pulse-glow">
              <Radio className="w-7 h-7 text-fuchsia-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-wide font-orbitron">
                  PROFESSIONAL PLAYER
                </h1>
                {state.error.isDegraded && (
                  <span className="text-xs px-2 py-1 bg-yellow-900/50 border border-yellow-400 text-yellow-400 rounded font-orbitron">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-sm lg:text-base text-fuchsia-400 font-orbitron truncate max-w-48 lg:max-w-none">
                {playlist.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-end space-md">
          <button
            onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showAudioDebugger', value: !state.ui.showAudioDebugger } })}
            aria-label={state.ui.showAudioDebugger ? 'Hide audio debugger' : 'Show audio debugger'}
            className={`btn-accent btn-sm flex-center space-sm ease-smooth ${state.ui.showAudioDebugger ? 'shadow-neon-hard' : ''
              }`}
          >
            <Headphones className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">DEBUG</span>
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showSettings', value: !state.ui.showSettings } })}
            aria-label={state.ui.showSettings ? 'Hide settings' : 'Show settings'}
            className={`btn-ghost btn-sm flex-center space-sm ease-smooth ${state.ui.showSettings ? 'shadow-neon-medium' : ''
              }`}
          >
            <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">SETTINGS</span>
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showPlaylistEditor', value: !state.ui.showPlaylistEditor } })}
            aria-label={state.ui.showPlaylistEditor ? 'Hide playlist editor' : 'Show playlist editor'}
            className={`btn-primary btn-sm flex-center space-sm ease-elastic ${state.ui.showPlaylistEditor ? 'shadow-neon-hard' : ''
              }`}
          >
            <List className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">PLAYLIST</span>
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showMagicDancer', value: !state.ui.showMagicDancer } })}
            aria-label={state.ui.showMagicDancer ? 'Hide magic dancer' : 'Show magic dancer'}
            className={`btn-secondary btn-sm flex-center space-sm ease-elastic ${state.ui.showMagicDancer ? 'shadow-neon-medium' : ''
              }`}
          >
            <Activity className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">DANCER</span>
          </button>

          {state.error.message ? (
            <div className="flex items-center space-x-2 px-3 lg:px-4 py-2 glass-card border-yellow-400 shadow-yellow-400/20">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs lg:text-sm font-bold tracking-wider text-yellow-400">
                {state.error.message}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 glass-card shadow-neon-cyan">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse-glow"></div>
              <span className="text-xs lg:text-sm font-bold tracking-wider">
                LIVE
              </span>
            </div>
          )}

          <button
            onClick={onSessionEnd}
            aria-label="End DJ session"
            className="btn-primary px-3 lg:px-4 py-2 flex items-center space-x-2 text-sm lg:text-base"
          >
            <Square className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">END</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Player */}
      <div className="lg:hidden bg-glass border-b border-glass">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-14 h-14 glass-card flex items-center justify-center shadow-neon-pink animate-pulse-glow">
              <Play className="w-7 h-7 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate text-white text-lg font-orbitron">
                {currentTrack.title}
              </h3>
              <p className="text-sm text-fuchsia-400 truncate font-orbitron">
                {currentTrack.artist}
              </p>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span className="font-orbitron">{currentTrack.bpm ?? 128} BPM</span>
                <span className="font-orbitron">{currentTrack.key ?? 'C'}</span>
              </div>
            </div>
            {state.isLoading && (
              <div className="w-8 h-8 border-3 border-fuchsia-400 border-t-transparent rounded-sm animate-spin shadow-neon-pink"></div>
            )}
          </div>

          <div className="mb-4">
            <div
              className="w-full h-3 bg-glass border border-glass rounded-lg cursor-pointer overflow-hidden"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                handleSeek(percentage);
              }}
              role="slider"
              aria-label="Seek track position"
              aria-valuenow={state.progress.deckA}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-fill gradient-bg-secondary transition-all duration-300"
                style={{ width: `${state.progress.deckA}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
              <span>{formatTimeClock(state.currentTime)}</span>
              <span>{formatTimeClock(state.duration)}</span>
            </div>
          </div>

          <div className="flex-center space-lg">
            <button
              onClick={handleSkipBack}
              aria-label="Skip to previous track"
              className="btn-icon-square btn-ghost ease-elastic"
            >
              <SkipBack className="w-6 h-6 text-fuchsia-400" />
            </button>
            <button
              onClick={() => throttledOnPlayPause(!isPlaying)}
              disabled={state.isLoading}
              aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
              className="btn-primary w-16 h-16 flex-center ease-bounce shadow-neon-hard disabled:opacity-50"
            >
              {state.isLoading ? (
                <div className="w-8 h-8 border-3 border-fuchsia-400 border-t-transparent rounded-sm animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </button>
            <button
              onClick={handleSkipForward}
              aria-label="Skip to next track"
              className="btn-icon-square btn-ghost ease-elastic"
            >
              <SkipForward className="w-6 h-6 text-fuchsia-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Player Interface */}
      <div className={`flex-1 p-4 lg:p-6 ${state.ui.mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 h-full">
          {/* Enhanced Deck A */}
          <div className="glass-card hover-lift p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-fuchsia-400 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg">
                  A
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-fuchsia-400 tracking-wider font-orbitron">
                  DECK A
                </h2>
              </div>
            </div>

            {/* Enhanced Track Info */}
            <div className="mb-6 p-4 bg-glass border border-glass rounded-lg">
              <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-white font-orbitron">
                {currentTrack.title}
              </h3>
              <p className="text-fuchsia-400 mb-3 truncate font-orbitron text-base">
                {currentTrack.artist}
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">
                    {currentTrack.bpm ?? 128}
                  </div>
                  <div className="text-slate-400 text-xs">BPM</div>
                </div>
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">
                    {currentTrack.key ?? 'C'}
                  </div>
                  <div className="text-slate-400 text-xs">KEY</div>
                </div>
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">
                    {formatTimeClock(currentTrack.duration ?? 180)}
                  </div>
                  <div className="text-slate-400 text-xs">TIME</div>
                </div>
              </div>
            </div>

            {/* Enhanced Waveform / YouTube Player */}
            <div className="mb-6">
              {state.sources.deckACurrent?.type === 'youtube' ? (
                <div className="relative">
                  <YouTubePlayer
                    ref={youtubeARef}
                    videoId={state.sources.deckACurrent.metadata?.videoId || ''}
                    volume={state.volumes.deckA}
                    className="w-full h-20 lg:h-28 rounded-lg border border-glass"
                    onReady={() => {
                      dispatch({ type: 'SET_LOADING', payload: false });
                      dispatch({ type: 'SET_READINESS', payload: { player: 'youtubeA', ready: true } });
                      logger.info('ProfessionalMagicPlayer', 'YouTube A player ready');
                    }}
                    onStateChange={(youtubeState) => {
                      if (youtubeState === YouTubePlayerState.PLAYING) {
                        onPlayPause(true);
                      } else if (youtubeState === YouTubePlayerState.PAUSED) {
                        onPlayPause(false);
                      } else if (youtubeState === YouTubePlayerState.ENDED) {
                        handleTrackEnd();
                      }
                    }}
                    onError={(error) => {
                      logger.error('ProfessionalMagicPlayer', 'YouTube A player error', error);
                      handleSourceError('A', error);
                    }}
                    onProgress={(currentTime, duration) => {
                      dispatch({ type: 'SET_TIME', payload: { currentTime, duration } });
                      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckA', value: progress } });
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded font-orbitron">
                    YOUTUBE
                  </div>
                </div>
              ) : (
                <canvas
                  ref={waveformCanvasA}
                  width={320}
                  height={120}
                  className="w-full h-20 lg:h-28 bg-slate-900 border border-glass rounded-lg cursor-pointer"
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                    handleSeek(percentage);
                  }}
                  role="slider"
                  aria-label="Track waveform and seek control"
                  aria-valuenow={state.progress.deckA}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              )}
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
                <span>{formatTimeClock(state.currentTime)}</span>
                <span className="text-fuchsia-400">
                  {Math.round(state.progress.deckA)}%
                </span>
                <span>
                  {formatTimeClock(state.duration || (currentTrack?.duration ?? 180))}
                </span>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleSkipBack}
                  aria-label="Previous track"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 text-fuchsia-400" />
                </button>
                <button
                  onClick={() => throttledOnPlayPause(!isPlaying)}
                  disabled={state.isLoading}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-16 h-16 lg:w-20 lg:h-20 glass-button hover-lift flex items-center justify-center transition-all duration-300 disabled:opacity-50 shadow-neon-pink active:scale-95"
                >
                  {state.isLoading ? (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 border-3 border-fuchsia-400 border-t-transparent rounded-sm animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8 lg:w-10 lg:h-10 text-fuchsia-400" />
                  ) : (
                    <Play className="w-8 h-8 lg:w-10 lg:h-10 text-fuchsia-400" />
                  )}
                </button>
                <button
                  onClick={handleSkipForward}
                  aria-label="Next track"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300"
                >
                  <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 text-fuchsia-400" />
                </button>
              </div>

              {/* Enhanced Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-fuchsia-400" />
                    <span className="text-sm font-bold text-fuchsia-400 font-orbitron">
                      VOLUME
                    </span>
                  </div>
                  <span className="text-sm font-orbitron text-white">
                    {state.volumes.deckA}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.volumes.deckA}
                  onChange={e => dispatch({ type: 'SET_VOLUME', payload: { deck: 'deckA', value: Number(e.target.value) } })}
                  className="slider-futuristic w-full"
                  aria-label="Deck A volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckA', state.progress.deckA)}
                  aria-label="Add cue point"
                  className="btn-secondary flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button
                  onClick={() => clearCuePoints('deckA')}
                  aria-label="Clear cue points"
                  className="btn-accent flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CLEAR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Center Controls */}
          <div className="flex flex-col justify-between">
            {/* Enhanced Crossfader Section */}
            <div className="glass-card hover-lift p-6 mb-6">
              <h3 className="text-lg lg:text-xl font-bold mb-6 text-center text-cyan-400 flex items-center justify-center space-x-2 font-orbitron">
                <Zap className="w-6 h-6" />
                <span>CROSSFADER</span>
              </h3>

              <div className="relative mb-8">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={state.volumes.crossfader}
                  onChange={e => dispatch({ type: 'SET_VOLUME', payload: { deck: 'crossfader', value: Number(e.target.value) } })}
                  className="slider-futuristic w-full"
                  aria-label="Crossfader position"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-3 font-orbitron font-bold">
                  <span className="text-fuchsia-400">A</span>
                  <span className="text-white">CENTER</span>
                  <span className="text-cyan-400">B</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-orbitron text-cyan-400">
                    {state.volumes.crossfader > 0 ? '+' : ''}
                    {state.volumes.crossfader}
                  </span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Headphones className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400 font-orbitron">
                      MASTER
                    </span>
                  </div>
                  <span className="text-sm font-orbitron text-white">
                    {state.volumes.master}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.volumes.master}
                  onChange={e => dispatch({ type: 'SET_VOLUME', payload: { deck: 'master', value: Number(e.target.value) } })}
                  className="slider-futuristic w-full"
                  aria-label="Master volume"
                />
              </div>

              {/* Enhanced Master Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => dispatch({ type: 'SET_SETTING', payload: { key: 'bpmSync', value: !state.settings.bpmSync } })}
                  aria-label={`BPM sync ${state.settings.bpmSync ? 'enabled' : 'disabled'}`}
                  className={`btn-secondary py-3 px-4 text-sm font-bold ${state.settings.bpmSync ? 'shadow-neon-blue' : ''}`}
                >
                  BPM SYNC
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_SETTING', payload: { key: 'autoMix', value: !state.settings.autoMix } })}
                  aria-label={`Auto mix ${state.settings.autoMix ? 'enabled' : 'disabled'}`}
                  className={`btn-primary py-3 px-4 text-sm font-bold ${state.settings.autoMix ? 'shadow-neon-pink' : ''}`}
                >
                  AUTO MIX
                </button>
              </div>
            </div>

            {/* Enhanced Session Info */}
            <div className="glass-card hover-lift p-6">
              <h3 className="text-lg lg:text-xl font-bold mb-4 text-fuchsia-400 flex items-center space-x-2 font-orbitron">
                <Clock className="w-5 h-5" />
                <span>SESSION INFO</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Playing:</span>
                  <span className="text-white font-bold">
                    {state.currentTrackIndex + 1} / {playlist.tracks.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Remaining:</span>
                  <span className="text-white font-bold">
                    {formatTimeClock((playlist.tracks.length - state.currentTrackIndex - 1) * 180)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">BPM:</span>
                  <span className="text-fuchsia-400 font-bold">
                    {currentTrack.bpm ?? 128}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Key:</span>
                  <span className="text-fuchsia-400 font-bold">
                    {currentTrack.key ?? 'C'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Deck B */}
          <div className="glass-card hover-lift p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg">
                  B
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-cyan-400 tracking-wider font-orbitron">
                  DECK B
                </h2>
              </div>
            </div>

            {/* Enhanced Track Info */}
            <div className="mb-6 p-4 bg-glass border border-glass rounded-lg">
              {nextTrack ? (
                <>
                  <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-white font-orbitron">
                    {nextTrack.title}
                  </h3>
                  <p className="text-cyan-400 mb-3 truncate font-orbitron text-base">
                    {nextTrack.artist}
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">
                        {nextTrack.bpm ?? 128}
                      </div>
                      <div className="text-slate-400 text-xs">BPM</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">
                        {nextTrack.key ?? 'C'}
                      </div>
                      <div className="text-slate-400 text-xs">KEY</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">
                        {formatTimeClock(nextTrack.duration ?? 180)}
                      </div>
                      <div className="text-slate-400 text-xs">TIME</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Music className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-400 font-orbitron">NO TRACK LOADED</p>
                </div>
              )}
            </div>

            {/* Enhanced Waveform / YouTube Player */}
            <div className="mb-6">
              {state.sources.deckBCurrent?.type === 'youtube' ? (
                <div className="relative">
                  <YouTubePlayer
                    ref={youtubeBRef}
                    videoId={state.sources.deckBCurrent.metadata?.videoId || ''}
                    volume={state.volumes.deckB}
                    className="w-full h-20 lg:h-28 rounded-lg border border-glass"
                    onReady={() => {
                      dispatch({ type: 'SET_READINESS', payload: { player: 'youtubeB', ready: true } });
                      logger.info('ProfessionalMagicPlayer', 'YouTube B player ready');
                    }}
                    onError={(error) => {
                      logger.error('ProfessionalMagicPlayer', 'YouTube B player error', error);
                      handleSourceError('B', error);
                    }}
                    onProgress={(currentTime, duration) => {
                      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                      dispatch({ type: 'SET_PROGRESS', payload: { deck: 'deckB', value: progress } });
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded font-orbitron">
                    YOUTUBE
                  </div>
                </div>
              ) : (
                <canvas
                  ref={waveformCanvasB}
                  width={320}
                  height={120}
                  className="w-full h-20 lg:h-28 bg-slate-900 border border-glass rounded-lg"
                  aria-label="Deck B waveform display"
                />
              )}
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
                <span>0:00</span>
                <span className="text-cyan-400">
                  {Math.round(state.progress.deckB)}%
                </span>
                <span>
                  {nextTrack ? formatTimeClock(nextTrack.duration ?? 180) : '--:--'}
                </span>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleDeckBSkipBack}
                  disabled={!state.sources.deckBCurrent || state.sources.deckBIndex <= 0}
                  aria-label="Deck B previous"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 text-cyan-400" />
                </button>
                <button
                  onClick={() => throttledDeckBPlayPause(!deckBPlaying)}
                  disabled={!state.sources.deckBCurrent}
                  aria-label={deckBPlaying ? 'Pause deck B' : 'Play deck B'}
                  className="w-16 h-16 lg:w-20 lg:h-20 glass-button hover-lift flex items-center justify-center transition-all duration-300 shadow-neon-cyan active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deckBPlaying ? (
                    <Pause className="w-8 h-8 lg:w-10 lg:h-10 text-cyan-400" />
                  ) : (
                    <Play className="w-8 h-8 lg:w-10 lg:h-10 text-cyan-400" />
                  )}
                </button>
                <button
                  onClick={handleDeckBSkipForward}
                  disabled={!state.sources.deckBCurrent || state.sources.deckBIndex >= state.sources.deckB.length - 1}
                  aria-label="Deck B next"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 text-cyan-400" />
                </button>
              </div>

              {/* Enhanced Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400 font-orbitron">
                      VOLUME
                    </span>
                  </div>
                  <span className="text-sm font-orbitron text-white">
                    {state.volumes.deckB}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.volumes.deckB}
                  onChange={e => dispatch({ type: 'SET_VOLUME', payload: { deck: 'deckB', value: Number(e.target.value) } })}
                  className="slider-futuristic w-full"
                  aria-label="Deck B volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckB', state.progress.deckB)}
                  aria-label="Add cue point to deck B"
                  className="btn-secondary flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button
                  onClick={() => clearCuePoints('deckB')}
                  aria-label="Clear cue points on deck B"
                  className="btn-accent flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CLEAR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Right Sidebar */}
          <div className="space-y-6 min-h-0">
            {state.ui.showAudioDebugger && (
              <AudioDebugger
                testAudioUrl={state.sources.deckACurrent?.url || ''}
                className="max-h-96 overflow-y-auto"
              />
            )}

            {state.ui.showMagicDancer && (
              <MagicDancer
                isActive={isPlaying}
                currentTrack={currentTrack ? {
                  title: currentTrack.title,
                  artist: currentTrack.artist,
                  bpm: currentTrack.bpm ?? 128,
                  energy: currentTrack.energy ?? 0.7,
                } : undefined}
                onEnergyChange={energy => {
                  logger.info('ProfessionalMagicPlayer', 'Crowd energy changed', { energy });
                }}
              />
            )}

            {state.ui.showPlaylistEditor && (
              <PlaylistEditor
                playlist={playlist}
                currentTrackIndex={state.currentTrackIndex}
                isPlaying={isPlaying}
                onTrackSelect={handleTrackSelect}
                onTrackRemove={handleTrackRemove}
                onTrackReorder={handleTrackReorder}
                onPlaylistUpdate={handlePlaylistUpdate}
                className="max-h-96 overflow-hidden"
              />
            )}

            {!state.ui.showMagicDancer && !state.ui.showPlaylistEditor && !state.ui.showAudioDebugger && (
              <div className="glass-card hover-lift p-6 text-center">
                <div className="w-16 h-16 glass-card flex items-center justify-center mx-auto mb-4 shadow-neon-pink animate-pulse-glow">
                  <Music className="w-8 h-8 text-fuchsia-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 font-orbitron">
                  DJ TOOLS
                </h3>
                <p className="text-slate-400 mb-6 font-orbitron text-sm">
                  Select tools from the header to get started
                </p>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showMagicDancer', value: true } })}
                    aria-label="Show magic dancer"
                    className="btn-secondary py-3 px-4 text-sm font-bold"
                  >
                    MAGIC DANCER
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_UI', payload: { key: 'showPlaylistEditor', value: true } })}
                    aria-label="Show playlist editor"
                    className="btn-primary py-3 px-4 text-sm font-bold"
                  >
                    PLAYLIST EDITOR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unmute Overlay for Autoplay Restrictions */}
      {state.ui.showUnmuteOverlay && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center max-w-md mx-4 shadow-neon-pink">
            <div className="w-20 h-20 bg-glass border border-fuchsia-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-neon-pink animate-pulse-glow">
              <Volume2 className="w-10 h-10 text-fuchsia-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">
              TAP TO UNMUTE
            </h2>
            <p className="text-slate-400 mb-6 font-orbitron">
              Your browser requires user interaction before playing audio
            </p>
            <button
              onClick={handleUnmute}
              className="btn-primary px-8 py-4 text-lg font-bold shadow-neon-pink"
            >
              START PLAYING
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalMagicPlayer;
