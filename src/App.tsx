import React, { useReducer, useEffect, useCallback, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import AuthSaveBanner from './components/AuthSaveBanner';
import NotFound from './components/NotFound';

import { Playlist, User, Session } from './types/index';
import { supabasePlaylistService } from './services/supabasePlaylistService';
import { spotifyService } from './services/spotifyService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSpotifyToken } from './hooks/useSpotifyToken';
import { useToast } from './hooks/useToast';

// Lazy-loaded heavy components
const MagicStudio = React.lazy(() => import('./components/MagicStudio'));
const ProfessionalMagicPlayer = React.lazy(
  () => import('./components/ProfessionalMagicPlayer')
);
const PlaylistEditor = React.lazy(() => import('./components/PlaylistEditor'));
const AnalyticsExport = React.lazy(
  () => import('./components/AnalyticsExport')
);
const LibraryProfile = React.lazy(() => import('./components/LibraryProfile'));

// --- Central Logger ---
const Logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
};

// --- State ---
interface AppState {
  user: User | null;
  savedPlaylists: Playlist[];
  recentSessions: Session[];
  currentPlaylist: Playlist | null;
  currentSession: Session | null;
  isPlaying: boolean;
  isEditingPlaylist: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  user: {
    id: 'default-user',
    email: 'user@magicdjapp.com',
    name: 'Magic DJ User',
    created_at: new Date().toISOString(),
  },
  savedPlaylists: [],
  recentSessions: [],
  currentPlaylist: null,
  currentSession: null,
  isPlaying: false,
  isEditingPlaylist: false,
  isLoading: true,
  error: null,
};

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PLAYLIST'; payload: Playlist | null }
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'SET_PLAYLISTS'; payload: Playlist[] }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_EDITING'; payload: boolean };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PLAYLIST':
      return { ...state, currentPlaylist: action.payload };
    case 'SET_SESSION':
      return { ...state, currentSession: action.payload };
    case 'SET_PLAYLISTS':
      return { ...state, savedPlaylists: action.payload };
    case 'SET_SESSIONS':
      return { ...state, recentSessions: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_EDITING':
      return { ...state, isEditingPlaylist: action.payload };
    default:
      return state;
  }
}

// --- Main AppContent ---
function AppContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Spotify token
  const {
    isLoading: tokenLoading,
    fetchLazy: fetchSpotifyTokenLazy,
  } = useSpotifyToken();

  // Local storage
  const [userPreferences] = useLocalStorage('user-preferences', {
    theme: 'dark',
    autoSave: true,
    notifications: true,
  });
  const [lastPlaylistId, setLastPlaylistId] = useLocalStorage<string>(
    'last-playlist-id',
    ''
  );

  // --- Spotify is now lazily initialized when needed as fallback ---
  // Removed automatic initialization to improve startup performance

  // Provide lazy Spotify initialization function for services
  // @ts-ignore - Function reserved for future lazy initialization
  const _initializeSpotifyLazy = useCallback(async (): Promise<boolean> => {
    try {
      const token = await fetchSpotifyTokenLazy();
      if (token) {
        spotifyService.initialize(token);
        Logger.info('Spotify service lazily initialized');
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Lazy Spotify initialization failed', error);
      return false;
    }
  }, [fetchSpotifyTokenLazy]);

  // --- Initialize App ---
  useEffect(() => {
    const initializeApp = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        // Mock sessions (replace with Supabase)
        const mockSessions: Session[] = [
          {
            id: '1',
            name: 'Electronic Night',
            tracks: 15,
            duration: 3600,
            user_id: 'default-user',
            playlist_id: 'mock',
            started_at: new Date().toISOString(),
            status: 'completed' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        dispatch({ type: 'SET_SESSIONS', payload: mockSessions });
        Logger.info('MagicDJ initialized without authentication');
      } catch (err) {
        Logger.error('Init error', err);
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to load application data',
        });
        showToast('Failed to load application data', 'error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initializeApp();
  }, []);

  // Separate effect for user data loading
  useEffect(() => {
    if (state.user?.id) {
      loadUserData(state.user.id).catch(err => {
        Logger.error('Load user data error', err);
        showToast('Failed to load user data', 'error');
      });
    }
  }, [state.user?.id]);

  // --- Load user data ---
  const loadUserData = async (userId: string) => {
    if (!userId) {
      Logger.error('loadUserData', 'No user ID provided');
      return;
    }

    try {
      Logger.info('loadUserData', 'Loading playlists for user', { userId });
      const playlists = await supabasePlaylistService.getPlaylists(userId);

      // Ensure playlists is an array and all have required properties
      const safePlaylists: Playlist[] = Array.isArray(playlists)
        ? (playlists as Playlist[]).filter(
            (p): p is Playlist => !!p && typeof p.id === 'string' && !!p.name
          )
        : [];
      dispatch({ type: 'SET_PLAYLISTS', payload: safePlaylists });

      // Restore last playlist with additional safety checks
      if (safePlaylists.length > 0) {
        const candidate = lastPlaylistId
          ? safePlaylists.find((p: Playlist) => p && p.id === lastPlaylistId)
          : null;

        const playlistToRestore =
          candidate ||
          safePlaylists
            .filter((p: Playlist) => p && p.updated_at) // Filter out invalid playlists
            .sort(
              (a: Playlist, b: Playlist) =>
                new Date(b.updated_at || 0).getTime() -
                new Date(a.updated_at || 0).getTime()
            )[0];

        if (
          playlistToRestore &&
          playlistToRestore.id &&
          playlistToRestore.name
        ) {
          dispatch({ type: 'SET_PLAYLIST', payload: playlistToRestore });
          setLastPlaylistId(playlistToRestore.id);
          Logger.info('Restored playlist', playlistToRestore.name);
          showToast(`Restored playlist: ${playlistToRestore.name}`, 'success');
        }
      }
    } catch (err) {
      Logger.error('Load user data error', err);

      // Graceful fallback - don't crash the app
      dispatch({ type: 'SET_PLAYLISTS', payload: [] });

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        showToast('Network error - working offline', 'warning');
      } else {
        showToast('Failed to load playlists - working offline', 'warning');
      }
    }
  };

  // --- Playlist save handler ---
  const saveCurrentPlaylist = useCallback(
    async (playlist: Playlist) => {
      if (!playlist || !playlist.id) {
        Logger.error(
          'saveCurrentPlaylist',
          'Invalid playlist provided',
          playlist
        );
        return;
      }

      if (!state.user || !state.user.id) {
        Logger.warn('saveCurrentPlaylist', 'No user logged in, skipping save');
        return;
      }

      if (!userPreferences.autoSave) {
        Logger.info('saveCurrentPlaylist', 'Auto-save disabled, skipping save');
        return;
      }

      try {
        Logger.info('saveCurrentPlaylist', 'Saving playlist', {
          playlistId: playlist.id,
          userId: state.user.id,
        });

        const saved = await supabasePlaylistService.savePlaylist(
          playlist,
          state.user.id
        );

        if (saved && saved.id) {
          setLastPlaylistId(playlist.id);

          // Safely update playlists array
          const updatedPlaylists = state.savedPlaylists.map(p =>
            p && p.id === playlist.id ? saved : p
          );

          // Add playlist if it's new
          if (!state.savedPlaylists.find(p => p && p.id === playlist.id)) {
            updatedPlaylists.push(saved);
          }

          // Ensure updatedPlaylists is filtered to only valid Playlist objects with defined id
          dispatch({
            type: 'SET_PLAYLISTS',
            payload: updatedPlaylists.filter(
              (p): p is Playlist => !!p && typeof p.id === 'string'
            ),
          });

          if (userPreferences.notifications) {
            showToast('Playlist saved', 'success', { dedupe: true });
          }
        } else {
          throw new Error('Invalid saved playlist response');
        }
      } catch (err) {
        Logger.error('Save playlist error', err);

        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')
        ) {
          showToast('Network error - playlist saved locally', 'warning');
        } else {
          showToast('Failed to save playlist to cloud', 'error');
        }
      }
    },
    [
      state.user,
      state.savedPlaylists,
      userPreferences,
      setLastPlaylistId,
      showToast,
    ]
  );

  // Authentication removed - no login handlers needed

  // --- Playlist handlers ---
  const handlePlaylistGenerated = (pl: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: pl });
    dispatch({ type: 'SET_EDITING', payload: true });
    saveCurrentPlaylist(pl);
    showToast('Playlist generated!', 'success');
  };

  const handlePlaylistEdited = (pl: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: pl });
    dispatch({ type: 'SET_EDITING', payload: false });
    saveCurrentPlaylist(pl);
    navigate('/play');
  };

  const handlePlaylistSelect = (pl: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: pl });
    dispatch({ type: 'SET_EDITING', payload: true });
    setLastPlaylistId(pl.id);
    navigate('/create');
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!state.currentPlaylist || !state.currentPlaylist.tracks) {
      Logger.error('handleTrackReorder', 'No playlist or tracks available');
      showToast('Cannot reorder tracks: No playlist selected', 'error');
      return;
    }

    // Validate indices
    if (
      fromIndex < 0 ||
      fromIndex >= state.currentPlaylist.tracks.length ||
      toIndex < 0 ||
      toIndex >= state.currentPlaylist.tracks.length
    ) {
      Logger.error('handleTrackReorder', 'Invalid track indices', {
        fromIndex,
        toIndex,
        trackCount: state.currentPlaylist.tracks.length,
      });
      showToast('Cannot reorder tracks: Invalid track position', 'error');
      return;
    }

    try {
      const newTracks = [...state.currentPlaylist.tracks];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);

      const updatedPlaylist = {
        ...state.currentPlaylist,
        tracks: newTracks,
        updated_at: new Date().toISOString(),
      };
      dispatch({ type: 'SET_PLAYLIST', payload: updatedPlaylist });
      saveCurrentPlaylist(updatedPlaylist);
    } catch (error) {
      Logger.error('handleTrackReorder', 'Failed to reorder tracks', error);
      showToast('Failed to reorder tracks', 'error');
    }
  };

  const handleTrackRemove = (index: number) => {
    if (!state.currentPlaylist || !state.currentPlaylist.tracks) {
      Logger.error('handleTrackRemove', 'No playlist or tracks available');
      showToast('Cannot remove track: No playlist selected', 'error');
      return;
    }

    // Validate index
    if (index < 0 || index >= state.currentPlaylist.tracks.length) {
      Logger.error('handleTrackRemove', 'Invalid track index', {
        index,
        trackCount: state.currentPlaylist.tracks.length,
      });
      showToast('Cannot remove track: Invalid track position', 'error');
      return;
    }

    try {
      const newTracks = state.currentPlaylist.tracks.filter(
        (_, i) => i !== index
      );
      const updatedPlaylist = {
        ...state.currentPlaylist,
        tracks: newTracks,
        updated_at: new Date().toISOString(),
      };
      dispatch({ type: 'SET_PLAYLIST', payload: updatedPlaylist });
      saveCurrentPlaylist(updatedPlaylist);
      showToast('Track removed successfully', 'success');
    } catch (error) {
      Logger.error('handleTrackRemove', 'Failed to remove track', error);
      showToast('Failed to remove track', 'error');
    }
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: playlist });
    saveCurrentPlaylist(playlist);
  };

  // --- Session handlers ---
  const handleSessionEnd = () => {
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_PLAYING', payload: false });
    navigate('/');
    showToast('Session ended', 'info');
  };

  // --- Render states ---
  if (state.isLoading || tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading The New Magic DJ..." />
      </div>
    );
  }

  // Authentication removed - direct access to app

  return (
    <div className="min-h-screen gradient-bg-primary">
      <AuthSaveBanner />

      <Navigation
        user={state.user}
        hasPlaylist={!!state.currentPlaylist}
        hasSession={!!state.currentSession}
      />

      {state.error && (
        <div className="mx-4 mt-4">
          <div className="glass-card p-4 bg-red-500/10 border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-red-400 text-sm">⚠</span>
                </div>
                <div>
                  <p className="text-red-400 font-medium">Something went wrong</p>
                  <p className="text-red-300 text-sm">{state.error}</p>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                className="glass-button w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/20"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center gradient-bg-primary">
          <LoadingSpinner
            variant="futuristic"
            size="large"
            text="Loading MagicDJ..."
            subtext="Preparing your AI studio"
          />
        </div>
      }>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <LandingPage
                  onStartMixing={() => navigate('/create')}
                  onLibraryAccess={() => navigate('/library')}
                  recentSessions={state.recentSessions}
                />
              </ErrorBoundary>
            }
          />

          <Route
            path="/create"
            element={
              <ErrorBoundary>
                {state.isEditingPlaylist && state.currentPlaylist ? (
                  <PlaylistEditor
                    playlist={state.currentPlaylist}
                    currentTrackIndex={0}
                    isPlaying={state.isPlaying}
                    onTrackSelect={() => {}}
                    onTrackRemove={handleTrackRemove}
                    onTrackReorder={handleTrackReorder}
                    onPlaylistUpdate={handlePlaylistUpdate}
                    onSendToPlayer={() =>
                      state.currentPlaylist &&
                      handlePlaylistEdited(state.currentPlaylist)
                    }
                  />
                ) : (
                  <MagicStudio
                    user={state.user}
                    onPlaylistGenerated={handlePlaylistGenerated}
                    onBack={() => window.history.back()}
                    onLibraryAccess={() => navigate('/library')}
                    recentSessions={state.recentSessions}
                  />
                )}
              </ErrorBoundary>
            }
          />

          <Route
            path="/play"
            element={
              <ErrorBoundary>
                {state.currentPlaylist ? (
                  <ProfessionalMagicPlayer
                    playlist={state.currentPlaylist}
                    session={state.currentSession}
                    isPlaying={state.isPlaying}
                    onPlayPause={playing =>
                      dispatch({ type: 'SET_PLAYING', payload: playing })
                    }
                    onSessionEnd={handleSessionEnd}
                    onBack={() => navigate('/create')}
                  />
                ) : (
                  <Navigate to="/create" replace />
                )}
              </ErrorBoundary>
            }
          />

          <Route
            path="/library"
            element={
              <ErrorBoundary>
                <LibraryProfile
                  user={state.user}
                  savedPlaylists={state.savedPlaylists}
                  onBack={() => window.history.back()}
                  onPlaylistSelect={handlePlaylistSelect}
                  onCreateNew={() => navigate('/create')}
                />
              </ErrorBoundary>
            }
          />

          <Route
            path="/analytics"
            element={
              <ErrorBoundary>
                {state.currentPlaylist && state.currentSession ? (
                  <AnalyticsExport
                    playlist={state.currentPlaylist}
                    session={state.currentSession}
                    onBack={() => window.history.back()}
                    onSaveToLibrary={saveCurrentPlaylist}
                    onEditAgain={() => navigate('/create')}
                  />
                ) : (
                  <Navigate to="/" replace />
                )}
              </ErrorBoundary>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

// --- App wrapper ---
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
