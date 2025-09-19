import React, { useState, useCallback, useMemo } from 'react';
import { Play, Music, Zap, BarChart3, Users, ChevronRight, Star } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
  onLibraryAccess?: () => void;
  onWatchDemo?: () => void;
  recentSessions?: any[];
}

interface Feature {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  highlight?: string;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar?: string;
}

interface StatItem {
  value: string;
  label: string;
  sublabel: string;
  gradient: 'primary' | 'accent' | 'secondary';
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartMixing, 
  onWatchDemo,
  recentSessions = [] 
}) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const handleWatchDemo = useCallback(() => {
    if (onWatchDemo) {
      onWatchDemo();
    } else {
      setIsVideoModalOpen(true);
    }
  }, [onWatchDemo]);

  const stats: StatItem[] = useMemo(() => [
    {
      value: '10M+',
      label: 'Tracks Analyzed Daily',
      sublabel: 'Live music database',
      gradient: 'primary'
    },
    {
      value: '50K+',
      label: 'DJ Sets Created',
      sublabel: 'By artists worldwide',
      gradient: 'accent'
    },
    {
      value: '99.8%',
      label: 'AI Accuracy',
      sublabel: 'Shazam-level precision',
      gradient: 'secondary'
    }
  ], []);

  const features: Feature[] = useMemo(() => [
    {
      icon: Zap,
      title: 'AI Track Recognition',
      description: 'Instantly identify any song and automatically build the perfect playlist for your vibe',
      highlight: 'Real-time identification'
    },
    {
      icon: Music,
      title: 'Smart Playlist Generation',
      description: 'Create seamless DJ sets tailored to any mood, energy level, or musical style',
      highlight: 'Mood-based mixing'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track your performance and crowd engagement with live insights and feedback',
      highlight: 'Live performance data'
    },
    {
      icon: Users,
      title: 'Crowd Intelligence',
      description: 'AI-powered crowd analysis helps you read the room and time transitions perfectly',
      highlight: 'Audience insights'
    },
  ], []);

  const testimonials: Testimonial[] = useMemo(() => [
    {
      name: "Alex Rivera",
      role: "Professional DJ",
      content: "This AI completely changed how I approach my sets. The crowd reading is incredible."
    },
    {
      name: "Sarah Chen",
      role: "Club Resident",
      content: "Finally, an AI that understands music flow. My sets have never been smoother."
    },
    {
      name: "Marcus Johnson",
      role: "Festival DJ",
      content: "The real-time analytics helped me connect with audiences like never before."
    }
  ], []);

  const platforms = useMemo(() => [
    'Beatport', 'SoundCloud', 'Mixcloud', 'Spotify', 'Apple Music', 'YouTube Music'
  ], []);

  return (
    <>
      <main className="min-h-screen gradient-bg-primary relative overflow-hidden" role="main">
        {/* Skip Navigation */}
        <a 
          href="#main-content" 
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 btn-primary"
        >
          Skip to main content
        </a>

        {/* Background Animation Layer */}
        <BackgroundAnimation />

        {/* Hero Section */}
        <HeroSection 
          onStartMixing={onStartMixing}
          onWatchDemo={handleWatchDemo}
          stats={stats}
        />

        {/* Features Section */}
        <FeaturesSection 
          features={features}
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
        />

        {/* Social Proof Section */}
        <SocialProofSection 
          testimonials={testimonials}
          platforms={platforms}
        />

        {/* Final CTA Section */}
        <FinalCTASection 
          onStartMixing={onStartMixing}
          recentSessions={recentSessions}
        />
      </main>

      {/* Demo Video Modal */}
      {isVideoModalOpen && (
        <VideoModal onClose={() => setIsVideoModalOpen(false)} />
      )}
    </>
  );
};

// Background Animation Component
const BackgroundAnimation: React.FC = () => {
  const floatingElements = useMemo(() => [
    { 
      className: "absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-float",
      delay: '0s'
    },
    { 
      className: "absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float",
      delay: '1s'
    },
    { 
      className: "absolute top-3/4 left-1/2 w-48 h-48 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float",
      delay: '2s'
    }
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Floating Elements */}
      {floatingElements.map((element, index) => (
        <div
          key={index}
          className={element.className}
          style={{ animationDelay: element.delay }}
        />
      ))}

      {/* Optimized Spectrum Animation */}
      <div className="spectrum-background opacity-30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="spectrum-bar"
            style={{
              height: `${Math.random() * 80 + 40}px`,
              top: `${20 + i * 12}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Hero Section Component
interface HeroSectionProps {
  onStartMixing: () => void;
  onWatchDemo: () => void;
  stats: StatItem[];
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStartMixing, onWatchDemo, stats }) => {
  const getGradientClass = (gradient: string) => {
    switch (gradient) {
      case 'accent':
        return 'text-gradient-accent';
      case 'secondary':
        return 'text-gradient-secondary';
      default:
        return 'text-gradient-primary';
    }
  };

  return (
    <section
      id="main-content"
      className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center"
      aria-labelledby="hero-heading"
    >
      {/* Stats Cards */}
      <div className="glass-card hover-lift mb-16 max-w-5xl mx-auto" role="region" aria-label="Platform statistics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className={`text-3xl md:text-4xl font-bold ${getGradientClass(stat.gradient)} mb-2 font-orbitron group-hover:scale-110 transition-transform duration-300`}>
                {stat.value}
              </div>
              <div className="text-gray-400 font-inter font-medium">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Content */}
      <div className="mb-16 space-y-8">
        <h1
          id="hero-heading"
          className="text-6xl md:text-8xl lg:text-9xl font-bold leading-tight font-orbitron"
        >
          <span className="text-white block mb-4 animate-fade-in">The Future of</span>
          <span className="block text-gradient-primary font-black animate-fade-in-delay">
            AI DJing
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-inter animate-fade-in-delay-2">
          Transform your music with AI-powered tools that create, perform, and analyze your perfect DJ set.
          <span className="block mt-2 text-lg text-cyan-400">Join the revolution that's changing how DJs perform.</span>
        </p>

        {/* Interactive Waveform */}
        <div className="flex justify-center mb-8" aria-hidden="true">
          <div className="flex items-end space-x-1 h-16 hover:scale-105 transition-transform cursor-pointer" 
               role="img" 
               aria-label="Interactive audio waveform animation"
               onClick={onWatchDemo}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className="waveform-bar hover:bg-cyan-400 transition-colors"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={onStartMixing}
            className="btn-primary flex items-center space-x-3 text-xl hover-lift px-10 py-5 font-bold group shadow-neon-pink hover:shadow-neon-pink-lg transition-all duration-300"
            aria-label="Start your free AI DJ trial - No credit card required"
          >
            <Play className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span>Start Free Trial</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="flex flex-col items-center">
            <button
              onClick={onWatchDemo}
              className="glass-button text-lg font-semibold px-8 py-4 border-2 border-white/20 hover:border-cyan-400/50 hover:bg-cyan-400/10 transition-all duration-300 group"
              aria-label="Watch 60-second product demo"
            >
              <span className="flex items-center space-x-2">
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Watch 60s Demo</span>
              </span>
            </button>
            <span className="text-xs text-gray-500 mt-2">No signup required • 2M+ views</span>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-8 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>4.9/5 (2,000+ reviews)</span>
          </div>
          <span>•</span>
          <span>30-day money-back guarantee</span>
          <span>•</span>
          <span>Used by 50K+ DJs worldwide</span>
        </div>
      </div>
    </section>
  );
};

// Features Section Component
interface FeaturesSectionProps {
  features: Feature[];
  activeFeature: number | null;
  setActiveFeature: (index: number | null) => void;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features, activeFeature, setActiveFeature }) => {
  return (
    <section
      className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      aria-labelledby="features-heading"
    >
      <div className="text-center mb-16">
        <h2 id="features-heading" className="text-4xl md:text-5xl font-bold text-white mb-6 font-orbitron">
          Revolutionary AI Features
        </h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Discover the cutting-edge technology that's transforming how DJs create and perform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isActive = activeFeature === index;
          
          return (
            <div
              key={index}
              className={`glass-card p-8 hover-lift group h-96 flex flex-col justify-between transition-all duration-500 cursor-pointer ${
                isActive ? 'shadow-neon-cyan scale-105' : 'hover:shadow-neon-pink'
              }`}
              role="article"
              aria-labelledby={`feature-${index}-title`}
              onMouseEnter={() => setActiveFeature(index)}
              onMouseLeave={() => setActiveFeature(null)}
              onClick={() => setActiveFeature(isActive ? null : index)}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 gradient-bg-secondary rounded-xl flex items-center justify-center mb-6 transition-all duration-500 ${
                  isActive ? 'scale-125 shadow-neon-cyan rotate-12' : 'group-hover:scale-110 group-hover:shadow-neon-pink'
                }`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                
                <h3
                  id={`feature-${index}-title`}
                  className="text-xl font-bold text-white mb-4 font-orbitron min-h-[3rem] flex items-center"
                >
                  {feature.title}
                </h3>
                
                {feature.highlight && (
                  <span className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full mb-4 border border-cyan-500/30">
                    {feature.highlight}
                  </span>
                )}
              </div>
              
              <p className={`text-gray-400 leading-relaxed font-inter text-center transition-all duration-300 ${
                isActive ? 'text-gray-300' : ''
              }`}>
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Social Proof Section Component
interface SocialProofSectionProps {
  testimonials: Testimonial[];
  platforms: string[];
}

const SocialProofSection: React.FC<SocialProofSectionProps> = ({ testimonials, platforms }) => {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20" aria-labelledby="social-proof-heading">
      <div className="text-center mb-16">
        <h2 id="social-proof-heading" className="text-4xl font-bold text-white mb-6 font-orbitron">
          Trusted by Top DJs
        </h2>
        <p className="text-gray-400 mb-12 font-inter">See what professionals are saying</p>
        
        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="glass-card p-6 hover-lift">
              <div className="flex items-center mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
              <div className="text-sm">
                <div className="text-white font-semibold">{testimonial.name}</div>
                <div className="text-gray-500">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Logos */}
        <div className="text-center">
          <p className="text-gray-400 mb-8 font-inter">Integrates seamlessly with</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            {platforms.map((platform, index) => (
              <span 
                key={index} 
                className={`text-lg font-bold hover:opacity-100 transition-opacity cursor-default ${
                  index % 2 === 0 ? 'text-gradient-accent' : 'text-gradient-primary'
                }`}
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Final CTA Section Component
interface FinalCTASectionProps {
  onStartMixing: () => void;
  recentSessions: any[];
}

const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onStartMixing, recentSessions }) => {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20" aria-labelledby="final-cta-heading">
      <div className="text-center glass-card p-12 hover-lift">
        <h2 id="final-cta-heading" className="text-4xl md:text-5xl font-bold text-white mb-6 font-orbitron">
          Ready to Revolutionize Your Sets?
        </h2>
        <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
          Join thousands of DJs who've already transformed their performances with AI. 
          <span className="block mt-2 text-cyan-400">Start your journey to the future of DJing today.</span>
        </p>
        
        {/* Recent Activity Indicator */}
        {recentSessions.length > 0 && (
          <div className="mb-8 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            {recentSessions.length} DJs created sets in the last hour
          </div>
        )}
        
        <div className="space-y-6">
          <button
            onClick={onStartMixing}
            className="btn-primary flex items-center space-x-3 text-xl hover-lift mx-auto px-12 py-6 font-bold shadow-neon-pink hover:shadow-neon-pink-lg transition-all duration-300 group"
            aria-label="Start your free trial - Join thousands of DJs"
          >
            <Play className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span>Start Free Trial</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>✓ No credit card required • ✓ Instant access • ✓ Cancel anytime</p>
            <p>✓ 30-day money-back guarantee • ✓ Premium support included</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Video Modal Component
interface VideoModalProps {
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Demo video"
    >
      <div 
        className="glass-card p-8 max-w-4xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white font-orbitron">Product Demo</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close video modal"
          >
            ×
          </button>
        </div>
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">Demo video would be embedded here</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;