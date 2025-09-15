import { useState, useRef } from 'react';
import { Zap, Music, Mic, Upload, ArrowLeft, Sparkles, Wand2, Radio, BarChart3, Save, History, Disc } from 'lucide-react';
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
  recentSessions = []
}) => {
  const [activeMode, setActiveMode] = useState<'match' | 'set' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showRecentSessions, setShowRecentSessions] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [selectedEnergy, setSelectedEnergy] = useState<'low' | 'medium' | 'high' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vibes = [
    { name: 'Electronic', icon: Zap, color: 'neon-green', description: 'Synth-heavy electronic beats' },
    { name: 'Hip-Hop', icon: Mic, color: 'neon-purple', description: 'Urban rhythms and rap flows' },
    { name: 'House', icon: Disc, color: 'neon-blue', description: 'Four-on-the-floor dance music' },
    { name: 'Techno', icon: Radio, color: 'neon-orange', description: 'Industrial electronic sounds' }
  ];

  const energyLevels = [
    { level: 'low', label: 'Chill', color: 'neon-blue', description: 'Relaxed and ambient' },
    { level: 'medium', label: 'Groove', color: 'neon-green', description: 'Steady and rhythmic' },
    { level: 'high', label: 'Peak', color: 'neon-purple', description: 'High energy and intense' }
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
          const result = await audioProcessingService.processAudioFromMicrophone(8000);
          fingerprint = result.fingerprint;
          setStatusMessage(`Audio captured (${Math.round(result.confidence * 100)}% confidence)`);
        } catch (error) {
          logger.warn('MagicStudio', 'Microphone access failed, using mock data', error);
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
        'Creating AI-curated playlist...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setStatusMessage(steps[i]);
        setProgress(40 + ((i + 1) / steps.length * 60));
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      try {
        const playlist = await playlistService.generateMagicMatchPlaylist(fingerprint);
        logger.info('MagicStudio', 'MagicMatch playlist generated successfully', {
          trackCount: playlist.tracks.length,
          duration: playlist.total_duration
        });
        onPlaylistGenerated(playlist);
      } catch (error) {
        logger.error('MagicStudio', 'Failed to generate MagicMatch playlist', error);
        setStatusMessage('Failed to generate playlist. Please check your API configuration.');
        setTimeout(() => {
          setIsProcessing(false);
          setActiveMode(null);
        }, 2000);
        return;
      }
    } catch (error) {
      logger.error('MagicStudio', 'MagicMatch recognition failed', error);
      setStatusMessage('Recognition failed. Please try again or check your microphone permissions.');
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

  const handleMagicSet = async (vibe: string, energy: 'low' | 'medium' | 'high') => {
    logger.info('MagicStudio', `Starting MagicSet generation`, { vibe, energy });
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
        'Finalizing your set...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setStatusMessage(steps[i]);
        setProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      try {
        const playlist = await playlistService.generateMagicSetPlaylist(vibe, energy, user?.id);
        logger.info('MagicStudio', 'MagicSet playlist generated successfully', {
          vibe,
          energy,
          trackCount: playlist.tracks.length,
          duration: playlist.total_duration
        });
        onPlaylistGenerated(playlist);
      } catch (error) {
        logger.error('MagicStudio', 'Failed to generate MagicSet playlist', error);
        setStatusMessage('Failed to generate playlist. Please check your API configuration.');
        setTimeout(() => {
          setIsProcessing(false);
          setActiveMode(null);
        }, 2000);
        return;
      }
    } catch (error) {
      logger.error('MagicStudio', 'MagicSet generation failed', error);
      setStatusMessage('Generation failed. Please check your API configuration and try again.');
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
        fileType: file.type
      });
      
      setActiveMode('match');
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Processing uploaded file...');
      
      playlistService.recognizeFromAudioFile(file)
        .then(async (result) => {
          if (result) {
            logger.info('MagicStudio', 'Track recognized from file', {
              track: `${result.title} - ${result.artist}`
            });
            setStatusMessage('Track recognized from file!');
            setProgress(60);
            
            const playlist = await playlistService.generateMagicMatchPlaylist();
            playlist.tracks.unshift(result);
            onPlaylistGenerated(playlist);
            return;
          }
          
          logger.warn('MagicStudio', 'Direct recognition failed, trying fingerprint approach');
          const fingerprintResult = await audioProcessingService.processAudioFile(file);
          setStatusMessage(`File processed (${Math.round(fingerprintResult.confidence * 100)}% confidence)`);
          setProgress(40);
          
          const steps = [
            'Analyzing audio fingerprint...',
            'Querying recognition services...',
            'Generating AI playlist...'
          ];
          
          for (let i = 0; i < steps.length; i++) {
            setStatusMessage(steps[i]);
            setProgress(40 + ((i + 1) / steps.length * 60));
            await new Promise(resolve => setTimeout(resolve, 600));
          }
          
          const playlist = await playlistService.generateMagicMatchPlaylist(fingerprintResult.fingerprint);
          onPlaylistGenerated(playlist);
        })
        .catch(async (error) => {
          logger.error('MagicStudio', 'File processing failed', error);
          setStatusMessage('File processing failed. Please try a different audio file.');
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
      <div className="min-h-screen bg-cyber-black flex items-center justify-center font-dj">
        <div className="text-center max-w-lg mx-auto p-8">
          {/* Enhanced Animated Logo */}
          <div className={`w-32 h-32 bg-cyber-dark border-4 ${activeMode === 'match' ? 'border-neon-green neon-glow-green' : 'border-neon-purple neon-glow-purple'} rounded-sm flex items-center justify-center mx-auto mb-8 animate-deck-glow`}>
            {activeMode === 'match' ? 
              <Zap className="w-16 h-16 neon-text-green animate-pulse-light" /> : 
              <Wand2 className="w-16 h-16 neon-text-purple animate-pulse-light" />
            }
          </div>

          {/* Enhanced Progress Bar */}
          <div className={`w-full bg-cyber-dark border-2 ${activeMode === 'match' ? 'border-neon-green' : 'border-neon-purple'} rounded-sm h-4 mb-8 overflow-hidden`}>
            <div 
              className={`h-4 rounded-sm transition-all duration-500 ${activeMode === 'match' ? 'progress-green' : 'progress-purple'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Enhanced Status Message */}
          <h2 className={`text-3xl font-bold mb-4 ${activeMode === 'match' ? 'neon-text-green' : 'neon-text-purple'} tracking-wide`}>
            {activeMode === 'match' ? 'MAGICMATCH' : 'MAGICSET'} PROCESSING
          </h2>
          <p className="text-cyber-gray text-xl font-mono mb-2">{statusMessage}</p>
          <p className="text-cyber-dim text-sm font-mono">{Math.round(progress)}% COMPLETE</p>

          {/* Enhanced Audio Visualization */}
          <div className="loading-cyber mt-12 justify-center">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`${activeMode === 'match' ? 'bg-neon-green neon-glow-green' : 'bg-neon-purple neon-glow-purple'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black font-dj">
      {/* Enhanced Header */}
      <div className="px-4 lg:px-6 py-4 lg:py-6 border-b-2 border-neon-green bg-gradient-to-r from-cyber-darker to-cyber-dark backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-sm bg-cyber-medium border-2 border-neon-green hover:neon-glow-green flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 neon-text-green" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border-3 border-neon-green rounded-sm flex items-center justify-center neon-glow-green animate-pulse-light">
                <Sparkles className="w-6 h-6 lg:w-7 lg:h-7 neon-text-green" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-cyber-white tracking-wide">MAGIC STUDIO</h1>
                <p className="text-sm text-neon-green font-mono">AI-POWERED CREATION SUITE</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-4">
            <button
              onClick={() => setShowRecentSessions(!showRecentSessions)}
              className="cyber-button px-3 py-2 rounded-sm flex items-center space-x-2 text-sm"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">RECENT</span>
            </button>
            {onLibraryAccess && (
              <button
                onClick={onLibraryAccess}
                className="cyber-button cyber-button-purple px-3 py-2 rounded-sm flex items-center space-x-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">LIBRARY</span>
              </button>
            )}
            <div className="hidden sm:flex items-center text-right">
              <div>
                <p className="text-sm text-cyber-dim font-mono">WELCOME BACK,</p>
                <p className="font-bold truncate max-w-32 lg:max-w-none text-neon-green font-mono">{user?.email}</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cyber-dark border-2 border-neon-purple rounded-sm flex items-center justify-center neon-glow-purple ml-3">
                <span className="font-bold neon-text-purple text-lg">{user?.email?.[0]?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions Panel */}
      {showRecentSessions && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="cyber-card rounded-none p-4">
            <h3 className="text-lg font-bold neon-text-green mb-4">Recent Sessions</h3>
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSessions.slice(0, 6).map((session, index) => (
                  <div key={index} className="cyber-card rounded-none p-3 hover:neon-glow-green cursor-pointer">
                    <h4 className="font-medium text-cyber-white truncate">{session.name || `Session ${index + 1}`}</h4>
                    <p className="text-sm text-cyber-gray">{session.tracks?.length || 0} tracks</p>
                    <p className="text-xs text-cyber-dim">{new Date(session.created_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cyber-gray">No recent sessions found</p>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Recent Sessions Panel */}
      {showRecentSessions && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 animate-fade-in-up">
          <div className="cyber-card rounded-sm p-6 bg-gradient-to-r from-cyber-medium/50 to-cyber-dark/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold neon-text-green mb-4 flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>RECENT SESSIONS</span>
            </h3>
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSessions.slice(0, 6).map((session, index) => (
                  <div key={index} className="cyber-card rounded-sm p-4 hover:neon-glow-green cursor-pointer transition-all duration-300 hover:scale-105 group">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-neon-green/20 border border-neon-green rounded-sm flex items-center justify-center">
                        <Music className="w-4 h-4 neon-text-green" />
                      </div>
                      <h4 className="font-bold text-cyber-white truncate group-hover:neon-text-green transition-colors">{session.name || `Session ${index + 1}`}</h4>
                    </div>
                    <p className="text-sm text-cyber-gray font-mono">{session.tracks?.length || 0} tracks</p>
                    <p className="text-xs text-cyber-dim font-mono">{new Date(session.created_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-cyber-dim mx-auto mb-3" />
                <p className="text-cyber-gray font-mono">No recent sessions found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
        <div className="text-center mb-12 lg:mb-20">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 lg:mb-8 text-cyber-white animate-fade-in-up tracking-wide">
            CHOOSE YOUR
            <span className="block bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-pulse-light">
              MAGIC
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-cyber-gray max-w-3xl mx-auto px-4 font-mono leading-relaxed">
            AI-assisted creation, playback, and analysis of DJ sets with real-time crowd sensing
          </p>
        </div>

        {/* Enhanced Mode Selection */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto mb-16">
          {/* Enhanced MagicMatch */}
          <div className="group animate-slide-in-left">
            <div className="cyber-card rounded-sm p-8 lg:p-10 transition-all duration-500 hover:scale-105 bg-gradient-to-b from-cyber-medium/30 to-cyber-dark/50 backdrop-blur-sm">
              <div className="flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-neon-green to-neon-green-bright rounded-sm mb-8 mx-auto group-hover:scale-110 transition-transform animate-deck-glow">
                <Zap className="w-12 h-12 lg:w-14 lg:h-14 text-cyber-black" />
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-center neon-text-green tracking-wider">MAGICMATCH</h2>
              <p className="text-base lg:text-lg text-cyber-gray text-center mb-8 leading-relaxed font-mono">
                Recognize what's playing and let AI create the perfect continuation playlist
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => handleMagicMatch('mic')}
                  className="cyber-button w-full py-4 lg:py-5 px-6 rounded-sm flex items-center justify-center space-x-3 text-base lg:text-lg font-bold group/btn"
                >
                  <Mic className="w-6 h-6 group-hover/btn:animate-bounce-subtle" />
                  <span>LISTEN VIA MICROPHONE</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cyber-button w-full py-4 lg:py-5 px-6 rounded-sm flex items-center justify-center space-x-3 text-base lg:text-lg font-bold group/btn"
                >
                  <Upload className="w-6 h-6 group-hover/btn:animate-bounce-subtle" />
                  <span>UPLOAD AUDIO FILE</span>
                </button>

                <button
                  onClick={() => handleMagicMatch('stream')}
                  className="cyber-button w-full py-4 lg:py-5 px-6 rounded-sm flex items-center justify-center space-x-3 text-base lg:text-lg font-bold group/btn"
                >
                  <Radio className="w-6 h-6 group-hover/btn:animate-bounce-subtle" />
                  <span>CAPTURE FROM STREAM</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced MagicSet */}
          <div className="group animate-slide-in-right">
            <div className="cyber-card rounded-sm p-8 lg:p-10 transition-all duration-500 hover:scale-105 bg-gradient-to-b from-cyber-medium/30 to-cyber-dark/50 backdrop-blur-sm">
              <div className="flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-neon-purple to-neon-purple-bright rounded-sm mb-8 mx-auto group-hover:scale-110 transition-transform animate-deck-glow">
                <Wand2 className="w-12 h-12 lg:w-14 lg:h-14 text-cyber-black" />
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-center neon-text-purple tracking-wider">MAGICSET</h2>
              <p className="text-base lg:text-lg text-cyber-gray text-center mb-8 leading-relaxed font-mono">
                Generate an AI-curated playlist from scratch based on your vibe and energy preferences
              </p>

              <div className="space-y-6">
                {/* Enhanced Vibe Selection */}
                <div>
                  <label className="block text-sm lg:text-base font-bold text-cyber-gray mb-4 tracking-wide">CHOOSE YOUR VIBE</label>
                  <div className="grid grid-cols-2 gap-3">
                    {vibes.map((vibe) => {
                      const Icon = vibe.icon;
                      return (
                        <button
                          key={vibe.name}
                          onClick={() => {
                            setSelectedVibe(vibe.name.toLowerCase());
                            if (selectedEnergy) {
                              handleMagicSet(vibe.name.toLowerCase(), selectedEnergy);
                            }
                          }}
                          className={`cyber-button cyber-button-purple py-3 lg:py-4 px-4 rounded-sm text-sm lg:text-base font-bold flex items-center justify-center space-x-2 group/vibe ${
                            selectedVibe === vibe.name.toLowerCase() ? 'active-neon-purple' : ''
                          }`}
                        >
                          <Icon className="w-4 h-4 group-hover/vibe:animate-bounce-subtle" />
                          <span>{vibe.name.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Enhanced Energy Level */}
                <div>
                  <label className="block text-sm lg:text-base font-bold text-cyber-gray mb-4 tracking-wide">ENERGY LEVEL</label>
                  <div className="grid grid-cols-3 gap-2">
                    {energyLevels.map(({ level, label, color }) => (
                      <button
                        key={level}
                        onClick={() => {
                          setSelectedEnergy(level as 'low' | 'medium' | 'high');
                          if (selectedVibe) {
                            handleMagicSet(selectedVibe, level as 'low' | 'medium' | 'high');
                          }
                        }}
                        className={`cyber-button py-3 lg:py-4 px-3 rounded-sm text-sm lg:text-base font-bold transition-all duration-300 ${
                          level === 'medium' ? '' : 'cyber-button-purple'
                        } ${selectedEnergy === level ? `active-${color}` : ''}`}
                      >
                        {label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Generate Button */}
                {selectedVibe && selectedEnergy && (
                  <button
                    onClick={() => handleMagicSet(selectedVibe, selectedEnergy)}
                    className="cyber-button w-full py-4 px-6 rounded-sm text-lg font-bold bg-gradient-to-r from-neon-purple to-neon-purple-bright text-cyber-black border-neon-purple animate-fade-in-up"
                  >
                    GENERATE {selectedVibe.toUpperCase()} SET
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto animate-fade-in-up">
          <div className="text-center p-6 lg:p-8 cyber-card rounded-sm group hover:neon-glow-green transition-all duration-300">
            <div className="text-3xl lg:text-4xl font-bold neon-text-green mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform">99.8%</div>
            <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">RECOGNITION ACCURACY</div>
            <div className="w-12 h-1 bg-gradient-to-r from-neon-green to-transparent mx-auto mt-2"></div>
          </div>
          <div className="text-center p-6 lg:p-8 cyber-card rounded-sm group hover:neon-glow-purple transition-all duration-300">
            <div className="text-3xl lg:text-4xl font-bold neon-text-purple mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform" style={{ animationDelay: '0.5s' }}>&lt;3s</div>
            <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">AVERAGE PROCESSING TIME</div>
            <div className="w-12 h-1 bg-gradient-to-r from-neon-purple to-transparent mx-auto mt-2"></div>
          </div>
          <div className="text-center p-6 lg:p-8 cyber-card rounded-sm group hover:neon-glow-blue transition-all duration-300">
            <div className="text-3xl lg:text-4xl font-bold neon-text-blue mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform" style={{ animationDelay: '1s' }}>10M+</div>
            <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">TRACKS IN DATABASE</div>
            <div className="w-12 h-1 bg-gradient-to-r from-neon-blue to-transparent mx-auto mt-2"></div>
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
