import React, { useEffect, useState } from 'react';
import { Zap, Music, Users, BarChart3, Play, Headphones, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartMixing }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [rippleEffect, setRippleEffect] = useState(false);
  
  const features = [
    {
      icon: Zap,
      title: 'MagicMatch',
      description: 'Recognize any track and get AI-curated continuations',
      color: 'neon-green'
    },
    {
      icon: Music,
      title: 'MagicSet',
      description: 'Generate perfect playlists from scratch with AI',
      color: 'neon-purple'
    },
    {
      icon: Users,
      title: 'Magic Dancer',
      description: 'Real-time crowd energy analysis and visualization',
      color: 'neon-green'
    },
    {
      icon: BarChart3,
      title: 'Magic Producer',
      description: 'Post-performance insights and analytics',
      color: 'neon-purple'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = () => {
    setRippleEffect(true);
    setTimeout(() => setRippleEffect(false), 600);
    onStartMixing();
  };

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-neon-pulse" 
             style={{ background: 'radial-gradient(circle, rgba(57, 255, 19, 0.1), transparent)' }}></div>
        <div className="absolute top-60 right-20 w-96 h-96 rounded-full blur-3xl animate-neon-pulse" 
             style={{ background: 'radial-gradient(circle, rgba(138, 0, 255, 0.1), transparent)', animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full blur-3xl animate-neon-pulse" 
             style={{ background: 'radial-gradient(circle, rgba(57, 255, 19, 0.05), transparent)', animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 lg:px-6 py-4 lg:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyber-dark border-2 border-neon-green rounded-none flex items-center justify-center neon-glow-green">
              <Sparkles className="w-6 h-6 neon-text-green" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold neon-text-green">
              MagicDJ
            </h1>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-6">
            <a href="#features" className="hidden sm:block text-cyber-gray hover:text-neon-green transition-colors">Features</a>
            <a href="#pricing" className="hidden sm:block text-cyber-gray hover:text-neon-green transition-colors">Pricing</a>
            <button 
              onClick={handleButtonClick}
              className="cyber-button px-4 lg:px-6 py-2 lg:py-3 rounded-none text-sm lg:text-base ripple-effect"
            >
              Start Mixing
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 pt-10 lg:pt-20 pb-16 lg:pb-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 lg:mb-8 text-cyber-white leading-tight animate-slide-in-cyber">
            The Future of DJing is Intelligent
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-cyber-gray mb-8 lg:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            Create, perform, and analyze your DJ sets with our suite of AI-powered tools. 
            Experience the perfect blend of technology and creativity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 mb-12 lg:mb-16 px-4">
            <button 
              onClick={handleButtonClick}
              className={`cyber-button w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 rounded-none font-semibold text-base lg:text-lg flex items-center justify-center space-x-3 ${rippleEffect ? 'animate-neon-ripple' : ''}`}
            >
              <Play className="w-6 h-6 neon-text-green" />
              <span>Start Mixing with AI</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button className="cyber-button cyber-button-purple w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 rounded-none font-semibold text-base lg:text-lg flex items-center justify-center space-x-3">
              <Headphones className="w-6 h-6 neon-text-purple" />
              <span>Listen to Demo</span>
            </button>
          </div>

          {/* Feature Showcase */}
          <div className="relative">
            <div className="cyber-card rounded-none p-4 lg:p-8 mx-4 lg:mx-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = index === currentFeature;
                  
                  return (
                    <div
                      key={index}
                      className={`relative p-4 lg:p-6 rounded-none transition-all duration-500 ${
                        isActive ? 'bg-cyber-medium scale-105 neon-glow-green' : 'bg-cyber-dark hover:bg-cyber-medium'
                      }`}
                    >
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-none bg-cyber-dark border-2 ${feature.color === 'neon-green' ? 'border-neon-green neon-glow-green' : 'border-neon-purple neon-glow-purple'} flex items-center justify-center mb-3 lg:mb-4 mx-auto`}>
                        <Icon className={`w-6 h-6 ${feature.color === 'neon-green' ? 'neon-text-green' : 'neon-text-purple'}`} />
                      </div>
                      <h3 className="text-lg lg:text-xl font-semibold mb-2 lg:mb-3 text-center text-cyber-white">{feature.title}</h3>
                      <p className="text-sm lg:text-base text-cyber-gray text-center leading-relaxed">{feature.description}</p>
                      
                      {isActive && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 animate-neon-pulse">
                          <div className="w-2 h-2 bg-neon-green rounded-full neon-glow-green"></div>
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
      <div className="relative z-10 bg-cyber-dark border-y border-neon-green">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold neon-text-green mb-2 animate-neon-pulse">10M+</div>
              <div className="text-sm lg:text-base text-cyber-gray">Tracks Analyzed</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold neon-text-purple mb-2 animate-neon-pulse">50K+</div>
              <div className="text-sm lg:text-base text-cyber-gray">AI-Generated Sets</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold neon-text-green mb-2 animate-neon-pulse">99.8%</div>
              <div className="text-sm lg:text-base text-cyber-gray">Recognition Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 neon-text-green">
          Ready to Transform Your Sets?
        </h2>
        <p className="text-lg lg:text-xl text-cyber-gray mb-8 lg:mb-12 max-w-2xl mx-auto px-4">
          Join thousands of DJs who are already using AI to create unforgettable musical experiences.
        </p>
        <button 
          onClick={handleButtonClick}
          className="cyber-button px-8 lg:px-10 py-4 lg:py-5 rounded-none font-semibold text-lg lg:text-xl ripple-effect"
        >
          Start Your Magic Journey
          <ArrowRight className="inline w-5 h-5 lg:w-6 lg:h-6 ml-3 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default LandingPage;