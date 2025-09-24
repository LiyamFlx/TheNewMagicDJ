import React, { useReducer, useEffect, useCallback, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import NotFound from './components/NotFound';

import { Playlist, User, Session } from './types/index';
import { supabasePlaylistService } from './services/supabasePlaylistService';
import { spotifyService } from './services/spotifyService';
import { logEvent } from './services/eventsService';
import { supabase } from './lib/supabase';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSpotifyToken } from './hooks/useSpotifyToken';
import { useToast } from './hooks/useToast';
import { logger } from './utils/logger';

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
// Wrapper for shared logger to match prior lightweight usage in this file
const Logger = {
  info: (...args: any[]) => {
    const [message, ...rest] = args;
    const data = rest.length
      ? rest.length === 1
        ? rest[0]
        : { args: rest }
      : undefined;
    logger.info('App', String(message), data);
  },
  warn: (...args: any[]) => {
    const [message, ...rest] = args;
    const data = rest.length
      ? rest.length === 1
        ? rest[0]
        : { args: rest }
      : undefined;
    logger.warn('App', String(message), data);
  },
  _error: (...args: any[]) => {
    const [message, ...rest] = args;
    const err = rest.find((r: any) => r instanceof Error) ?? rest[0];
    logger._error('App', String(message), err);
  },
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
  _error: string | null;
  showAuthModal: boolean;
  authModalMode: 'signin' | 'signup';
}

const initialState: AppState = {
  user: null, // Start without user to enable authentication
  savedPlaylists: [],
  recentSessions: [],
  currentPlaylist: null,
  currentSession: null,
  isPlaying: false,
  isEditingPlaylist: false,
  isLoading: false,
  _error: null,
  showAuthModal: false,
  authModalMode: 'signin',
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
  | { type: 'SET_EDITING'; payload: boolean }
  | {
      type: 'SHOW_AUTH_MODAL';
      payload: { show: boolean; mode?: 'signin' | 'signup' };
    };

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
      return { ...state, _error: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_EDITING':
      return { ...state, isEditingPlaylist: action.payload };
    case 'SHOW_AUTH_MODAL':
      return {
        ...state,
        showAuthModal: action.payload.show,
        authModalMode: action.payload.mode || state.authModalMode,
      };
    default:
      return state;
  }
}

// --- Main AppContent ---
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Save function indirection to allow debounced calls before declaration
  const saveFnRef = React.useRef<(pl: Playlist) => void>(() => {});
  const saveDebounceRef = React.useRef<number | null>(null);
  const saveCurrentPlaylistDebounced = useCallback((pl: Playlist) => {
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current);
    }
    saveDebounceRef.current = window.setTimeout(() => {
      try {
        saveFnRef.current?.(pl);
      } catch {}
      localStorage.setItem('last-resume-at', String(Date.now()));
    }, 500);
  }, []);

  // Spotify token
  const { isLoading: tokenLoading, fetchLazy: fetchSpotifyTokenLazy } =
    useSpotifyToken();

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

  const [lastRoute, setLastRoute] = useLocalStorage<string>('last-route', '/');
  const [authDismissedAt, setAuthDismissedAt] = useLocalStorage<number>(
    'auth-dismissed-at',
    0
  );

  // --- Spotify is now lazily initialized when needed as fallback ---
  // Removed automatic initialization to improve startup performance

  // Provide lazy Spotify initialization function for services
  // @ts-ignore - Function reserved for future lazy initialization
  const unused__initializeSpotifyLazy =
    useCallback(async (): Promise<boolean> => {
      try {
        const token = await fetchSpotifyTokenLazy();
        if (token) {
          spotifyService.initialize(token);
          Logger.info('Spotify service lazily initialized');
          return true;
        }
        return false;
      } catch (_error) {
        Logger._error('Lazy Spotify initialization failed', _error);
        return false;
      }
    }, [fetchSpotifyTokenLazy]);

  // --- Initialize App ---
  useEffect(() => {
    const initializeApp = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        // Check if user is already authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const supabaseUser = sessionData.session.user;
          const appUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name:
              supabaseUser.user_metadata?.name ||
              supabaseUser.email?.split('@')[0] ||
              'User',
            created_at: supabaseUser.created_at,
          };
          dispatch({ type: 'SET_USER', payload: appUser });
          Logger.info('User already authenticated');
        } else {
          // Set up popup timer for unauthenticated users on homepage, respect dismissal for 7 days
          if (window.location.pathname === '/') {
            const dismissedAgo = Date.now() - (authDismissedAt || 0);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (dismissedAgo > sevenDays) {
              setTimeout(() => {
                dispatch({
                  type: 'SHOW_AUTH_MODAL',
                  payload: { show: true, mode: 'signup' },
                });
              }, 5000);
            }
          }
        }

        // Mock sessions (replace with Supabase)
        const mockSessions: Session[] = [
          {
            id: '1',
            name: 'Electronic Night',
            tracks: 15,
            duration: 3600,
            user_id: state.user?.id || 'guest',
            playlist_id: 'mock',
            started_at: new Date().toISOString(),
            status: 'completed' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        dispatch({ type: 'SET_SESSIONS', payload: mockSessions });
        Logger.info('MagicDJ initialized');
      } catch (err) {
        Logger._error('Init _error', err);
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to load application data',
        });
        showToast('Failed to load application data', '_error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initializeApp();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const supabaseUser = session.user;
          const appUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name:
              supabaseUser.user_metadata?.name ||
              supabaseUser.email?.split('@')[0] ||
              'User',
            created_at: supabaseUser.created_at,
          };
          dispatch({ type: 'SET_USER', payload: appUser });
          dispatch({ type: 'SHOW_AUTH_MODAL', payload: { show: false } });
          Logger.info('User signed in');
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SET_USER', payload: null });
          Logger.info('User signed out');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [authDismissedAt]);

  // Persist last route for resume
  useEffect(() => {
    setLastRoute(location.pathname + location.search);
  }, [location.pathname, location.search, setLastRoute]);

  // Initialize Spotify token on player route
  useEffect(() => {
    if (location.pathname.startsWith('/play')) {
      fetchSpotifyTokenLazy().catch(() => {});
      localStorage.setItem('last-resume-at', String(Date.now()));
    }
  }, [location.pathname, fetchSpotifyTokenLazy]);

  // Optional resume: only when user explicitly enables it (prevents home → create jump)
  useEffect(() => {
    if (location.pathname !== '/') return;

    const autoResumeEnabled =
      localStorage.getItem('auto-resume-enabled') === 'true';
    if (!autoResumeEnabled) return; // disabled by default

    const last = lastRoute || '/';
    const within12h =
      Date.now() - (Number(localStorage.getItem('last-resume-at')) || 0) <
      12 * 60 * 60 * 1000;
    const canResume = state.currentPlaylist || lastPlaylistId;
    if (
      canResume &&
      (last.startsWith('/create') ||
        last.startsWith('/edit') ||
        last.startsWith('/play')) &&
      within12h
    ) {
      showToast('Resuming where you left off', 'info');
      navigate(last);
    }
  }, [
    location.pathname,
    lastRoute,
    state.currentPlaylist,
    lastPlaylistId,
    navigate,
    showToast,
  ]);

  // --- Load user data ---
  const loadUserData = useCallback(
    async (userId: string) => {
      if (!userId) {
        Logger._error('loadUserData', 'No user ID provided');
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
            showToast(
              `Restored playlist: ${playlistToRestore.name}`,
              'success'
            );
          }
        }
      } catch (err) {
        Logger._error('Load user data _error', err);

        // Graceful fallback - don't crash the app
        dispatch({ type: 'SET_PLAYLISTS', payload: [] });

        const errorMessage =
          err instanceof Error ? err.message : 'Unknown _error';
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')
        ) {
          showToast('Network _error - working offline', 'warning');
        } else {
          showToast('Failed to load playlists - working offline', 'warning');
        }
      }
    },
    [setLastPlaylistId, showToast]
  );

  // Separate effect for user data loading
  useEffect(() => {
    if (state.user?.id) {
      loadUserData(state.user.id).catch(err => {
        Logger._error('Load user data _error', err);
        showToast('Failed to load user data', '_error');
      });
    }
  }, [state.user?.id]); // Remove function dependencies to prevent infinite loop

  // --- Playlist save handler ---
  const saveCurrentPlaylist = useCallback(
    async (playlist: Playlist) => {
      if (!playlist || !playlist.id) {
        Logger._error(
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
        Logger._error('Save playlist _error', err);

        const errorMessage =
          err instanceof Error ? err.message : 'Unknown _error';
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')
        ) {
          showToast('Network _error - playlist saved locally', 'warning');
        } else {
          showToast('Failed to save playlist to cloud', '_error');
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

  // Bind latest save function to ref used by debounced saver
  useEffect(() => {
    saveFnRef.current = saveCurrentPlaylist;
  }, [saveCurrentPlaylist]);

  // --- Auth handlers ---
  const handleAuthClick = (isSignUp: boolean) => {
    dispatch({
      type: 'SHOW_AUTH_MODAL',
      payload: { show: true, mode: isSignUp ? 'signup' : 'signin' },
    });
  };

  const handleAuthModalClose = () => {
    dispatch({ type: 'SHOW_AUTH_MODAL', payload: { show: false } });
    setAuthDismissedAt(Date.now());
  };

  // --- Playlist handlers ---
  const handlePlaylistGenerated = (pl: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: pl });
    dispatch({ type: 'SET_EDITING', payload: true });
    saveCurrentPlaylist(pl);
    showToast('Playlist generated!', 'success');
    navigate('/edit');
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
    navigate('/edit');
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!state.currentPlaylist || !state.currentPlaylist.tracks) {
      Logger._error('handleTrackReorder', 'No playlist or tracks available');
      showToast('Cannot reorder tracks: No playlist selected', '_error');
      return;
    }

    // Validate indices
    if (
      fromIndex < 0 ||
      fromIndex >= state.currentPlaylist.tracks.length ||
      toIndex < 0 ||
      toIndex >= state.currentPlaylist.tracks.length
    ) {
      Logger._error('handleTrackReorder', 'Invalid track indices', {
        fromIndex,
        toIndex,
        trackCount: state.currentPlaylist.tracks.length,
      });
      showToast('Cannot reorder tracks: Invalid track position', '_error');
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
      saveCurrentPlaylistDebounced(updatedPlaylist);
    } catch (_error) {
      Logger._error('handleTrackReorder', 'Failed to reorder tracks', _error);
      showToast('Failed to reorder tracks', '_error');
    }
  };

  const handleTrackRemove = (index: number) => {
    if (!state.currentPlaylist || !state.currentPlaylist.tracks) {
      Logger._error('handleTrackRemove', 'No playlist or tracks available');
      showToast('Cannot remove track: No playlist selected', '_error');
      return;
    }

    // Validate index
    if (index < 0 || index >= state.currentPlaylist.tracks.length) {
      Logger._error('handleTrackRemove', 'Invalid track index', {
        index,
        trackCount: state.currentPlaylist.tracks.length,
      });
      showToast('Cannot remove track: Invalid track position', '_error');
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
      saveCurrentPlaylistDebounced(updatedPlaylist);
      showToast('Track removed successfully', 'success');
    } catch (_error) {
      Logger._error('handleTrackRemove', 'Failed to remove track', _error);
      showToast('Failed to remove track', '_error');
    }
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    dispatch({ type: 'SET_PLAYLIST', payload: playlist });
    saveCurrentPlaylistDebounced(playlist);
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
      <Navigation
        user={state.user}
        hasPlaylist={!!state.currentPlaylist}
        hasSession={!!state.currentSession}
        onAuthClick={handleAuthClick}
      />

      {state._error && (
        <div className="mx-4 mt-4">
          <div className="glass-card p-4 bg-red-500/10 border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-red-400 text-sm">⚠</span>
                </div>
                <div>
                  <p className="text-red-400 font-medium">
                    Something went wrong
                  </p>
                  <p className="text-red-300 text-sm">{state._error}</p>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                className="glass-button w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/20"
                aria-label="Dismiss _error"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center gradient-bg-primary">
            <LoadingSpinner
              variant="futuristic"
              size="large"
              text="Loading MagicDJ..."
              subtext="Preparing your AI studio"
            />
          </div>
        }
      >
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
                <MagicStudio
                  user={state.user}
                  onPlaylistGenerated={handlePlaylistGenerated}
                  onBack={() => navigate('/')}
                  onLibraryAccess={() => navigate('/library')}
                  recentSessions={state.recentSessions}
                />
              </ErrorBoundary>
            }
          />

          <Route
            path="/edit"
            element={
              <ErrorBoundary>
                {state.currentPlaylist ? (
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
                    onSavePlaylist={() =>
                      state.currentPlaylist &&
                      saveCurrentPlaylist(state.currentPlaylist)
                    }
                  />
                ) : (
                  <Navigate to="/create" replace />
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
                    onPlayPause={async playing => {
                      dispatch({ type: 'SET_PLAYING', payload: playing });
                      // best-effort event
                      logEvent(playing ? 'player.play' : 'player.pause');
                    }}
                    onSessionEnd={handleSessionEnd}
                    onBack={() => navigate('/edit')}
                    onSavePlaylist={saveCurrentPlaylist}
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
                    onEditAgain={() => navigate('/edit')}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={state.showAuthModal}
        onClose={handleAuthModalClose}
        initialMode={state.authModalMode}
      />
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
