import React from 'react';
import { Play, Music, Sparkles, Zap, BarChart3, Users } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartMixing }) => {
  const features = [
    {
      icon: Zap,
      title: 'AI Track Recognition',
      description: 'Instantly identify any song and build the perfect playlist'
    },
    {
      icon: Music,
      title: 'Smart Playlist Generation',
      description: 'Create DJ sets tailored to any mood or energy level'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track performance and crowd engagement in real-time'
    },
    {
      icon: Users,
      title: 'Crowd Intelligence',
      description: 'AI-powered crowd analysis for perfect timing'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">MagicDJ</span>
          </div>
          <button 
            onClick={onStartMixing}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
          >
            Start Mixing
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 text-white leading-tight">
            The Future of
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              AI DJing
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
            Create, perform, and analyze your DJ sets with cutting-edge AI technology. 
            Experience the perfect blend of artificial intelligence and musical creativity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={onStartMixing}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 flex items-center space-x-3"
            >
              <Play className="w-6 h-6" />
              <span>Start Creating Now</span>
            </button>
            <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-lg font-semibold rounded-xl transition-all duration-300 border border-white/20">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">10M+</div>
            <div className="text-gray-400">Tracks Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-pink-400 mb-2">50K+</div>
            <div className="text-gray-400">AI Sets Created</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">99.8%</div>
            <div className="text-gray-400">Recognition Accuracy</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;