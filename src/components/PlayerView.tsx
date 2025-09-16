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
    if (!audio || !currentTrack) return;

    // Update audio source when track changes
    // Ensure we always have a playable source
    audio.preload = 'metadata';
    if (currentTrack.preview_url && currentTrack.preview_url.trim() !== '') {
      audio.src = currentTrack.preview_url;
    } else {
      // Use a simple silent audio data URL as fallback
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t';
    }
    audio.load();
    setCurrentTime(0);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const onError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      console.error('Audio element error', {
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState,
        error: target.error?.message
      });
      // Fallback duration if metadata fails
      setDuration(currentTrack.duration ?? 180);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', handleNext);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', handleNext);
    };
  }, [currentTrackIndex, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (!audio.src) {
        console.warn('No audio source set; skipping play.');
        return;
      }
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

  const handleSavePlaylist = () => {
    // Note: Playlist is already saved via Supabase in parent component
    // Just show confirmation to user
    alert(`Playlist "${playlist.name}" is already saved to your library!`);
  };

  const handleSharePlaylist = () => {
    const shareData = {
      title: `${playlist.name} - MagicDJ Playlist`,
      text: `Check out this amazing ${playlist.tracks.length}-track playlist I created with MagicDJ AI!`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Playlist link copied to clipboard!');
      });
    }
  };

  return (
    <div className="min-h-screen gradient-bg-primary">
      {/* Enhanced Header */}
      <div className="px-6 py-4 bg-glass border-b border-glass backdrop-blur-md nav-sticky">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="glass-button hover-lift w-12 h-12 flex items-center justify-center transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 text-fuchsia-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-fuchsia-400 font-orbitron tracking-wider">{playlist.name}</h1>
              <p className="text-slate-400 font-orbitron">{playlist.tracks.length} TRACKS</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Enhanced Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 p-4 glass-card shadow-neon-pink">
          <div className="flex items-center space-x-6">
            <button
              onClick={onBack}
              className="btn-secondary px-4 py-2 flex items-center space-x-2 font-bold tracking-wider"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>BACK TO STUDIO</span>
            </button>
            <div className="text-slate-400 font-orbitron">
              <span className="text-cyan-400">STUDIO</span> → <span className="text-fuchsia-400">NOW PLAYING</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSavePlaylist}
              className="btn-primary px-4 py-2 font-bold tracking-wider"
            >
              SAVE PLAYLIST
            </button>
            <button
              onClick={handleSharePlaylist}
              className="btn-secondary px-4 py-2 font-bold tracking-wider"
            >
              SHARE
            </button>
          </div>
        </div>

        {/* Enhanced Current Track Display */}
        <div className="text-center mb-12">
          <div className="w-80 h-80 glass-card mx-auto mb-8 flex items-center justify-center shadow-neon-pink animate-pulse-glow">
            <div className="w-64 h-64 bg-glass border border-glass rounded-lg flex items-center justify-center shadow-neon-cyan">
              <div className="text-8xl">🎵</div>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-fuchsia-400 mb-3 font-orbitron tracking-wider">{currentTrack.title}</h2>
          <p className="text-2xl text-cyan-400 mb-6 font-orbitron">{currentTrack.artist}</p>
          <div className="flex items-center justify-center space-x-8 text-lg font-orbitron font-bold">
            <span className="text-fuchsia-400">{currentTrack.bpm} BPM</span>
            <span className="text-slate-400">•</span>
            <span className="text-cyan-400">ENERGY: {Math.round((currentTrack.energy || 0.5) * 100)}%</span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mb-12 p-4 glass-card shadow-neon-pink">
          <div className="flex items-center justify-between mb-4 text-lg font-orbitron font-bold">
            <span className="text-fuchsia-400">{formatTime(currentTime)}</span>
            <span className="text-slate-400">PLAYING</span>
            <span className="text-fuchsia-400">{formatTime(duration || currentTrack.duration || 0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || currentTrack.duration || 300}
            value={currentTime}
            onChange={handleSeek}
            className="slider-futuristic w-full"
          />
        </div>

        {/* Enhanced Player Controls */}
        <div className="flex items-center justify-center space-x-8 mb-12">
          <button className="w-16 h-16 glass-button hover-lift flex items-center justify-center transition-all hover:scale-110" aria-label="Shuffle">
            <Shuffle className="w-8 h-8 text-fuchsia-400" />
          </button>

          <button
            onClick={handlePrevious}
            className="w-20 h-20 glass-button hover-lift flex items-center justify-center transition-all hover:scale-110 shadow-neon-cyan"
          >
            <SkipBack className="w-10 h-10 text-cyan-400" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-28 h-28 glass-button hover-lift flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-neon-pink animate-pulse-glow"
          >
            {isPlaying ?
              <Pause className="w-14 h-14 text-fuchsia-400" /> :
              <Play className="w-14 h-14 text-fuchsia-400 ml-1" />
            }
          </button>

          <button
            onClick={handleNext}
            className="w-20 h-20 glass-button hover-lift flex items-center justify-center transition-all hover:scale-110 shadow-neon-cyan"
          >
            <SkipForward className="w-10 h-10 text-cyan-400" />
          </button>

          <button className="w-16 h-16 glass-button hover-lift flex items-center justify-center transition-all hover:scale-110" aria-label="Repeat">
            <Repeat className="w-8 h-8 text-fuchsia-400" />
          </button>
        </div>

        {/* Enhanced Volume Control */}
        <div className="flex items-center justify-center space-x-6 mb-12 p-4 glass-card shadow-neon-cyan">
          <Volume2 className="w-6 h-6 text-cyan-400" />
          <span className="text-lg font-orbitron font-bold text-cyan-400">VOLUME</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="slider-futuristic w-48"
          />
          <span className="text-lg font-orbitron font-bold text-cyan-400 w-12">{Math.round(volume * 100)}%</span>
        </div>

        {/* Enhanced Playlist */}
        <div className="glass-card p-6 shadow-neon-pink">
          <h3 className="text-2xl font-bold text-fuchsia-400 mb-6 flex items-center space-x-3 font-orbitron tracking-wider">
            <span>PLAYLIST</span>
            <Heart className="w-6 h-6 text-cyan-400" />
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {playlist.tracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => setCurrentTrackIndex(index)}
                className={`group flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer ${
                  index === currentTrackIndex
                    ? 'bg-glass border-fuchsia-400 shadow-neon-pink animate-pulse-glow'
                    : 'bg-glass border-glass hover:border-cyan-400 hover:shadow-neon-cyan'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                  index === currentTrackIndex ? 'border-fuchsia-400 bg-glass' : 'border-glass bg-glass'
                }`}>
                  {index === currentTrackIndex && isPlaying ? (
                    <Pause className="w-5 h-5 text-fuchsia-400" />
                  ) : (
                    <Play className="w-5 h-5 text-fuchsia-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-fuchsia-400 truncate font-orbitron text-lg group-hover:text-cyan-400 transition-colors">{track.title}</h4>
                  <p className="text-base text-cyan-400 truncate font-orbitron">{track.artist}</p>
                </div>

                <div className="text-base text-fuchsia-400 font-orbitron font-bold">
                  {formatTime(track.duration || 300)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
};

export default PlayerView;
