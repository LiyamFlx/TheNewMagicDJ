import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Play, Pause, Volume2, Headphones } from 'lucide-react';
import { logger } from '../utils/logger';

interface AudioDebugInfo {
  audioContext: {
    state: string;
    sampleRate: number;
    supported: boolean;
  };
  htmlAudio: {
    supported: boolean;
    canPlayMP3: boolean;
    canPlayWAV: boolean;
    canPlayAAC: boolean;
  };
  permissions: {
    autoplay: string;
    microphone: string;
  };
  currentAudio: {
    src: string;
    readyState: number;
    networkState: number;
    error: string | null;
    duration: number;
    volume: number;
  } | null;
}

interface AudioDebuggerProps {
  testAudioUrl?: string;
  className?: string;
}

const AudioDebugger: React.FC<AudioDebuggerProps> = ({
  testAudioUrl = '',
  className = '',
}) => {
  const [debugInfo, setDebugInfo] = useState<AudioDebugInfo | null>(null);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize debug info
  useEffect(() => {
    const checkAudioSupport = async () => {
      const info: AudioDebugInfo = {
        audioContext: {
          state: 'unknown',
          sampleRate: 0,
          supported: false,
        },
        htmlAudio: {
          supported: false,
          canPlayMP3: false,
          canPlayWAV: false,
          canPlayAAC: false,
        },
        permissions: {
          autoplay: 'unknown',
          microphone: 'unknown',
        },
        currentAudio: null,
      };

      // Check AudioContext support
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          info.audioContext = {
            state: audioContextRef.current.state,
            sampleRate: audioContextRef.current.sampleRate,
            supported: true,
          };
        }
      } catch (error) {
        logger.warn('AudioDebugger', 'AudioContext not supported', error);
      }

      // Check HTML Audio support
      try {
        const testAudio = new Audio();
        info.htmlAudio = {
          supported: true,
          canPlayMP3: testAudio.canPlayType('audio/mpeg') !== '',
          canPlayWAV: testAudio.canPlayType('audio/wav') !== '',
          canPlayAAC: testAudio.canPlayType('audio/aac') !== '',
        };
      } catch (error) {
        logger.warn('AudioDebugger', 'HTML Audio not supported', error);
      }

      // Check autoplay policy
      try {
        const testAudio = new Audio();
        testAudio.volume = 0;
        const playPromise = testAudio.play();
        if (playPromise) {
          await playPromise;
          info.permissions.autoplay = 'allowed';
          testAudio.pause();
        }
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          info.permissions.autoplay = 'blocked';
        } else {
          info.permissions.autoplay = 'unknown';
        }
      }

      // Check microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        info.permissions.microphone = 'granted';
        stream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          info.permissions.microphone = 'denied';
        } else {
          info.permissions.microphone = 'unknown';
        }
      }

      setDebugInfo(info);
    };

    checkAudioSupport();
  }, []);

  // Update current audio info
  useEffect(() => {
    if (!audioRef.current || !debugInfo) return;

    const updateAudioInfo = () => {
      const audio = audioRef.current!;
      setDebugInfo(prev =>
        prev
          ? {
              ...prev,
              currentAudio: {
                src: audio.src,
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error?.message || null,
                duration: audio.duration || 0,
                volume: audio.volume,
              },
            }
          : prev
      );
    };

    const audio = audioRef.current;
    const events = [
      'loadstart',
      'loadedmetadata',
      'canplay',
      'canplaythrough',
      'error',
      'stalled',
    ];

    events.forEach(event => {
      audio.addEventListener(event, updateAudioInfo);
    });

    updateAudioInfo();

    return () => {
      events.forEach(event => {
        audio.removeEventListener(event, updateAudioInfo);
      });
    };
  }, [debugInfo, testAudioUrl]);

  const handleTestPlay = async () => {
    if (!audioRef.current) return;

    try {
      setTestError(null);

      if (isTestPlaying) {
        audioRef.current.pause();
        setIsTestPlaying(false);
      } else {
        // Resume AudioContext if needed
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        await audioRef.current.play();
        setIsTestPlaying(true);
      }
    } catch (error: any) {
      setTestError(error.message);
      logger.error('AudioDebugger', 'Test playback failed', error);
    }
  };

  const generateTestTone = () => {
    try {
      const audioContext =
        audioContextRef.current ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);

      logger.info('AudioDebugger', 'Test tone generated');
    } catch (error) {
      logger.error('AudioDebugger', 'Failed to generate test tone', error);
      setTestError('Failed to generate test tone');
    }
  };

  if (!debugInfo) {
    return (
      <div className={`glass-card p-4 ${className}`}>
        <div className="animate-pulse">Loading audio diagnostics...</div>
      </div>
    );
  }

  const getStatusColor = (condition: boolean) =>
    condition ? 'text-green-400' : 'text-red-400';
  const getReadyStateText = (state: number) => {
    const states = [
      'HAVE_NOTHING',
      'HAVE_METADATA',
      'HAVE_CURRENT_DATA',
      'HAVE_FUTURE_DATA',
      'HAVE_ENOUGH_DATA',
    ];
    return states[state] || 'UNKNOWN';
  };

  return (
    <div className={`glass-card p-6 space-y-6 ${className}`}>
      <div className="flex items-center space-x-3 border-b border-glass pb-4">
        <Headphones className="w-6 h-6 text-cyan-400" />
        <h3 className="text-xl font-bold text-white font-orbitron">
          AUDIO DIAGNOSTICS
        </h3>
      </div>

      {/* AudioContext Status */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-cyan-400 font-orbitron">
          AudioContext
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Supported:</span>
            <span className={getStatusColor(debugInfo.audioContext.supported)}>
              {debugInfo.audioContext.supported ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">State:</span>
            <span className="text-white">{debugInfo.audioContext.state}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Sample Rate:</span>
            <span className="text-white">
              {debugInfo.audioContext.sampleRate} Hz
            </span>
          </div>
        </div>
      </div>

      {/* HTML Audio Support */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-fuchsia-400 font-orbitron">
          HTML Audio
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Supported:</span>
            <span className={getStatusColor(debugInfo.htmlAudio.supported)}>
              {debugInfo.htmlAudio.supported ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">MP3:</span>
            <span className={getStatusColor(debugInfo.htmlAudio.canPlayMP3)}>
              {debugInfo.htmlAudio.canPlayMP3 ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">WAV:</span>
            <span className={getStatusColor(debugInfo.htmlAudio.canPlayWAV)}>
              {debugInfo.htmlAudio.canPlayWAV ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">AAC:</span>
            <span className={getStatusColor(debugInfo.htmlAudio.canPlayAAC)}>
              {debugInfo.htmlAudio.canPlayAAC ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-yellow-400 font-orbitron">
          Permissions
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Autoplay:</span>
            <span
              className={
                debugInfo.permissions.autoplay === 'allowed'
                  ? 'text-green-400'
                  : 'text-red-400'
              }
            >
              {debugInfo.permissions.autoplay.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Microphone:</span>
            <span
              className={
                debugInfo.permissions.microphone === 'granted'
                  ? 'text-green-400'
                  : 'text-red-400'
              }
            >
              {debugInfo.permissions.microphone.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Current Audio Status */}
      {debugInfo.currentAudio && (
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-purple-400 font-orbitron">
            Current Audio
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Ready State:</span>
              <span className="text-white">
                {getReadyStateText(debugInfo.currentAudio.readyState)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Duration:</span>
              <span className="text-white">
                {debugInfo.currentAudio.duration.toFixed(2)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Volume:</span>
              <span className="text-white">
                {(debugInfo.currentAudio.volume * 100).toFixed(0)}%
              </span>
            </div>
            {debugInfo.currentAudio.error && (
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-xs break-all">
                  {debugInfo.currentAudio.error}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="space-y-4 border-t border-glass pt-4">
        <h4 className="text-lg font-semibold text-white font-orbitron">
          Audio Tests
        </h4>

        <div className="flex space-x-4">
          <button
            onClick={generateTestTone}
            className="btn-secondary px-4 py-2 text-sm font-bold flex items-center space-x-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>TEST TONE</span>
          </button>

          {testAudioUrl && (
            <button
              onClick={handleTestPlay}
              className="btn-primary px-4 py-2 text-sm font-bold flex items-center space-x-2"
              disabled={!debugInfo.htmlAudio.supported}
            >
              {isTestPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isTestPlaying ? 'STOP' : 'PLAY'} TEST</span>
            </button>
          )}
        </div>

        {testError && (
          <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-400 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <span className="text-red-400 text-sm">{testError}</span>
          </div>
        )}
      </div>

      {/* Hidden test audio element */}
      {testAudioUrl && (
        <audio
          ref={audioRef}
          src={testAudioUrl}
          preload="metadata"
          onEnded={() => setIsTestPlaying(false)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default AudioDebugger;
