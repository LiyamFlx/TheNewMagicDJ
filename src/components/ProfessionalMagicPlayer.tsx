import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Settings, ArrowLeft, Square, Menu, X, List, Activity, Music, Zap, Radio, Crosshair, RotateCcw } from 'lucide-react';
import { Playlist, Session, Track } from '../types';
import MagicDancer from './MagicDancer';
import PlaylistEditor from './PlaylistEditor';
import { logger } from '../utils/logger';
import { throttle } from '../utils/debounce';
import { formatTimeClock } from '../utils/format';
import { generateWavDataUrl } from '../utils/audioFallback';


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
  onBack
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

  // Audio elements using refs for stability
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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

  // Error throttling to prevent spam
  const errorThrottleRef = useRef<{
    lastError: number;
    errorCount: number;
  }>({ lastError: 0, errorCount: 0 });

  const currentTrack = playlist?.tracks[currentTrackIndex];
  const nextTrack = playlist?.tracks[currentTrackIndex + 1];

  // Touch session to avoid TS unused var warning and provide traceability
  useEffect(() => {
    logger.info('ProfessionalMagicPlayer', 'Session active', { sessionId: session?.id });
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

  // Initialize Audio A
  useEffect(() => {
    if (!currentTrack) return;

    // Clean up existing audio
    if (audioARef.current) {
      const audio = audioARef.current;
      const listeners = audioAListenersRef.current;

      audio.pause();
      if (listeners.loadedmetadata) audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
      if (listeners.canplaythrough) audio.removeEventListener('canplaythrough', listeners.canplaythrough);
      if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
      if (listeners.ended) audio.removeEventListener('ended', listeners.ended);
      if (listeners.error) audio.removeEventListener('error', listeners.error);
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = deckAVolume / 100;
    
    // Create listener functions
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 180);
      logger.info('ProfessionalMagicPlayer', 'Audio A metadata loaded', {
        duration: audio.duration,
        readyState: audio.readyState,
        src: audio.src.substring(0, 50) + '...'
      });
    };

    const onCanPlayThrough = () => {
      setIsLoading(false);
      logger.info('ProfessionalMagicPlayer', 'Audio A can play through', {
        duration: audio.duration,
        readyState: audio.readyState,
        src: audio.src.substring(0, 50) + '...'
      });
    };
    
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setDeckAProgress(progress);
    };
    
    const onError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      const now = Date.now();

      // Throttle error logging to prevent spam
      if (now - errorThrottleRef.current.lastError < 2000) {
        errorThrottleRef.current.errorCount++;
        if (errorThrottleRef.current.errorCount > 5) {
          return; // Stop logging after 5 rapid errors
        }
      } else {
        errorThrottleRef.current.errorCount = 1;
      }
      errorThrottleRef.current.lastError = now;

      logger.error('ProfessionalMagicPlayer', 'Audio A playback error', {
        code: error?.code,
        message: error?.message,
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState,
        errorCount: errorThrottleRef.current.errorCount
      });

      setIsLoading(false);
      setDuration(currentTrack.duration ?? 180);

      // Only show error message on first few errors, not repeatedly
      if (errorThrottleRef.current.errorCount <= 2 && target.src && !target.src.startsWith('data:audio/wav')) {
        setErrorMessage('Audio failed, using demo audio');
        setIsDegraded(true);
        setTimeout(() => setErrorMessage(null), 3000);
      }

      // Auto-skip to next track if current track fails to load (but not repeatedly)
      if (error && error.code !== 1 && errorThrottleRef.current.errorCount === 1) {
        logger.info('ProfessionalMagicPlayer', 'Auto-skipping failed track', {
          currentIndex: currentTrackIndex,
          totalTracks: playlist?.tracks.length
        });
        setTimeout(() => {
          if (currentTrackIndex < (playlist?.tracks.length ?? 0) - 1) {
            handleSkipForward();
          }
        }, 1000);
      }
    };
    
    // Store listeners for cleanup
    audioAListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      canplaythrough: onCanPlayThrough,
      timeupdate: onTimeUpdate,
      ended: handleTrackEnd,
      error: onError
    };

    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', onError);
    
    // Set audio source - prioritize track's preview_url
    if (currentTrack.preview_url && currentTrack.preview_url.trim() !== '') {
      audio.src = currentTrack.preview_url;
      setIsDegraded(false);
      logger.info('ProfessionalMagicPlayer', 'Audio A source set to track preview', {
        trackTitle: currentTrack.title,
        audioSrc: currentTrack.preview_url
      });
    } else {
      // Use track index to vary frequency for local fallback
      const baseFreq = 440 + (currentTrackIndex * 20); // Vary frequency per track
      audio.src = generateWavDataUrl(baseFreq, 12);
      setIsDegraded(true);

      logger.info('ProfessionalMagicPlayer', 'Audio A source set to generated fallback', {
        trackTitle: currentTrack.title,
        frequency: baseFreq,
        reason: 'No preview_url available'
      });
    }
    
    // Set volume immediately
    audio.volume = 0.7;
    
    audioARef.current = audio;
    setIsLoading(true);

    return () => {
      const listeners = audioAListenersRef.current;
      if (listeners.loadedmetadata) audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
      if (listeners.canplaythrough) audio.removeEventListener('canplaythrough', listeners.canplaythrough);
      if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
      if (listeners.ended) audio.removeEventListener('ended', listeners.ended);
      if (listeners.error) audio.removeEventListener('error', listeners.error);
      audio.pause();
    };
  }, [currentTrack, currentTrackIndex, playlist?.tracks.length, onSessionEnd]);

  // Initialize Audio B
  useEffect(() => {
    if (!nextTrack) {
      if (audioBRef.current) {
        const audio = audioBRef.current;
        const listeners = audioBListenersRef.current;
        
        audio.pause();
        if (listeners.loadedmetadata) audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
        if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
        if (listeners.ended) audio.removeEventListener('ended', listeners.ended);
        if (listeners.error) audio.removeEventListener('error', listeners.error);
        audioBRef.current = null;
      }
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    
    // Create listener functions for deck B
    const onLoadedMetadata = () => {
      // Deck B metadata loaded
    };
    
    const onTimeUpdate = () => {
      const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setDeckBProgress(progress);
    };
    
    const onError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      const now = Date.now();

      // Use same throttling for Audio B
      if (now - errorThrottleRef.current.lastError < 2000) {
        errorThrottleRef.current.errorCount++;
        if (errorThrottleRef.current.errorCount > 5) {
          return; // Stop logging after 5 rapid errors
        }
      } else {
        errorThrottleRef.current.errorCount = 1;
      }
      errorThrottleRef.current.lastError = now;

      logger.error('ProfessionalMagicPlayer', 'Audio B playback error', {
        code: error?.code,
        message: error?.message,
        src: target.src,
        errorCount: errorThrottleRef.current.errorCount
      });

      // Set degraded mode if errors persist
      if (errorThrottleRef.current.errorCount <= 2) {
        setIsDegraded(true);
      }
    };
    
    // Store listeners for cleanup
    audioBListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      timeupdate: onTimeUpdate,
      error: onError
    };
    
    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('error', onError);
    
    // Set audio source - prioritize track's preview_url
    if (nextTrack.preview_url && nextTrack.preview_url.trim() !== '') {
      audio.src = nextTrack.preview_url;
    } else {
      // Use a simple silent audio data URL as fallback
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t';
    }
    
    // Set volume immediately  
    audio.volume = 0.5;
    
    audioBRef.current = audio;

    return () => {
      const listeners = audioBListenersRef.current;
      if (listeners.loadedmetadata) audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
      if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
      if (listeners.error) audio.removeEventListener('error', listeners.error);
      audio.pause();
    };
  }, [nextTrack]);

  // Handle play/pause with state tracking to prevent double triggers
  const [lastPlayPauseState, setLastPlayPauseState] = useState<boolean | null>(null);

  useEffect(() => {
    // Prevent duplicate calls with same state
    if (lastPlayPauseState === isPlaying) {
      return;
    }
    setLastPlayPauseState(isPlaying);

    const audio = audioARef.current;

    logger.info('ProfessionalMagicPlayer', 'Play/Pause effect triggered', {
      isPlaying,
      hasAudio: !!audio,
      audioSrc: audio?.src,
      isLoading,
      readyState: audio?.readyState,
      currentTrack: currentTrack?.title
    });

    if (!audio || isLoading || audio.readyState < 4) { // 4 = HAVE_ENOUGH_DATA
      logger.warn('ProfessionalMagicPlayer', 'Play/Pause skipped - audio not ready', {
        hasAudio: !!audio,
        isLoading,
        readyState: audio?.readyState,
        readyStateRequired: 4, // HAVE_ENOUGH_DATA
        audioSrc: audio?.src
      });
      return;
    }

    if (isPlaying) {
      // Initialize AudioContext if needed
      if (!audioContextRef.current && window.AudioContext) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

          // Handle AudioContext state changes
          audioContextRef.current.addEventListener('statechange', () => {
            logger.info('ProfessionalMagicPlayer', 'AudioContext state changed', {
              state: audioContextRef.current?.state
            });
          });

        } catch (error: any) {
          logger.warn('ProfessionalMagicPlayer', 'AudioContext creation failed', error);
          setErrorMessage('Audio device unavailable. Using basic playback.');
          setIsDegraded(true);
          setTimeout(() => setErrorMessage(null), 3000);
        }
      }

      // Resume AudioContext if suspended (required for autoplay policy)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(error => {
          logger.warn('ProfessionalMagicPlayer', 'AudioContext resume failed', error);

          // Check if this is a device error
          if (error.name === 'NotSupportedError' || error.message.includes('audio device')) {
            setErrorMessage('Audio device error. Check system audio settings.');
            setIsDegraded(true);
            setTimeout(() => setErrorMessage(null), 5000);
          } else {
            setShowUnmuteOverlay(true);
          }
        });
      }

      // Ensure audio is ready before playing
      logger.info('ProfessionalMagicPlayer', 'Attempting to play audio', {
        audioSrc: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        audioContextState: audioContextRef.current?.state
      });

      // Add retry mechanism for playback
      const attemptPlay = async (retries = 3): Promise<void> => {
        try {
          await audio.play();
          logger.info('ProfessionalMagicPlayer', 'Audio playback started successfully');
          setShowUnmuteOverlay(false);
        } catch (error: any) {
          logger.error('ProfessionalMagicPlayer', `Audio play failed (${retries} retries left)`, {
            error: error.message,
            name: error.name,
            readyState: audio.readyState,
            networkState: audio.networkState
          });

          if (retries > 0) {
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            return attemptPlay(retries - 1);
          } else {
            // Show unmute overlay for user interaction
            setShowUnmuteOverlay(true);
            throw error;
          }
        }
      };

      attemptPlay().catch(error => {
        logger.error('ProfessionalMagicPlayer', 'All play attempts failed', error);
        onPlayPause(false);

        // Check if this is an autoplay restriction
        if (error.name === 'NotAllowedError') {
          setShowUnmuteOverlay(true);
          logger.info('ProfessionalMagicPlayer', 'Autoplay blocked - showing unmute overlay');
        } else {
          setErrorMessage('Playback failed. Retrying...');
          setTimeout(() => {
            setErrorMessage(null);
            audio.load();
          }, 2000);
        }
      });
    } else {
      logger.info('ProfessionalMagicPlayer', 'Pausing audio');
      audio.pause();
    }
  }, [isPlaying, isLoading, currentTrack]);

  // Handle volume changes
  useEffect(() => {
    const audioA = audioARef.current;
    const audioB = audioBRef.current;

    if (audioA) {
      const deckAVol = (deckAVolume / 100) * (masterVolume / 100);
      const crossfadeA = crossfaderPosition <= 0 ? 1 : Math.max(0, 1 - (crossfaderPosition / 100));
      audioA.volume = Math.max(0, Math.min(1, deckAVol * crossfadeA));
    }
    
    if (audioB) {
      const deckBVol = (deckBVolume / 100) * (masterVolume / 100);
      const crossfadeB = crossfaderPosition >= 0 ? 1 : Math.max(0, 1 + (crossfaderPosition / 100));
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

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawWaveform(waveformCanvasA.current, currentTrack, deckAProgress, 'green', waveformDataA.current);
      drawWaveform(waveformCanvasB.current, nextTrack, deckBProgress, 'purple', waveformDataB.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
      const animatedAmplitude = baseAmplitude * energyMultiplier * (1 + Math.sin(time * 2 + i * 0.1) * 0.1);
      
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
    ctx.shadowColor = color === 'green' ? 'rgba(232, 121, 249, 1)' : 'rgba(34, 211, 238, 1)';
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
      const safeDuration = (trackDuration && trackDuration > 0) ? trackDuration : 180;
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
      [deckId]: [...(prev[deckId] || []), position].slice(-5) // Limit to 5 cue points
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
        nextTrack: playlist?.tracks[newIndex]?.title
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
            aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            className="lg:hidden glass-button hover-lift flex items-center justify-center w-10 h-10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-fuchsia-400" /> : <Menu className="w-5 h-5 text-fuchsia-400" />}
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 glass-card flex items-center justify-center shadow-neon-pink animate-pulse-glow">
              <Radio className="w-7 h-7 text-fuchsia-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-wide font-orbitron">PROFESSIONAL PLAYER</h1>
                {isDegraded && (
                  <span className="text-xs px-2 py-1 bg-yellow-900/50 border border-yellow-400 text-yellow-400 rounded font-orbitron">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-sm lg:text-base text-fuchsia-400 font-orbitron truncate max-w-48 lg:max-w-none">{playlist.name}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 lg:space-x-4">
          <button
            onClick={() => setShowPlaylistEditor(!showPlaylistEditor)}
            aria-label={showPlaylistEditor ? "Hide playlist editor" : "Show playlist editor"}
            className={`btn-primary px-3 lg:px-4 py-2 flex items-center space-x-2 text-sm lg:text-base ${showPlaylistEditor ? 'shadow-neon-pink' : ''}`}
          >
            <List className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">PLAYLIST</span>
          </button>
          <button
            onClick={() => setShowMagicDancer(!showMagicDancer)}
            aria-label={showMagicDancer ? "Hide magic dancer" : "Show magic dancer"}
            className={`btn-secondary px-3 lg:px-4 py-2 flex items-center space-x-2 text-sm lg:text-base ${showMagicDancer ? 'shadow-neon-blue' : ''}`}
          >
            <Activity className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">DANCER</span>
          </button>
          {errorMessage ? (
            <div className="flex items-center space-x-2 px-3 lg:px-4 py-2 glass-card border-yellow-400 shadow-yellow-400/20">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs lg:text-sm font-bold tracking-wider text-yellow-400">{errorMessage}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 glass-card shadow-neon-cyan">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse-glow"></div>
              <span className="text-xs lg:text-sm font-bold tracking-wider">LIVE</span>
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
              <h3 className="font-bold truncate text-white text-lg font-orbitron">{currentTrack.title}</h3>
              <p className="text-sm text-fuchsia-400 truncate font-orbitron">{currentTrack.artist}</p>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span className="font-orbitron">{currentTrack.bpm ?? 128} BPM</span>
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
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
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
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
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
      <div className={`flex-1 p-4 lg:p-6 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 h-full">
          
          {/* Enhanced Deck A */}
          <div className="glass-card hover-lift p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-fuchsia-400 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg">
                  A
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-fuchsia-400 tracking-wider font-orbitron">DECK A</h2>
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
              <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-white font-orbitron">{currentTrack.title}</h3>
              <p className="text-fuchsia-400 mb-3 truncate font-orbitron text-base">{currentTrack.artist}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">{currentTrack.bpm ?? 128}</div>
                  <div className="text-slate-400 text-xs">BPM</div>
                </div>
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">{currentTrack.key ?? 'C'}</div>
                  <div className="text-slate-400 text-xs">KEY</div>
                </div>
                <div className="text-center">
                  <div className="text-fuchsia-400 font-bold text-lg">{formatTimeClock(currentTrack.duration ?? 180)}</div>
                  <div className="text-slate-400 text-xs">TIME</div>
                </div>
              </div>
            </div>

            {/* Enhanced Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasA}
                width={320}
                height={120}
                className="w-full h-20 lg:h-28 bg-slate-900 border border-glass rounded-lg cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
                role="slider"
                aria-label="Track waveform and seek control"
                aria-valuenow={deckAProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
                <span>{formatTimeClock(currentTime)}</span>
                <span className="text-fuchsia-400">{Math.round(deckAProgress)}%</span>
                <span>{formatTimeClock(duration || (currentTrack?.duration ?? 180))}</span>
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
                  disabled={isLoading}
                  aria-label={isPlaying ? "Pause" : "Play"}
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
                    <span className="text-sm font-bold text-fuchsia-400 font-orbitron">VOLUME</span>
                  </div>
                  <span className="text-sm font-orbitron text-white">{deckAVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckAVolume}
                  onChange={(e) => setDeckAVolume(Number(e.target.value))}
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
                  onChange={(e) => handleCrossfaderChange(Number(e.target.value))}
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
                  <span className="text-sm font-orbitron text-cyan-400">{crossfaderPosition > 0 ? '+' : ''}{crossfaderPosition}</span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Headphones className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400 font-orbitron">MASTER</span>
                  </div>
                  <span className="text-sm font-orbitron text-white">{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
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
                  <span className="text-white font-bold">{currentTrackIndex + 1} / {playlist.tracks.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Remaining:</span>
                  <span className="text-white font-bold">{formatTimeClock((playlist.tracks.length - currentTrackIndex - 1) * 180)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">BPM:</span>
                  <span className="text-fuchsia-400 font-bold">{currentTrack.bpm ?? 128}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Key:</span>
                  <span className="text-fuchsia-400 font-bold">{currentTrack.key ?? 'C'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-glass rounded-lg">
                  <span className="text-slate-400 font-orbitron">Energy:</span>
                  <span className="text-cyan-400 font-bold">{Math.round((currentTrack.energy ?? 0.5) * 100)}%</span>
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
                <h2 className="text-xl lg:text-2xl font-bold text-cyan-400 tracking-wider font-orbitron">DECK B</h2>
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
                  <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-white font-orbitron">{nextTrack.title}</h3>
                  <p className="text-cyan-400 mb-3 truncate font-orbitron text-base">{nextTrack.artist}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">{nextTrack.bpm ?? 128}</div>
                      <div className="text-slate-400 text-xs">BPM</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">{nextTrack.key ?? 'C'}</div>
                      <div className="text-slate-400 text-xs">KEY</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold text-lg">{formatTimeClock(nextTrack.duration ?? 180)}</div>
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

            {/* Enhanced Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasB}
                width={320}
                height={120}
                className="w-full h-20 lg:h-28 bg-slate-900 border border-glass rounded-lg"
                aria-label="Deck B waveform display"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-orbitron">
                <span>0:00</span>
                <span className="text-cyan-400">{Math.round(deckBProgress)}%</span>
                <span>{nextTrack ? formatTimeClock(nextTrack.duration ?? 180) : '--:--'}</span>
              </div>
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
                    <span className="text-sm font-bold text-cyan-400 font-orbitron">VOLUME</span>
                  </div>
                  <span className="text-sm font-orbitron text-white">{deckBVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckBVolume}
                  onChange={(e) => setDeckBVolume(Number(e.target.value))}
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
                currentTrack={currentTrack ? {
                  title: currentTrack.title,
                  artist: currentTrack.artist,
                  bpm: currentTrack.bpm ?? 128,
                  energy: currentTrack.energy ?? 0.7
                } : undefined}
                onEnergyChange={(energy) => {
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
                <h3 className="text-lg font-bold text-white mb-3 font-orbitron">DJ TOOLS</h3>
                <p className="text-slate-400 mb-6 font-orbitron text-sm">Select tools from the header to get started</p>
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
            <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">TAP TO UNMUTE</h2>
            <p className="text-slate-400 mb-6 font-orbitron">Your browser requires user interaction before playing audio</p>
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
