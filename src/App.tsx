import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import PlaylistEditor from './components/PlaylistEditor';
import AnalyticsExport from './components/AnalyticsExport';
import LibraryProfile from './components/LibraryProfile';
import { User, Playlist, Session } from './types';
import { logger } from './utils/logger';
import { ArrowLeft, Play } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'editor' | 'player' | 'analytics' | 'library'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    // Auto-login for demo purposes
    const demoUser: User = {
      id: 'demo-user',
      email: 'demo@magicdj.ai',
      name: 'Demo User',
      created_at: new Date().toISOString()
    };
    setUser(demoUser);
    logger.info('App', 'Demo user logged in', { userId: demoUser.id });
    
    // Load recent sessions (mock data)
    setRecentSessions([
      { id: '1', name: 'Electronic Night', tracks: 15, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', name: 'House Party Mix', tracks: 20, created_at: new Date(Date.now() - 172800000).toISOString() }
    ]);
  }, []);

  const handleStartMixing = () => {
    logger.info('App', 'User started mixing session');
    setCurrentView('studio');
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    logger.info('App', 'Playlist generated, switching to player', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length
    });
    
    setCurrentPlaylist(playlist);
    setCurrentView('editor');
  };

  const handlePlaylistEdited = (playlist: Playlist) => {
    logger.info('App', 'Playlist edited, switching to player', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length
    });
    
    setCurrentPlaylist(playlist);
    
    // Create a new session
    const session: Session = {
      id: `session-${Date.now()}`,
      user_id: user?.id || 'demo-user',
      playlist_id: playlist.id,
      started_at: new Date().toISOString(),
      status: 'active'
    };
    setCurrentSession(session);
    setCurrentView('player');
  };

  const handlePlayPause = (playing: boolean) => {
    setIsPlaying(playing);
    logger.info('App', `Playback ${playing ? 'started' : 'paused'}`);
  };

  const handleSessionEnd = () => {
    logger.info('App', 'Session ended, showing analytics');
    if (currentSession) {
      const updatedSession = { ...currentSession, ended_at: new Date().toISOString(), status: 'completed' as const };
      setCurrentSession(updatedSession);
    }
    setCurrentView('analytics');
  };

  const handleSaveToLibrary = (playlist: Playlist) => {
    setSavedPlaylists(prev => [...prev, playlist]);
    logger.info('App', 'Playlist saved to library', { playlistId: playlist.id });
  };

  const handleBackToStudio = () => {
    logger.info('App', 'Returning to studio');
    setCurrentView('studio');
    setCurrentSession(null);
    setCurrentPlaylist(null);
    setIsPlaying(false);
    setCurrentView('studio');
  };

  const handleBackToLanding = () => {
    logger.info('App', 'Returning to landing page');
    setCurrentView('landing');
    setCurrentPlaylist(null);
    setCurrentSession(null);
  };

  const handleBackToEditor = () => {
    logger.info('App', 'Returning to editor');
    setCurrentView('editor');
  };

  const handleLibraryAccess = () => {
    logger.info('App', 'Accessing library');
    setCurrentView('library');
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    logger.info('App', 'Playlist selected from library');
    setCurrentPlaylist(playlist);
    setCurrentView('editor');
  };

  const handleEditAgain = () => {
    logger.info('App', 'Edit again requested');
    setCurrentView('editor');
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
    const newTracks = [...currentPlaylist.tracks];
    newTracks.splice(index, 1);
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cyber-black">
        <NotificationSystem />
        
        {currentView === 'landing' && (
          <LandingPage onStartMixing={handleStartMixing} />
        )}
        
        {currentView === 'studio' && (
          <MagicStudio
            user={user}
            onPlaylistGenerated={handlePlaylistGenerated}
            onBack={handleBackToLanding}
            onLibraryAccess={handleLibraryAccess}
            recentSessions={recentSessions}
          />
        )}
        
        {currentView === 'editor' && currentPlaylist && (
          <div className="min-h-screen bg-cyber-black">
            <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-neon-green">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackToStudio}
                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
                  </button>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-cyber-white">Playlist Editor</h1>
                    <p className="text-sm text-cyber-gray">Fine-tune your AI-generated set</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePlaylistEdited(currentPlaylist)}
                  className="cyber-button px-4 py-2 rounded-none flex items-center space-x-2"
                >
                  <Play className="w-4 h-4 neon-text-green" />
                  <span>Send to Player</span>
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
              <PlaylistEditor
                playlist={currentPlaylist}
                currentTrackIndex={0}
                isPlaying={false}
                onTrackSelect={() => {}}
                onTrackRemove={handleTrackRemove}
                onTrackReorder={handleTrackReorder}
                onPlaylistUpdate={handlePlaylistUpdate}
              />
            </div>
          </div>
        )}
        
        {currentView === 'player' && (
          <ProfessionalMagicPlayer
            playlist={currentPlaylist}
            session={currentSession}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSessionEnd={handleSessionEnd}
            onBack={handleBackToStudio}
          />
        )}
        
        {currentView === 'analytics' && currentPlaylist && currentSession && (
          <AnalyticsExport
            playlist={currentPlaylist}
            session={currentSession}
            onBack={handleBackToStudio}
            onSaveToLibrary={handleSaveToLibrary}
            onEditAgain={handleEditAgain}
          />
        )}
        
        {currentView === 'library' && (
          <LibraryProfile
            user={user}
            onBack={handleBackToStudio}
            onPlaylistSelect={handlePlaylistSelect}
            onCreateNew={handleBackToStudio}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;