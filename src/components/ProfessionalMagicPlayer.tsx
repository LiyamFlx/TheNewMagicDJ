import { useEffect, useRef, useCallback, useReducer } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { Playlist, Session } from '../types';
import { AudioSource, AudioSourceType } from '../services/audioSourceService';

// Types
interface YouTubePlayerRef {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
}

interface PlayerState {
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: {
    message: string | null;
    isDegraded: boolean;
  };
  duration: number;
  currentTime: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  cuePoints: Array<{ position: number; label: string }>;
  settings: {
    crossfade: number;
    autoPlay: boolean;
    loop: boolean;
    bpmSync: boolean;
    autoMix: boolean;
    shuffle: boolean;
    repeat: boolean;
  };
  ui: {
    showPlaylist: boolean;
    showSettings: boolean;
    mobileMenuOpen: boolean;
    showPlaylistEditor: boolean;
    showMagicDancer: boolean;
    showUnmuteOverlay: boolean;
  };
  volumes: {
    deckA: number;
    deckB: number;
    master: number;
    crossfader: number;
  };
  progress: {
    deckA: number;
    deckB: number;
  };
  sources: {
    deckA: AudioSource | null;
    deckB: AudioSource | null;
  };
  readiness: {
    audioA: boolean;
    audioB: boolean;
    youtubeA: boolean;
    youtubeB: boolean;
  };
}

type PlayerAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_TRACK_INDEX'; payload: number }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { message: string | null; isDegraded?: boolean } }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_BUFFERED'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'ADD_CUE_POINT'; payload: { position: number; label: string } }
  | { type: 'CLEAR_CUE_POINTS' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'TOGGLE_PLAYLIST' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TIME'; payload: { deck: 'deckA' | 'deckB'; value: number } }
  | { type: 'SET_PROGRESS'; payload: { deck: 'deckA' | 'deckB'; value: number } }
  | { type: 'SET_SOURCES'; payload: { deckA: AudioSource | null; deckB: AudioSource | null } }
  | { type: 'SET_UI'; payload: Partial<PlayerState['ui']> }
  | { type: 'SET_READINESS'; payload: { key: keyof PlayerState['readiness']; value: boolean } };

interface ProfessionalMagicPlayerProps {
  playlist: Playlist | null;
  session?: Session | null;   // <-- add this
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  onSessionEnd: () => void;
  onBack: () => void;
}

const initialState: PlayerState = {
  currentTrackIndex: 0,
  isPlaying: false,
  isLoading: false,
  error: {
    message: null,
    isDegraded: false
  },
  duration: 0,
  currentTime: 0,
  buffered: 0,
  volume: 0.8,
  isMuted: false,
  cuePoints: [],
  settings: {
    crossfade: 0,
    autoPlay: true,
    loop: false,
    bpmSync: false,
    autoMix: false,
    shuffle: false,
    repeat: false,
  },
  ui: {
    showPlaylist: false,
    showSettings: false,
    mobileMenuOpen: false,
    showPlaylistEditor: false,
    showMagicDancer: true,
    showUnmuteOverlay: false
  },
  volumes: {
    deckA: 1.0,
    deckB: 1.0,
    master: 1.0,
    crossfader: 0,
  },
  progress: {
    deckA: 0,
    deckB: 0,
  },
  sources: {
    deckA: null,
    deckB: null,
  },
  readiness: {
    audioA: false,
    audioB: false,
    youtubeA: false,
    youtubeB: false,
  },
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'SET_TRACK_INDEX':
      return { ...state, currentTrackIndex: action.payload };
    case 'SET_IS_LOADING':
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        error: {
          message: action.payload.message,
          isDegraded: action.payload.isDegraded || false
        }
      };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_TIME':
      return {
        ...state,
        currentTime: action.payload.deck === 'deckA'
          ? action.payload.value
          : state.currentTime,
      };
    case 'SET_BUFFERED':
      return { ...state, buffered: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'ADD_CUE_POINT':
      return {
        ...state,
        cuePoints: [...state.cuePoints, action.payload],
      };
    case 'CLEAR_CUE_POINTS':
      return { ...state, cuePoints: [] };
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showSettings: !state.ui.showSettings,
          showPlaylist: state.ui.showPlaylist && !state.ui.showSettings ? state.ui.showPlaylist : false,
        },
      };
    case 'TOGGLE_PLAYLIST':
      return {
        ...state,
        ui: {
          ...state.ui,
          showPlaylist: !state.ui.showPlaylist,
          showSettings: state.ui.showSettings && !state.ui.showPlaylist ? state.ui.showSettings : false,
        },
      };
    case 'SET_PROGRESS':
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.deck]: action.payload.value,
        },
      };
    case 'SET_SOURCES':
      return {
        ...state,
        sources: {
          deckA: action.payload.deckA,
          deckB: action.payload.deckB,
        },
      };
    case 'SET_UI':
      return {
        ...state,
        ui: {
          ...state.ui,
          ...action.payload,
        },
      };
    case 'SET_READINESS':
      return {
        ...state,
        readiness: {
          ...state.readiness,
          [action.payload.key]: action.payload.value,
        },
      };
    default:
      return state;
  }
}

const ProfessionalMagicPlayer: React.FC<ProfessionalMagicPlayerProps> = ({
  playlist,
  isPlaying: propIsPlaying,
  onPlayPause,
  onBack,
}) => {
  // Initialize state with useReducer
  const [state, dispatch] = useReducer(playerReducer, initialState);

  // Refs for audio and YouTube players
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const youtubeARef = useRef<YouTubePlayerRef | null>(null);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (state.isPlaying) {
      audioARef.current?.pause();
      audioBRef.current?.pause();
      youtubeARef.current?.pauseVideo();
      dispatch({ type: 'PAUSE' });
      onPlayPause(false);
    } else {
      audioARef.current?.play().catch(e => {
        console.error('Error playing audio:', e);
        dispatch({
          type: 'SET_ERROR',
          payload: {
            message: 'Failed to play audio',
            isDegraded: true
          }
        });
      });
      youtubeARef.current?.playVideo();
      dispatch({ type: 'PLAY' });
      onPlayPause(true);
    }
  }, [state.isPlaying, onPlayPause]);

  // Handle track change
  const handleTrackChange = useCallback((index: number) => {
    if (!playlist?.tracks?.[index]) return;

    dispatch({ type: 'SET_IS_LOADING', payload: true });
    dispatch({ type: 'SET_TRACK_INDEX', payload: index });

    // Load the new track
    const track = playlist.tracks[index];
    const sourceType = track.url?.includes('youtube') ? 'youtube' : 'audio' as AudioSourceType;

    dispatch({
      type: 'SET_SOURCES',
      payload: {
        deckA: { type: sourceType, url: track.url || '' },
        deckB: null
      }
    });

    // Auto-play if enabled
    if (state.settings.autoPlay) {
      handlePlayPause();
    }
  }, [playlist, state.settings.autoPlay, handlePlayPause]);

  // Sync prop changes with internal state
  useEffect(() => {
    if (propIsPlaying !== state.isPlaying) {
      handlePlayPause();
    }
  }, [propIsPlaying, state.isPlaying, handlePlayPause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup audio elements
      audioARef.current?.pause();
      audioBRef.current?.pause();
      youtubeARef.current?.pauseVideo();
    };
  }, [audioARef, audioBRef, youtubeARef]);

  return (
    <div className="min-h-screen gradient-bg-primary overflow-hidden font-orbitron relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-glass nav-sticky">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">
            {playlist?.name || 'Professional Magic Player'}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
            className={`p-2 rounded-full ${state.ui.showSettings ? 'bg-gray-800' : 'hover:bg-gray-800'} transition-colors`}
            aria-label="Settings"
            title="Settings"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{
                width: `${(state.currentTime / (state.duration || 1)) * 100}%`,
                minWidth: '0.5rem',
                maxWidth: '100%'
              } as React.CSSProperties}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={state.duration || 1}
              aria-valuenow={state.currentTime}
              aria-valuetext={`${Math.floor(state.currentTime)} seconds`}
              aria-label="Playback progress"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">
            {playlist?.tracks[state.currentTrackIndex]?.title || 'No track selected'}
          </h2>
          <p className="text-gray-400">
            {playlist?.tracks[state.currentTrackIndex]?.artist || 'Unknown artist'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center space-x-6 mb-8">
          <button
            onClick={() => handleTrackChange(Math.max(0, state.currentTrackIndex - 1))}
            className="p-3 rounded-full hover:bg-gray-800 transition-colors"
            disabled={!playlist?.tracks.length || state.currentTrackIndex === 0}
            aria-label="Previous track"
            title="Previous track"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-4 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
            disabled={!playlist?.tracks.length}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
            title={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </button>

          <button
            onClick={() => handleTrackChange(Math.min(
              (playlist?.tracks.length || 1) - 1,
              state.currentTrackIndex + 1
            ))}
            className="p-3 rounded-full hover:bg-gray-800 transition-colors"
            disabled={!playlist?.tracks.length || state.currentTrackIndex === (playlist?.tracks.length || 1) - 1}
            aria-label="Next track"
            title="Next track"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <label htmlFor="volume-control" className="sr-only">Volume</label>
          <input
            id="volume-control"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.volume}
            onChange={(e) => dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) })}
            className="w-32 accent-purple-600"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={state.volume}
            aria-valuetext={`${Math.round(state.volume * 100)}%`}
            aria-label="Volume control"
            title="Volume control"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Audio Elements (hidden) */}
        <audio ref={audioARef} />
        <audio ref={audioBRef} />

        {/* Error Message */}
        {state.error.message && (
          <div className="fixed bottom-4 left-4 right-4 bg-red-900 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center">
            <span>{state.error.message}</span>
            <button
              onClick={() => dispatch({ type: 'SET_ERROR', payload: { message: null } })}
              className="text-white hover:text-gray-300"
              aria-label="Dismiss error"
              title="Dismiss error"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format time (mm:ss)
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

export default ProfessionalMagicPlayer;
