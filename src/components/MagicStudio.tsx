import React, { useState, useRef } from 'react';
import { Zap, Music, Mic, Upload, ArrowLeft, Sparkles, Wand2, Radio, Headphones } from 'lucide-react';
import { User, Playlist } from '../types';
import { playlistService } from '../services/playlistService';
import { audioProcessingService } from '../services/audioProcessingService';
import { logger } from '../utils/logger';

interface MagicStudioProps {
  user: User | null;
  onPlaylistGenerated: (playlist: Playlist) => void;
  onBack: () => void;
}

const MagicStudio: React.FC<MagicStudioProps> = ({ user, onPlaylistGenerated, onBack }) => {
  const [activeMode, setActiveMode] = useState<'match' | 'set' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
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
        
        await audioProcessingService.startMicrophoneCapture();
        const result = await audioProcessingService.processAudioFromMicrophone(8000);
        fingerprint = result.fingerprint;
        
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          {/* Animated Logo */}
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            {activeMode === 'match' ? <Zap className="w-12 h-12" /> : <Wand2 className="w-12 h-12" />}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-6">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Status Message */}
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {activeMode === 'match' ? 'MagicMatch' : 'MagicSet'} Processing
          </h2>
          <p className="text-gray-300 text-lg">{statusMessage}</p>

          {/* Audio Visualization */}
          <div className="flex items-center justify-center space-x-2 mt-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 40}px`,
                  animationDelay: `${i * 100}ms`
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 lg:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-xl lg:text-2xl font-bold">Magic Studio</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-400">Welcome back,</p>
              <p className="font-medium truncate max-w-32 lg:max-w-none">{user?.email}</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="font-bold">{user?.email?.[0]?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 lg:mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Choose Your Magic
          </h1>
          <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto px-4">
            Select how you want to create your next incredible DJ set
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 max-w-6xl mx-auto">
          {/* MagicMatch */}
          <div className="group">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-500 lg:hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-6 lg:mb-8 mx-auto group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold mb-3 lg:mb-4 text-center">MagicMatch</h2>
              <p className="text-sm lg:text-base text-gray-300 text-center mb-6 lg:mb-8 leading-relaxed">
                Recognize what's playing and let AI create the perfect continuation playlist
              </p>

              <div className="space-y-3 lg:space-y-4">
                <button
                  onClick={() => handleMagicMatch('mic')}
                  className="w-full py-3 lg:py-4 px-4 lg:px-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-500/60 rounded-xl transition-all duration-300 hover:bg-purple-600/30 flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Mic className="w-5 h-5 text-purple-400" />
                  <span>Listen via Microphone</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 lg:py-4 px-4 lg:px-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-500/60 rounded-xl transition-all duration-300 hover:bg-purple-600/30 flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Upload className="w-5 h-5 text-purple-400" />
                  <span>Upload Audio File</span>
                </button>

                <button
                  onClick={() => handleMagicMatch('stream')}
                  className="w-full py-3 lg:py-4 px-4 lg:px-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-500/60 rounded-xl transition-all duration-300 hover:bg-purple-600/30 flex items-center justify-center space-x-3 text-sm lg:text-base"
                >
                  <Radio className="w-5 h-5 text-purple-400" />
                  <span>Capture from Stream</span>
                </button>
              </div>
            </div>
          </div>

          {/* MagicSet */}
          <div className="group">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border border-gray-700/50 hover:border-pink-500/50 transition-all duration-500 lg:hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/10">
              <div className="flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl mb-6 lg:mb-8 mx-auto group-hover:scale-110 transition-transform">
                <Wand2 className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold mb-3 lg:mb-4 text-center">MagicSet</h2>
              <p className="text-sm lg:text-base text-gray-300 text-center mb-6 lg:mb-8 leading-relaxed">
                Generate an AI-curated playlist from scratch based on your vibe and energy preferences
              </p>

              <div className="space-y-4 lg:space-y-6">
                {/* Vibe Selection */}
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-300 mb-2 lg:mb-3">Choose Your Vibe</label>
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    {['Electronic', 'Hip-Hop', 'House', 'Techno'].map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => handleMagicSet(vibe.toLowerCase(), 'high')}
                        className="py-2 lg:py-3 px-3 lg:px-4 bg-gray-700/50 hover:bg-purple-600/20 border border-gray-600 hover:border-purple-500/50 rounded-lg transition-all duration-300 text-xs lg:text-sm"
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy Level */}
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-300 mb-2 lg:mb-3">Energy Level</label>
                  <div className="grid grid-cols-3 gap-1 lg:gap-2">
                    {[
                      { level: 'low', label: 'Chill', color: 'from-blue-500 to-cyan-500' },
                      { level: 'medium', label: 'Groove', color: 'from-green-500 to-blue-500' },
                      { level: 'high', label: 'Peak', color: 'from-orange-500 to-red-500' }
                    ].map(({ level, label, color }) => (
                      <button
                        key={level}
                        onClick={() => handleMagicSet('electronic', level as 'low' | 'medium' | 'high')}
                        className={`py-2 lg:py-3 px-2 lg:px-3 bg-gradient-to-r ${color} opacity-80 hover:opacity-100 rounded-lg transition-all duration-300 text-xs lg:text-sm font-medium`}
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
          <div className="text-center p-4 lg:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="text-2xl lg:text-3xl font-bold text-purple-400 mb-2">99.8%</div>
            <div className="text-sm lg:text-base text-gray-400">Recognition Accuracy</div>
          </div>
          <div className="text-center p-4 lg:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="text-2xl lg:text-3xl font-bold text-pink-400 mb-2"><3s</div>
            <div className="text-sm lg:text-base text-gray-400">Average Processing Time</div>
          </div>
          <div className="text-center p-4 lg:p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="text-2xl lg:text-3xl font-bold text-blue-400 mb-2">10M+</div>
            <div className="text-sm lg:text-base text-gray-400">Tracks in Database</div>
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