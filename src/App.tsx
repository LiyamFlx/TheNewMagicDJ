import { useState, useEffect } from 'react';
import Navigation, { NavigationView } from './components/Navigation';
import { useNavigation } from './hooks/useNavigation';
import { Playlist } from './types';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import PlayerView from './components/PlayerView';
import PlaylistEditor from './components/PlaylistEditor';
import AnalyticsExport from './components/AnalyticsExport';
import LibraryProfile from './components/LibraryProfile';

function App() {
  const { 
    currentView, 
    navigate, 
    goBack, 
    setBreadcrumbs, 
    clearBreadcrumbs, 
    canGoBack,
    breadcrumbs 
  } = useNavigation('home');
  
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, _setCurrentSession] = useState<any>(null);
  const [user, _setUser] = useState<any>(null);

  // Load recent sessions (mock data) - only once on mount
  useEffect(() => {
    setRecentSessions([
      { id: '1', name: 'Electronic Night', tracks: 15, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', name: 'House Party Mix', tracks: 20, created_at: new Date(Date.now() - 172800000).toISOString() }
    ]);
  }, []);

  // Handle navigation with proper breadcrumbs
  const handleNavigation = (view: NavigationView) => {
    clearBreadcrumbs();
    navigate(view);
  };

  const handleStartMixing = () => {
    navigate('create');
    setBreadcrumbs([{ label: 'Create', onClick: () => navigate('create') }]);
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    navigate('create'); // Stay in create view but show editor
    setBreadcrumbs([
      { label: 'Create', onClick: () => navigate('create') },
      { label: 'Edit Playlist' }
    ]);
  };

  const handlePlaylistEdited = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    navigate('play');
    setBreadcrumbs([
      { label: 'Create', onClick: () => navigate('create') },
      { label: 'Now Playing' }
    ]);
  };

  const handleLibraryAccess = () => {
    navigate('library');
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    navigate('create');
    setBreadcrumbs([
      { label: 'Library', onClick: () => navigate('library') },
      { label: 'Edit Playlist' }
    ]);
  };

  const handleEditAgain = () => {
    navigate('create');
    setBreadcrumbs([
      { label: 'Analytics', onClick: () => navigate('analytics') },
      { label: 'Edit Again' }
    ]);
  };

  const handleSaveToLibrary = (playlist: Playlist) => {
    setSavedPlaylists(prev => [...prev, playlist]);
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = [...currentPlaylist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
  };

  const handleTrackRemove = (index: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = currentPlaylist.tracks.filter((_, i) => i !== index);
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
  };

  const showEditor = currentView === 'create' && currentPlaylist && breadcrumbs.some(b => b.label === 'Edit Playlist');
  const showPlayer = currentView === 'play' && currentPlaylist;

  return (
    <div className="min-h-screen gradient-bg-primary">
      <Navigation
        currentView={currentView}
        onNavigate={handleNavigation}
        user={user}
        breadcrumbs={breadcrumbs}
        showBackButton={canGoBack}
        onBack={goBack}
      />

      {currentView === 'home' && (
        <LandingPage 
          onStartMixing={handleStartMixing}
          onLibraryAccess={handleLibraryAccess}
          recentSessions={recentSessions}
        />
      )}
      
      {currentView === 'create' && !showEditor && (
        <MagicStudio
          user={user}
          onPlaylistGenerated={handlePlaylistGenerated}
          onBack={goBack}
          onLibraryAccess={handleLibraryAccess}
          recentSessions={recentSessions}
        />
      )}
      
      {showEditor && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <PlaylistEditor
            playlist={currentPlaylist!}
            currentTrackIndex={0}
            isPlaying={false}
            onTrackSelect={() => {}}
            onTrackRemove={handleTrackRemove}
            onTrackReorder={handleTrackReorder}
            onPlaylistUpdate={handlePlaylistUpdate}
            onSendToPlayer={() => handlePlaylistEdited(currentPlaylist!)}
          />
        </div>
      )}
      
      {showPlayer && (
        <PlayerView 
          playlist={currentPlaylist}
          onBack={goBack}
        />
      )}
        
      {currentView === 'analytics' && currentPlaylist && currentSession && (
        <AnalyticsExport
          playlist={currentPlaylist}
          session={currentSession}
          onBack={goBack}
          onSaveToLibrary={handleSaveToLibrary}
          onEditAgain={handleEditAgain}
        />
      )}
        
      {currentView === 'library' && (
        <LibraryProfile
          user={user}
          savedPlaylists={savedPlaylists}
          onBack={goBack}
          onPlaylistSelect={handlePlaylistSelect}
          onCreateNew={handleStartMixing}
        />
      )}
    </div>
  );
}

export default App;