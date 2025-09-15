import { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import PlaylistEditor from './components/PlaylistEditor';
import AnalyticsExport from './components/AnalyticsExport';
import LibraryProfile from './components/LibraryProfile';
import AuthModal from './components/AuthModal';
import { User, Playlist, Session } from './types';
import { useAuth } from './hooks/useAuth';
import { supabasePlaylistService } from './services/supabasePlaylistService';
import { supabase } from './lib/supabase';
import { logger } from './utils/logger';
import { testSupabaseConnection, testSupabaseAuth } from './utils/supabaseTest';
import { ArrowLeft, Play } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'editor' | 'player' | 'analytics' | 'library'>('landing');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Test Supabase connection on app start
    const initializeApp = async () => {
      const connectionTest = await testSupabaseConnection();
      const authTest = await testSupabaseAuth();
      
      logger.info('App', 'Supabase initialization complete', {
        connectionSuccess: connectionTest.success,
        authSuccess: authTest.success,
        authenticated: authTest.authenticated
      });
      
      if (!connectionTest.success) {
        logger.warn('App', 'Supabase connection issues detected', {
          error: connectionTest.error,
          message: 'Database tables may need to be created. Some features may not work until migration is applied.'
        });
      } else if (connectionTest.warning) {
        logger.warn('App', 'Supabase connected with warnings', {
          warning: connectionTest.warning,
          message: 'Run database migration to enable all features'
        });
      }
    };
    
    initializeApp();
    
    if (isAuthenticated && user) {
      loadUserData();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      // Clear user data when not authenticated
      setRecentSessions([]);
      setUserPlaylists([]);
      setCurrentPlaylist(null);
      setCurrentSession(null);
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load user's recent sessions
      const { data: sessions, error: sessionsError } = await supabase.from("sessions").select("*").eq("user_id", user.id)(user.id);
      if (!sessionsError && sessions) {
        setRecentSessions(sessions.slice(0, 10)); // Get last 10 sessions
      }

      // Load user's playlists
      const playlists = await supabasePlaylistService.getPlaylists(user.id);
      setUserPlaylists(playlists);

      logger.info('App', 'User data loaded successfully', {
        userId: user.id,
        sessionCount: sessions?.length || 0,
        playlistCount: playlists.length
      });
    } catch (error) {
      logger.error('App', 'Failed to load user data', error);
    }
  };

  const handleStartMixing = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

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

  const handlePlaylistEdited = async (playlist: Playlist) => {
    logger.info('App', 'Playlist edited, switching to player', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length
    });
    
    setCurrentPlaylist(playlist);
    
    // Create a new session in the database
    if (user) {
      try {
        const { data: session, error } = await supabase.from("sessions").insert([{ user_id: user.id }]), {
      const { data: session, error } = await supabase
        .from("sessions")
        .insert([{ user_id: user.id, playlist_id: playlist.id, name: `${playlist.name} Session`, status: "active" }])
        .select()
        .single();
      if (error) throw error;
      setCurrentSession(session);    setCurrentView('player');
  };

  const handlePlayPause = (playing: boolean) => {
        });
        
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      } catch (error) {
        logger.error('App', 'Failed to update session', error);
      }
    }
    
    setCurrentView('analytics');
  };

  const handleSaveToLibrary = async (playlist: Playlist) => {
    if (!user) return;

    try {
      await supabasePlaylistService.createPlaylist(
        user.id,
        playlist.name,
        playlist.type,
        playlist.tracks,
        playlist.metadata
      );
      
      // Reload user playlists
      const updatedPlaylists = await supabasePlaylistService.getPlaylists(user.id);
      setUserPlaylists(updatedPlaylists);
      
      logger.info('App', 'Playlist saved to library', { playlistId: playlist.id });
    } catch (error) {
      logger.error('App', 'Failed to save playlist to library', error);
    }
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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

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
    
    logger.info('App', 'Track reordered', {
      playlistId: updatedPlaylist.id,
      fromIndex,
      toIndex,
      trackMoved: movedTrack.title
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
      remainingTracks: newTracks.length
    });
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    logger.info('App', 'Playlist updated', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length
    });
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-none animate-spin mx-auto mb-4 neon-glow-green"></div>
          <p className="text-cyber-gray font-mono">Initializing MagicDJ...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cyber-black">
        <NotificationSystem />
        
        {/* Authentication Modal */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
        
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
            onBack={handleBackToStudio}
            onPlaylistSelect={handlePlaylistSelect}
            onCreateNew={handleBackToStudio}
            savedPlaylists={userPlaylists}
      </div>
    </ErrorBoundary>
  );
}

export default App;