import React from 'react';
import { Play, Music, Zap, BarChart3, Users } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
  onLibraryAccess?: () => void;
  recentSessions?: any[];
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
    <div className="min-h-screen gradient-bg-primary relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-3/4 left-1/2 w-48 h-48 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight font-orbitron">
            <span className="text-white">The Future of</span>
            <span className="block text-gradient-primary text-neon-glow animate-pulse-glow">
              AI DJing
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12 font-inter">
            Create, perform, and analyze your DJ sets with cutting-edge AI technology.
            Experience the perfect blend of artificial intelligence and musical creativity.
          </p>

          {/* Animated Waveform */}
          <div className="flex justify-center mb-12">
            <div className="flex items-end space-x-1 h-16">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="waveform-bar"></div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={onStartMixing}
              className="btn-primary flex items-center space-x-3 text-lg hover-lift"
            >
              <Play className="w-6 h-6" />
              <span>Start Creating Now</span>
            </button>
            <button className="glass-button text-lg font-semibold">
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
                className="glass-card p-8 hover-lift group"
              >
                <div className="w-16 h-16 gradient-bg-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-neon-pink">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 font-orbitron">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed font-inter">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="glass-card hover-lift">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-primary mb-2 font-orbitron">10M+</div>
              <div className="text-gray-400 font-inter">Tracks Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-accent mb-2 font-orbitron">50K+</div>
              <div className="text-gray-400 font-inter">AI Sets Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-primary mb-2 font-orbitron">99.8%</div>
              <div className="text-gray-400 font-inter">Recognition Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;