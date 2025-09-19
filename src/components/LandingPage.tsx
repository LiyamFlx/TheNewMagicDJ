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
      description: 'Instantly identify any song and automatically build the perfect playlist for your vibe',
    },
    {
      icon: Music,
      title: 'Smart Playlist Generation',
      description: 'Create seamless DJ sets tailored to any mood, energy level, or musical style',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track your performance and crowd engagement with live insights and feedback',
    },
    {
      icon: Users,
      title: 'Crowd Intelligence',
      description: 'AI-powered crowd analysis helps you read the room and time transitions perfectly',
    },
  ];

  return (
    <main className="min-h-screen gradient-bg-primary relative overflow-hidden" role="main">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-3/4 left-1/2 w-48 h-48 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        ></div>

        {/* Subtle Spectrum Animation */}
        <div className="spectrum-background" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="spectrum-bar"
              style={{
                height: `${Math.random() * 100 + 50}px`,
                top: `${Math.random() * 80 + 10}%`,
                animationDelay: `${i * 2.5}s`,
                animationDuration: `${20 + i * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section
        id="main-content"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center"
        aria-labelledby="hero-heading"
      >
        {/* Stats moved higher for credibility */}
        <div className="glass-card hover-lift mb-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-primary mb-2 font-orbitron">
                10M+
              </div>
              <div className="text-gray-400 font-inter">Tracks Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-accent mb-2 font-orbitron">
                50K+
              </div>
              <div className="text-gray-400 font-inter">AI Sets Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gradient-primary mb-2 font-orbitron">
                99.8%
              </div>
              <div className="text-gray-400 font-inter">
                Recognition Accuracy
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h1
            id="hero-heading"
            className="text-7xl md:text-9xl font-bold mb-8 leading-tight font-orbitron"
          >
            <span className="text-white block mb-4">The Future of</span>
            <span className="block text-gradient-primary font-black">
              AI DJing
            </span>
          </h1>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12 font-inter">
            AI-powered tools to create, perform, and analyze your perfect DJ set.
          </p>

          {/* Animated Waveform */}
          <div className="flex justify-center mb-12" aria-hidden="true">
            <div className="flex items-end space-x-1 h-16" role="img" aria-label="Audio waveform animation">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="waveform-bar"></div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={onStartMixing}
              className="btn-primary flex items-center space-x-3 text-xl hover-lift px-8 py-4 font-bold"
              aria-label="Start creating your AI DJ set"
            >
              <Play className="w-7 h-7" />
              <span>Create Your AI DJ Set</span>
            </button>
            <button
              className="glass-button text-xl font-semibold px-8 py-4 border-2 border-white/20 hover:border-cyan-400/50"
              aria-label="Watch product demonstration"
            >
              <span>Watch Demo</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
          aria-labelledby="features-heading"
        >
          <h2 id="features-heading" className="sr-only">
            Key Features
          </h2>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass-card p-8 hover-lift group h-80 flex flex-col justify-between transition-all duration-300 hover:shadow-neon-pink"
                role="article"
                aria-labelledby={`feature-${index}-title`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 gradient-bg-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-neon-pink transition-all duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3
                    id={`feature-${index}-title`}
                    className="text-xl font-bold text-white mb-4 font-orbitron min-h-[3rem] flex items-center"
                  >
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-400 leading-relaxed font-inter text-center flex-grow flex items-center">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Final CTA Section */}
        <section className="text-center mt-20" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="sr-only">
            Get Started
          </h2>
          <button
            onClick={onStartMixing}
            className="btn-primary flex items-center space-x-3 text-lg hover-lift mx-auto"
            aria-label="Start mixing now"
          >
            <Play className="w-6 h-6" />
            <span>Start Mixing</span>
          </button>
        </section>
      </section>
    </main>
  );
};

export default LandingPage;
