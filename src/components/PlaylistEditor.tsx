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
  Edit3
} from 'lucide-react';
import { Playlist } from '../types';

interface PlaylistEditorProps {
  playlist: Playlist;
  currentTrackIndex: number;
  isPlaying: boolean;
  onTrackSelect: (index: number) => void;
  onTrackRemove: (index: number) => void;
  onTrackReorder: (fromIndex: number, toIndex: number) => void;
  onPlaylistUpdate: (playlist: Playlist) => void;
  onSendToPlayer?: () => void;
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
    (track.album?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const totalDuration = playlist.tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);
  const remainingDuration = playlist.tracks
    .slice(currentTrackIndex + 1)
    .reduce((sum, track) => sum + (track.duration ?? 0), 0);

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
    let baseClass = "group flex items-center space-x-4 p-4 rounded-sm border-2 transition-all duration-300 cursor-pointer";

    if (index === currentTrackIndex) {
      baseClass += " bg-cyber-medium border-neon-green neon-glow-green animate-pulse-light";
    } else if (index < currentTrackIndex) {
      baseClass += " bg-cyber-darker/50 border-cyber-light opacity-60";
    } else {
      baseClass += " bg-cyber-dark border-cyber-light hover:bg-cyber-medium hover:border-neon-purple hover:neon-glow-purple";
    }

    if (dragOverIndex === index) {
      baseClass += " border-neon-purple neon-glow-purple scale-105";
    }

    return baseClass;
  };

  return (
    <div className={`bg-cyber-black border-2 border-neon-green rounded-sm p-4 lg:p-6 neon-glow-green ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neon-green">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center neon-glow-green animate-pulse-light">
            <List className="w-7 h-7 neon-text-green" />
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="bg-cyber-darker border-2 border-neon-green rounded-sm px-3 py-2 text-base focus:outline-none focus:border-neon-purple neon-text-green font-mono"
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePlaylistName()}
                  autoFocus
                />
                <button
                  onClick={handleSavePlaylistName}
                  className="w-8 h-8 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center hover:neon-glow-green transition-all"
                >
                  <Save className="w-4 h-4 neon-text-green" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setPlaylistName(playlist.name);
                  }}
                  className="w-8 h-8 bg-cyber-dark border-2 border-red-500 rounded-sm flex items-center justify-center hover:bg-red-900/20 transition-all"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <h3 className="text-xl font-bold neon-text-green tracking-wider font-mono">{playlist.name}</h3>
                <button
                  onClick={() => setEditingName(true)}
                  className="w-8 h-8 bg-cyber-dark border-2 border-neon-purple rounded-sm flex items-center justify-center hover:neon-glow-purple opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit3 className="w-4 h-4 neon-text-purple" />
                </button>
              </div>
            )}
            <p className="text-base text-neon-green font-mono mt-2">
              {playlist.tracks.length} TRACKS • {formatTime(totalDuration)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onSendToPlayer && (
            <button
              onClick={onSendToPlayer}
              className="cyber-button px-4 py-3 rounded-sm flex items-center space-x-2 text-base font-bold tracking-wider"
            >
              <Music className="w-5 h-5" />
              <span className="hidden sm:inline">SEND TO PLAYER</span>
            </button>
          )}
          <button
            onClick={shufflePlaylist}
            className="cyber-button cyber-button-purple px-4 py-3 rounded-sm flex items-center space-x-2 text-base font-bold tracking-wider"
          >
            <Shuffle className="w-5 h-5" />
            <span className="hidden sm:inline">SHUFFLE</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-cyber-dark border-2 border-neon-green rounded-sm neon-glow-green animate-fade-in">
          <div className="text-2xl font-bold neon-text-green font-mono">{playlist.tracks.length}</div>
          <div className="text-sm text-cyber-gray font-mono tracking-wider">TRACKS</div>
        </div>
        <div className="text-center p-4 bg-cyber-dark border-2 border-neon-purple rounded-sm neon-glow-purple animate-fade-in">
          <div className="text-2xl font-bold neon-text-purple font-mono">{formatTime(totalDuration)}</div>
          <div className="text-sm text-cyber-gray font-mono tracking-wider">TOTAL</div>
        </div>
        <div className="text-center p-4 bg-cyber-dark border-2 border-neon-green rounded-sm neon-glow-green animate-fade-in">
          <div className="text-2xl font-bold neon-text-green font-mono">{formatTime(remainingDuration)}</div>
          <div className="text-sm text-cyber-gray font-mono tracking-wider">REMAINING</div>
        </div>
        <div className="text-center p-4 bg-cyber-dark border-2 border-neon-purple rounded-sm neon-glow-purple animate-fade-in">
          <div className="text-2xl font-bold neon-text-purple font-mono">{currentTrackIndex + 1}</div>
          <div className="text-sm text-cyber-gray font-mono tracking-wider">CURRENT</div>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 neon-text-green" />
        <input
          type="text"
          placeholder="SEARCH TRACKS..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-cyber-darker border-2 border-neon-green rounded-sm focus:outline-none focus:border-neon-purple neon-text-green placeholder-cyber-dim font-mono text-base tracking-wider"
        />
      </div>

      {/* Track List */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-12 text-cyber-dim">
            <div className="w-16 h-16 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center mx-auto mb-6 neon-glow-green">
              <Music className="w-8 h-8 neon-text-green opacity-50" />
            </div>
            <p className="text-xl font-mono tracking-wider">NO TRACKS FOUND</p>
          </div>
        ) : (
          filteredTracks.map((track) => {
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
                <div className="w-10 h-10 flex items-center justify-center bg-cyber-darker border border-neon-green rounded-sm">
                  {getTrackStatusIcon(originalIndex)}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate text-cyber-white group-hover:neon-text-green transition-colors text-lg font-mono">
                        {track.title}
                      </h4>
                      <p className="text-base neon-text-green truncate font-mono">{track.artist}</p>
                      {track.album && (
                        <p className="text-sm text-cyber-dim truncate font-mono">{track.album}</p>
                      )}
                    </div>

                    {/* Track Details */}
                    <div className="hidden lg:flex items-center space-x-6 text-sm text-cyber-dim font-mono">
                      {track.bpm && <span className="text-neon-purple font-bold">{track.bpm} BPM</span>}
                      {track.key && <span className="text-neon-green font-bold">{track.key}</span>}
                      <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold">{formatTime(track.duration ?? 0)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackRemove(originalIndex);
                    }}
                    className="w-10 h-10 bg-cyber-dark border-2 border-red-500 rounded-sm flex items-center justify-center hover:bg-red-900/20 hover:scale-110 transition-all"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Enhanced Footer Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-neon-green">
        <div className="flex items-center space-x-3 text-base neon-text-green font-mono">
          <Volume2 className="w-5 h-5" />
          <span>DRAG TO REORDER • CLICK TO PLAY</span>
        </div>

        <div className="flex items-center space-x-3">
          <button className="cyber-button px-4 py-3 rounded-sm flex items-center space-x-2 text-base font-bold tracking-wider">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">ADD TRACKS</span>
          </button>
          <button className="cyber-button cyber-button-purple px-4 py-3 rounded-sm flex items-center space-x-2 text-base font-bold tracking-wider">
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;
