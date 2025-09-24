import { useState, useEffect } from 'react';
import {
  Search,
  Grid,
  List,
  ArrowLeft,
  Trash2,
  Edit3,
  Play,
  Save,
  Music,
} from 'lucide-react';
import { User, Playlist } from '../types';
import { formatDurationHuman } from '../utils/format';
import { getEnergyColor } from '../utils/energy';
import { supabasePlaylistService } from '../services/supabasePlaylistService';

interface LibraryItem {
  id: string;
  name: string;
  type: 'magic_match' | 'magic_set';
  tracks: number;
  duration: number;
  created_at: string;
  energy: number;
  thumbnail?: string;
}

interface LibraryProfileProps {
  user: User | null;
  onBack: () => void;
  onPlaylistSelect: (playlist: Playlist) => void;
  onCreateNew: () => void;
  savedPlaylists?: Playlist[];
}

const LibraryProfile: React.FC<LibraryProfileProps> = ({
  user,
  onBack,
  onPlaylistSelect,
  onCreateNew,
  savedPlaylists = [],
}) => {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'magic_match' | 'magic_set'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'duration'>(
    'recent'
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Convert saved playlists to library items
    const libraryItems: LibraryItem[] = savedPlaylists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      type: playlist.type === 'magic_match' ? 'magic_match' : 'magic_set',
      tracks: playlist.tracks.length,
      duration: playlist.total_duration ?? 0,
      created_at: playlist.created_at ?? new Date().toISOString(),
      energy:
        Math.round(
          (playlist.tracks.reduce(
            (sum, track) => sum + (track.energy || 0.5),
            0
          ) /
            Math.max(1, playlist.tracks.length)) *
            100
        ) || 75,
    }));

    setLibrary(libraryItems);
    setIsLoading(false);
  }, [savedPlaylists]);

  const filteredLibrary = library
    .filter(item => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return b.duration - a.duration;
        case 'recent':
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

  const formatTime = (seconds: number) => formatDurationHuman(seconds);

  const getTypeIcon = (type: string) => {
    return type === 'magic_match' ? '🎯' : '🎵';
  };

  const handlePlaylistClick = (item: LibraryItem) => {
    // Find the corresponding playlist from savedPlaylists
    const playlist = savedPlaylists.find(p => p.id === item.id);
    if (!playlist) return;

    onPlaylistSelect(playlist);
  };

  const handleDelete = async (id: string) => {
    try {
      await supabasePlaylistService.deletePlaylist(id);
      setLibrary(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-primary flex-center">
        <div className="text-center">
          <div className="w-16 h-16 glass-card flex-center animate-pulse-glow shadow-neon-pink mx-auto mb-4">
            <Music className="w-8 h-8 text-gradient-primary" />
          </div>
          <p className="text-xl text-gray-300 font-orbitron">
            Loading your library...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-primary relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 px-4 lg:px-6 py-4 lg:py-6 nav-sticky">
        <div className="max-w-7xl mx-auto flex-between">
          <div className="flex-start space-md">
            <button
              onClick={onBack}
              className="btn-icon-square btn-ghost ease-smooth"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-fuchsia-400" />
            </button>
            <div className="flex-start space-md">
              <div className="w-12 h-12 glass-card flex-center animate-pulse-glow shadow-neon-pink">
                <Save className="w-7 h-7 text-gradient-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gradient-primary font-orbitron tracking-wide">
                  LIBRARY & PROFILE
                </h1>
                <p className="text-sm text-gradient-accent font-mono">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onCreateNew}
            className="btn-primary btn-lg flex-center space-sm ease-bounce shadow-neon-hard"
            aria-label="Create new set"
            title="Create new set"
          >
            <Music className="w-5 h-5" />
            <span>CREATE NEW</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid-4 mb-8">
          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {library.length}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              TOTAL SETS
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill w-full gradient-bg-accent"></div>
            </div>
          </div>
          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-primary mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {library.reduce((sum, item) => sum + item.tracks, 0)}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              TOTAL TRACKS
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill w-full gradient-bg-secondary"></div>
            </div>
          </div>
          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {formatTime(
                library.reduce((sum, item) => sum + item.duration, 0)
              )}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              TOTAL TIME
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill w-full gradient-bg-accent"></div>
            </div>
          </div>
          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-primary mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {Math.round(
                library.reduce((sum, item) => sum + item.energy, 0) /
                  library.length || 0
              )}
              %
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              AVG ENERGY
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill w-full gradient-bg-secondary"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-lg mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="input-with-icon flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-neon text-gradient-accent font-inter"
                aria-label="Search library"
                title="Search your library"
              />
              <Search className="input-icon w-5 h-5" />
            </div>

            {/* Filters */}
            <div className="flex-center space-md">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="select-neon text-gradient-accent font-inter"
                aria-label="Filter by type"
                title="Filter by type"
              >
                <option value="all">All Types</option>
                <option value="magic_match">Magic Match</option>
                <option value="magic_set">Magic Set</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="select-neon text-gradient-accent font-inter"
                aria-label="Sort by"
                title="Sort by"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name</option>
                <option value="duration">Duration</option>
              </select>

              <div className="flex glass-card rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ease-smooth ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ease-smooth ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  aria-label="List view"
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Library Content */}
        {filteredLibrary.length === 0 ? (
          <div className="glass-card p-xl text-center">
            <div className="w-20 h-20 glass-card flex-center animate-pulse-glow shadow-neon-cyan mx-auto mb-6">
              <Music className="w-10 h-10 text-gradient-accent" />
            </div>
            <h3 className="text-2xl font-bold text-gradient-primary mb-4 font-orbitron">
              NO SETS FOUND
            </h3>
            <p className="text-gray-300 mb-8 font-inter text-lg">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create your first DJ set to get started'}
            </p>
            <button
              onClick={onCreateNew}
              className="btn-primary btn-xl flex-center space-md ease-bounce shadow-neon-hard"
              aria-label="Create new set"
              title="Create new set"
            >
              <Music className="w-6 h-6" />
              <span>CREATE NEW SET</span>
            </button>
          </div>
        ) : (
          <div
            className={viewMode === 'grid' ? 'grid-auto gap-6' : 'space-y-4'}
          >
            {filteredLibrary.map(item => (
              <div
                key={item.id}
                className={`glass-card p-lg hover-lift ease-smooth cursor-pointer group shadow-neon-soft hover:shadow-neon-medium ${
                  viewMode === 'list' ? 'flex-between space-md' : ''
                }`}
                onClick={() => handlePlaylistClick(item)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="flex-between mb-4">
                      <div className="w-12 h-12 glass-card flex-center animate-pulse-glow shadow-neon-soft">
                        <span className="text-2xl">
                          {getTypeIcon(item.type)}
                        </span>
                      </div>
                      <div className="flex-center space-sm opacity-0 group-hover:opacity-100 ease-smooth">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="btn-icon btn-secondary ease-bounce"
                          aria-label={`Edit ${item.name}`}
                          title={`Edit ${item.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="btn-icon btn-danger ease-bounce"
                          aria-label={`Delete ${item.name}`}
                          title={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-gradient-primary mb-3 truncate group-hover:text-gradient-accent ease-smooth font-orbitron">
                      {item.name}
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex-between">
                        <span className="text-gray-400 font-inter">TRACKS</span>
                        <span className="text-gradient-accent font-bold font-mono">
                          {item.tracks}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span className="text-gray-400 font-inter">
                          DURATION
                        </span>
                        <span className="text-gradient-primary font-bold font-mono">
                          {formatTime(item.duration)}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span className="text-gray-400 font-inter">ENERGY</span>
                        <span
                          className={`font-bold font-mono ${getEnergyColor(item.energy)}`}
                        >
                          {item.energy}%
                        </span>
                      </div>
                      <div className="progress-bar h-1 mt-2">
                        <div
                          className="progress-fill gradient-bg-accent"
                          style={{ width: `${item.energy}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono pt-2 border-t border-glass">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-start space-md">
                      <div className="w-12 h-12 glass-card flex-center animate-pulse-glow shadow-neon-soft">
                        <span className="text-2xl">
                          {getTypeIcon(item.type)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gradient-primary truncate group-hover:text-gradient-accent ease-smooth font-orbitron">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-400 font-inter">
                          <span className="text-gradient-accent font-bold">
                            {item.tracks}
                          </span>{' '}
                          tracks •
                          <span className="text-gradient-primary font-bold">
                            {' '}
                            {formatTime(item.duration)}
                          </span>{' '}
                          • Energy:{' '}
                          <span
                            className={`font-bold ${getEnergyColor(item.energy)}`}
                          >
                            {item.energy}%
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex-center space-md">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handlePlaylistClick(item);
                        }}
                        className="btn-primary btn-sm flex-center space-sm ease-bounce shadow-neon-medium"
                        aria-label={`Play ${item.name}`}
                        title={`Play ${item.name}`}
                      >
                        <Play className="w-4 h-4" />
                        <span>PLAY</span>
                      </button>

                      <div className="flex-center space-sm opacity-0 group-hover:opacity-100 ease-smooth">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="btn-icon btn-secondary ease-bounce"
                          aria-label={`Edit ${item.name}`}
                          title={`Edit ${item.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="btn-icon btn-danger ease-bounce"
                          aria-label={`Delete ${item.name}`}
                          title={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryProfile;
