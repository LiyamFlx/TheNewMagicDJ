import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Settings, ArrowLeft, Square, Menu, X, List, Activity, Music, Zap, Radio, Crosshair, RotateCcw } from 'lucide-react';
import { Playlist, Session, Track } from '../types';
import MagicDancer from './MagicDancer';
import PlaylistEditor from './PlaylistEditor';
import { logger } from '../utils/logger';

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
  
  // Audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [showMagicDancer, setShowMagicDancer] = useState(true);
  
  const waveformCanvasA = useRef<HTMLCanvasElement>(null);
  const waveformCanvasB = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const autoMixIntervalRef = useRef<number>();
  const fadeIntervalRef = useRef<number>();

  // Store listener references for proper cleanup
  const audioAListenersRef = useRef<{
    loadedmetadata?: () => void;
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
      if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
      if (listeners.ended) audio.removeEventListener('ended', listeners.ended);
      if (listeners.error) audio.removeEventListener('error', listeners.error);
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    
    // Create listener functions
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 180);
      setIsLoading(false);
    };
    
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setDeckAProgress(progress);
    };
    
    const onError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      logger.error('ProfessionalMagicPlayer', 'Audio A playback error', {
        code: error?.code,
        message: error?.message,
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState
      });
      setIsLoading(false);
      setDuration(currentTrack.duration ?? 180);
    };
    
    // Store listeners for cleanup
    audioAListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      timeupdate: onTimeUpdate,
      ended: handleTrackEnd,
      error: onError
    };
    
    // Add listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', onError);
    
    // Set audio source - prioritize track's preview_url
    if (currentTrack.preview_url && currentTrack.preview_url.trim() !== '') {
      audio.src = currentTrack.preview_url;
    } else {
      // Use a simple silent audio data URL as fallback
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t';
    }
    
    // Set volume immediately
    audio.volume = 0.7;
    
    audioARef.current = audio;
    setIsLoading(true);

    return () => {
      const listeners = audioAListenersRef.current;
      if (listeners.loadedmetadata) audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
      if (listeners.timeupdate) audio.removeEventListener('timeupdate', listeners.timeupdate);
      if (listeners.ended) audio.removeEventListener('ended', listeners.ended);
      if (listeners.error) audio.removeEventListener('error', listeners.error);
      audio.pause();
    };
  }, [currentTrack, handleTrackEnd]);

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
      logger.error('ProfessionalMagicPlayer', 'Audio B playback error', {
        code: error?.code,
        message: error?.message,
        src: target.src
      });
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

  // Handle play/pause
  useEffect(() => {
    const audio = audioARef.current;
    if (!audio || isLoading) return;

    if (isPlaying) {
      // Ensure audio is ready before playing
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            logger.info('ProfessionalMagicPlayer', 'Audio playback started successfully');
          })
          .catch(error => {
            logger.error('ProfessionalMagicPlayer', 'Audio play failed', error);
            onPlayPause(false);
            // Try to reload the audio
            setTimeout(() => {
              audio.load();
            }, 1000);
          });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

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
          fillColor = '#00FF41';
          shadowColor = 'rgba(0, 255, 65, 0.8)';
        } else {
          fillColor = '#9D00FF';
          shadowColor = 'rgba(157, 0, 255, 0.8)';
        }
      } else {
        if (color === 'green') {
          fillColor = 'rgba(0, 255, 65, 0.3)';
          shadowColor = 'rgba(0, 255, 65, 0.2)';
        } else {
          fillColor = 'rgba(157, 0, 255, 0.3)';
          shadowColor = 'rgba(157, 0, 255, 0.2)';
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
    ctx.strokeStyle = color === 'green' ? '#00FF41' : '#9D00FF';
    ctx.lineWidth = 3;
    ctx.shadowColor = color === 'green' ? 'rgba(0, 255, 65, 1)' : 'rgba(157, 0, 255, 1)';
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
    if (audio && duration > 0) {
      const newTime = (percentage / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
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

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyber-white font-mono">Loading playlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black overflow-hidden font-dj">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b-2 border-neon-green bg-gradient-to-r from-cyber-darker to-cyber-dark backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            aria-label="Go back to playlist selection"
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-sm bg-cyber-medium border-2 border-neon-green hover:neon-glow-green flex items-center justify-center transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 neon-text-green" />
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            className="lg:hidden w-10 h-10 rounded-sm bg-cyber-medium border-2 border-neon-green hover:neon-glow-green flex items-center justify-center transition-all duration-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 neon-text-green" /> : <Menu className="w-5 h-5 neon-text-green" />}
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-cyber-dark border-3 border-neon-green rounded-sm flex items-center justify-center neon-glow-green animate-pulse-light">
              <Radio className="w-7 h-7 neon-text-green" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-cyber-white tracking-wide">PROFESSIONAL PLAYER</h1>
              <p className="text-sm lg:text-base text-neon-green font-mono truncate max-w-48 lg:max-w-none">{playlist.name}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 lg:space-x-4">
          <button
            onClick={() => setShowPlaylistEditor(!showPlaylistEditor)}
            aria-label={showPlaylistEditor ? "Hide playlist editor" : "Show playlist editor"}
            className={`cyber-button cyber-button-purple px-3 lg:px-4 py-2 rounded-sm flex items-center space-x-2 text-sm lg:text-base ${showPlaylistEditor ? 'active-neon-purple' : ''}`}
          >
            <List className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">PLAYLIST</span>
          </button>
          <button
            onClick={() => setShowMagicDancer(!showMagicDancer)}
            aria-label={showMagicDancer ? "Hide magic dancer" : "Show magic dancer"}
            className={`cyber-button px-3 lg:px-4 py-2 rounded-sm flex items-center space-x-2 text-sm lg:text-base ${showMagicDancer ? 'active-neon-green' : ''}`}
          >
            <Activity className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">DANCER</span>
          </button>
          <div className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 bg-cyber-dark border-2 border-neon-green rounded-sm neon-glow-green">
            <div className="w-3 h-3 bg-neon-green rounded-full animate-neon-pulse-fast"></div>
            <span className="text-xs lg:text-sm font-bold tracking-wider">LIVE</span>
          </div>
          <button
            onClick={onSessionEnd}
            aria-label="End DJ session"
            className="cyber-button cyber-button-purple px-3 lg:px-4 py-2 rounded-sm flex items-center space-x-2 text-sm lg:text-base"
          >
            <Square className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">END</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Player */}
      <div className="lg:hidden bg-cyber-dark border-b-2 border-neon-green">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-14 h-14 deck-card deck-card-a rounded-sm flex items-center justify-center animate-deck-glow">
              <Play className="w-7 h-7 neon-text-green" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate text-cyber-white text-lg">{currentTrack.title}</h3>
              <p className="text-sm text-neon-green truncate font-mono">{currentTrack.artist}</p>
              <div className="flex items-center space-x-3 text-xs text-cyber-dim mt-1">
                <span className="font-mono">{currentTrack.bpm ?? 128} BPM</span>
                <span className="font-mono">{currentTrack.key ?? 'C'}</span>
              </div>
            </div>
            {isLoading && (
              <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-sm animate-spin neon-glow-green"></div>
            )}
          </div>

          <div className="mb-4">
            <div 
              className="w-full h-3 bg-cyber-darker border-2 border-neon-green rounded-sm cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percentage);
              }}
              role="slider"
              aria-label="Seek track position"
              aria-valuenow={deckAProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div 
                className="h-3 progress-green rounded-sm transition-all duration-300"
                style={{ width: `${deckAProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-cyber-dim mt-2 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={handleSkipBack}
              aria-label="Skip to previous track"
              className="w-12 h-12 deck-card deck-card-a rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <SkipBack className="w-6 h-6 neon-text-green" />
            </button>
            <button
              onClick={() => onPlayPause(!isPlaying)}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
              className="w-16 h-16 deck-card deck-card-a rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-sm animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-8 h-8 neon-text-green" />
              ) : (
                <Play className="w-8 h-8 neon-text-green" />
              )}
            </button>
            <button 
              onClick={handleSkipForward}
              aria-label="Skip to next track"
              className="w-12 h-12 deck-card deck-card-a rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <SkipForward className="w-6 h-6 neon-text-green" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Player Interface */}
      <div className={`flex-1 p-4 lg:p-6 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 h-full">
          
          {/* Enhanced Deck A */}
          <div className="deck-card deck-card-a rounded-sm p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neon-green rounded-sm flex items-center justify-center text-cyber-black font-bold text-lg">
                  A
                </div>
                <h2 className="text-xl lg:text-2xl font-bold neon-text-green tracking-wider">DECK A</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  aria-label="Play deck A"
                  className="w-10 h-10 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center neon-glow-green hover:scale-105 transition-all"
                >
                  <Play className="w-5 h-5 neon-text-green" />
                </button>
                <button 
                  aria-label="Pause deck A"
                  className="w-10 h-10 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center hover:neon-glow-green hover:scale-105 transition-all"
                >
                  <Pause className="w-5 h-5 neon-text-green" />
                </button>
              </div>
            </div>

            {/* Enhanced Track Info */}
            <div className="mb-6 p-4 bg-cyber-darker border-2 border-neon-green rounded-sm">
              <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-cyber-white">{currentTrack.title}</h3>
              <p className="text-neon-green mb-3 truncate font-mono text-base">{currentTrack.artist}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-neon-green font-bold text-lg">{currentTrack.bpm ?? 128}</div>
                  <div className="text-cyber-dim text-xs">BPM</div>
                </div>
                <div className="text-center">
                  <div className="text-neon-green font-bold text-lg">{currentTrack.key ?? 'C'}</div>
                  <div className="text-cyber-dim text-xs">KEY</div>
                </div>
                <div className="text-center">
                  <div className="text-neon-green font-bold text-lg">{formatTime(currentTrack.duration ?? 180)}</div>
                  <div className="text-cyber-dim text-xs">TIME</div>
                </div>
              </div>
            </div>

            {/* Enhanced Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasA}
                width={320}
                height={120}
                className="w-full h-20 lg:h-28 bg-cyber-black border-2 border-neon-green rounded-sm cursor-pointer"
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
              <div className="flex justify-between text-xs text-cyber-dim mt-2 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="text-neon-green">{Math.round(deckAProgress)}%</span>
                <span>{formatTime(duration || (currentTrack.duration ?? 180))}</span>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={handleSkipBack}
                  aria-label="Previous track"
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-cyber-dark border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 neon-text-green" />
                </button>
                <button
                  onClick={() => onPlayPause(!isPlaying)}
                  disabled={isLoading}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-4 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-50 animate-deck-glow active:scale-95"
                >
                  {isLoading ? (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 border-3 border-neon-green border-t-transparent rounded-sm animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8 lg:w-10 lg:h-10 neon-text-green" />
                  ) : (
                    <Play className="w-8 h-8 lg:w-10 lg:h-10 neon-text-green" />
                  )}
                </button>
                <button 
                  onClick={handleSkipForward}
                  aria-label="Next track"
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-cyber-dark border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 neon-text-green" />
                </button>
              </div>

              {/* Enhanced Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-neon-green" />
                    <span className="text-sm font-bold text-neon-green">VOLUME</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-white">{deckAVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckAVolume}
                  onChange={(e) => setDeckAVolume(Number(e.target.value))}
                  className="cyber-slider w-full"
                  aria-label="Deck A volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckA', deckAProgress)}
                  aria-label="Add cue point"
                  className="cyber-button flex-1 py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button 
                  aria-label="Create loop"
                  className="cyber-button cyber-button-blue flex-1 py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>LOOP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Center Controls */}
          <div className="flex flex-col justify-between animate-fade-in-up">
            {/* Enhanced Crossfader Section */}
            <div className="cyber-card rounded-sm p-6 mb-6 bg-gradient-to-b from-cyber-medium to-cyber-dark">
              <h3 className="text-lg lg:text-xl font-bold mb-6 text-center neon-text-blue flex items-center justify-center space-x-2">
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
                  className="cyber-slider cyber-slider-blue w-full"
                  aria-label="Crossfader position"
                  aria-valuetext={`${crossfaderPosition > 0 ? 'Deck B' : crossfaderPosition < 0 ? 'Deck A' : 'Center'}`}
                />
                <div className="flex justify-between text-xs text-cyber-dim mt-3 font-mono font-bold">
                  <span className="neon-text-green">A</span>
                  <span className="text-cyber-white">CENTER</span>
                  <span className="neon-text-purple">B</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-mono text-neon-blue">{crossfaderPosition > 0 ? '+' : ''}{crossfaderPosition}</span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Headphones className="w-5 h-5 text-neon-blue" />
                    <span className="text-sm font-bold text-neon-blue">MASTER</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-white">{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="cyber-slider cyber-slider-blue w-full"
                  aria-label="Master volume"
                />
              </div>

              {/* Enhanced Master Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBpmSync(!bpmSync)}
                  aria-label={`BPM sync ${bpmSync ? 'enabled' : 'disabled'}`}
                  className={`cyber-button py-3 px-4 rounded-sm text-sm font-bold ${
                    bpmSync ? 'active-neon-green' : ''
                  }`}
                >
                  BPM SYNC
                </button>
                <button
                  onClick={() => setAutoMix(!autoMix)}
                  aria-label={`Auto mix ${autoMix ? 'enabled' : 'disabled'}`}
                  className={`cyber-button cyber-button-purple py-3 px-4 rounded-sm text-sm font-bold ${
                    autoMix ? 'active-neon-purple' : ''
                  }`}
                >
                  AUTO MIX
                </button>
              </div>
            </div>

            {/* Enhanced Session Info */}
            <div className="cyber-card rounded-sm p-6 bg-gradient-to-b from-cyber-dark to-cyber-medium">
              <h3 className="text-lg lg:text-xl font-bold mb-4 neon-text-purple flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>SESSION INFO</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-cyber-darker rounded-sm">
                  <span className="text-cyber-gray font-mono">Playing:</span>
                  <span className="text-cyber-white font-bold">{currentTrackIndex + 1} / {playlist.tracks.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-cyber-darker rounded-sm">
                  <span className="text-cyber-gray font-mono">Remaining:</span>
                  <span className="text-cyber-white font-bold">{formatTime((playlist.tracks.length - currentTrackIndex - 1) * 180)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-cyber-darker rounded-sm">
                  <span className="text-cyber-gray font-mono">BPM:</span>
                  <span className="text-neon-green font-bold">{currentTrack.bpm ?? 128}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-cyber-darker rounded-sm">
                  <span className="text-cyber-gray font-mono">Key:</span>
                  <span className="text-neon-green font-bold">{currentTrack.key ?? 'C'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-cyber-darker rounded-sm">
                  <span className="text-cyber-gray font-mono">Energy:</span>
                  <span className="text-neon-blue font-bold">{Math.round((currentTrack.energy ?? 0.5) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Deck B */}
          <div className="deck-card deck-card-b rounded-sm p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neon-purple rounded-sm flex items-center justify-center text-cyber-black font-bold text-lg">
                  B
                </div>
                <h2 className="text-xl lg:text-2xl font-bold neon-text-purple tracking-wider">DECK B</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  aria-label="Play deck B"
                  className="w-10 h-10 bg-cyber-dark border-2 border-neon-purple rounded-sm flex items-center justify-center neon-glow-purple hover:scale-105 transition-all"
                >
                  <Play className="w-5 h-5 neon-text-purple" />
                </button>
                <button 
                  aria-label="Pause deck B"
                  className="w-10 h-10 bg-cyber-dark border-2 border-neon-purple rounded-sm flex items-center justify-center hover:neon-glow-purple hover:scale-105 transition-all"
                >
                  <Pause className="w-5 h-5 neon-text-purple" />
                </button>
              </div>
            </div>

            {/* Enhanced Track Info */}
            <div className="mb-6 p-4 bg-cyber-darker border-2 border-neon-purple rounded-sm">
              {nextTrack ? (
                <>
                  <h3 className="font-bold text-lg lg:text-xl mb-2 truncate text-cyber-white">{nextTrack.title}</h3>
                  <p className="text-neon-purple mb-3 truncate font-mono text-base">{nextTrack.artist}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-neon-purple font-bold text-lg">{nextTrack.bpm ?? 128}</div>
                      <div className="text-cyber-dim text-xs">BPM</div>
                    </div>
                    <div className="text-center">
                      <div className="text-neon-purple font-bold text-lg">{nextTrack.key ?? 'C'}</div>
                      <div className="text-cyber-dim text-xs">KEY</div>
                    </div>
                    <div className="text-center">
                      <div className="text-neon-purple font-bold text-lg">{formatTime(nextTrack.duration ?? 180)}</div>
                      <div className="text-cyber-dim text-xs">TIME</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Music className="w-12 h-12 text-cyber-dim mx-auto mb-3" />
                  <p className="text-cyber-dim font-mono">NO TRACK LOADED</p>
                </div>
              )}
            </div>

            {/* Enhanced Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasB}
                width={320}
                height={120}
                className="w-full h-20 lg:h-28 bg-cyber-black border-2 border-neon-purple rounded-sm"
                aria-label="Deck B waveform display"
              />
              <div className="flex justify-between text-xs text-cyber-dim mt-2 font-mono">
                <span>0:00</span>
                <span className="text-neon-purple">{Math.round(deckBProgress)}%</span>
                <span>{nextTrack ? formatTime(nextTrack.duration ?? 180) : '--:--'}</span>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  aria-label="Deck B previous"
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-cyber-dark border-2 border-neon-purple hover:neon-glow-purple rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 neon-text-purple" />
                </button>
                <button 
                  aria-label="Play deck B"
                  className="w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-4 border-neon-purple hover:neon-glow-purple rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105 animate-deck-glow"
                >
                  <Play className="w-8 h-8 lg:w-10 lg:h-10 neon-text-purple" />
                </button>
                <button 
                  aria-label="Deck B next"
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-cyber-dark border-2 border-neon-purple hover:neon-glow-purple rounded-sm flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 neon-text-purple" />
                </button>
              </div>

              {/* Enhanced Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-neon-purple" />
                    <span className="text-sm font-bold text-neon-purple">VOLUME</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-white">{deckBVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckBVolume}
                  onChange={(e) => setDeckBVolume(Number(e.target.value))}
                  className="cyber-slider cyber-slider-purple w-full"
                  aria-label="Deck B volume"
                />
              </div>

              {/* Enhanced Cue Points */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addCuePoint('deckB', deckBProgress)}
                  aria-label="Add cue point to deck B"
                  className="cyber-button cyber-button-purple flex-1 py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>CUE</span>
                </button>
                <button 
                  aria-label="Create loop on deck B"
                  className="cyber-button flex-1 py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>LOOP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Right Sidebar */}
          <div className="space-y-6 min-h-0 animate-slide-in-right">
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
              <div className="cyber-card rounded-sm p-6 text-center bg-gradient-to-b from-cyber-medium to-cyber-dark">
                <div className="w-16 h-16 bg-cyber-dark border-3 border-neon-green rounded-sm flex items-center justify-center mx-auto mb-4 neon-glow-green animate-pulse-light">
                  <Music className="w-8 h-8 neon-text-green" />
                </div>
                <h3 className="text-lg font-bold text-cyber-white mb-3">DJ TOOLS</h3>
                <p className="text-cyber-gray mb-6 font-mono text-sm">Select tools from the header to get started</p>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => setShowMagicDancer(true)}
                    aria-label="Show magic dancer"
                    className="cyber-button py-3 px-4 rounded-sm text-sm font-bold"
                  >
                    MAGIC DANCER
                  </button>
                  <button
                    onClick={() => setShowPlaylistEditor(true)}
                    aria-label="Show playlist editor"
                    className="cyber-button cyber-button-purple py-3 px-4 rounded-sm text-sm font-bold"
                  >
                    PLAYLIST EDITOR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMagicPlayer;
