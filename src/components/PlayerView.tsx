import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Heart } from 'lucide-react';
import { Playlist } from '../types';

interface PlayerViewProps {
  playlist: Playlist;
  onBack: () => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({ playlist, onBack }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = playlist.tracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleNext);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleNext);
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => 
      prev < playlist.tracks.length - 1 ? prev + 1 : 0
    );
    setCurrentTime(0);
  };

  const handlePrevious = () => {
    setCurrentTrackIndex((prev) => 
      prev > 0 ? prev - 1 : playlist.tracks.length - 1
    );
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="px-6 py-4 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{playlist.name}</h1>
              <p className="text-gray-400">{playlist.tracks.length} tracks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Current Track Display */}
        <div className="text-center mb-12">
          <div className="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-2xl">
            <div className="w-48 h-48 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
              <div className="text-6xl">🎵</div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">{currentTrack.title}</h2>
          <p className="text-xl text-gray-300 mb-4">{currentTrack.artist}</p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
            <span>{currentTrack.bpm} BPM</span>
            <span>•</span>
            <span>Energy: {Math.round((currentTrack.energy || 0.5) * 100)}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || currentTrack.duration || 0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || currentTrack.duration || 300}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-center space-x-6 mb-8">
          <button className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <Shuffle className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={handlePrevious}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <SkipBack className="w-7 h-7 text-white" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {isPlaying ? 
              <Pause className="w-10 h-10 text-white" /> : 
              <Play className="w-10 h-10 text-white ml-1" />
            }
          </button>
          
          <button
            onClick={handleNext}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <SkipForward className="w-7 h-7 text-white" />
          </button>
          
          <button className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <Repeat className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center space-x-4 mb-12">
          <Volume2 className="w-5 h-5 text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-32 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Playlist */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>Playlist</span>
            <Heart className="w-5 h-5 text-pink-400" />
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {playlist.tracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => setCurrentTrackIndex(index)}
                className={`flex items-center space-x-4 p-3 rounded-xl transition-all cursor-pointer ${
                  index === currentTrackIndex 
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === currentTrackIndex ? 'bg-purple-500' : 'bg-white/10'
                }`}>
                  {index === currentTrackIndex && isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{track.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                </div>
                
                <div className="text-sm text-gray-400">
                  {formatTime(track.duration || 300)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={currentTrack.preview_url} preload="metadata" />
    </div>
  );
};

export default PlayerView;