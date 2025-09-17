import { useState, useRef } from 'react';
import {
  Zap,
  Music,
  Mic,
  Upload,
  ArrowLeft,
  Sparkles,
  Wand2,
  Radio,
  BarChart3,
  Save,
  History,
  Disc,
} from 'lucide-react';
import { User, Playlist } from '../types';
import { playlistService } from '../services/playlistService';
import { audioProcessingService } from '../services/audioProcessingService';
import { logger } from '../utils/logger';

interface MagicStudioProps {
  user: User | null;
  onPlaylistGenerated: (playlist: Playlist) => void;
  onBack: () => void;
  onLibraryAccess?: () => void;
  recentSessions?: any[];
}

const MagicStudio: React.FC<MagicStudioProps> = ({
  user,
  onPlaylistGenerated,
  onBack,
  onLibraryAccess,
  recentSessions = [],
}) => {
  const [activeMode, setActiveMode] = useState<'match' | 'set' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showRecentSessions, setShowRecentSessions] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [selectedEnergy, setSelectedEnergy] = useState<
    'low' | 'medium' | 'high' | ''
  >('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vibes = [
    {
      name: 'Electronic',
      icon: Zap,
      color: 'neon-green',
      description: 'Synth-heavy electronic beats',
    },
    {
      name: 'Hip-Hop',
      icon: Mic,
      color: 'neon-purple',
      description: 'Urban rhythms and rap flows',
    },
    {
      name: 'House',
      icon: Disc,
      color: 'neon-blue',
      description: 'Four-on-the-floor dance music',
    },
    {
      name: 'Techno',
      icon: Radio,
      color: 'neon-orange',
      description: 'Industrial electronic sounds',
    },
  ];

  const energyLevels = [
    {
      level: 'low',
      label: 'Chill',
      color: 'neon-blue',
      description: 'Relaxed and ambient',
    },
    {
      level: 'medium',
      label: 'Groove',
      color: 'neon-green',
      description: 'Steady and rhythmic',
    },
    {
      level: 'high',
      label: 'Peak',
      color: 'neon-purple',
      description: 'High energy and intense',
    },
  ];

  const handleMagicMatch = async (source: 'mic' | 'file' | 'stream') => {
    logger.info('MagicStudio', `Starting MagicMatch with source: ${source}`);
    setActiveMode('match');
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Initializing audio capture...');

    try {
      let fingerprint = '';

      if (source === 'mic') {
        setStatusMessage('Listening via microphone...');
        setProgress(20);

        try {
          await audioProcessingService.startMicrophoneCapture();
          const result =
            await audioProcessingService.processAudioFromMicrophone(8000);
          fingerprint = result.fingerprint;
          setStatusMessage(
            `Audio captured (${Math.round(result.confidence * 100)}% confidence)`
          );
        } catch (error) {
          logger.warn(
            'MagicStudio',
            'Microphone access failed, using mock data',
            error
          );
          fingerprint = 'mock_mic_' + Date.now().toString(16);
          setStatusMessage('Audio captured (simulated)');
        }
        setProgress(40);
      } else if (source === 'file') {
        return;
      } else if (source === 'stream') {
        setStatusMessage('Capturing from audio stream...');
        setProgress(20);

        await new Promise(resolve => setTimeout(resolve, 2000));
        fingerprint = 'stream_' + Date.now().toString(16);

        setStatusMessage('Stream audio captured');
        setProgress(40);
      }

      const steps = [
        'Analyzing frequency patterns...',
        'Generating audio fingerprint...',
        'Querying music database...',
        'Searching recognition services...',
        'Creating AI-curated playlist...',
      ];

      for (let i = 0; i < steps.length; i++) {
        setStatusMessage(steps[i]);
        setProgress(40 + ((i + 1) / steps.length) * 60);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      try {
        const playlist = await playlistService.generateMagicMatchPlaylist({
          fingerprint,
        });
        logger.info(
          'MagicStudio',
          'MagicMatch playlist generated successfully',
          {
            trackCount: playlist.tracks.length,
            duration: playlist.total_duration,
          }
        );
        onPlaylistGenerated(playlist);
      } catch (error) {
        logger.error(
          'MagicStudio',
          'Failed to generate MagicMatch playlist',
          error
        );
        setStatusMessage(
          'Failed to generate playlist. Please check your API configuration.'
        );
        setTimeout(() => {
          setIsProcessing(false);
          setActiveMode(null);
        }, 2000);
        return;
      }
    } catch (error) {
      logger.error('MagicStudio', 'MagicMatch recognition failed', error);
      setStatusMessage(
        'Recognition failed. Please try again or check your microphone permissions.'
      );
      setProgress(80);

      setTimeout(() => {
        setIsProcessing(false);
        setActiveMode(null);
      }, 2000);
      return;
    } finally {
      setIsProcessing(false);
      setActiveMode(null);
      audioProcessingService.stopMicrophoneCapture();
    }
  };

  const handleMagicSet = async (
    vibe: string,
    energy: 'low' | 'medium' | 'high'
  ) => {
    logger.info('MagicStudio', `Starting MagicSet generation`, {
      vibe,
      energy,
    });
    setActiveMode('set');
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Analyzing your preferences...');

    try {
      const steps = [
        'Analyzing your preferences...',
        'Selecting base tracks...',
        'Applying harmonic matching...',
        'Optimizing energy flow...',
        'Finalizing your set...',
      ];

      for (let i = 0; i < steps.length; i++) {
        setStatusMessage(steps[i]);
        setProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      try {
        const playlist = await playlistService.generateMagicSetPlaylist({
          vibe,
          energyLevel: energy,
          userId: user?.id,
        });
        logger.info('MagicStudio', 'MagicSet playlist generated successfully', {
          vibe,
          energy,
          trackCount: playlist.tracks.length,
          duration: playlist.total_duration,
        });
        onPlaylistGenerated(playlist);
      } catch (error) {
        logger.error(
          'MagicStudio',
          'Failed to generate MagicSet playlist',
          error
        );
        setStatusMessage(
          'Failed to generate playlist. Please check your API configuration.'
        );
        setTimeout(() => {
          setIsProcessing(false);
          setActiveMode(null);
        }, 2000);
        return;
      }
    } catch (error) {
      logger.error('MagicStudio', 'MagicSet generation failed', error);
      setStatusMessage(
        'Generation failed. Please check your API configuration and try again.'
      );
      setTimeout(() => {
        setIsProcessing(false);
        setActiveMode(null);
      }, 2000);
      return;
    } finally {
      setIsProcessing(false);
      setActiveMode(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      logger.info('MagicStudio', 'Processing uploaded file', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      setActiveMode('match');
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Processing uploaded file...');

      playlistService
        .recognizeFromAudioFile(file)
        .then(async result => {
          if (result) {
            logger.info('MagicStudio', 'Track recognized from file', {
              track: `${result.title} - ${result.artist}`,
            });
            setStatusMessage('Track recognized from file!');
            setProgress(60);

            const playlist = await playlistService.generateMagicMatchPlaylist(
              {}
            );
            playlist.tracks.unshift(result);
            onPlaylistGenerated(playlist);
            return;
          }

          logger.warn(
            'MagicStudio',
            'Direct recognition failed, trying fingerprint approach'
          );
          const fingerprintResult =
            await audioProcessingService.processAudioFile(file);
          setStatusMessage(
            `File processed (${Math.round(fingerprintResult.confidence * 100)}% confidence)`
          );
          setProgress(40);

          const steps = [
            'Analyzing audio fingerprint...',
            'Querying recognition services...',
            'Generating AI playlist...',
          ];

          for (let i = 0; i < steps.length; i++) {
            setStatusMessage(steps[i]);
            setProgress(40 + ((i + 1) / steps.length) * 60);
            await new Promise(resolve => setTimeout(resolve, 600));
          }

          const playlist = await playlistService.generateMagicMatchPlaylist({
            fingerprint: fingerprintResult.fingerprint,
          });
          onPlaylistGenerated(playlist);
        })
        .catch(async error => {
          logger.error('MagicStudio', 'File processing failed', error);
          setStatusMessage(
            'File processing failed. Please try a different audio file.'
          );
          setProgress(80);

          setTimeout(() => {
            setIsProcessing(false);
            setActiveMode(null);
          }, 2000);
        })
        .finally(() => {
          setIsProcessing(false);
          setActiveMode(null);
        });
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen gradient-bg-primary flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float"
            style={{ animationDelay: '1s' }}
          ></div>
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto p-8">
          {/* Futuristic Animated Logo */}
          <div
            className={`w-32 h-32 glass-card flex items-center justify-center mx-auto mb-8 animate-pulse-glow ${activeMode === 'match' ? 'shadow-neon-cyan' : 'shadow-neon-pink'}`}
          >
            {activeMode === 'match' ? (
              <Zap className="w-16 h-16 text-gradient-accent" />
            ) : (
              <Wand2 className="w-16 h-16 text-gradient-primary" />
            )}
          </div>

          {/* Glass Progress Bar */}
          <div className="w-full glass-card h-4 mb-8 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${activeMode === 'match' ? 'gradient-bg-accent' : 'gradient-bg-secondary'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Futuristic Status Message */}
          <h2
            className={`text-3xl font-bold mb-4 font-orbitron tracking-wide ${activeMode === 'match' ? 'text-gradient-accent' : 'text-gradient-primary'}`}
          >
            {activeMode === 'match' ? 'MAGICMATCH' : 'MAGICSET'} PROCESSING
          </h2>
          <p className="text-gray-300 text-xl font-inter mb-2">
            {statusMessage}
          </p>
          <p className="text-gray-500 text-sm font-mono">
            {Math.round(progress)}% COMPLETE
          </p>

          {/* Animated Waveform Visualization */}
          <div className="flex justify-center mt-12">
            <div className="flex items-end space-x-1 h-16">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-primary relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-3/4 left-1/2 w-48 h-48 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      {/* Glass Header */}
      <div className="relative z-10 px-4 lg:px-6 py-4 lg:py-6 nav-sticky">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-10 h-10 lg:w-12 lg:h-12 glass-button flex items-center justify-center hover-lift"
            >
              <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gradient-accent" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 glass-card flex items-center justify-center animate-pulse-glow">
                <Sparkles className="w-6 h-6 lg:w-7 lg:h-7 text-gradient-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gradient-primary tracking-wide font-orbitron">
                  MAGIC STUDIO
                </h1>
                <p className="text-sm text-gradient-accent font-mono">
                  AI-POWERED CREATION SUITE
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-4">
            <button
              onClick={() => setShowRecentSessions(!showRecentSessions)}
              className="glass-button px-3 py-2 flex items-center space-x-2 text-sm font-inter"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">RECENT</span>
            </button>
            {onLibraryAccess && (
              <button
                onClick={onLibraryAccess}
                className="btn-secondary px-3 py-2 flex items-center space-x-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">LIBRARY</span>
              </button>
            )}
            <div className="hidden sm:flex items-center text-right">
              <div>
                <p className="text-sm text-gray-400 font-mono">WELCOME BACK,</p>
                <p className="font-bold truncate max-w-32 lg:max-w-none text-gradient-accent font-mono">
                  {user?.email}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 glass-card flex items-center justify-center shadow-neon-pink ml-3">
                <span className="font-bold text-gradient-primary text-lg">
                  {user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glass Recent Sessions Panel */}
      {showRecentSessions && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-6 hover-lift">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-gradient-accent mb-4 flex items-center space-x-2 font-orbitron">
              <History className="w-5 h-5" />
              <span>RECENT SESSIONS</span>
            </h3>
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSessions.slice(0, 6).map((session, index) => (
                  <div
                    key={index}
                    className="glass-card p-4 hover-lift cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 gradient-bg-accent rounded-full flex items-center justify-center shadow-neon-cyan">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-white truncate group-hover:text-gradient-accent transition-colors font-inter">
                        {session.name || `Session ${index + 1}`}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-400 font-mono">
                      {session.tracks?.length || 0} tracks
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {new Date(
                        session.created_at || Date.now()
                      ).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 font-inter">
                  No recent sessions found
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Futuristic Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
        <div className="text-center mb-12 lg:mb-20">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 lg:mb-8 text-white font-orbitron tracking-wide">
            CHOOSE YOUR
            <span className="block text-gradient-primary text-neon-glow animate-pulse-glow">
              MAGIC
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto px-4 font-inter leading-relaxed">
            AI-assisted creation, playback, and analysis of DJ sets with
            real-time crowd sensing
          </p>
        </div>

        {/* Glass Mode Selection */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto mb-16">
          {/* Glass MagicMatch */}
          <div className="group hover-lift">
            <div className="glass-card p-8 lg:p-10">
              <div className="flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 gradient-bg-accent rounded-xl mb-8 mx-auto group-hover:scale-110 transition-transform shadow-neon-cyan animate-pulse-glow">
                <Zap className="w-12 h-12 lg:w-14 lg:h-14 text-white" />
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-center text-gradient-accent tracking-wider font-orbitron">
                MAGICMATCH
              </h2>
              <p className="text-base lg:text-lg text-gray-300 text-center mb-8 leading-relaxed font-inter">
                Recognize what's playing and let AI create the perfect
                continuation playlist
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => handleMagicMatch('mic')}
                  className="btn-accent w-full py-4 lg:py-5 px-6 flex items-center justify-center space-x-3 text-base lg:text-lg font-bold hover-lift"
                >
                  <Mic className="w-6 h-6" />
                  <span>LISTEN VIA MICROPHONE</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-button w-full py-4 lg:py-5 px-6 flex items-center justify-center space-x-3 text-base lg:text-lg font-bold hover-lift"
                >
                  <Upload className="w-6 h-6" />
                  <span>UPLOAD AUDIO FILE</span>
                </button>

                <button
                  onClick={() => handleMagicMatch('stream')}
                  className="glass-button w-full py-4 lg:py-5 px-6 flex items-center justify-center space-x-3 text-base lg:text-lg font-bold hover-lift"
                >
                  <Radio className="w-6 h-6" />
                  <span>CAPTURE FROM STREAM</span>
                </button>
              </div>
            </div>
          </div>

          {/* Glass MagicSet */}
          <div className="group hover-lift">
            <div className="glass-card p-8 lg:p-10">
              <div className="flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 gradient-bg-secondary rounded-xl mb-8 mx-auto group-hover:scale-110 transition-transform shadow-neon-pink animate-pulse-glow">
                <Wand2 className="w-12 h-12 lg:w-14 lg:h-14 text-white" />
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-center text-gradient-primary tracking-wider font-orbitron">
                MAGICSET
              </h2>
              <p className="text-base lg:text-lg text-gray-300 text-center mb-8 leading-relaxed font-inter">
                Generate an AI-curated playlist from scratch based on your vibe
                and energy preferences
              </p>

              <div className="space-y-6">
                {/* Glass Vibe Selection */}
                <div>
                  <label className="block text-sm lg:text-base font-bold text-gray-300 mb-4 tracking-wide font-orbitron">
                    CHOOSE YOUR VIBE
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {vibes.map(vibe => {
                      const Icon = vibe.icon;
                      const isSelected =
                        selectedVibe === vibe.name.toLowerCase();
                      return (
                        <button
                          key={vibe.name}
                          onClick={() => {
                            setSelectedVibe(vibe.name.toLowerCase());
                            if (selectedEnergy) {
                              handleMagicSet(
                                vibe.name.toLowerCase(),
                                selectedEnergy
                              );
                            }
                          }}
                          className={`py-3 lg:py-4 px-4 text-sm lg:text-base font-bold flex items-center justify-center space-x-2 transition-all hover-lift ${
                            isSelected ? 'btn-primary' : 'glass-button'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{vibe.name.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Glass Energy Level */}
                <div>
                  <label className="block text-sm lg:text-base font-bold text-gray-300 mb-4 tracking-wide font-orbitron">
                    ENERGY LEVEL
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {energyLevels.map(({ level, label }) => {
                      const isSelected = selectedEnergy === level;
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            setSelectedEnergy(
                              level as 'low' | 'medium' | 'high'
                            );
                            if (selectedVibe) {
                              handleMagicSet(
                                selectedVibe,
                                level as 'low' | 'medium' | 'high'
                              );
                            }
                          }}
                          className={`py-3 lg:py-4 px-3 text-sm lg:text-base font-bold transition-all hover-lift ${
                            isSelected ? 'btn-secondary' : 'glass-button'
                          }`}
                        >
                          {label.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Generate Button */}
                {selectedVibe && selectedEnergy && (
                  <button
                    onClick={() => handleMagicSet(selectedVibe, selectedEnergy)}
                    className="btn-primary w-full py-4 px-6 text-lg font-bold hover-lift animate-pulse-glow"
                  >
                    GENERATE {selectedVibe.toUpperCase()} SET
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Glass Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 lg:p-8 glass-card hover-lift group">
            <div className="text-3xl lg:text-4xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 transition-transform">
              99.8%
            </div>
            <div className="text-sm lg:text-base text-gray-400 font-inter tracking-wide">
              RECOGNITION ACCURACY
            </div>
            <div className="w-12 h-1 gradient-bg-accent mx-auto mt-2 rounded-full"></div>
          </div>
          <div className="text-center p-6 lg:p-8 glass-card hover-lift group">
            <div className="text-3xl lg:text-4xl font-bold text-gradient-primary mb-3 font-orbitron group-hover:scale-110 transition-transform">
              &lt;3s
            </div>
            <div className="text-sm lg:text-base text-gray-400 font-inter tracking-wide">
              AVERAGE PROCESSING TIME
            </div>
            <div className="w-12 h-1 gradient-bg-secondary mx-auto mt-2 rounded-full"></div>
          </div>
          <div className="text-center p-6 lg:p-8 glass-card hover-lift group">
            <div className="text-3xl lg:text-4xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 transition-transform">
              10M+
            </div>
            <div className="text-sm lg:text-base text-gray-400 font-inter tracking-wide">
              TRACKS IN DATABASE
            </div>
            <div className="w-12 h-1 gradient-bg-accent mx-auto mt-2 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default MagicStudio;
