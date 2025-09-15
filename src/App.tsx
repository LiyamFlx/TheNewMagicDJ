import { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import PlaylistEditor from './components/PlaylistEditor';
import LibraryProfile from './components/LibraryProfile';
import { User as AppUser, Playlist, Session } from './types';
import { logger } from './utils/logger';
import { ArrowLeft, Play } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'editor' | 'player' | 'library'>('landing');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  // Create a demo user for components that need user data
  const demoUser: AppUser = {
    id: 'demo-user',
    email: 'demo@magicdj.com',
    name: 'Demo DJ',
    created_at: new Date().toISOString(),
  };

  useEffect(() => {
    logger.info('App', 'MagicDJ initialized without authentication');
    
    // Load demo data
    const demoSessions: Session[] = [
      {
        id: 'demo-session-1',
        user_id: 'demo-user',
        playlist_id: 'demo-playlist-1',
        started_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        status: 'completed'
      },
      {
        id: 'demo-session-2',
        user_id: 'demo-user',
        playlist_id: 'demo-playlist-2',
        started_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        status: 'completed'
      }
    ];
    
    const demoPlaylists: Playlist[] = [
      {
        id: 'demo-playlist-1',
        name: 'Electronic Vibes',
        tracks: [],
        type: 'magic_set',
        total_duration: 3600,
        created_at: new Date().toISOString(),
        user_id: 'demo-user'
      },
      {
        id: 'demo-playlist-2',
        name: 'House Session',
        tracks: [],
        type: 'magic_match',
        total_duration: 2400,
        created_at: new Date().toISOString(),
        user_id: 'demo-user'
      }
    ];
    
    setRecentSessions(demoSessions);
    setUserPlaylists(demoPlaylists);
  }, []);

  const handleStartMixing = () => {
    logger.info('App', 'User started mixing session');
    setCurrentView('studio');
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    logger.info('App', 'Playlist generated', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length,
    });
    setCurrentPlaylist(playlist);
    setCurrentView('editor');
  };

  const handlePlaylistEdited = async (playlist: Playlist) => {
    logger.info('App', 'Playlist edited, switching to player', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length,
    });
    setCurrentPlaylist(playlist);

    // Create a demo session
    const demoSession: Session = {
      id: `session-${Date.now()}`,
      user_id: 'demo-user',
      playlist_id: playlist.id,
      started_at: new Date().toISOString(),
      status: 'active'
    };
    
    setCurrentSession(demoSession);
    setCurrentView('player');
  };

  const handleBackToStudio = () => {
    logger.info('App', 'Returning to studio');
    setCurrentView('studio');
    setCurrentSession(null);
    setCurrentPlaylist(null);
    setIsPlaying(false);
  };

  const handleBackToLanding = () => {
    logger.info('App', 'Returning to landing');
    setCurrentView('landing');
    setCurrentPlaylist(null);
    setCurrentSession(null);
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

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!currentPlaylist) return;

    const newTracks = [...currentPlaylist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);

    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);

    logger.info('App', 'Track reordered', {
      playlistId: updatedPlaylist.id,
      fromIndex,
      toIndex,
      trackMoved: movedTrack.title,
    });
  };

  const handleTrackRemove = (index: number) => {
    if (!currentPlaylist) return;

    const removedTrack = currentPlaylist.tracks[index];
    const newTracks = [...currentPlaylist.tracks];
    newTracks.splice(index, 1);

    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);

    logger.info('App', 'Track removed', {
      playlistId: updatedPlaylist.id,
      removedTrack: removedTrack.title,
      remainingTracks: newTracks.length,
    });
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    logger.info('App', 'Playlist updated', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length,
    });
  };

  const handlePlayPause = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleSessionEnd = () => {
    if (!currentSession) return;
    
    // Update session to completed
    const completedSession = {
      ...currentSession,
      status: 'completed' as const,
      ended_at: new Date().toISOString()
    };
    
    setCurrentSession(completedSession);
    setIsPlaying(false);
    logger.info('App', 'Session ended', { sessionId: completedSession.id });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cyber-black">
        <NotificationSystem />

        {currentView === 'landing' && <LandingPage onStartMixing={handleStartMixing} />}

        {currentView === 'studio' && (
          <MagicStudio
            user={demoUser}
            onPlaylistGenerated={handlePlaylistGenerated}
            onBack={handleBackToLanding}
            onLibraryAccess={handleLibraryAccess}
            recentSessions={recentSessions}
          />
        )}

        {currentView === 'editor' && currentPlaylist && (
          <div className="min-h-screen bg-cyber-black">
            <div className="px-4 py-4 border-b border-neon-green">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackToStudio}
                    className="w-8 h-8 rounded bg-cyber-dark border border-neon-green flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 neon-text-green" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-cyber-white">Playlist Editor</h1>
                    <p className="text-sm text-cyber-gray">Fine-tune your AI-generated set</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePlaylistEdited(currentPlaylist)}
                  className="cyber-button px-4 py-2 flex items-center space-x-2"
                >
                  <Play className="w-4 h-4 neon-text-green" />
                  <span>Send to Player</span>
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
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

        {currentView === 'library' && (
          <LibraryProfile
            user={demoUser}
            onBack={handleBackToStudio}
            onPlaylistSelect={handlePlaylistSelect}
            onCreateNew={handleBackToStudio}
            savedPlaylists={userPlaylists}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;