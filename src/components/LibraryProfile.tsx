import React, { useState, useEffect } from 'react';
import { Save, Music, Clock, TrendingUp, Search, Filter, Grid, List, ArrowLeft, Trash2, Edit3, Play } from 'lucide-react';
import { User, Playlist } from '../types';

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
  savedPlaylists = []
}) => {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'magic_match' | 'magic_set'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'duration'>('recent');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Convert saved playlists to library items
    const libraryItems: LibraryItem[] = savedPlaylists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      type: playlist.type,
      tracks: playlist.tracks.length,
      duration: playlist.total_duration,
      created_at: playlist.created_at,
      energy: Math.round((playlist.tracks.reduce((sum, track) => sum + (track.energy || 0.5), 0) / playlist.tracks.length) * 100) || 75
    }));
    
    setLibrary(libraryItems);
    setIsLoading(false);
  }, [savedPlaylists]);

  const filteredLibrary = library
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
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
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getEnergyColor = (energy: number) => {
    if (energy >= 80) return 'neon-text-green';
    if (energy >= 60) return 'text-yellow-400';
    if (energy >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTypeIcon = (type: string) => {
    return type === 'magic_match' ? '🎯' : '🎵';
  };

  const handlePlaylistClick = (item: LibraryItem) => {
    // Find the corresponding playlist from savedPlaylists
    const playlist = savedPlaylists.find(p => p.id === item.id);
    if (!playlist) return;
    
    onPlaylistSelect(playlist);
  };

  const handleDelete = (id: string) => {
    setLibrary(prev => prev.filter(item => item.id !== id));
    // TODO: Implement actual deletion from Supabase
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-none animate-spin mx-auto mb-4 neon-glow-green"></div>
          <p className="text-cyber-gray">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-neon-green">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyber-dark border-2 border-neon-purple rounded-none flex items-center justify-center neon-glow-purple">
                <Save className="w-6 h-6 neon-text-purple" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-cyber-white">Library & Profile</h1>
                <p className="text-sm text-cyber-gray">{user?.email}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={onCreateNew}
            className="cyber-button px-4 py-2 rounded-none flex items-center space-x-2"
          >
            <Music className="w-4 h-4 neon-text-green" />
            <span>Create New</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="cyber-card rounded-none p-4 text-center">
            <div className="text-2xl font-bold neon-text-green mb-2">{library.length}</div>
            <div className="text-sm text-cyber-gray">Total Sets</div>
          </div>
          <div className="cyber-card rounded-none p-4 text-center">
            <div className="text-2xl font-bold neon-text-purple mb-2">
              {library.reduce((sum, item) => sum + item.tracks, 0)}
            </div>
            <div className="text-sm text-cyber-gray">Total Tracks</div>
          </div>
          <div className="cyber-card rounded-none p-4 text-center">
            <div className="text-2xl font-bold neon-text-green mb-2">
              {formatTime(library.reduce((sum, item) => sum + item.duration, 0))}
            </div>
            <div className="text-sm text-cyber-gray">Total Time</div>
          </div>
          <div className="cyber-card rounded-none p-4 text-center">
            <div className="text-2xl font-bold neon-text-purple mb-2">
              {Math.round(library.reduce((sum, item) => sum + item.energy, 0) / library.length || 0)}%
            </div>
            <div className="text-sm text-cyber-gray">Avg Energy</div>
          </div>
        </div>

        {/* Controls */}
        <div className="cyber-card rounded-none p-4 mb-6">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-dim" />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-cyber-dark border border-cyber-light rounded-none focus:outline-none focus:border-neon-green text-cyber-white placeholder-cyber-dim"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-cyber-dark border border-neon-green rounded-none px-3 py-2 text-cyber-white focus:outline-none focus:border-neon-purple"
              >
                <option value="all">All Types</option>
                <option value="magic_match">Magic Match</option>
                <option value="magic_set">Magic Set</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-cyber-dark border border-neon-purple rounded-none px-3 py-2 text-cyber-white focus:outline-none focus:border-neon-green"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name</option>
                <option value="duration">Duration</option>
              </select>

              <div className="flex border border-neon-green rounded-none">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-neon-green text-cyber-black' : 'text-neon-green'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-neon-green text-cyber-black' : 'text-neon-green'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Library Content */}
        {filteredLibrary.length === 0 ? (
          <div className="cyber-card rounded-none p-12 text-center">
            <Music className="w-16 h-16 text-cyber-dim mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-cyber-white mb-2">No sets found</h3>
            <p className="text-cyber-gray mb-6">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first DJ set to get started'}
            </p>
            <button
              onClick={onCreateNew}
              className="cyber-button px-6 py-3 rounded-none"
            >
              Create New Set
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {filteredLibrary.map((item) => (
              <div
                key={item.id}
                className={`cyber-card rounded-none p-4 hover:neon-glow-green cursor-pointer transition-all group ${
                  viewMode === 'list' ? 'flex items-center space-x-4' : ''
                }`}
                onClick={() => handlePlaylistClick(item)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{getTypeIcon(item.type)}</span>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="w-6 h-6 bg-cyber-dark border border-neon-purple rounded-none flex items-center justify-center hover:neon-glow-purple"
                        >
                          <Edit3 className="w-3 h-3 neon-text-purple" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="w-6 h-6 bg-cyber-dark border border-red-500 rounded-none flex items-center justify-center hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-cyber-white mb-2 truncate group-hover:neon-text-green transition-colors">
                      {item.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-cyber-gray">
                      <div className="flex items-center justify-between">
                        <span>{item.tracks} tracks</span>
                        <span>{formatTime(item.duration)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Energy</span>
                        <span className={getEnergyColor(item.energy)}>{item.energy}%</span>
                      </div>
                      <div className="text-xs text-cyber-dim">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTypeIcon(item.type)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-cyber-white truncate group-hover:neon-text-green transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-sm text-cyber-gray">
                          {item.tracks} tracks • {formatTime(item.duration)} • Energy: <span className={getEnergyColor(item.energy)}>{item.energy}%</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistClick(item);
                        }}
                        className="cyber-button px-3 py-2 rounded-none flex items-center space-x-2 text-sm"
                      >
                        <Play className="w-3 h-3 neon-text-green" />
                        <span>Play</span>
                      </button>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="w-8 h-8 bg-cyber-dark border border-neon-purple rounded-none flex items-center justify-center hover:neon-glow-purple"
                        >
                          <Edit3 className="w-3 h-3 neon-text-purple" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="w-8 h-8 bg-cyber-dark border border-red-500 rounded-none flex items-center justify-center hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
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