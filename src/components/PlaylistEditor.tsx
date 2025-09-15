import { useState, useRef } from 'react';
import { 
  List, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Trash2, 
  Plus, 
  Search, 
  Clock, 
  Music, 
  Shuffle, 
  RotateCcw,
  Volume2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { Track, Playlist } from '../types';

interface PlaylistEditorProps {
  playlist: Playlist;
  currentTrackIndex: number;
  isPlaying: boolean;
  onTrackSelect: (index: number) => void;
  onTrackRemove: (index: number) => void;
  onTrackReorder: (fromIndex: number, toIndex: number) => void;
  onPlaylistUpdate: (playlist: Playlist) => void;
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
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [playlistName, setPlaylistName] = useState(playlist.name);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const filteredTracks = playlist.tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.album?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = playlist.tracks.reduce((sum, track) => sum + track.duration ?? 0, 0);
  const remainingDuration = playlist.tracks.slice(currentTrackIndex + 1).reduce((sum, track) => sum + track.duration ?? 0, 0);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        <Pause className="w-4 h-4 neon-text-green animate-neon-pulse" />
      ) : (
        <Play className="w-4 h-4 neon-text-green" />
      );
    }
    return <Music className="w-4 h-4 text-cyber-dim" />;
  };

  const getTrackRowClass = (index: number) => {
    let baseClass = "group flex items-center space-x-3 p-3 rounded-none border transition-all duration-200 cursor-pointer";
    
    if (index === currentTrackIndex) {
      baseClass += " bg-cyber-medium border-neon-green neon-glow-green";
    } else if (index < currentTrackIndex) {
      baseClass += " bg-cyber-dark/50 border-cyber-light opacity-60";
    } else {
      baseClass += " bg-cyber-dark border-cyber-light hover:bg-cyber-medium hover:border-neon-purple";
    }
    
    if (dragOverIndex === index) {
      baseClass += " border-neon-purple neon-glow-purple";
    }
    
    return baseClass;
  };

  return (
    <div className={`cyber-card rounded-none p-4 lg:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-cyber-dark border-2 border-neon-purple rounded-none flex items-center justify-center neon-glow-purple">
            <List className="w-6 h-6 neon-text-purple" />
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="bg-cyber-dark border border-neon-purple rounded-none px-2 py-1 text-sm focus:outline-none focus:border-neon-green"
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePlaylistName()}
                  autoFocus
                />
                <button
                  onClick={handleSavePlaylistName}
                  className="w-6 h-6 bg-cyber-dark border border-neon-green rounded-none flex items-center justify-center hover:neon-glow-green"
                >
                  <Save className="w-3 h-3 neon-text-green" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setPlaylistName(playlist.name);
                  }}
                  className="w-6 h-6 bg-cyber-dark border border-red-500 rounded-none flex items-center justify-center hover:bg-red-900/20"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-cyber-white">{playlist.name}</h3>
                <button
                  onClick={() => setEditingName(true)}
                  className="w-6 h-6 bg-cyber-dark border border-neon-purple rounded-none flex items-center justify-center hover:neon-glow-purple opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="w-3 h-3 neon-text-purple" />
                </button>
              </div>
            )}
            <p className="text-sm text-cyber-gray">
              {playlist.tracks.length} tracks • {formatTime(totalDuration)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={shufflePlaylist}
            className="cyber-button cyber-button-purple px-3 py-2 rounded-none flex items-center space-x-2 text-sm"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-cyber-dark border border-neon-green rounded-none">
          <div className="text-lg font-bold neon-text-green">{playlist.tracks.length}</div>
          <div className="text-xs text-cyber-gray">Tracks</div>
        </div>
        <div className="text-center p-3 bg-cyber-dark border border-neon-purple rounded-none">
          <div className="text-lg font-bold neon-text-purple">{formatTime(totalDuration)}</div>
          <div className="text-xs text-cyber-gray">Total</div>
        </div>
        <div className="text-center p-3 bg-cyber-dark border border-neon-green rounded-none">
          <div className="text-lg font-bold neon-text-green">{formatTime(remainingDuration)}</div>
          <div className="text-xs text-cyber-gray">Remaining</div>
        </div>
        <div className="text-center p-3 bg-cyber-dark border border-neon-purple rounded-none">
          <div className="text-lg font-bold neon-text-purple">{currentTrackIndex + 1}</div>
          <div className="text-xs text-cyber-gray">Current</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-dim" />
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-cyber-dark border border-cyber-light rounded-none focus:outline-none focus:border-neon-green text-cyber-white placeholder-cyber-dim"
        />
      </div>

      {/* Track List */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-8 text-cyber-dim">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks found</p>
          </div>
        ) : (
          filteredTracks.map((track, filteredIndex) => {
            const originalIndex = playlist.tracks.findIndex(t => t.id === track.id);
            return (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragEnter={(e) => handleDragEnter(e, originalIndex)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, originalIndex)}
                className={getTrackRowClass(originalIndex)}
                onClick={() => onTrackSelect(originalIndex)}
              >
                {/* Track Number & Status */}
                <div className="w-8 flex items-center justify-center">
                  {getTrackStatusIcon(originalIndex)}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate text-cyber-white group-hover:neon-text-green transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-sm text-cyber-gray truncate">{track.artist}</p>
                      {track.album && (
                        <p className="text-xs text-cyber-dim truncate">{track.album}</p>
                      )}
                    </div>
                    
                    {/* Track Details */}
                    <div className="hidden lg:flex items-center space-x-4 text-xs text-cyber-dim">
                      {track.bpm && <span>{track.bpm} BPM</span>}
                      {track.key && <span>{track.key}</span>}
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(track.duration ?? 0)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackRemove(originalIndex);
                    }}
                    className="w-8 h-8 bg-cyber-dark border border-red-500 rounded-none flex items-center justify-center hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-cyber-light">
        <div className="flex items-center space-x-2 text-sm text-cyber-gray">
          <Volume2 className="w-4 h-4" />
          <span>Drag to reorder • Click to play</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="cyber-button px-3 py-2 rounded-none flex items-center space-x-2 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Tracks</span>
          </button>
          <button className="cyber-button cyber-button-purple px-3 py-2 rounded-none flex items-center space-x-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;