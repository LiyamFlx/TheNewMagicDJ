import React, { useState } from 'react';
import { ArrowLeft, Mic, Upload, Wand2, Zap, Music, Headphones } from 'lucide-react';
import { Playlist, Track } from '../types';

interface StudioViewProps {
  onPlaylistGenerated: (playlist: Playlist) => void;
  onBack: () => void;
}

const StudioView: React.FC<StudioViewProps> = ({ onPlaylistGenerated, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'match' | 'generate' | null>(null);
  const [progress, setProgress] = useState(0);

  const generateMockPlaylist = (type: 'match' | 'generate'): Playlist => {
    const mockTracks: Track[] = [
      {
        id: '1',
        title: 'Electric Dreams',
        artist: 'Synthwave Pro',
        duration: 245,
        bpm: 128,
        energy: 0.8,
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      },
      {
        id: '2', 
        title: 'Midnight Drive',
        artist: 'Neon Nights',
        duration: 320,
        bpm: 132,
        energy: 0.7,
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
      },
      {
        id: '3',
        title: 'Digital Pulse',
        artist: 'Cyber DJ',
        duration: 380,
        bpm: 126,
        energy: 0.9,
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
      },
      {
        id: '4',
        title: 'Bassline Thunder',
        artist: 'Deep House Master',
        duration: 290,
        bpm: 124,
        energy: 0.6,
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
      },
      {
        id: '5',
        title: 'Euphoric Heights',
        artist: 'Trance Producer',
        duration: 420,
        bpm: 136,
        energy: 0.85,
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
      }
    ];

    return {
      id: `playlist-${Date.now()}`,
      name: type === 'match' ? 'AI Recognition Set' : 'Generated Mix',
      tracks: mockTracks,
      total_duration: mockTracks.reduce((sum, track) => sum + track.duration, 0),
      type: type === 'match' ? 'magic_match' : 'magic_set',
      created_at: new Date().toISOString()
    };
  };

  const handleMagicMatch = async () => {
    setIsProcessing(true);
    setProcessingMode('match');
    setProgress(0);

    // Simulate processing steps
    const steps = ['Listening...', 'Analyzing audio...', 'Matching tracks...', 'Building playlist...'];
    
    for (let i = 0; i < steps.length; i++) {
      setProgress((i / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const playlist = generateMockPlaylist('match');
    onPlaylistGenerated(playlist);
    
    setIsProcessing(false);
    setProcessingMode(null);
  };

  const handleMagicGenerate = async () => {
    setIsProcessing(true);
    setProcessingMode('generate');
    setProgress(0);

    const steps = ['Analyzing preferences...', 'Selecting tracks...', 'Optimizing flow...', 'Finalizing set...'];
    
    for (let i = 0; i < steps.length; i++) {
      setProgress((i / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const playlist = generateMockPlaylist('generate');
    onPlaylistGenerated(playlist);
    
    setIsProcessing(false);
    setProcessingMode(null);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            {processingMode === 'match' ? 
              <Zap className="w-12 h-12 text-white" /> : 
              <Wand2 className="w-12 h-12 text-white" />
            }
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-3 mb-8">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            {processingMode === 'match' ? 'AI Recognition' : 'Generating Mix'}
          </h2>
          <p className="text-gray-300 text-lg">Creating your perfect playlist...</p>
          <p className="text-purple-400 text-sm mt-2">{Math.round(progress)}% Complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="px-6 py-4 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Magic Studio</h1>
              <p className="text-gray-400">AI-Powered DJ Creation Suite</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Magic
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Create incredible DJ sets with the power of artificial intelligence
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Magic Match */}
          <div className="group">
            <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white text-center mb-4">Magic Match</h2>
              <p className="text-gray-400 text-center mb-8 text-lg leading-relaxed">
                Play or upload a song and let AI create the perfect continuation playlist
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleMagicMatch}
                  className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 transform hover:scale-105"
                >
                  <Mic className="w-5 h-5" />
                  <span>Listen via Microphone</span>
                </button>

                <button
                  onClick={handleMagicMatch}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 border border-white/20"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Audio File</span>
                </button>

                <button
                  onClick={handleMagicMatch}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 border border-white/20"
                >
                  <Headphones className="w-5 h-5" />
                  <span>Capture Audio Stream</span>
                </button>
              </div>
            </div>
          </div>

          {/* Magic Generate */}
          <div className="group">
            <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform">
                <Wand2 className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white text-center mb-4">Magic Generate</h2>
              <p className="text-gray-400 text-center mb-8 text-lg leading-relaxed">
                Generate fresh AI-curated playlists from scratch based on your preferences
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-4">Choose Genre</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Electronic', 'Hip-Hop', 'House', 'Techno'].map((genre) => (
                      <button
                        key={genre}
                        className="py-3 px-4 bg-white/10 hover:bg-purple-500/30 text-white font-medium rounded-lg transition-all duration-300 border border-white/20 hover:border-purple-400"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-4">Energy Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Chill', 'Groove', 'Peak'].map((energy) => (
                      <button
                        key={energy}
                        className="py-3 px-4 bg-white/10 hover:bg-pink-500/30 text-white font-medium rounded-lg transition-all duration-300 border border-white/20 hover:border-pink-400"
                      >
                        {energy}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleMagicGenerate}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 transform hover:scale-105"
                >
                  <Music className="w-5 h-5" />
                  <span>Generate Magic Set</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-2">99.8%</div>
            <div className="text-gray-400">Recognition Accuracy</div>
          </div>
          <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="text-3xl font-bold text-pink-400 mb-2">&lt;3s</div>
            <div className="text-gray-400">Processing Time</div>
          </div>
          <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-2">10M+</div>
            <div className="text-gray-400">Tracks Database</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioView;