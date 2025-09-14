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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          
          <div>
            <h1 className="text-lg lg:text-2xl font-bold">Professional Player</h1>
            <p className="text-sm lg:text-base text-gray-400 truncate max-w-48 lg:max-w-none">{playlist.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 bg-gray-800 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs lg:text-sm">Live</span>
          </div>
          <button
            onClick={onSessionEnd}
            className="px-3 lg:px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Square className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline text-sm lg:text-base">End Session</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Player */}
      <div className="lg:hidden bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="p-4">
          {/* Current Track Info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{currentTrack.title}</h3>
              <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
            </div>
            {isLoading && (
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div 
              className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percentage);
              }}
            >
              <div 
                className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${deckAProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={handleSkipBack}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={() => onPlayPause(!isPlaying)}
              disabled={isLoading}
              className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7" />
              )}
            </button>
            <button 
              onClick={handleSkipForward}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Player Interface */}
      <div className={`flex-1 p-4 lg:p-6 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
          
          {/* Deck A */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-semibold text-purple-400">Deck A</h2>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Track Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-base lg:text-lg mb-1 truncate">{currentTrack.title}</h3>
              <p className="text-gray-400 mb-2 truncate">{currentTrack.artist}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                className="w-full h-16 lg:h-24 bg-gray-900 rounded-lg cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || currentTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={handleSkipBack}
                  className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <SkipBack className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
                <button
                  onClick={() => onPlayPause(!isPlaying)}
                  disabled={isLoading}
                  className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 lg:w-8 lg:h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 lg:w-8 lg:h-8" />
                  ) : (
                    <Play className="w-6 h-6 lg:w-8 lg:h-8" />
                  )}
                </button>
                <button 
                  onClick={handleSkipForward}
                  className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <SkipForward className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Volume</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckAVolume}
                  onChange={(e) => setDeckAVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Cue Points */}
              <div className="flex space-x-2">
                <button
                  onClick={() => addCuePoint('deckA', deckAProgress)}
                  className="flex-1 py-2 px-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xs lg:text-sm transition-colors"
                >
                  CUE
                </button>
                <button className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs lg:text-sm transition-colors">
                  LOOP
                </button>
              </div>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex flex-col justify-between">
            {/* Crossfader Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-700/50 mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold mb-4 text-center">Crossfader</h3>
              
              <div className="relative mb-6">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={crossfaderPosition}
                  onChange={(e) => handleCrossfaderChange(Number(e.target.value))}
                  className="w-full h-3 lg:h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>A</span>
                  <span>CENTER</span>
                  <span>B</span>
                </div>
              </div>

              {/* Master Controls */}
              <div className="grid grid-cols-2 gap-2 lg:gap-4">
                <button
                  onClick={() => setBpmSync(!bpmSync)}
                  className={`py-2 lg:py-3 px-2 lg:px-4 rounded-lg transition-colors text-xs lg:text-sm ${
                    bpmSync ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  BPM SYNC
                </button>
                <button
                  onClick={() => setAutoMix(!autoMix)}
                  className={`py-2 lg:py-3 px-2 lg:px-4 rounded-lg transition-colors text-xs lg:text-sm ${
                    autoMix ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  AUTO MIX
                </button>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-700/50">
              <h3 className="text-base lg:text-lg font-semibold mb-4">Session Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Playing:</span>
                  <span>{currentTrackIndex + 1} of {playlist.tracks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining:</span>
                  <span>{formatTime((playlist.tracks.length - currentTrackIndex - 1) * 180)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BPM:</span>
                  <span>{currentTrack.bpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Key:</span>
                  <span>{currentTrack.key}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deck B */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-semibold text-pink-400">Deck B</h2>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Track Info */}
            <div className="mb-6">
              {nextTrack ? (
                <>
                  <h3 className="font-semibold text-base lg:text-lg mb-1 truncate">{nextTrack.title}</h3>
                  <p className="text-gray-400 mb-2 truncate">{nextTrack.artist}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{nextTrack.bpm} BPM</span>
                    <span>{nextTrack.key}</span>
                    <span>{formatTime(nextTrack.duration)}</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No next track loaded</p>
              )}
            </div>

            {/* Waveform */}
            <div className="mb-6">
              <canvas
                ref={waveformCanvasB}
                width={280}
                height={100}
                className="w-full h-16 lg:h-24 bg-gray-900 rounded-lg"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0:00</span>
                <span>{nextTrack ? formatTime(nextTrack.duration) : '--:--'}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <SkipBack className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
                <button className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-full flex items-center justify-center transition-all transform hover:scale-105">
                  <Play className="w-6 h-6 lg:w-8 lg:h-8" />
                </button>
                <button className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <SkipForward className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Volume</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deckBVolume}
                  onChange={(e) => setDeckBVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Cue Points */}
              <div className="flex space-x-2">
                <button
                  onClick={() => addCuePoint('deckB', deckBProgress)}
                  className="flex-1 py-2 px-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xs lg:text-sm transition-colors"
                >
                  CUE
                </button>
                <button className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs lg:text-sm transition-colors">
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