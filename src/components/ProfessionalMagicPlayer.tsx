import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { Playlist, Session, Track } from '../types';
import MagicDancer from './MagicDancer';
import PlaylistEditor from './PlaylistEditor';
import YouTubePlayer, { YouTubePlayerRef, YouTubePlayerState } from './YouTubePlayer';
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

const ProfessionalMagicPlayer: React.FC<ProfessionalMagicPlayerProps> = ({
  playlist,
  session,
  isPlaying,
  onPlayPause,
  onSessionEnd,
  onBack,
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [deckAVolume, setDeckAVolume] = useState(85);
  const [deckBVolume, setDeckBVolume] = useState(0);
  const [crossfaderPosition, setCrossfaderPosition] = useState(-50); // -100 to 100
  const [masterVolume, setMasterVolume] = useState(75);
  const [deckAProgress, setDeckAProgress] = useState(0);
  const [deckBProgress, setDeckBProgress] = useState(0);
  const [bpmSync, setBpmSync] = useState(true);
  const [autoMix, setAutoMix] = useState(false);
  const [, setCuePoints] = useState<{ [key: string]: number[] }>({});

  // Audio elements and YouTube players using refs for stability
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const youtubeARef = useRef<YouTubePlayerRef | null>(null);
  const youtubeBRef = useRef<YouTubePlayerRef | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Audio source management
  const [deckASources, setDeckASources] = useState<AudioSource[]>([]);
  const [deckBSources, setDeckBSources] = useState<AudioSource[]>([]);
  const [deckACurrentSource, setDeckACurrentSource] = useState<AudioSource | null>(null);
  const [deckBCurrentSource, setDeckBCurrentSource] = useState<AudioSource | null>(null);
  const [deckASourceIndex, setDeckASourceIndex] = useState(0);
  const [deckBSourceIndex, setDeckBSourceIndex] = useState(0);

  // Audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [_youtubeAReady, setYoutubeAReady] = useState(false);
  const [_youtubeBReady, setYoutubeBReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [showMagicDancer, setShowMagicDancer] = useState(true);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const waveformCanvasA = useRef<HTMLCanvasElement>(null);
  const waveformCanvasB = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const autoMixIntervalRef = useRef<number>();
  const fadeIntervalRef = useRef<number>();

  // Store listener references for proper cleanup
  const audioAListenersRef = useRef<{
    loadedmetadata?: () => void;
    canplaythrough?: () => void;
    timeupdate?: () => void;
    ended?: () => void;
    error?: (e: Event) => void;
  }>({});

  const audioBListenersRef = useRef<{
    loadedmetadata?: () => void;
    timeupdate?: () => void;
    ended?: () => void;
    error?: (e: Event) => void;
  }>({});

  const currentTrack = playlist?.tracks[currentTrackIndex];
  const nextTrack = playlist?.tracks[currentTrackIndex + 1];

  // Log session information for debugging and analytics
  useEffect(() => {
    logger.info('ProfessionalMagicPlayer', 'Session active', {
      sessionId: session?.id,
    });
  }, [session]);

  // Memoized waveform data for performance
  const waveformDataA = useRef<number[]>([]);
  const waveformDataB = useRef<number[]>([]);

  // Generate waveform data when track changes
  useEffect(() => {
    if (currentTrack) {
      waveformDataA.current = generateWaveformData(320);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (nextTrack) {
      waveformDataB.current = generateWaveformData(320);
    }
  }, [nextTrack]);

  const generateWaveformData = (width: number): number[] => {
    const bars = Math.floor(width / 3);
    const data: number[] = [];

    for (let i = 0; i < bars; i++) {
      const frequency = (i / bars) * 10 + 1;
      const baseAmplitude = Math.sin(frequency * 0.5) * 0.3 + 0.7;
      data.push(baseAmplitude);
    }

    return data;
  };

  const handleTrackEnd = useCallback(() => {
    if (currentTrackIndex < (playlist?.tracks.length ?? 0) - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      setDeckAProgress(0);
    } else {
      onSessionEnd();
    }
  }, [currentTrackIndex, playlist?.tracks.length, onSessionEnd]);

  // Helper functions for audio source management
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

  const tryNextSource = useCallback((deck: 'A' | 'B', currentIndex: number, sources: AudioSource[]) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < sources.length) {
      logger.info('ProfessionalMagicPlayer', `Trying next source for deck ${deck}`, {
        currentIndex,
        nextIndex,
        nextSourceType: sources[nextIndex]?.type
      });

      if (deck === 'A') {
        setDeckASourceIndex(nextIndex);
      } else {
        setDeckBSourceIndex(nextIndex);
      }
      return true;
    }
    return false;
  }, []);

  // Audio cleanup utility
  const cleanupAudioElement = useCallback((audio: HTMLAudioElement, listeners: any) => {
    try {
      // Pause and reset audio
      audio.pause();
      audio.currentTime = 0;

      // Remove all event listeners
      if (listeners.loadedmetadata) {
        audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
      }
      if (listeners.canplaythrough) {
        audio.removeEventListener('canplaythrough', listeners.canplaythrough);
      }
      if (listeners.timeupdate) {
        audio.removeEventListener('timeupdate', listeners.timeupdate);
      }
      if (listeners.ended) {
        audio.removeEventListener('ended', listeners.ended);
      }
      if (listeners.error) {
        audio.removeEventListener('error', listeners.error);
      }

      // Clear source to free memory
      audio.src = '';
      audio.load();

      logger.debug('ProfessionalMagicPlayer', 'Audio element cleaned up successfully');
    } catch (error) {
      logger.warn('ProfessionalMagicPlayer', 'Error during audio cleanup', error);
    }
  }, []);

  const initializeAudioPlayer = useCallback((source: AudioSource, deck: 'A' | 'B') => {
    if (source.type === 'youtube') {
      // YouTube source will be handled by YouTubePlayer component
      return null;
    }

    // Create HTML audio element for proxy and demo sources
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    // Set source with error handling
    try {
      audio.src = source.url;
    } catch (error) {
      logger.error('ProfessionalMagicPlayer', 'Failed to set audio source', {
        sourceType: source.type,
        error
      });
      return null;
    }

    logger.info('ProfessionalMagicPlayer', `Initialized audio player for deck ${deck}`, {
      sourceType: source.type,
      sourceUrl: source.url.substring(0, 50) + '...'
    });

    return audio;
  }, []);

  const handleSourceError = useCallback((deck: 'A' | 'B', error: any) => {
    const sources = deck === 'A' ? deckASources : deckBSources;
    const currentIndex = deck === 'A' ? deckASourceIndex : deckBSourceIndex;

    logger.error('ProfessionalMagicPlayer', `Audio source error on deck ${deck}`, {
      error,
      currentSourceType: sources[currentIndex]?.type,
      currentIndex,
      totalSources: sources.length
    });

    // Try next source
    if (!tryNextSource(deck, currentIndex, sources)) {
      // No more sources available
      setErrorMessage(`All audio sources failed for deck ${deck}`);
      setIsDegraded(true);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }, [deckASources, deckBSources, deckASourceIndex, deckBSourceIndex, tryNextSource]);

  // Load audio sources for current track
  useEffect(() => {
    if (!currentTrack) {
      setDeckASources([]);
      setDeckACurrentSource(null);
      setDeckASourceIndex(0);
      return;
    }

    let isCancelled = false;

    const loadSources = async () => {
      setIsLoading(true);
      const sources = await loadAudioSources(currentTrack);

      if (!isCancelled && sources.length > 0) {
        setDeckASources(sources);
        setDeckASourceIndex(0);
      } else if (!isCancelled) {
        // Fallback if no sources available
        setDeckASources([]);
        setDeckACurrentSource(null);
        setErrorMessage('No audio sources available');
        setIsDegraded(true);
        setTimeout(() => setErrorMessage(null), 3000);
      }
    };

    loadSources();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack, loadAudioSources]);

  // Initialize Audio A when source changes
  useEffect(() => {
    if (deckASources.length === 0 || deckASourceIndex >= deckASources.length) {
      setDeckACurrentSource(null);
      setYoutubeAReady(false);
      return;
    }

    const source = deckASources[deckASourceIndex];
    setDeckACurrentSource(source);
    setYoutubeAReady(false); // Reset readiness when source changes

    // Clean up existing audio using utility function
    if (audioARef.current) {
      cleanupAudioElement(audioARef.current, audioAListenersRef.current);
      audioARef.current = null;
      // Clear listeners reference
      audioAListenersRef.current = {};
    }

    // Skip YouTube sources - they're handled by YouTubePlayer component
    if (source.type === 'youtube') {
      setIsLoading(false);
      setDuration(source.duration || 180);
      return;
    }

    // Initialize HTML audio for proxy and demo sources
    const audio = initializeAudioPlayer(source, 'A');
    if (!audio) return;

    audio.volume = deckAVolume / 100;

    // Create listener functions
    const onLoadedMetadata = () => {
      setDuration(audio.duration || source.duration || 180);
      logger.info('ProfessionalMagicPlayer', 'Audio A metadata loaded', {
        duration: audio.duration,
        sourceType: source.type,
        sourceUrl: source.url.substring(0, 50) + '...',
      });
    };

    const onCanPlayThrough = () => {
      setIsLoading(false);
      logger.info('ProfessionalMagicPlayer', 'Audio A can play through', {
        duration: audio.duration,
        sourceType: source.type,
      });
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progress =
        audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setDeckAProgress(progress);
    };

    const onError = (e: Event) => {
      logger.error('ProfessionalMagicPlayer', 'Audio A source failed', {
        sourceType: source.type,
        sourceUrl: source.url,
        error: (e.target as HTMLAudioElement).error
      });

      handleSourceError('A', e);
    };

    // Store listeners for cleanup
    audioAListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      canplaythrough: onCanPlayThrough,
      timeupdate: onTimeUpdate,
      ended: handleTrackEnd,
      error: onError,
    };

    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', onError);

    audioARef.current = audio;
    setIsLoading(true);

    return () => {
      if (audio) {
        cleanupAudioElement(audio, audioAListenersRef.current);
      }
    };
  }, [deckASources, deckASourceIndex, deckAVolume, initializeAudioPlayer, handleTrackEnd, handleSourceError, cleanupAudioElement]);

  // Load audio sources for next track (Deck B)
  useEffect(() => {
    if (!nextTrack) {
      setDeckBSources([]);
      setDeckBCurrentSource(null);
      setDeckBSourceIndex(0);
      return;
    }

    let isCancelled = false;

    const loadSources = async () => {
      const sources = await loadAudioSources(nextTrack);

      if (!isCancelled && sources.length > 0) {
        setDeckBSources(sources);
        setDeckBSourceIndex(0);
      } else if (!isCancelled) {
        setDeckBSources([]);
        setDeckBCurrentSource(null);
      }
    };

    loadSources();

    return () => {
      isCancelled = true;
    };
  }, [nextTrack, loadAudioSources]);

  // Initialize Audio B when source changes
  useEffect(() => {
    if (deckBSources.length === 0 || deckBSourceIndex >= deckBSources.length) {
      setDeckBCurrentSource(null);

      // Clean up existing audio using utility function
      if (audioBRef.current) {
        cleanupAudioElement(audioBRef.current, audioBListenersRef.current);
        audioBRef.current = null;
        audioBListenersRef.current = {};
      }
      return;
    }

    const source = deckBSources[deckBSourceIndex];
    setDeckBCurrentSource(source);

    // Clean up existing audio using utility function
    if (audioBRef.current) {
      cleanupAudioElement(audioBRef.current, audioBListenersRef.current);
      audioBRef.current = null;
      audioBListenersRef.current = {};
    }

    // Skip YouTube sources - they're handled by YouTubePlayer component
    if (source.type === 'youtube') {
      return;
    }

    // Initialize HTML audio for proxy and demo sources
    const audio = initializeAudioPlayer(source, 'B');
    if (!audio) return;

    audio.preload = 'metadata';
    audio.volume = deckBVolume / 100;

    // Create listener functions for deck B
    const onLoadedMetadata = () => {
      logger.info('ProfessionalMagicPlayer', 'Audio B metadata loaded', {
        sourceType: source.type,
        sourceUrl: source.url.substring(0, 50) + '...',
      });
    };

    const onTimeUpdate = () => {
      const progress =
        audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setDeckBProgress(progress);
    };

    const onError = (e: Event) => {
      logger.error('ProfessionalMagicPlayer', 'Audio B source failed', {
        sourceType: source.type,
        sourceUrl: source.url,
        error: (e.target as HTMLAudioElement).error
      });

      handleSourceError('B', e);
    };

    // Store listeners for cleanup
    audioBListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      timeupdate: onTimeUpdate,
      error: onError,
    };

    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('error', onError);

    audioBRef.current = audio;

    return () => {
      if (audio) {
        cleanupAudioElement(audio, audioBListenersRef.current);
      }
    };
  }, [deckBSources, deckBSourceIndex, deckBVolume, initializeAudioPlayer, handleSourceError, cleanupAudioElement]);

  // Atomic audio state management to prevent race conditions
  const audioStateRef = useRef<{
    isTransitioning: boolean;
    pendingAction: boolean | null;
    lastKnownState: boolean | null;
    retryCount: number;
  }>({
    isTransitioning: false,
    pendingAction: null,
    lastKnownState: null,
    retryCount: 0
  });

  // Atomic audio control function to prevent race conditions
  const handlePlayPauseAtomic = useCallback(async (shouldPlay: boolean) => {
    const state = audioStateRef.current;

    // If already transitioning, queue the action
    if (state.isTransitioning) {
      state.pendingAction = shouldPlay;
      logger.debug('ProfessionalMagicPlayer', 'Audio action queued during transition', { shouldPlay });
      return;
    }

    // Check if this is a duplicate call
    if (state.lastKnownState === shouldPlay) {
      logger.debug('ProfessionalMagicPlayer', 'Skipping duplicate audio action', { shouldPlay });
      return;
    }

    state.isTransitioning = true;
    state.lastKnownState = shouldPlay;

    try {
      const audio = audioARef.current;
      const youtubePlayer = youtubeARef.current;
      const currentSource = deckACurrentSource;

      logger.info('ProfessionalMagicPlayer', 'Atomic audio control triggered', {
        shouldPlay,
        hasAudio: !!audio,
        hasYoutube: !!youtubePlayer,
        sourceType: currentSource?.type,
        isLoading,
        currentTrack: currentTrack?.title,
      });

      // Handle YouTube source
      if (currentSource?.type === 'youtube' && youtubePlayer) {
        try {
          // Wait for player to be ready with proper promise-based approach
          if (!youtubePlayer.isReady()) {
            logger.info('ProfessionalMagicPlayer', 'Waiting for YouTube player readiness');
            await youtubePlayer.waitForReady();
            logger.info('ProfessionalMagicPlayer', 'YouTube player is now ready');
          }

          // Player is ready, execute action
          if (shouldPlay) {
            await youtubePlayer.play();
            logger.debug('ProfessionalMagicPlayer', 'YouTube playback started');
          } else {
            youtubePlayer.pause();
            logger.debug('ProfessionalMagicPlayer', 'YouTube playback paused');
          }

          // Reset retry counter on success
          audioStateRef.current.retryCount = 0;
          return;
        } catch (error) {
          logger.error('ProfessionalMagicPlayer', 'YouTube player operation failed', {
            action: shouldPlay ? 'play' : 'pause',
            error: error instanceof Error ? error.message : String(error)
          });

          // Increment retry counter and retry with exponential backoff (max 3 retries)
          audioStateRef.current.retryCount++;
          const maxRetries = 3;

          if (shouldPlay && audioStateRef.current.retryCount <= maxRetries) {
            // Queue a retry after exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, audioStateRef.current.retryCount - 1), 5000);
            logger.info('ProfessionalMagicPlayer', 'Retrying YouTube operation after error', {
              retryDelay,
              retryCount: audioStateRef.current.retryCount,
              maxRetries
            });

            setTimeout(() => {
              handlePlayPauseAtomic(shouldPlay);
            }, retryDelay);
          } else {
            logger.error('ProfessionalMagicPlayer', 'YouTube operation failed after max retries', {
              retryCount: audioStateRef.current.retryCount,
              maxRetries
            });
            audioStateRef.current.retryCount = 0; // Reset for next operation
          }
          return;
        }
      }

      // Handle HTML audio source
      if (!audio || isLoading || audio.readyState < 4) {
        logger.warn('ProfessionalMagicPlayer', 'Audio not ready for playback', {
          hasAudio: !!audio,
          isLoading,
          readyState: audio?.readyState,
          sourceType: currentSource?.type,
        });
        return;
      }

      if (shouldPlay) {
        // Initialize AudioContext if needed
        if (!audioContextRef.current && window.AudioContext) {
          try {
            audioContextRef.current = new (window.AudioContext ||
              (window as any).webkitAudioContext)();

            audioContextRef.current.addEventListener('statechange', () => {
              logger.info('ProfessionalMagicPlayer', 'AudioContext state changed', {
                state: audioContextRef.current?.state,
              });
            });
          } catch (error: any) {
            logger.warn('ProfessionalMagicPlayer', 'AudioContext creation failed', error);
            setErrorMessage('Audio device unavailable. Using basic playback.');
            setIsDegraded(true);
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }

        // Resume AudioContext if suspended
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume().catch(error => {
            logger.warn('ProfessionalMagicPlayer', 'AudioContext resume failed', error);
            if (error.name === 'NotSupportedError' || error.message.includes('audio device')) {
              setErrorMessage('Audio device error. Check system audio settings.');
              setIsDegraded(true);
              setTimeout(() => setErrorMessage(null), 5000);
            } else {
              setShowUnmuteOverlay(true);
            }
          });
        }

        logger.info('ProfessionalMagicPlayer', 'Attempting to play audio', {
          audioSrc: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
          audioContextState: audioContextRef.current?.state,
        });

        // Retry mechanism for playback
        let retries = 3;
        while (retries > 0) {
          try {
            await audio.play();
            logger.info('ProfessionalMagicPlayer', 'Audio playback started successfully');
            setShowUnmuteOverlay(false);
            break;
          } catch (error: any) {
            logger.error('ProfessionalMagicPlayer', `Audio play failed (${retries} retries left)`, {
              error: error.message,
              name: error.name,
              readyState: audio.readyState,
              networkState: audio.networkState,
            });

            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              // Final failure handling
              if (error.name === 'NotAllowedError') {
                setShowUnmuteOverlay(true);
                logger.info('ProfessionalMagicPlayer', 'Autoplay blocked - showing unmute overlay');
              } else {
                setErrorMessage('Playback failed. Retrying...');
                setTimeout(() => {
                  setErrorMessage(null);
                  audio.load();
                }, 2000);
                throw error;
              }
            }
          }
        }
      } else {
        logger.info('ProfessionalMagicPlayer', 'Pausing audio');
        audio.pause();
      }

    } catch (error) {
      logger.error('ProfessionalMagicPlayer', 'Atomic audio control failed', error);
      if (shouldPlay) {
        handleSourceError('A', error);
      }
    } finally {
      state.isTransitioning = false;

      // Process any queued action
      if (state.pendingAction !== null) {
        const pendingAction = state.pendingAction;
        state.pendingAction = null;
        logger.debug('ProfessionalMagicPlayer', 'Processing queued audio action', { pendingAction });
        // Use setTimeout to avoid immediate recursion
        setTimeout(() => handlePlayPauseAtomic(pendingAction), 0);
      }
    }
  }, [isLoading, currentTrack, deckACurrentSource, handleSourceError]);

  // Use the atomic handler in useEffect
  useEffect(() => {
    handlePlayPauseAtomic(isPlaying);
  }, [isPlaying, handlePlayPauseAtomic]);

  // Handle volume changes
  useEffect(() => {
    const audioA = audioARef.current;
    const audioB = audioBRef.current;

    if (audioA) {
      const deckAVol = (deckAVolume / 100) * (masterVolume / 100);
      const crossfadeA =
        crossfaderPosition <= 0 ? 1 : Math.max(0, 1 - crossfaderPosition / 100);
      audioA.volume = Math.max(0, Math.min(1, deckAVol * crossfadeA));
    }

    if (audioB) {
      const deckBVol = (deckBVolume / 100) * (masterVolume / 100);
      const crossfadeB =
        crossfaderPosition >= 0 ? 1 : Math.max(0, 1 + crossfaderPosition / 100);
      audioB.volume = Math.max(0, Math.min(1, deckBVol * crossfadeB));
    }
  }, [deckAVolume, deckBVolume, crossfaderPosition, masterVolume]);

  // Auto mix functionality with proper cleanup
  useEffect(() => {
    if (autoMixIntervalRef.current) {
      clearInterval(autoMixIntervalRef.current);
    }

    if (isPlaying && autoMix && nextTrack) {
      autoMixIntervalRef.current = window.setInterval(() => {
        const audioA = audioARef.current;
        if (audioA && audioA.duration > 0) {
          const progress = (audioA.currentTime / audioA.duration) * 100;
          if (progress >= 75) {
            handleAutoTransition();
          }
        }
      }, 100);
    }

    return () => {
      if (autoMixIntervalRef.current) {
        clearInterval(autoMixIntervalRef.current);
      }
    };
  }, [isPlaying, autoMix, nextTrack]);

  // Optimized animation loop with dirty tracking
  const lastRenderState = useRef({
    deckAProgress: -1,
    deckBProgress: -1,
    currentTrackId: '',
    nextTrackId: '',
    isPlaying: false
  });

  useEffect(() => {
    let animationId: number;

    const animate = () => {
      const current = lastRenderState.current;
      const shouldUpdateA =
        current.deckAProgress !== deckAProgress ||
        current.currentTrackId !== (currentTrack?.id || '') ||
        current.isPlaying !== isPlaying;

      const shouldUpdateB =
        current.deckBProgress !== deckBProgress ||
        current.nextTrackId !== (nextTrack?.id || '') ||
        current.isPlaying !== isPlaying;

      // Only redraw if something changed
      if (shouldUpdateA) {
        drawWaveform(
          waveformCanvasA.current,
          currentTrack,
          deckAProgress,
          'green',
          waveformDataA.current
        );
      }

      if (shouldUpdateB) {
        drawWaveform(
          waveformCanvasB.current,
          nextTrack,
          deckBProgress,
          'purple',
          waveformDataB.current
        );
      }

      // Update last render state
      if (shouldUpdateA || shouldUpdateB) {
        current.deckAProgress = deckAProgress;
        current.deckBProgress = deckBProgress;
        current.currentTrackId = currentTrack?.id || '';
        current.nextTrackId = nextTrack?.id || '';
        current.isPlaying = isPlaying;
      }

      // Continue animation only if playing or if updates are needed
      if (isPlaying || shouldUpdateA || shouldUpdateB) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Schedule next check in 100ms when not playing
        setTimeout(() => {
          animationId = requestAnimationFrame(animate);
        }, 100);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentTrack, nextTrack, deckAProgress, deckBProgress, isPlaying]);

  const drawWaveform = (
    canvas: HTMLCanvasElement | null,
    track: Track | undefined,
    progress: number,
    color: 'green' | 'purple',
    waveformData: number[]
  ) => {
    if (!canvas || !track) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

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

    // Draw waveform using precomputed data
    const time = Date.now() * 0.001;
    const progressWidth = (width * progress) / 100;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * 3;
      const baseAmplitude = waveformData[i];
      const energyMultiplier = isPlaying ? (track.energy ?? 0.5) : 0.3;
      const animatedAmplitude =
        baseAmplitude *
        energyMultiplier *
        (1 + Math.sin(time * 2 + i * 0.1) * 0.1);

      const barHeight = (height * animatedAmplitude) / 2;

      // Determine color based on progress and deck
      let fillColor, shadowColor;
      if (x < progressWidth) {
        if (color === 'green') {
          fillColor = '#e879f9'; // fuchsia-400
          shadowColor = 'rgba(232, 121, 249, 0.8)';
        } else {
          fillColor = '#22d3ee'; // cyan-400
          shadowColor = 'rgba(34, 211, 238, 0.8)';
        }
      } else {
        if (color === 'green') {
          fillColor = 'rgba(232, 121, 249, 0.3)';
          shadowColor = 'rgba(232, 121, 249, 0.2)';
        } else {
          fillColor = 'rgba(34, 211, 238, 0.3)';
          shadowColor = 'rgba(34, 211, 238, 0.2)';
        }
      }

      // Draw waveform bar with glow effect
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, centerY - barHeight / 2, 2, barHeight);

      // Reset shadow for next iteration
      ctx.shadowBlur = 0;
    }

    // Draw playhead
    const playheadX = progressWidth;
    ctx.strokeStyle = color === 'green' ? '#e879f9' : '#22d3ee';
    ctx.lineWidth = 3;
    ctx.shadowColor =
      color === 'green' ? 'rgba(232, 121, 249, 1)' : 'rgba(34, 211, 238, 1)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(Math.round(playheadX), 0);
    ctx.lineTo(Math.round(playheadX), height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw BPM markers - FIXED with proper safety checks
    const trackBpm = track.bpm;
    if (trackBpm && trackBpm > 0) {
      const trackDuration = track.duration;
      const safeDuration =
        trackDuration && trackDuration > 0 ? trackDuration : 180;
      const beatInterval = (60 / trackBpm) * (width / safeDuration);

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
  };

  const handleAutoTransition = useCallback(() => {
    const audioB = audioBRef.current;
    if (!nextTrack || !audioB) return;

    // Clear any existing fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audioB.play().catch(e => console.error('Next track play failed:', e));

    fadeIntervalRef.current = window.setInterval(() => {
      setCrossfaderPosition(prev => {
        const newPos = prev + 15;
        if (newPos >= 50) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
          }
          setCurrentTrackIndex(prev => prev + 1);
          setCrossfaderPosition(-50);
          setDeckBProgress(0);
          return -50;
        }
        return newPos;
      });
    }, 150);
  }, [nextTrack]);

  const handleCrossfaderChange = (value: number) => {
    setCrossfaderPosition(value);
  };

  const addCuePoint = (deckId: string, position: number) => {
    setCuePoints(prev => ({
      ...prev,
      [deckId]: [...(prev[deckId] || []), position].slice(-5), // Limit to 5 cue points
    }));
  };

  const handleSeek = (percentage: number) => {
    const audio = audioARef.current;
    const maxDuration = duration || (currentTrack?.duration ?? 180);
    if (audio && maxDuration > 0 && audio.readyState >= 2) {
      const newTime = (percentage / 100) * maxDuration;
      const clampedTime = Math.min(newTime, maxDuration);
      audio.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };

  const handleSkipForward = () => {
    if (currentTrackIndex < (playlist?.tracks.length ?? 0) - 1) {
      const newIndex = currentTrackIndex + 1;
      logger.info('ProfessionalMagicPlayer', 'Skipping forward', {
        from: currentTrackIndex,
        to: newIndex,
        currentTrack: currentTrack?.title,
        nextTrack: playlist?.tracks[newIndex]?.title,
      });
      setCurrentTrackIndex(prev => prev + 1);
      setDeckAProgress(0);
    }
  };

  const handleSkipBack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
      setDeckAProgress(0);
    }
  };

  // formatTime now provided by utils/format as formatTimeClock

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    setDeckAProgress(0);
  };

  const handleTrackRemove = (index: number) => {
    if (!playlist) return;

    const newTracks = playlist.tracks.filter((_, i) => i !== index);
    const updatedPlaylist = { ...playlist, tracks: newTracks };

    // Propagate changes to parent
    handlePlaylistUpdate(updatedPlaylist);

    if (index < currentTrackIndex) {
      setCurrentTrackIndex(prev => prev - 1);
    } else if (index === currentTrackIndex && index >= newTracks.length) {
      setCurrentTrackIndex(Math.max(0, newTracks.length - 1));
    }
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!playlist) return;

    const newTracks = [...playlist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);

    const updatedPlaylist = { ...playlist, tracks: newTracks };

    // Propagate changes to parent
    handlePlaylistUpdate(updatedPlaylist);

    if (fromIndex === currentTrackIndex) {
      setCurrentTrackIndex(toIndex);
    } else if (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) {
      setCurrentTrackIndex(prev => prev - 1);
    } else if (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex) {
      setCurrentTrackIndex(prev => prev + 1);
    }
  };

  const handlePlaylistUpdate = (updatedPlaylist: Playlist) => {
    // Playlist update logic - in a real app this would update the parent state
    console.log('Playlist updated:', updatedPlaylist);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoMixIntervalRef.current) clearInterval(autoMixIntervalRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Guard clause - return early if no playlist or current track
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

  const throttledOnPlayPause = useCallback(
    throttle((playing: boolean) => {
      onPlayPause(playing);
    }, 250),
    [onPlayPause]
  );

  const handleUnmute = () => {
    setShowUnmuteOverlay(false);
    onPlayPause(true);
  };

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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={
              mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'
            }
            className="lg:hidden glass-button hover-lift flex items-center justify-center w-10 h-10"
          >
            {mobileMenuOpen ? (
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
                {isDegraded && (
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

        <div className="flex items-center space-x-3 lg:space-x-4">
          <button
            onClick={() => setShowPlaylistEditor(!showPlaylistEditor)}
            aria-label={
              showPlaylistEditor
                ? 'Hide playlist editor'
                : 'Show playlist editor'
            }
            className={`btn-primary px-3 lg:px-4 py-2 flex items-center space-x-2 text-sm lg:text-base ${showPlaylistEditor ? 'shadow-neon-pink' : ''}`}
          >
            <List className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">PLAYLIST</span>
          </button>
          <button
            onClick={() => setShowMagicDancer(!showMagicDancer)}
            aria-label={
              showMagicDancer ? 'Hide magic dancer' : 'Show magic dancer'
            }
            className={`btn-secondary px-3 lg:px-4 py-2 flex items-center space-x-2 text-sm lg:text-base ${showMagicDancer ? 'shadow-neon-blue' : ''}`}
          >
            <Activity className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">DANCER</span>
          </button>
          {errorMessage ? (
            <div className="flex items-center space-x-2 px-3 lg:px-4 py-2 glass-card border-yellow-400 shadow-yellow-400/20">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs lg:text-sm font-bold tracking-wider text-yellow-400">
                {errorMessage}
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
                <span className="font-orbitron">
                  {currentTrack.bpm ?? 128} BPM
                </span>
                <span className="font-orbitron">{currentTrack.key ?? 'C'}</span>
              </div>
            </div>
            {isLoading && (
              <div className="w-8 h-8 border-3 border-fuchsia-400 border-t-transparent rounded-sm animate-spin shadow-neon-pink"></div>
            )}
          </div>

          <div className="mb-4">
            <div
              className="w-full h-3 bg-glass border border-glass rounded-lg cursor-pointer overflow-hidden"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.min(
                  100,
                  Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)
                );
                handleSeek(percentage);
              }}
              role="slider"
              aria-label="Seek track position"
              aria-valuenow={deckAProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-3 bg-gradient-to-r from-fuchsia-600 to-cyan-400 rounded-lg transition-all duration-300"
                style={{ width: `${deckAProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
              <span>{formatTimeClock(currentTime)}</span>
              <span>{formatTimeClock(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={handleSkipBack}
              aria-label="Skip to previous track"
              className="w-12 h-12 glass-button hover-lift flex items-center justify-center transition-all duration-300"
            >
              <SkipBack className="w-6 h-6 text-fuchsia-400" />
            </button>
            <button
              onClick={() => throttledOnPlayPause(!isPlaying)}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
              className="w-16 h-16 glass-button hover-lift flex items-center justify-center transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-3 border-fuchsia-400 border-t-transparent rounded-sm animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-8 h-8 text-fuchsia-400" />
              ) : (
                <Play className="w-8 h-8 text-fuchsia-400" />
              )}
            </button>
            <button
              onClick={handleSkipForward}
              aria-label="Skip to next track"
              className="w-12 h-12 glass-button hover-lift flex items-center justify-center transition-all duration-300"
            >
              <SkipForward className="w-6 h-6 text-fuchsia-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Player Interface */}
      <div
        className={`flex-1 p-4 lg:p-6 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}
      >
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
              <div className="flex items-center space-x-2">
                <button
                  aria-label="Play deck A"
                  className="w-10 h-10 glass-button hover-lift flex items-center justify-center transition-all"
                >
                  <Play className="w-5 h-5 text-fuchsia-400" />
                </button>
                <button
                  aria-label="Pause deck A"
                  className="w-10 h-10 glass-button hover-lift flex items-center justify-center transition-all"
                >
                  <Pause className="w-5 h-5 text-fuchsia-400" />
                </button>
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
              {deckACurrentSource?.type === 'youtube' ? (
                <div className="relative">
                  <YouTubePlayer
                    ref={youtubeARef}
                    videoId={deckACurrentSource.metadata?.videoId || ''}
                    volume={deckAVolume}
                    className="w-full h-20 lg:h-28 rounded-lg border border-glass"
                    onReady={() => {
                      setIsLoading(false);
                      setYoutubeAReady(true);
                      logger.info('ProfessionalMagicPlayer', 'YouTube A player ready');
                    }}
                    onStateChange={(state) => {
                      if (state === YouTubePlayerState.PLAYING) {
                        onPlayPause(true);
                      } else if (state === YouTubePlayerState.PAUSED) {
                        onPlayPause(false);
                      } else if (state === YouTubePlayerState.ENDED) {
                        handleTrackEnd();
                      }
                    }}
                    onError={(error) => {
                      logger.error('ProfessionalMagicPlayer', 'YouTube A player error', error);
                      handleSourceError('A', error);
                    }}
                    onProgress={(currentTime, duration) => {
                      setCurrentTime(currentTime);
                      setDuration(duration);
                      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                      setDeckAProgress(progress);
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
                    const percentage =
                      ((e.clientX - rect.left) / rect.width) * 100;
                    handleSeek(percentage);
                  }}
                  role="slider"
                  aria-label="Track waveform and seek control"
                  aria-valuenow={deckAProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              )}
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
                <span>{formatTimeClock(currentTime)}</span>
                <span className="text-fuchsia-400">
                  {Math.round(deckAProgress)}%
                </span>
                <span>
                  {formatTimeClock(duration || (currentTrack?.duration ?? 180))}
                </span>
              </div>
              {deckACurrentSource && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500 font-orbitron">
                    Source: {deckACurrentSource.type.toUpperCase()}
                    {deckACurrentSource.quality && ` (${deckACurrentSource.quality})`}
                  </span>
                  {deckASources.length > 1 && (
                    <span className="text-slate-500 font-orbitron">
                      {deckASourceIndex + 1}/{deckASources.length}
                    </span>
                  )}
                </div>
              )}
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
                  disabled={isLoading}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-16 h-16 lg:w-20 lg:h-20 glass-button hover-lift flex items-center justify-center transition-all duration-300 disabled:opacity-50 shadow-neon-pink active:scale-95"
                >
                  {isLoading ? (
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
                    {deckAVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckAVolume}
                  onChange={e => setDeckAVolume(Number(e.target.value))}
                  className="slider-futuristic w-full"
                  aria-label="Deck A volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckA', deckAProgress)}
                  aria-label="Add cue point"
                  className="btn-secondary flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button
                  aria-label="Create loop"
                  className="btn-accent flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>LOOP</span>
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
                  value={crossfaderPosition}
                  onChange={e => handleCrossfaderChange(Number(e.target.value))}
                  className="slider-futuristic w-full"
                  aria-label="Crossfader position"
                  aria-valuetext={`${crossfaderPosition > 0 ? 'Deck B' : crossfaderPosition < 0 ? 'Deck A' : 'Center'}`}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-3 font-orbitron font-bold">
                  <span className="text-fuchsia-400">A</span>
                  <span className="text-white">CENTER</span>
                  <span className="text-cyan-400">B</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-orbitron text-cyan-400">
                    {crossfaderPosition > 0 ? '+' : ''}
                    {crossfaderPosition}
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
                    {masterVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={e => setMasterVolume(Number(e.target.value))}
                  className="slider-futuristic w-full"
                  aria-label="Master volume"
                />
              </div>

              {/* Enhanced Master Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBpmSync(!bpmSync)}
                  aria-label={`BPM sync ${bpmSync ? 'enabled' : 'disabled'}`}
                  className={`btn-secondary py-3 px-4 text-sm font-bold ${
                    bpmSync ? 'shadow-neon-blue' : ''
                  }`}
                >
                  BPM SYNC
                </button>
                <button
                  onClick={() => setAutoMix(!autoMix)}
                  aria-label={`Auto mix ${autoMix ? 'enabled' : 'disabled'}`}
                  className={`btn-primary py-3 px-4 text-sm font-bold ${
                    autoMix ? 'shadow-neon-pink' : ''
                  }`}
                >
                  AUTO MIX
                </button>
              </div>
            </div>

            {/* Enhanced Session Info */}
            <div className="glass-card hover-lift p-6">
              <h3 className="text-lg lg:text-xl font-bold mb-4 text-fuchsia-400 flex items-center space-x-2 font-orbitron">
                <Settings className="w-5 h-5" />
                <span>SESSION INFO</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Playing:</span>
                  <span className="text-white font-bold">
                    {currentTrackIndex + 1} / {playlist.tracks.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">
                    Remaining:
                  </span>
                  <span className="text-white font-bold">
                    {formatTimeClock(
                      (playlist.tracks.length - currentTrackIndex - 1) * 180
                    )}
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
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Energy:</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.round((currentTrack.energy ?? 0.5) * 100)}%
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
              <div className="flex items-center space-x-2">
                <button
                  aria-label="Play deck B"
                  className="w-10 h-10 glass-button hover-lift flex items-center justify-center transition-all"
                >
                  <Play className="w-5 h-5 text-cyan-400" />
                </button>
                <button
                  aria-label="Pause deck B"
                  className="w-10 h-10 glass-button hover-lift flex items-center justify-center transition-all"
                >
                  <Pause className="w-5 h-5 text-cyan-400" />
                </button>
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
                  <p className="text-slate-400 font-orbitron">
                    NO TRACK LOADED
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Waveform / YouTube Player */}
            <div className="mb-6">
              {deckBCurrentSource?.type === 'youtube' ? (
                <div className="relative">
                  <YouTubePlayer
                    ref={youtubeBRef}
                    videoId={deckBCurrentSource.metadata?.videoId || ''}
                    volume={deckBVolume}
                    className="w-full h-20 lg:h-28 rounded-lg border border-glass"
                    onReady={() => {
                      setYoutubeBReady(true);
                      logger.info('ProfessionalMagicPlayer', 'YouTube B player ready');
                    }}
                    onStateChange={(state) => {
                      // Handle state changes for deck B
                      logger.debug('ProfessionalMagicPlayer', 'YouTube B state change', state);
                    }}
                    onError={(error) => {
                      logger.error('ProfessionalMagicPlayer', 'YouTube B player error', error);
                      handleSourceError('B', error);
                    }}
                    onProgress={(currentTime, duration) => {
                      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                      setDeckBProgress(progress);
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
                  {Math.round(deckBProgress)}%
                </span>
                <span>
                  {nextTrack
                    ? formatTimeClock(nextTrack.duration ?? 180)
                    : '--:--'}
                </span>
              </div>
              {deckBCurrentSource && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500 font-orbitron">
                    Source: {deckBCurrentSource.type.toUpperCase()}
                    {deckBCurrentSource.quality && ` (${deckBCurrentSource.quality})`}
                  </span>
                  {deckBSources.length > 1 && (
                    <span className="text-slate-500 font-orbitron">
                      {deckBSourceIndex + 1}/{deckBSources.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  aria-label="Deck B previous"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 text-cyan-400" />
                </button>
                <button
                  aria-label="Play deck B"
                  className="w-16 h-16 lg:w-20 lg:h-20 glass-button hover-lift flex items-center justify-center transition-all duration-300 shadow-neon-cyan"
                >
                  <Play className="w-8 h-8 lg:w-10 lg:h-10 text-cyan-400" />
                </button>
                <button
                  aria-label="Deck B next"
                  className="w-12 h-12 lg:w-14 lg:h-14 glass-button hover-lift flex items-center justify-center transition-all duration-300"
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
                    {deckBVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckBVolume}
                  onChange={e => setDeckBVolume(Number(e.target.value))}
                  className="slider-futuristic w-full"
                  aria-label="Deck B volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckB', deckBProgress)}
                  aria-label="Add cue point to deck B"
                  className="btn-secondary flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button
                  aria-label="Create loop on deck B"
                  className="btn-accent flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>LOOP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Right Sidebar */}
          <div className="space-y-6 min-h-0">
            {showMagicDancer && (
              <MagicDancer
                isActive={isPlaying}
                currentTrack={
                  currentTrack
                    ? {
                        title: currentTrack.title,
                        artist: currentTrack.artist,
                        bpm: currentTrack.bpm ?? 128,
                        energy: currentTrack.energy ?? 0.7,
                      }
                    : undefined
                }
                onEnergyChange={energy => {
                  console.log('Crowd energy:', energy);
                }}
              />
            )}

            {showPlaylistEditor && (
              <PlaylistEditor
                playlist={playlist}
                currentTrackIndex={currentTrackIndex}
                isPlaying={isPlaying}
                onTrackSelect={handleTrackSelect}
                onTrackRemove={handleTrackRemove}
                onTrackReorder={handleTrackReorder}
                onPlaylistUpdate={handlePlaylistUpdate}
                className="max-h-96 overflow-hidden"
              />
            )}

            {!showMagicDancer && !showPlaylistEditor && (
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
                    onClick={() => setShowMagicDancer(true)}
                    aria-label="Show magic dancer"
                    className="btn-secondary py-3 px-4 text-sm font-bold"
                  >
                    MAGIC DANCER
                  </button>
                  <button
                    onClick={() => setShowPlaylistEditor(true)}
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
      {showUnmuteOverlay && (
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
