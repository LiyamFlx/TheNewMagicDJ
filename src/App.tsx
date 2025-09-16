import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { Playlist } from './types';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import PlaylistEditor from './components/PlaylistEditor';
import AnalyticsExport from './components/AnalyticsExport';
import LibraryProfile from './components/LibraryProfile';
import NotFound from './components/NotFound';
import LoginPage from './components/LoginPage';
import { supabasePlaylistService } from './services/supabasePlaylistService';

// Main App content that needs access to navigation
function AppContent() {
  const navigate = useNavigate();
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load recent sessions and restore playlist from Supabase
  useEffect(() => {
    // Load mock recent sessions
    setRecentSessions([
      { id: '1', name: 'Electronic Night', tracks: 15, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', name: 'House Party Mix', tracks: 20, created_at: new Date(Date.now() - 172800000).toISOString() }
    ]);

    const loadLastPlaylist = async () => {
      if (!user) return;
      const playlists = await supabasePlaylistService.getUserPlaylists(user.id);
      if (playlists && playlists.length > 0) {
        const lastPlaylist = playlists.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        setCurrentPlaylist(lastPlaylist);
        console.log('Restored playlist from Supabase:', lastPlaylist.name);
      }
    };

    loadLastPlaylist();
  }, [user]);

  const saveCurrentPlaylist = async (playlist: Playlist) => {
    if (!user) {
      console.warn('Cannot save playlist, user not logged in.');
      return;
    }
    try {
      await supabasePlaylistService.savePlaylist(playlist, user.id);
    } catch (error) {
      console.error('Failed to save playlist to Supabase:', error);
    }
  };

  const handleLogin = (user: any) => {
    setUser(user);
    navigate('/');
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setIsEditingPlaylist(true);
    saveCurrentPlaylist(playlist);
  };

  const handlePlaylistEdited = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setIsEditingPlaylist(false);
    navigate('/play');
    saveCurrentPlaylist(playlist);
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setIsEditingPlaylist(true);
    navigate('/create');
  };

  const handleSaveToLibrary = (playlist: Playlist) => {
    setSavedPlaylists(prev => [...prev, playlist]);
    saveCurrentPlaylist(playlist);
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = [...currentPlaylist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
    saveCurrentPlaylist(updatedPlaylist);
  };

  const handleTrackRemove = (index: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = currentPlaylist.tracks.filter((_, i) => i !== index);
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
    saveCurrentPlaylist(updatedPlaylist);
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    saveCurrentPlaylist(playlist);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen gradient-bg-primary">
      <Navigation
        user={user}
        hasPlaylist={!!currentPlaylist}
        hasSession={!!currentSession}
      />

      <Routes>
          {/* Home Route */}
          <Route
            path="/"
            element={
              <LandingPage
                onStartMixing={() => navigate('/create')}
                onLibraryAccess={() => navigate('/library')}
                recentSessions={recentSessions}
              />
            }
          />

          {/* Create Route */}
          <Route
            path="/create"
            element={
              isEditingPlaylist && currentPlaylist ? (
                <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
                  <PlaylistEditor
                    playlist={currentPlaylist}
                    currentTrackIndex={0}
                    isPlaying={false}
                    onTrackSelect={() => {}}
                    onTrackRemove={handleTrackRemove}
                    onTrackReorder={handleTrackReorder}
                    onPlaylistUpdate={handlePlaylistUpdate}
                    onSendToPlayer={() => handlePlaylistEdited(currentPlaylist!)}
                  />
                </div>
              ) : (
                <MagicStudio
                  user={user}
                  onPlaylistGenerated={handlePlaylistGenerated}
                  onBack={() => window.history.back()}
                  onLibraryAccess={() => navigate('/library')}
                  recentSessions={recentSessions}
                />
              )
            }
          />

          {/* Play Route - Protected */}
          <Route
            path="/play"
            element={
              currentPlaylist ? (
                <ProfessionalMagicPlayer
                  playlist={currentPlaylist}
                  session={currentSession}
                  isPlaying={isPlaying}
                  onPlayPause={setIsPlaying}
                  onSessionEnd={() => navigate('/')}
                  onBack={() => window.history.back()}
                />
              ) : (
                <Navigate to="/create" replace />
              )
            }
          />

          {/* Library Route */}
          <Route
            path="/library"
            element={
              <LibraryProfile
                user={user}
                savedPlaylists={savedPlaylists}
                onBack={() => window.history.back()}
                onPlaylistSelect={handlePlaylistSelect}
                onCreateNew={() => navigate('/create')}
              />
            }
          />

          {/* Analytics Route - Protected */}
          <Route
            path="/analytics"
            element={
              currentPlaylist && currentSession ? (
                <AnalyticsExport
                  playlist={currentPlaylist}
                  session={currentSession}
                  onBack={() => window.history.back()}
                  onSaveToLibrary={handleSaveToLibrary}
                  onEditAgain={() => navigate('/create')}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

// Router wrapper
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
