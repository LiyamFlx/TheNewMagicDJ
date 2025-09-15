import { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import LandingPage from './components/LandingPage';
import MagicStudio from './components/MagicStudio';
import ProfessionalMagicPlayer from './components/ProfessionalMagicPlayer';
import PlaylistEditor from './components/PlaylistEditor';
import LibraryProfile from './components/LibraryProfile';
import AuthModal from './components/AuthModal';
import { User as AppUser, Playlist, Session } from './types';
import { useAuth } from './hooks/useAuth';
import { supabasePlaylistService } from './services/supabasePlaylistService';
import { supabase } from './lib/supabase';
import { logger } from './utils/logger';
import { testSupabaseAuth, testSupabaseConnection } from './utils/supabaseTest';
import { ArrowLeft, Play } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'editor' | 'player' | 'library'>('landing');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Map Supabase user -> AppUser shape for components that expect App types
  const appUser: AppUser | null = user
    ? {
        id: user.id,
        email: user.email ?? '',
        name: (user.user_metadata as any)?.display_name || user.email || 'DJ',
        created_at: new Date().toISOString(),
      }
    : null;

  useEffect(() => {
    // Test Supabase connectivity once on mount
    const initializeApp = async () => {
      const connectionTest = await testSupabaseConnection();
      const authTest = await testSupabaseAuth();

      logger.info('App', 'Supabase initialization complete', {
        connectionSuccess: connectionTest.success,
        authSuccess: authTest.success,
        authenticated: !!(authTest as any).authenticated,
      });

      if (!connectionTest.success) {
        logger.warn('App', 'Supabase connection issues detected', {
          error: connectionTest.error,
          message: 'Database tables may need to be created. Some features may not work until migration is applied.',
        });
      }
    };
    initializeApp();
  }, []);

  // Refresh user data when auth changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
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
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      if (!sessionsError && sessions) {
        setRecentSessions(sessions.slice(0, 10));
      }

      // Load user's playlists
      const playlists = await supabasePlaylistService.getPlaylists(user.id);
      setUserPlaylists((playlists as unknown) as Playlist[]);

      logger.info('App', 'User data loaded successfully', {
        userId: user.id,
        sessionCount: sessions?.length || 0,
        playlistCount: (playlists as any[])?.length || 0,
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

    if (user) {
      try {
        const { data: session, error } = await supabase
          .from('sessions')
          .insert([
            {
              user_id: user.id,
              playlist_id: playlist.id,
              status: 'active',
              started_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        if (error) throw error;
        setCurrentSession((session as unknown) as Session);
      } catch (err) {
        logger.error('App', 'Failed to create session', err);
      }
    }

    setCurrentView('player');
  };

  // Save-to-library is handled within specific components/services when needed

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

  // No-op placeholder removed: back to editor handled by navigation buttons

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

  // No-op placeholder removed: edit again handled via editor navigation

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

  const handleSessionEnd = async () => {
    if (!currentSession) return;
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', currentSession.id)
        .select()
        .single();
      if (error) throw error;
      setCurrentSession((data as unknown) as Session);
      setIsPlaying(false);
    } catch (err) {
      logger.error('App', 'Failed to end session', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-cyber-gray font-mono">Initializing MagicDJ...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cyber-black">
        <NotificationSystem />

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

        {currentView === 'landing' && <LandingPage onStartMixing={handleStartMixing} />}

        {currentView === 'studio' && (
          <MagicStudio
            user={appUser}
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
            user={appUser}
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