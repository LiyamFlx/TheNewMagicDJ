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
      // Use local demo audio files to avoid CORS issues
      const demoAudioSources = [
        '/audio/demo-1.mp3',
        '/audio/demo-2.mp3',
        '/audio/demo-3.mp3',
        '/audio/demo-4.mp3'
      ];
      const audioIndex = Math.abs(currentTrack.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % demoAudioSources.length;
      audio.src = demoAudioSources[audioIndex];
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
    // Save playlist to localStorage for now
    const savedPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
    const playlistToSave = {
      ...playlist,
      savedAt: new Date().toISOString()
    };

    savedPlaylists.push(playlistToSave);
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));

    // Show success message
    alert(`Playlist "${playlist.name}" saved successfully!`);
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
    <div className="min-h-screen bg-cyber-black">
      {/* Enhanced Header */}
      <div className="px-6 py-4 bg-cyber-dark border-b-2 border-neon-green backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-cyber-medium border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 neon-text-green" />
            </button>
            <div>
              <h1 className="text-2xl font-bold neon-text-green font-mono tracking-wider">{playlist.name}</h1>
              <p className="text-cyber-gray font-mono">{playlist.tracks.length} TRACKS</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Enhanced Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 p-4 bg-cyber-dark border-2 border-neon-green rounded-sm neon-glow-green">
          <div className="flex items-center space-x-6">
            <button
              onClick={onBack}
              className="cyber-button px-4 py-2 rounded-sm flex items-center space-x-2 font-bold tracking-wider"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>BACK TO STUDIO</span>
            </button>
            <div className="text-cyber-gray font-mono">
              <span className="text-neon-purple">STUDIO</span> → <span className="neon-text-green">NOW PLAYING</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSavePlaylist}
              className="cyber-button cyber-button-purple px-4 py-2 rounded-sm font-bold tracking-wider"
            >
              SAVE PLAYLIST
            </button>
            <button
              onClick={handleSharePlaylist}
              className="cyber-button px-4 py-2 rounded-sm font-bold tracking-wider"
            >
              SHARE
            </button>
          </div>
        </div>

        {/* Enhanced Current Track Display */}
        <div className="text-center mb-12">
          <div className="w-80 h-80 bg-cyber-dark border-4 border-neon-green rounded-sm mx-auto mb-8 flex items-center justify-center neon-glow-green animate-pulse-light">
            <div className="w-64 h-64 bg-cyber-darker border-2 border-neon-purple rounded-sm flex items-center justify-center neon-glow-purple">
              <div className="text-8xl">🎵</div>
            </div>
          </div>

          <h2 className="text-4xl font-bold neon-text-green mb-3 font-mono tracking-wider">{currentTrack.title}</h2>
          <p className="text-2xl neon-text-purple mb-6 font-mono">{currentTrack.artist}</p>
          <div className="flex items-center justify-center space-x-8 text-lg font-mono font-bold">
            <span className="text-neon-green">{currentTrack.bpm} BPM</span>
            <span className="text-cyber-gray">•</span>
            <span className="text-neon-purple">ENERGY: {Math.round((currentTrack.energy || 0.5) * 100)}%</span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mb-12 p-4 bg-cyber-dark border-2 border-neon-green rounded-sm neon-glow-green">
          <div className="flex items-center justify-between mb-4 text-lg font-mono font-bold">
            <span className="neon-text-green">{formatTime(currentTime)}</span>
            <span className="text-cyber-gray">PLAYING</span>
            <span className="neon-text-green">{formatTime(duration || currentTrack.duration || 0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || currentTrack.duration || 300}
            value={currentTime}
            onChange={handleSeek}
            className="cyber-slider w-full"
          />
        </div>

        {/* Enhanced Player Controls */}
        <div className="flex items-center justify-center space-x-8 mb-12">
          <button className="w-16 h-16 bg-cyber-dark border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all hover:scale-110" aria-label="Shuffle">
            <Shuffle className="w-8 h-8 neon-text-green" />
          </button>

          <button
            onClick={handlePrevious}
            className="w-20 h-20 bg-cyber-dark border-2 border-neon-purple hover:neon-glow-purple rounded-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <SkipBack className="w-10 h-10 neon-text-purple" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-28 h-28 bg-cyber-dark border-4 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all duration-300 transform hover:scale-110 animate-deck-glow"
          >
            {isPlaying ?
              <Pause className="w-14 h-14 neon-text-green" /> :
              <Play className="w-14 h-14 neon-text-green ml-1" />
            }
          </button>

          <button
            onClick={handleNext}
            className="w-20 h-20 bg-cyber-dark border-2 border-neon-purple hover:neon-glow-purple rounded-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <SkipForward className="w-10 h-10 neon-text-purple" />
          </button>

          <button className="w-16 h-16 bg-cyber-dark border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all hover:scale-110" aria-label="Repeat">
            <Repeat className="w-8 h-8 neon-text-green" />
          </button>
        </div>

        {/* Enhanced Volume Control */}
        <div className="flex items-center justify-center space-x-6 mb-12 p-4 bg-cyber-dark border-2 border-neon-purple rounded-sm neon-glow-purple">
          <Volume2 className="w-6 h-6 neon-text-purple" />
          <span className="text-lg font-mono font-bold neon-text-purple">VOLUME</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="cyber-slider cyber-slider-purple w-48"
          />
          <span className="text-lg font-mono font-bold neon-text-purple w-12">{Math.round(volume * 100)}%</span>
        </div>

        {/* Enhanced Playlist */}
        <div className="bg-cyber-dark border-2 border-neon-green rounded-sm p-6 neon-glow-green">
          <h3 className="text-2xl font-bold neon-text-green mb-6 flex items-center space-x-3 font-mono tracking-wider">
            <span>PLAYLIST</span>
            <Heart className="w-6 h-6 text-neon-purple" />
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {playlist.tracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => setCurrentTrackIndex(index)}
                className={`group flex items-center space-x-4 p-4 rounded-sm border-2 transition-all cursor-pointer ${
                  index === currentTrackIndex
                    ? 'bg-cyber-medium border-neon-green neon-glow-green animate-pulse-light'
                    : 'bg-cyber-darker border-cyber-light hover:bg-cyber-medium hover:border-neon-purple hover:neon-glow-purple'
                }`}
              >
                <div className={`w-10 h-10 rounded-sm border-2 flex items-center justify-center ${
                  index === currentTrackIndex ? 'border-neon-green bg-cyber-dark' : 'border-cyber-light bg-cyber-darker'
                }`}>
                  {index === currentTrackIndex && isPlaying ? (
                    <Pause className="w-5 h-5 neon-text-green" />
                  ) : (
                    <Play className="w-5 h-5 neon-text-green" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold neon-text-green truncate font-mono text-lg group-hover:neon-text-purple transition-colors">{track.title}</h4>
                  <p className="text-base text-neon-purple truncate font-mono">{track.artist}</p>
                </div>

                <div className="text-base neon-text-green font-mono font-bold">
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
