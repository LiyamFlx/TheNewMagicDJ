import React from 'react';
import { Play, Pause, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface UnifiedAudioPlayerProps {
  src?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
}

const UnifiedAudioPlayer: React.FC<UnifiedAudioPlayerProps> = ({
  src,
  onPlay,
  onPause,
  onError,
  className = '',
  showControls = true,
  autoPlay = false,
}) => {
  const [state, controls] = useAudioEngine();

  // Load audio when src changes
  React.useEffect(() => {
    if (src) {
      controls.load(src);
    }
  }, [src, controls]);

  // Auto play when ready (if enabled and not blocked)
  React.useEffect(() => {
    if (autoPlay && state.canPlay && !state.isPlaying && !state.autoplayBlocked) {
      controls.play().catch(() => {
        // Autoplay failed, but we'll show retry button
      });
    }
  }, [autoPlay, state.canPlay, state.isPlaying, state.autoplayBlocked, controls]);

  // Notify parent of state changes
  React.useEffect(() => {
    if (state.isPlaying) {
      onPlay?.();
    } else {
      onPause?.();
    }
  }, [state.isPlaying, onPlay, onPause]);

  React.useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  const handlePlayPause = async () => {
    try {
      if (state.isPlaying) {
        controls.pause();
      } else {
        await controls.play();
      }
    } catch (error) {
      console.error('Play/pause failed:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    controls.seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    controls.setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderErrorState = () => (
    <div className="flex items-center space-x-3 p-4 bg-red-900/20 border border-red-500 rounded-sm">
      <AlertCircle className="w-5 h-5 text-red-400" />
      <div className="flex-1">
        <p className="text-red-400 font-mono text-sm">{state.error}</p>
        {state.autoplayBlocked && (
          <p className="text-red-300 font-mono text-xs mt-1">
            Browser blocked autoplay. Click play to start.
          </p>
        )}
      </div>
      <button
        onClick={controls.retry}
        className="cyber-button px-3 py-1 text-sm flex items-center space-x-2"
        aria-label="Retry"
      >
        <RefreshCw className="w-4 h-4" />
        <span>RETRY</span>
      </button>
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex items-center space-x-3 p-4">
      <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
      <span className="text-neon-green font-mono">LOADING AUDIO...</span>
    </div>
  );

  if (!showControls && state.error) {
    return <div className={`${className} opacity-50`}>{renderErrorState()}</div>;
  }

  if (!showControls) {
    return <div className={className} />; // Hidden player
  }

  return (
    <div className={`bg-cyber-dark border-2 border-neon-green rounded-sm p-4 ${className}`}>
      {state.error && renderErrorState()}

      {state.isLoading && !state.error && renderLoadingState()}

      {!state.error && (
        <>
          {/* Main Controls */}
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={handlePlayPause}
              disabled={!state.canPlay || state.isLoading}
              className="w-12 h-12 bg-cyber-medium border-2 border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className="w-6 h-6 neon-text-green" />
              ) : (
                <Play className="w-6 h-6 neon-text-green ml-1" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between text-sm font-mono text-neon-green mb-2">
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>

              {/* Progress Bar */}
              <input
                type="range"
                min="0"
                max={state.duration || 0}
                value={state.currentTime}
                onChange={handleSeek}
                disabled={!state.canPlay}
                className="cyber-slider w-full"
              />
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 neon-text-purple" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={handleVolumeChange}
              className="cyber-slider cyber-slider-purple flex-1"
            />
            <span className="text-sm font-mono neon-text-purple w-12">
              {Math.round(state.volume * 100)}%
            </span>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-between mt-4 text-xs font-mono">
            <div className="flex items-center space-x-4">
              <span className={state.canPlay ? 'text-neon-green' : 'text-cyber-gray'}>
                {state.canPlay ? 'READY' : 'LOADING'}
              </span>
              {state.autoplayBlocked && (
                <span className="text-orange-400">AUTOPLAY BLOCKED</span>
              )}
            </div>

            {src && (
              <span className="text-cyber-gray truncate max-w-xs">
                {new URL(src).pathname.split('/').pop()}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedAudioPlayer;