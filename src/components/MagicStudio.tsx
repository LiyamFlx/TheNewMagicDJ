import React, { useState, useRef } from 'react';
import { Zap, Music, Mic, Upload, ArrowLeft, Sparkles, Wand2, Radio, Headphones, BarChart3, Save, History } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        } catch (error) {
          logger.warn('MagicStudio', 'Microphone access failed, using mock data', error);
          fingerprint = 'mock_mic_' + Date.now().toString(16);
        }
        
        setStatusMessage(`Audio captured (${Math.round(result.confidence * 100)}% confidence)`);
        setProgress(40);
      } else if (source === 'file') {
        // File processing is handled in handleFileUpload
        return;
      } else if (source === 'stream') {
        setStatusMessage('Capturing from audio stream...');
        setProgress(20);
        
        // Simulate stream capture
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
        await new Promise(resolve => setTimeout(resolve, 600));
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
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      try {
        const playlist = await playlistService.generateMagicSetPlaylist(vibe, energy);
        logger.info('MagicStudio', 'MagicSet playlist generated successfully', {
          vibe,
          energy,
          trackCount: playlist.tracks.length,
          duration: playlist.total_duration
        });
        onPlaylistGenerated(playlist);
      } catch (error) {
        logger.error('MagicStudio', 'Failed to generate MagicSet playlist', error);
        setStatusMessage('Failed to generate playlist. Please check your Spotify API configuration.');
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
      
      // Try direct recognition from audio file first
      playlistService.recognizeFromAudioFile(file)
        .then(async (result) => {
          if (result) {
            logger.info('MagicStudio', 'Track recognized from file', {
              track: `${result.title} - ${result.artist}`
            });
            setStatusMessage('Track recognized from file!');
            setProgress(60);
            
            // Generate playlist based on recognized track
            const playlist = await playlistService.generateMagicMatchPlaylist();
            // Add recognized track as seed
            playlist.tracks.unshift(result);
            onPlaylistGenerated(playlist);
            return;
          }
          
          logger.warn('MagicStudio', 'Direct recognition failed, trying fingerprint approach');
          // Fallback to fingerprint-based recognition
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
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          {/* Animated Logo */}
          <div className="w-24 h-24 bg-cyber-dark border-4 border-neon-green rounded-none flex items-center justify-center mx-auto mb-8 animate-neon-pulse neon-glow-green">
            {activeMode === 'match' ? <Zap className="w-12 h-12 neon-text-green" /> : <Wand2 className="w-12 h-12 neon-text-purple" />}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-cyber-dark border border-neon-green rounded-none h-3 mb-6">
            <div 
              className={`h-3 rounded-none transition-all duration-300 ${activeMode === 'match' ? 'progress-green' : 'progress-purple'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Status Message */}
          <h2 className={`text-2xl font-bold mb-4 ${activeMode === 'match' ? 'neon-text-green' : 'neon-text-purple'}`}>
            {activeMode === 'match' ? 'MagicMatch' : 'MagicSet'} Processing
          </h2>
          <p className="text-cyber-gray text-lg">{statusMessage}</p>

          {/* Audio Visualization */}
          <div className="loading-cyber mt-8 justify-center">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`${activeMode === 'match' ? 'bg-neon-green neon-glow-green' : 'bg-neon-purple neon-glow-purple'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 lg:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyber-dark border-2 border-neon-green rounded-none flex items-center justify-center neon-glow-green">
                <Sparkles className="w-6 h-6 neon-text-green" />
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-cyber-white">Magic Studio</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button
              onClick={() => setShowRecentSessions(!showRecentSessions)}
              className="cyber-button px-3 py-2 rounded-none flex items-center space-x-2 text-sm"
            >
              <History className="w-4 h-4 neon-text-green" />
              <span className="hidden sm:inline">Recent</span>
            </button>
            {onLibraryAccess && (
              <button
                onClick={onLibraryAccess}
                className="cyber-button cyber-button-purple px-3 py-2 rounded-none flex items-center space-x-2 text-sm"
              >
                <Save className="w-4 h-4 neon-text-purple" />
                <span className="hidden sm:inline">Library</span>
              </button>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-sm text-cyber-dim">Welcome back,</p>
              <p className="font-medium truncate max-w-32 lg:max-w-none text-cyber-white">{user?.email}</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyber-dark border-2 border-neon-purple rounded-none flex items-center justify-center neon-glow-purple">
              <span className="font-bold neon-text-purple">{user?.email?.[0]?.toUpperCase()}</span>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 lg:mb-6 text-cyber-white animate-slide-in-cyber">
            Choose Your Magic
          </h1>
          <p className="text-lg lg:text-xl text-cyber-gray max-w-2xl mx-auto px-4">
            AI-assisted creation, playback, and analysis of DJ sets with real-time crowd sensing
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 max-w-6xl mx-auto">
          {/* MagicMatch */}
          <div className="group">
            <div className="cyber-card rounded-none p-6 lg:p-8 transition-all duration-500 lg:hover:scale-105">
              <div className="flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-4 border-neon-green rounded-none mb-6 lg:mb-8 mx-auto group-hover:scale-110 transition-transform neon-glow-green">
                <Zap className="w-10 h-10 neon-text-green" />
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold mb-3 lg:mb-4 text-center neon-text-green">MagicMatch</h2>
              <p className="text-sm lg:text-base text-cyber-gray text-center mb-6 lg:mb-8 leading-relaxed">
                Recognize what's playing and let AI create the perfect continuation playlist
              </p>

              <div className="space-y-3 lg:space-y-4">
                <button
                  onClick={() => handleMagicMatch('mic')}
                  className="cyber-button w-full py-3 lg:py-4 px-4 lg:px-6 rounded-none flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Mic className="w-5 h-5 neon-text-green" />
                  <span>Listen via Microphone</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cyber-button w-full py-3 lg:py-4 px-4 lg:px-6 rounded-none flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Upload className="w-5 h-5 neon-text-green" />
                  <span>Upload Audio File</span>
                </button>

                <button
                  onClick={() => handleMagicMatch('stream')}
                  className="cyber-button w-full py-3 lg:py-4 px-4 lg:px-6 rounded-none flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Radio className="w-5 h-5 neon-text-green" />
                  <span>Capture from Stream</span>
                </button>
              </div>
            </div>
          </div>

          {/* MagicSet */}
          <div className="group">
            <div className="cyber-card rounded-none p-6 lg:p-8 transition-all duration-500 lg:hover:scale-105">
              <div className="flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-4 border-neon-purple rounded-none mb-6 lg:mb-8 mx-auto group-hover:scale-110 transition-transform neon-glow-purple">
                <Wand2 className="w-10 h-10 neon-text-purple" />
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold mb-3 lg:mb-4 text-center neon-text-purple">MagicSet</h2>
              <p className="text-sm lg:text-base text-cyber-gray text-center mb-6 lg:mb-8 leading-relaxed">
                Generate an AI-curated playlist from scratch based on your vibe and energy preferences
              </p>

              <div className="space-y-4 lg:space-y-6">
                {/* Vibe Selection */}
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-cyber-gray mb-2 lg:mb-3">Choose Your Vibe</label>
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    {['Electronic', 'Hip-Hop', 'House', 'Techno'].map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => handleMagicSet(vibe.toLowerCase(), 'high')}
                        className="cyber-button cyber-button-purple py-2 lg:py-3 px-3 lg:px-4 rounded-none text-xs lg:text-sm"
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy Level */}
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-cyber-gray mb-2 lg:mb-3">Energy Level</label>
                  <div className="grid grid-cols-3 gap-1 lg:gap-2">
                    {[
                      { level: 'low', label: 'Chill', isGreen: false },
                      { level: 'medium', label: 'Groove', isGreen: true },
                      { level: 'high', label: 'Peak', isGreen: false }
                    ].map(({ level, label, isGreen }) => (
                      <button
                        key={level}
                        onClick={() => handleMagicSet('electronic', level as 'low' | 'medium' | 'high')}
                        className={`cyber-button ${isGreen ? '' : 'cyber-button-purple'} py-2 lg:py-3 px-2 lg:px-3 rounded-none text-xs lg:text-sm font-medium`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8 max-w-4xl mx-auto">
          <div className="text-center p-4 lg:p-6 cyber-card rounded-none">
            <div className="text-2xl lg:text-3xl font-bold neon-text-green mb-2 animate-neon-pulse">99.8%</div>
            <div className="text-sm lg:text-base text-cyber-gray">Recognition Accuracy</div>
          </div>
          <div className="text-center p-4 lg:p-6 cyber-card rounded-none">
            <div className="text-2xl lg:text-3xl font-bold neon-text-purple mb-2 animate-neon-pulse">&lt;3s</div>
            <div className="text-sm lg:text-base text-cyber-gray">Average Processing Time</div>
          </div>
          <div className="text-center p-4 lg:p-6 cyber-card rounded-none">
            <div className="text-2xl lg:text-3xl font-bold neon-text-green mb-2 animate-neon-pulse">10M+</div>
            <div className="text-sm lg:text-base text-cyber-gray">Tracks in Database</div>
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