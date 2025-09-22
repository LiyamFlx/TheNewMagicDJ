import { useState, useRef } from 'react';
import {
  Trash2,
  Plus,
  Search,
  Clock,
  Music,
  Shuffle,
  RotateCcw,
  Volume2,
  Pause,
  Play,
  List,
  Save,
  X,
  Edit3,
} from 'lucide-react';
import { Playlist } from '../types';
import { formatTimeClock } from '../utils/format';

interface PlaylistEditorProps {
  playlist: Playlist;
  currentTrackIndex: number;
  isPlaying: boolean;
  onTrackSelect: (index: number) => void;
  onTrackRemove: (index: number) => void;
  onTrackReorder: (fromIndex: number, toIndex: number) => void;
  onPlaylistUpdate: (playlist: Playlist) => void;
  onSendToPlayer?: () => void;
  onSavePlaylist?: () => void;
  className?: string;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({
  playlist,
  currentTrackIndex,
  isPlaying,
  onTrackSelect,
  onTrackRemove,
  onTrackReorder,
  onPlaylistUpdate,
  onSendToPlayer,
  onSavePlaylist,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [playlistName, setPlaylistName] = useState(playlist.name);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const filteredTracks = playlist.tracks.filter(
    track =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.album?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const totalDuration = playlist.tracks.reduce(
    (sum, track) => sum + (track.duration ?? 0),
    0
  );
  const remainingDuration = playlist.tracks
    .slice(currentTrackIndex + 1)
    .reduce((sum, track) => sum + (track.duration ?? 0), 0);

  const formatTime = (seconds: number) => formatTimeClock(seconds);

  const handleSavePlaylistName = () => {
    const updatedPlaylist = { ...playlist, name: playlistName };
    onPlaylistUpdate(updatedPlaylist);
    setEditingName(false);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    dragCounter.current = 0;

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onTrackReorder(draggedIndex, dropIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const shufflePlaylist = () => {
    const currentTrack = playlist.tracks[currentTrackIndex];
    const remainingTracks = playlist.tracks.slice(currentTrackIndex + 1);
    const playedTracks = playlist.tracks.slice(0, currentTrackIndex);

    // Shuffle remaining tracks
    const shuffled = [...remainingTracks].sort(() => Math.random() - 0.5);

    const newTracks = [...playedTracks, currentTrack, ...shuffled];
    const updatedPlaylist = { ...playlist, tracks: newTracks };
    onPlaylistUpdate(updatedPlaylist);
  };

  const getTrackStatusIcon = (index: number) => {
    if (index === currentTrackIndex) {
      return isPlaying ? (
        <Pause className="w-4 h-4 text-gradient-accent" />
      ) : (
        <Play className="w-4 h-4 text-gradient-accent" />
      );
    }
    return <Music className="w-4 h-4 text-gray-500" />;
  };

  const getTrackRowClass = (index: number) => {
    let baseClass =
      'group flex items-center space-x-4 p-4 rounded-sm border-2 transition-all duration-300 cursor-pointer';

    if (index === currentTrackIndex) {
      baseClass += ' btn-primary shadow-neon-cyan';
    } else if (index < currentTrackIndex) {
      baseClass += ' glass-card opacity-60';
    } else {
      baseClass += ' glass-card hover-lift';
    }

    if (dragOverIndex === index) {
      baseClass += ' border-gradient-primary shadow-neon-pink scale-105';
    }

    return baseClass;
  };

  return (
    <div className={`glass-card p-4 lg:p-6 shadow-neon-cyan ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-glass">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 gradient-bg-accent rounded-xl flex items-center justify-center shadow-neon-cyan animate-pulse-glow">
            <List className="w-7 h-7 text-white" />
          </div>
          <div>
            {editingName ? (
              <div className="flex-start space-sm">
                <input
                  type="text"
                  value={playlistName}
                  onChange={e => setPlaylistName(e.target.value)}
                  className="input-neon text-gradient-accent font-inter"
                  onKeyPress={e =>
                    e.key === 'Enter' && handleSavePlaylistName()
                  }
                  autoFocus
                  aria-label="Edit playlist name"
                  placeholder="Enter playlist name"
                />
                <button
                  onClick={handleSavePlaylistName}
                  className="btn-icon-square btn-accent ease-bounce"
                  title="Save changes"
                >
                  <Save className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setPlaylistName(playlist.name);
                  }}
                  className="btn-icon-square btn-danger ease-bounce"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex-start space-sm group">
                <h3 className="text-xl font-bold text-gradient-accent tracking-wider font-orbitron">
                  {playlist.name}
                </h3>
                <button
                  onClick={() => setEditingName(true)}
                  className="btn-icon-square btn-ghost opacity-0 group-hover:opacity-100 ease-elastic"
                  title="Edit playlist name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-base text-gradient-accent font-inter mt-2">
              {playlist.tracks.length} TRACKS • {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        <div className="flex-end space-md">
          {onSavePlaylist && (
            <button
              onClick={onSavePlaylist}
              className="btn-success btn-lg flex-center space-sm ease-bounce shadow-neon-cyan"
            >
              <Save className="w-5 h-5" />
              <span className="hidden sm:inline">SAVE PLAYLIST</span>
            </button>
          )}
          {onSendToPlayer && (
            <button
              onClick={onSendToPlayer}
              className="btn-accent btn-lg flex-center space-sm ease-bounce shadow-neon-medium"
            >
              <Music className="w-5 h-5" />
              <span className="hidden sm:inline">SEND TO PLAYER</span>
            </button>
          )}
          <button
            onClick={shufflePlaylist}
            className="btn-primary btn-lg flex-center space-sm ease-elastic shadow-neon-hard"
          >
            <Shuffle className="w-5 h-5" />
            <span className="hidden sm:inline">SHUFFLE</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid-4 mb-8">
        <div className="text-center p-4 glass-card shadow-neon-cyan hover-lift">
          <div className="text-2xl font-bold text-gradient-accent font-orbitron">
            {playlist.tracks.length}
          </div>
          <div className="text-sm text-gray-400 font-inter tracking-wider">
            TRACKS
          </div>
        </div>
        <div className="text-center p-4 glass-card shadow-neon-pink hover-lift">
          <div className="text-2xl font-bold text-gradient-primary font-orbitron">
            {formatTime(totalDuration)}
          </div>
          <div className="text-sm text-gray-400 font-inter tracking-wider">
            TOTAL
          </div>
        </div>
        <div className="text-center p-4 glass-card shadow-neon-cyan hover-lift">
          <div className="text-2xl font-bold text-gradient-accent font-orbitron">
            {formatTime(remainingDuration)}
          </div>
          <div className="text-sm text-gray-400 font-inter tracking-wider">
            REMAINING
          </div>
        </div>
        <div className="text-center p-4 glass-card shadow-neon-pink hover-lift">
          <div className="text-2xl font-bold text-gradient-primary font-orbitron">
            {currentTrackIndex + 1}
          </div>
          <div className="text-sm text-gray-400 font-inter tracking-wider">
            CURRENT
          </div>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="input-with-icon mb-6">
        <input
          type="text"
          placeholder="SEARCH TRACKS..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-neon text-gradient-accent font-inter text-base tracking-wider"
        />
        <Search className="input-icon w-5 h-5" />
      </div>

      {/* Track List */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 glass-card flex items-center justify-center mx-auto mb-6 shadow-neon-cyan">
              <Music className="w-8 h-8 text-gradient-accent opacity-50" />
            </div>
            <p className="text-xl font-mono tracking-wider">NO TRACKS FOUND</p>
          </div>
        ) : (
          filteredTracks.map(track => {
            const originalIndex = playlist.tracks.findIndex(
              t => t.id === track.id
            );
            return (
              <div
                key={track.id}
                draggable
                onDragStart={e => handleDragStart(e, originalIndex)}
                onDragEnter={e => handleDragEnter(e, originalIndex)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, originalIndex)}
                className={getTrackRowClass(originalIndex)}
                onClick={() => onTrackSelect(originalIndex)}
              >
                {/* Track Number & Status */}
                <div className="w-10 h-10 flex items-center justify-center glass-card border border-gradient-accent">
                  {getTrackStatusIcon(originalIndex)}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate text-white group-hover:text-gradient-accent transition-colors text-lg font-inter">
                        {track.title}
                      </h4>
                      <p className="text-base text-gradient-accent truncate font-inter">
                        {track.artist}
                      </p>
                      {track.album && (
                        <p className="text-sm text-gray-500 truncate font-inter">
                          {track.album}
                        </p>
                      )}
                    </div>

                    {/* Track Details */}
                    <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-500 font-inter">
                      {track.bpm && (
                        <span className="text-gradient-primary font-bold">
                          {track.bpm} BPM
                        </span>
                      )}
                      {track.key && (
                        <span className="text-gradient-accent font-bold">
                          {track.key}
                        </span>
                      )}
                      <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold">
                          {formatTime(track.duration ?? 0)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-center space-sm opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onTrackRemove(originalIndex);
                    }}
                    className="btn-icon-square btn-danger ease-bounce"
                    title="Remove track"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Enhanced Footer Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-glass">
        <div className="flex items-center space-x-3 text-base text-gradient-accent font-inter">
          <Volume2 className="w-5 h-5" />
          <span>DRAG TO REORDER • CLICK TO PLAY</span>
        </div>

        <div className="flex-end space-md">
          <button className="btn-secondary btn-lg flex-center space-sm ease-elastic">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">ADD TRACKS</span>
          </button>
          <button className="btn-warning btn-lg flex-center space-sm ease-bounce">
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;
