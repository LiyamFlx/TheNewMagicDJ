import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import { User, Playlist, Session } from './types';
import { logger } from './utils/logger';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'player'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    logger.info('App', 'Session ended, returning to studio');
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
    setIsPlaying(false);
  };

  const handleBackToStudio = () => {
    logger.info('App', 'Returning to studio');
    setCurrentView('studio');
    setCurrentPlaylist(null);
    setCurrentSession(null);
    setIsPlaying(false);
  };

  return (
    <div className="App">
      {currentView === 'landing' && (
        <LandingPage onStartMixing={handleStartMixing} />
      )}
      
      {currentView === 'studio' && (
        <MagicStudio
          user={user}
          onPlaylistGenerated={handlePlaylistGenerated}
          onBack={handleBackToLanding}
        />
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
    </div>
  );
}

export default App;