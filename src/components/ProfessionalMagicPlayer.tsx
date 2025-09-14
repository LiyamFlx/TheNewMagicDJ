import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Settings, ArrowLeft, Square, Repeat, Shuffle, Menu, X } from 'lucide-react';
import { Playlist, Session, Track } from '../types';

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
  const [deckAVolume, setDeckAVolume] = useState(100);
  const [deckBVolume, setDeckBVolume] = useState(0);
  const [crossfaderPosition, setCrossfaderPosition] = useState(0); // -100 to 100
  const [deckAProgress, setDeckAProgress] = useState(0);
  const [deckBProgress, setDeckBProgress] = useState(0);
  const [bpmSync, setBpmSync] = useState(true);
  const [autoMix, setAutoMix] = useState(false);
  const [cuePoints, setCuePoints] = useState<{ [key: string]: number[] }>({});
  
  // Audio playback state
  const [audioA, setAudioA] = useState<HTMLAudioElement | null>(null);
  const [audioB, setAudioB] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const waveformCanvasA = useRef<HTMLCanvasElement>(null);
  const waveformCanvasB = useRef<HTMLCanvasElement>(null);

  const currentTrack = playlist?.tracks[currentTrackIndex];
  const nextTrack = playlist?.tracks[currentTrackIndex + 1];

  useEffect(() => {
    // Initialize audio elements
    if (currentTrack && !audioA) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        const progress = (audio.currentTime / audio.duration) * 100;
        setDeckAProgress(progress);
      });
      
      audio.addEventListener('ended', handleTrackEnd);
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsLoading(false);
      });
      
      // Try preview URL first, fallback to a demo track
      if (currentTrack.preview_url) {
        audio.src = currentTrack.preview_url;
      } else {
        // Use a demo audio file for tracks without preview
        audio.src = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
      }
      
      setAudioA(audio);
      setIsLoading(true);
    }
    
    // Initialize next track audio
    if (nextTrack && !audioB) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
      
      if (nextTrack.preview_url) {
        audio.src = nextTrack.preview_url;
      } else {
        audio.src = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
      }
      
      setAudioB(audio);
    }
    
    return () => {
      if (audioA) {
        audioA.pause();
        audioA.removeEventListener('loadedmetadata', () => {});
        audioA.removeEventListener('timeupdate', () => {});
        audioA.removeEventListener('ended', handleTrackEnd);
      }
    };
  }, [currentTrack, nextTrack]);

  useEffect(() => {
    // Handle play/pause
    if (audioA) {
      if (isPlaying) {
        audioA.play().catch(e => console.error('Play failed:', e));
      } else {
        audioA.pause();
      }
    }
  }, [isPlaying, audioA]);

  useEffect(() => {
    // Update volume based on crossfader
    if (audioA) {
      audioA.volume = (deckAVolume / 100) * (1 - Math.max(0, crossfaderPosition / 100));
    }
    if (audioB) {
      audioB.volume = (deckBVolume / 100) * Math.max(0, (crossfaderPosition + 100) / 200);
    }
  }, [deckAVolume, deckBVolume, crossfaderPosition, audioA, audioB]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        if (audioA && autoMix && nextTrack) {
          const progress = (audioA.currentTime / audioA.duration) * 100;
          if (progress >= 80) { // Start crossfade at 80%
            handleAutoTransition();
          }
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTrackIndex, autoMix, nextTrack, audioA]);

  useEffect(() => {
    drawWaveform(waveformCanvasA.current, currentTrack, deckAProgress);
    drawWaveform(waveformCanvasB.current, nextTrack, deckBProgress);
  }, [currentTrack, nextTrack, deckAProgress, deckBProgress]);

  const drawWaveform = (canvas: HTMLCanvasElement | null, track: Track | undefined, progress: number) => {
    if (!canvas || !track) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform background
    ctx.fillStyle = 'rgba(124, 58, 237, 0.3)';
    for (let i = 0; i < width; i += 4) {
      const amplitude = Math.random() * 0.7 + 0.3;
      const barHeight = height * amplitude;
      ctx.fillRect(i, (height - barHeight) / 2, 2, barHeight);
    }

    // Draw progress overlay
    const progressWidth = (width * progress) / 100;
    ctx.fillStyle = 'rgba(124, 58, 237, 0.8)';
    for (let i = 0; i < progressWidth; i += 4) {
      const amplitude = Math.random() * 0.7 + 0.3;
      const barHeight = height * amplitude;
      ctx.fillRect(i, (height - barHeight) / 2, 2, barHeight);
    }

    // Draw playhead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressWidth, 0);
    ctx.lineTo(progressWidth, height);
    ctx.stroke();
  };

  const handleAutoTransition = () => {
    if (nextTrack) {
      // Start playing next track
      if (audioB) {
        audioB.play().catch(e => console.error('Next track play failed:', e));
      }
      
      // Simulate crossfade
      const fadeInterval = setInterval(() => {
        setCrossfaderPosition(prev => {
          const newPos = prev + 10;
          if (newPos >= 100) {
            clearInterval(fadeInterval);
            setCurrentTrackIndex(prev => prev + 1);
            setAudioA(audioB);
            setAudioB(null);
            setCrossfaderPosition(-100);
            setDeckBProgress(0);
            return -100;
          }
          return newPos;
        });
      }, 100);
    }
  };

  const handleTrackEnd = () => {
    if (currentTrackIndex < (playlist?.tracks.length || 0) - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      setAudioA(null); // Reset audio to trigger reload
      setDeckAProgress(0);
    } else {
      onSessionEnd();
    }
  };

  const handleCrossfaderChange = (value: number) => {
    setCrossfaderPosition(value);
    // Adjust deck volumes based on crossfader position
    const leftVolume = Math.max(0, 100 - ((value + 100) / 2));
    const rightVolume = Math.max(0, (value + 100) / 2);
    setDeckAVolume(leftVolume);
    setDeckBVolume(rightVolume);
  };

  const addCuePoint = (deckId: string, position: number) => {
    setCuePoints(prev => ({
      ...prev,
      [deckId]: [...(prev[deckId] || []), position]
    }));
  };

  const handleSeek = (percentage: number) => {
    if (audioA && duration) {
      const newTime = (percentage / 100) * duration;
      audioA.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipForward = () => {
    if (currentTrackIndex < (playlist?.tracks.length || 0) - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      setAudioA(null);
      setDeckAProgress(0);
    }
  };

  const handleSkipBack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
      setAudioA(null);
      setDeckAProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!playlist || !currentTrack) return null;

  return (
    <div className="min-h-screen bg-cyber-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-neon-green">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
          </button>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 neon-text-green" /> : <Menu className="w-4 h-4 neon-text-green" />}
          </button>
          
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-cyber-white">Professional Player</h1>
            <p className="text-sm lg:text-base text-cyber-gray truncate max-w-48 lg:max-w-none">{playlist.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 bg-cyber-dark border border-neon-green rounded-none">
            <div className="w-3 h-3 bg-neon-green rounded-full animate-neon-pulse neon-glow-green"></div>
            <span className="text-xs lg:text-sm">Live</span>
          </div>
          <button
            onClick={onSessionEnd}
            className="cyber-button cyber-button-purple px-3 lg:px-4 py-2 rounded-none flex items-center space-x-2"
          >
            <Square className="w-3 h-3 lg:w-4 lg:h-4 neon-text-purple" />
            <span className="hidden sm:inline text-sm lg:text-base">End Session</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Player */}
      <div className="lg:hidden bg-cyber-dark border-b border-neon-green">
        <div className="p-4">
          {/* Current Track Info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-cyber-dark border-2 border-neon-green rounded-none flex items-center justify-center neon-glow-green">
              <Play className="w-6 h-6 neon-text-green" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-cyber-white">{currentTrack.title}</h3>
              <p className="text-sm text-cyber-gray truncate">{currentTrack.artist}</p>
            </div>
            {isLoading && (
              <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-none animate-spin neon-glow-green"></div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div 
              className="w-full h-2 bg-cyber-dark border border-neon-green rounded-none cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percentage);
              }}
            >
              <div 
                className="h-2 progress-green rounded-none transition-all duration-300"
                style={{ width: `${deckAProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-cyber-dim mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={handleSkipBack}
              className="w-10 h-10 bg-cyber-dark border border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all"
            >
              <SkipBack className="w-5 h-5 neon-text-green" />
            </button>
            <button
              onClick={() => onPlayPause(!isPlaying)}
              disabled={isLoading}
              className="w-14 h-14 bg-cyber-dark border-4 border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-none animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7 neon-text-green" />
              ) : (
                <Play className="w-7 h-7 neon-text-green" />
              )}
            </button>
            <button 
              onClick={handleSkipForward}
              className="w-10 h-10 bg-cyber-dark border border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all"
            >
              <SkipForward className="w-5 h-5 neon-text-green" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Player Interface */}
      <div className={`flex-1 p-4 lg:p-6 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
          
          {/* Deck A */}
          <div className="cyber-card rounded-none p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-semibold neon-text-green">Deck A</h2>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-cyber-dark border border-neon-green rounded-none flex items-center justify-center neon-glow-green">
                  <Play className="w-4 h-4 neon-text-green" />
                </button>
                <button className="w-8 h-8 bg-cyber-dark border border-neon-green rounded-none flex items-center justify-center">
                  <Pause className="w-4 h-4 neon-text-green" />
                </button>
              </div>
            </div>

            {/* Track Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-base lg:text-lg mb-1 truncate text-cyber-white">{currentTrack.title}</h3>
              <p className="text-cyber-gray mb-2 truncate">{currentTrack.artist}</p>
              <div className="flex items-center space-x-4 text-sm text-cyber-dim">
                <span>{currentTrack.bpm} BPM</span>
                <span>{currentTrack.key}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasA}
                width={280}
                height={100}
                className="w-full h-16 lg:h-24 bg-cyber-black border border-neon-green rounded-none cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
              />
              <div className="flex justify-between text-xs text-cyber-dim mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || currentTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={handleSkipBack}
                  className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all"
                >
                  <SkipBack className="w-5 h-5 lg:w-6 lg:h-6 neon-text-green" />
                </button>
                <button
                  onClick={() => onPlayPause(!isPlaying)}
                  disabled={isLoading}
                  className="w-14 h-14 lg:w-16 lg:h-16 bg-cyber-dark border-4 border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 lg:w-8 lg:h-8 border-2 border-neon-green border-t-transparent rounded-none animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 lg:w-8 lg:h-8 neon-text-green" />
                  ) : (
                    <Play className="w-6 h-6 lg:w-8 lg:h-8 neon-text-green" />
                  )}
                </button>
                <button 
                  onClick={handleSkipForward}
                  className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border border-neon-green hover:neon-glow-green rounded-none flex items-center justify-center transition-all"
                >
                  <SkipForward className="w-5 h-5 lg:w-6 lg:h-6 neon-text-green" />
                </button>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-cyber-gray" />
                  <span className="text-sm text-cyber-gray">Volume</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckAVolume}
                  onChange={(e) => setDeckAVolume(Number(e.target.value))}
                  className="cyber-slider w-full"
                />
              </div>

              {/* Cue Points */}
              <div className="flex space-x-2">
                <button
                  onClick={() => addCuePoint('deckA', deckAProgress)}
                  className="cyber-button flex-1 py-2 px-3 rounded-none text-xs lg:text-sm"
                >
                  CUE
                </button>
                <button className="cyber-button cyber-button-purple flex-1 py-2 px-3 rounded-none text-xs lg:text-sm">
                  LOOP
                </button>
              </div>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex flex-col justify-between">
            {/* Crossfader Section */}
            <div className="cyber-card rounded-none p-4 lg:p-6 mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold mb-4 text-center neon-text-green">Crossfader</h3>
              
              <div className="relative mb-6">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={crossfaderPosition}
                  onChange={(e) => handleCrossfaderChange(Number(e.target.value))}
                  className="cyber-slider cyber-slider-purple w-full"
                />
                <div className="flex justify-between text-xs text-cyber-dim mt-2">
                  <span>A</span>
                  <span>CENTER</span>
                  <span>B</span>
                </div>
              </div>

              {/* Master Controls */}
              <div className="grid grid-cols-2 gap-2 lg:gap-4">
                <button
                  onClick={() => setBpmSync(!bpmSync)}
                  className={`cyber-button py-2 lg:py-3 px-2 lg:px-4 rounded-none text-xs lg:text-sm ${
                    bpmSync ? 'neon-glow-green' : ''
                  }`}
                >
                  BPM SYNC
                </button>
                <button
                  onClick={() => setAutoMix(!autoMix)}
                  className={`cyber-button cyber-button-purple py-2 lg:py-3 px-2 lg:px-4 rounded-none text-xs lg:text-sm ${
                    autoMix ? 'neon-glow-purple' : ''
                  }`}
                >
                  AUTO MIX
                </button>
              </div>
            </div>

            {/* Session Info */}
            <div className="cyber-card rounded-none p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold mb-4 neon-text-purple">Session Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyber-gray">Playing:</span>
                  <span className="text-cyber-white">{currentTrackIndex + 1} of {playlist.tracks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray">Remaining:</span>
                  <span className="text-cyber-white">{formatTime((playlist.tracks.length - currentTrackIndex - 1) * 180)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray">BPM:</span>
                  <span className="text-cyber-white">{currentTrack.bpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray">Key:</span>
                  <span className="text-cyber-white">{currentTrack.key}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deck B */}
          <div className="cyber-card rounded-none p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-semibold neon-text-purple">Deck B</h2>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-cyber-dark border border-neon-purple rounded-none flex items-center justify-center neon-glow-purple">
                  <Play className="w-4 h-4 neon-text-purple" />
                </button>
                <button className="w-8 h-8 bg-cyber-dark border border-neon-purple rounded-none flex items-center justify-center">
                  <Pause className="w-4 h-4 neon-text-purple" />
                </button>
              </div>
            </div>

            {/* Track Info */}
            <div className="mb-6">
              {nextTrack ? (
                <>
                  <h3 className="font-semibold text-base lg:text-lg mb-1 truncate text-cyber-white">{nextTrack.title}</h3>
                  <p className="text-cyber-gray mb-2 truncate">{nextTrack.artist}</p>
                  <div className="flex items-center space-x-4 text-sm text-cyber-dim">
                    <span>{nextTrack.bpm} BPM</span>
                    <span>{nextTrack.key}</span>
                    <span>{formatTime(nextTrack.duration)}</span>
                  </div>
                </>
              ) : (
                <p className="text-cyber-dim">No next track loaded</p>
              )}
            </div>

            {/* Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasB}
                width={280}
                height={100}
                className="w-full h-16 lg:h-24 bg-cyber-black border border-neon-purple rounded-none"
              />
              <div className="flex justify-between text-xs text-cyber-dim mt-2">
                <span>0:00</span>
                <span>{nextTrack ? formatTime(nextTrack.duration) : '--:--'}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border border-neon-purple hover:neon-glow-purple rounded-none flex items-center justify-center transition-all">
                  <SkipBack className="w-5 h-5 lg:w-6 lg:h-6 neon-text-purple" />
                </button>
                <button className="w-14 h-14 lg:w-16 lg:h-16 bg-cyber-dark border-4 border-neon-purple hover:neon-glow-purple rounded-none flex items-center justify-center transition-all transform hover:scale-105">
                  <Play className="w-6 h-6 lg:w-8 lg:h-8 neon-text-purple" />
                </button>
                <button className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border border-neon-purple hover:neon-glow-purple rounded-none flex items-center justify-center transition-all">
                  <SkipForward className="w-5 h-5 lg:w-6 lg:h-6 neon-text-purple" />
                </button>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-cyber-gray" />
                  <span className="text-sm text-cyber-gray">Volume</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckBVolume}
                  onChange={(e) => setDeckBVolume(Number(e.target.value))}
                  className="cyber-slider cyber-slider-purple w-full"
                />
              </div>

              {/* Cue Points */}
              <div className="flex space-x-2">
                <button
                  onClick={() => addCuePoint('deckB', deckBProgress)}
                  className="cyber-button cyber-button-purple flex-1 py-2 px-3 rounded-none text-xs lg:text-sm"
                >
                  CUE
                </button>
                <button className="cyber-button flex-1 py-2 px-3 rounded-none text-xs lg:text-sm">
                  LOOP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMagicPlayer;