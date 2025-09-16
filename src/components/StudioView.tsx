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
  const [selectedGenre, setSelectedGenre] = useState<string>('Electronic');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('Groove');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const generateMockPlaylist = (type: 'match' | 'generate'): Playlist => {
    // Generate tracks based on selected preferences for Magic Generate
    const genreTrackData = {
      'Electronic': [
        { title: 'Electric Dreams', artist: 'Synthwave Pro', bpm: 128 },
        { title: 'Digital Pulse', artist: 'Cyber DJ', bpm: 126 },
        { title: 'Neon Circuits', artist: 'Tech Master', bpm: 130 },
        { title: 'Binary Waves', artist: 'Data Flow', bpm: 132 },
        { title: 'Voltage Rise', artist: 'Circuit Breaker', bpm: 134 }
      ],
      'Hip-Hop': [
        { title: 'Urban Legends', artist: 'Street Poet', bpm: 90 },
        { title: 'City Nights', artist: 'Metro Beats', bpm: 94 },
        { title: 'Flow State', artist: 'Rhythm King', bpm: 88 },
        { title: 'Block Party', artist: 'Hood Classic', bpm: 92 },
        { title: 'Beat Drop', artist: 'Bass Heavy', bpm: 96 }
      ],
      'House': [
        { title: 'Bassline Thunder', artist: 'Deep House Master', bpm: 124 },
        { title: 'Groove Machine', artist: 'House Legend', bpm: 126 },
        { title: 'Disco Fever', artist: 'Funk Master', bpm: 122 },
        { title: 'Dance Floor', artist: 'Club King', bpm: 128 },
        { title: 'Midnight Groove', artist: 'Studio 54', bpm: 125 }
      ],
      'Techno': [
        { title: 'Industrial Mind', artist: 'Techno Viking', bpm: 140 },
        { title: 'Machine Soul', artist: 'Steel Beats', bpm: 138 },
        { title: 'Dark Factory', artist: 'Underground', bpm: 142 },
        { title: 'Cyber Punk', artist: 'Future Sound', bpm: 136 },
        { title: 'Metal Heart', artist: 'Robot Dance', bpm: 144 }
      ]
    };

    const energyLevels = {
      'Chill': { min: 0.3, max: 0.5 },
      'Groove': { min: 0.6, max: 0.8 },
      'Peak': { min: 0.8, max: 1.0 }
    };

    // For Magic Generate, use selected genre. For Magic Match, mix genres for variety
    const tracks = type === 'generate'
      ? genreTrackData[selectedGenre as keyof typeof genreTrackData]
      : [
          ...genreTrackData['Electronic'].slice(0, 2),
          ...genreTrackData['House'].slice(0, 2),
          ...genreTrackData['Techno'].slice(0, 1)
        ];
    const energyRange = type === 'generate' ? energyLevels[selectedEnergy as keyof typeof energyLevels] : { min: 0.6, max: 0.9 };

    // Shuffle tracks for variety (except for specific genre selection in Generate mode)
    const shuffledTracks = type === 'match' ? [...tracks].sort(() => Math.random() - 0.5) : tracks;

    const mockTracks: Track[] = shuffledTracks.map((track, index) => ({
      id: `${type}-${Date.now()}-${index}`,
      title: track.title,
      artist: track.artist,
      duration: 180 + Math.floor(Math.random() * 180), // 3-6 minutes
      bpm: track.bpm,
      energy: energyRange.min + Math.random() * (energyRange.max - energyRange.min),
      // Leave preview_url undefined to avoid cross-origin audio CORS issues; players will generate safe fallback audio
      preview_url: undefined
    }));

    return {
      id: `playlist-${Date.now()}`,
      name: type === 'match' ? 'AI Recognition Set' : 'Generated Mix',
      tracks: mockTracks,
      total_duration: mockTracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
      type: type === 'match' ? 'magic_match' : 'magic_set',
      created_at: new Date().toISOString()
    };
  };

  const validateAudioFile = (file: File): string | null => {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid audio file (MP3, WAV, OGG, M4A, AAC)';
    }

    if (file.size > maxSize) {
      return 'File too large. Please upload a file smaller than 50MB';
    }

    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const error = validateAudioFile(file);

    if (error) {
      setUploadError(error);
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    // Process valid file
    handleMagicMatch();
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

                <label className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 border border-white/20 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <span>Upload Audio File</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {uploadError && (
                  <div className="p-3 bg-red-900/50 border border-red-400 text-red-400 rounded-lg text-sm">
                    {uploadError}
                  </div>
                )}

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
                        onClick={() => setSelectedGenre(genre)}
                        className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 border ${
                          selectedGenre === genre
                            ? 'bg-purple-500/50 border-purple-400 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/10 hover:bg-purple-500/30 text-white border-white/20 hover:border-purple-400'
                        }`}
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
                        onClick={() => setSelectedEnergy(energy)}
                        className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 border ${
                          selectedEnergy === energy
                            ? 'bg-pink-500/50 border-pink-400 text-white shadow-lg shadow-pink-500/25'
                            : 'bg-white/10 hover:bg-pink-500/30 text-white border-white/20 hover:border-pink-400'
                        }`}
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
