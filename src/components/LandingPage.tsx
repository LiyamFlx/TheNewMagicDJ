import React, { useEffect, useState } from 'react';
import { Zap, Music, Users, BarChart3, Play, Headphones, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartMixing }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      icon: Zap,
      title: 'MagicMatch',
      description: 'Recognize any track and get AI-curated continuations',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Music,
      title: 'MagicSet',
      description: 'Generate perfect playlists from scratch with AI',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Users,
      title: 'Magic Dancer',
      description: 'Real-time crowd energy analysis and visualization',
      color: 'from-green-400 to-blue-500'
    },
    {
      icon: BarChart3,
      title: 'Magic Producer',
      description: 'Post-performance insights and analytics',
      color: 'from-blue-400 to-cyan-500'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 lg:px-6 py-4 lg:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              MagicDJ
            </h1>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-6">
            <a href="#features" className="hidden sm:block text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hidden sm:block text-gray-300 hover:text-white transition-colors">Pricing</a>
            <button 
              onClick={onStartMixing}
              className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 text-sm lg:text-base"
            >
              Start Mixing
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 pt-10 lg:pt-20 pb-16 lg:pb-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 lg:mb-8 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
            The Future of DJing is Intelligent
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 lg:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            Create, perform, and analyze your DJ sets with our suite of AI-powered tools. 
            Experience the perfect blend of technology and creativity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 mb-12 lg:mb-16 px-4">
            <button 
              onClick={onStartMixing}
              className="group w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-base lg:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 flex items-center justify-center space-x-3"
            >
              <Play className="w-6 h-6" />
              <span>Start Mixing with AI</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 border-2 border-gray-600 hover:border-purple-500 rounded-xl font-semibold text-base lg:text-lg transition-all duration-300 hover:bg-purple-500/10 flex items-center justify-center space-x-3">
              <Headphones className="w-6 h-6" />
              <span>Listen to Demo</span>
            </button>
          </div>

          {/* Feature Showcase */}
          <div className="relative">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 lg:p-8 border border-gray-700/50 mx-4 lg:mx-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = index === currentFeature;
                  
                  return (
                    <div
                      key={index}
                      className={`relative p-4 lg:p-6 rounded-xl transition-all duration-500 ${
                        isActive ? 'bg-gray-700/50 scale-105' : 'bg-gray-800/30 hover:bg-gray-700/30'
                      }`}
                    >
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 lg:mb-4 mx-auto`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg lg:text-xl font-semibold mb-2 lg:mb-3 text-center">{feature.title}</h3>
                      <p className="text-sm lg:text-base text-gray-400 text-center leading-relaxed">{feature.description}</p>
                      
                      {isActive && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 bg-gray-800/30 backdrop-blur-sm border-y border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-purple-400 mb-2">10M+</div>
              <div className="text-sm lg:text-base text-gray-400">Tracks Analyzed</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-pink-400 mb-2">50K+</div>
              <div className="text-sm lg:text-base text-gray-400">AI-Generated Sets</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-blue-400 mb-2">99.8%</div>
              <div className="text-sm lg:text-base text-gray-400">Recognition Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Ready to Transform Your Sets?
        </h2>
        <p className="text-lg lg:text-xl text-gray-300 mb-8 lg:mb-12 max-w-2xl mx-auto px-4">
          Join thousands of DJs who are already using AI to create unforgettable musical experiences.
        </p>
        <button 
          onClick={onStartMixing}
          className="group px-8 lg:px-10 py-4 lg:py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg lg:text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
        >
          Start Your Magic Journey
          <ArrowRight className="inline w-5 h-5 lg:w-6 lg:h-6 ml-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default LandingPage;