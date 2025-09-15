import { useEffect, useState } from 'react';
import { Zap, Music, Users, BarChart3, Play, Headphones, Sparkles, ArrowRight, Radio, Disc, Waves as Waveform } from 'lucide-react';

interface LandingPageProps {
  onStartMixing: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartMixing }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [rippleEffect, setRippleEffect] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const features = [
    {
      icon: Zap,
      title: 'MagicMatch',
      description: 'AI-powered track recognition and seamless playlist continuation',
      color: 'neon-green',
      gradient: 'from-neon-green to-neon-green-bright'
    },
    {
      icon: Music,
      title: 'MagicSet',
      description: 'Generate perfect DJ sets from scratch with intelligent AI curation',
      color: 'neon-purple',
      gradient: 'from-neon-purple to-neon-purple-bright'
    },
    {
      icon: Users,
      title: 'Magic Dancer',
      description: 'Real-time crowd energy analysis and visualization for perfect timing',
      color: 'neon-blue',
      gradient: 'from-neon-blue to-cyan-400'
    },
    {
      icon: BarChart3,
      title: 'Magic Producer',
      description: 'Post-performance analytics and insights for continuous improvement',
      color: 'neon-orange',
      gradient: 'from-neon-orange to-yellow-400'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleButtonClick = () => {
    setRippleEffect(true);
    setTimeout(() => setRippleEffect(false), 600);
    onStartMixing();
  };

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-dj">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        {/* Dynamic gradient orbs */}
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl animate-pulse-light opacity-20"
          style={{ 
            background: 'radial-gradient(circle, rgba(0, 255, 65, 0.3), transparent)',
            left: `${20 + Math.sin(Date.now() * 0.001) * 10}%`,
            top: `${20 + Math.cos(Date.now() * 0.001) * 10}%`
          }}
        ></div>
        <div 
          className="absolute w-80 h-80 rounded-full blur-3xl animate-pulse-light opacity-15"
          style={{ 
            background: 'radial-gradient(circle, rgba(157, 0, 255, 0.3), transparent)',
            right: `${15 + Math.sin(Date.now() * 0.0015) * 15}%`,
            top: `${30 + Math.cos(Date.now() * 0.0015) * 15}%`,
            animationDelay: '1s'
          }}
        ></div>
        <div 
          className="absolute w-72 h-72 rounded-full blur-3xl animate-pulse-light opacity-10"
          style={{ 
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2), transparent)',
            left: `${30 + Math.sin(Date.now() * 0.0008) * 20}%`,
            bottom: `${20 + Math.cos(Date.now() * 0.0008) * 20}%`,
            animationDelay: '2s'
          }}
        ></div>

        {/* Interactive mouse follower */}
        <div 
          className="absolute w-64 h-64 rounded-full blur-2xl opacity-5 pointer-events-none transition-all duration-300"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 65, 0.4), transparent)',
            left: mousePosition.x - 128,
            top: mousePosition.y - 128,
          }}
        ></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="relative z-10 px-4 lg:px-6 py-4 lg:py-6 backdrop-blur-sm bg-cyber-dark/30 border-b border-neon-green/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-cyber-dark border-3 border-neon-green rounded-sm flex items-center justify-center neon-glow-green animate-pulse-light">
              <Sparkles className="w-7 h-7 neon-text-green" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold neon-text-green tracking-wider">
                MagicDJ
              </h1>
              <p className="text-xs text-cyber-dim font-mono">AI-POWERED DJ PLATFORM</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 lg:space-x-6">
            <a href="#features" className="hidden sm:block text-cyber-gray hover:text-neon-green transition-colors font-mono text-sm tracking-wide">FEATURES</a>
            <a href="#pricing" className="hidden sm:block text-cyber-gray hover:text-neon-green transition-colors font-mono text-sm tracking-wide">PRICING</a>
            <button 
              onClick={handleButtonClick}
              className="cyber-button px-6 lg:px-8 py-3 lg:py-4 rounded-sm text-sm lg:text-base font-bold ripple-effect"
            >
              START MIXING
            </button>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 pt-16 lg:pt-24 pb-20 lg:pb-32">
        <div className="text-center">
          <div className="mb-8 lg:mb-12">
            <div className="inline-flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-3 border-neon-green rounded-sm flex items-center justify-center neon-glow-green animate-deck-glow">
                <Radio className="w-8 h-8 lg:w-10 lg:h-10 neon-text-green" />
              </div>
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-3 border-neon-purple rounded-sm flex items-center justify-center neon-glow-purple animate-deck-glow" style={{ animationDelay: '0.5s' }}>
                <Disc className="w-8 h-8 lg:w-10 lg:h-10 neon-text-purple" />
              </div>
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-cyber-dark border-3 border-neon-blue rounded-sm flex items-center justify-center neon-glow-blue animate-deck-glow" style={{ animationDelay: '1s' }}>
                <Waveform className="w-8 h-8 lg:w-10 lg:h-10 neon-text-blue" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-8 lg:mb-12 text-cyber-white leading-tight animate-fade-in-up">
            <span className="block">THE FUTURE OF</span>
            <span className="block bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-pulse-light">
              INTELLIGENT DJING
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-cyber-gray mb-12 lg:mb-16 max-w-4xl mx-auto leading-relaxed px-4 font-mono">
            Create, perform, and analyze your DJ sets with our suite of AI-powered tools. 
            <br className="hidden lg:block" />
            Experience the perfect blend of technology and creativity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 lg:gap-8 mb-16 lg:mb-20 px-4">
            <button 
              onClick={handleButtonClick}
              className={`cyber-button w-full sm:w-auto px-8 lg:px-12 py-4 lg:py-6 rounded-sm font-bold text-lg lg:text-xl flex items-center justify-center space-x-3 group ${rippleEffect ? 'animate-neon-ripple' : ''}`}
            >
              <Play className="w-6 h-6 lg:w-7 lg:h-7 neon-text-green group-hover:animate-bounce-subtle" />
              <span>START MIXING WITH AI</span>
              <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6 transition-transform group-hover:translate-x-2" />
            </button>
            
            <button className="cyber-button cyber-button-purple w-full sm:w-auto px-8 lg:px-12 py-4 lg:py-6 rounded-sm font-bold text-lg lg:text-xl flex items-center justify-center space-x-3 group">
              <Headphones className="w-6 h-6 lg:w-7 lg:h-7 neon-text-purple group-hover:animate-bounce-subtle" />
              <span>LISTEN TO DEMO</span>
            </button>
          </div>

          {/* Enhanced Feature Showcase */}
          <div className="relative">
            <div className="cyber-card rounded-sm p-6 lg:p-10 mx-4 lg:mx-0 bg-gradient-to-b from-cyber-medium/50 to-cyber-dark/50 backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = index === currentFeature;
                  
                  return (
                    <div
                      key={index}
                      className={`relative p-6 lg:p-8 rounded-sm transition-all duration-700 cursor-pointer group ${
                        isActive 
                          ? 'bg-cyber-medium/80 scale-105 neon-glow-green border-2 border-neon-green' 
                          : 'bg-cyber-dark/60 hover:bg-cyber-medium/60 border-2 border-cyber-light hover:border-neon-green/50'
                      }`}
                      onClick={() => setCurrentFeature(index)}
                    >
                      <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-sm bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 lg:mb-6 mx-auto transition-all duration-500 ${
                        isActive ? 'animate-deck-glow scale-110' : 'group-hover:scale-105'
                      }`}>
                        <Icon className="w-7 h-7 lg:w-8 lg:h-8 text-cyber-black" />
                      </div>
                      
                      <h3 className="text-lg lg:text-xl font-bold mb-3 lg:mb-4 text-center text-cyber-white group-hover:neon-text-green transition-colors">
                        {feature.title}
                      </h3>
                      
                      <p className="text-sm lg:text-base text-cyber-gray text-center leading-relaxed font-mono">
                        {feature.description}
                      </p>
                      
                      {isActive && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <div className="w-3 h-3 bg-neon-green rounded-full animate-neon-pulse-fast neon-glow-green"></div>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
                  );
                })}
              </div>
              
              {/* Feature indicator dots */}
              <div className="flex justify-center space-x-3 mt-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentFeature 
                        ? 'bg-neon-green neon-glow-green scale-125' 
                        : 'bg-cyber-light hover:bg-neon-green/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      <div className="relative z-10 bg-gradient-to-r from-cyber-dark/80 to-cyber-medium/80 border-y-2 border-neon-green backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12 text-center">
            <div className="group">
              <div className="text-4xl lg:text-5xl font-bold neon-text-green mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform">
                10M+
              </div>
              <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">TRACKS ANALYZED</div>
              <div className="w-16 h-1 bg-gradient-to-r from-neon-green to-transparent mx-auto mt-2"></div>
            </div>
            <div className="group">
              <div className="text-4xl lg:text-5xl font-bold neon-text-purple mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform" style={{ animationDelay: '0.5s' }}>
                50K+
              </div>
              <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">AI-GENERATED SETS</div>
              <div className="w-16 h-1 bg-gradient-to-r from-neon-purple to-transparent mx-auto mt-2"></div>
            </div>
            <div className="group">
              <div className="text-4xl lg:text-5xl font-bold neon-text-blue mb-3 animate-neon-pulse font-mono group-hover:scale-110 transition-transform" style={{ animationDelay: '1s' }}>
                99.8%
              </div>
              <div className="text-sm lg:text-base text-cyber-gray font-mono tracking-wide">RECOGNITION ACCURACY</div>
              <div className="w-16 h-1 bg-gradient-to-r from-neon-blue to-transparent mx-auto mt-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-32 text-center">
        <div className="mb-8 lg:mb-12">
          <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 bg-cyber-dark/50 border border-neon-green/30 rounded-sm backdrop-blur-sm">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-neon-pulse-fast"></div>
            <span className="text-sm font-mono text-neon-green tracking-wider">READY TO TRANSFORM YOUR SETS?</span>
          </div>
        </div>
        
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 lg:mb-8 bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-pulse-light">
          Join the AI DJ Revolution
        </h2>
        
        <p className="text-lg lg:text-xl text-cyber-gray mb-12 lg:mb-16 max-w-3xl mx-auto px-4 font-mono leading-relaxed">
          Join thousands of DJs who are already using AI to create unforgettable musical experiences.
          <br className="hidden lg:block" />
          The future of DJing is here, and it's intelligent.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
          <button 
            onClick={handleButtonClick}
            className="cyber-button px-10 lg:px-14 py-5 lg:py-6 rounded-sm font-bold text-xl lg:text-2xl ripple-effect group flex items-center space-x-4"
          >
            <Zap className="w-6 h-6 lg:w-7 lg:h-7 neon-text-green group-hover:animate-bounce-subtle" />
            <span>START YOUR MAGIC JOURNEY</span>
            <ArrowRight className="w-6 h-6 lg:w-7 lg:h-7 transition-transform group-hover:translate-x-2" />
          </button>
        </div>
        
        <div className="flex items-center justify-center space-x-8 text-sm text-cyber-dim font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-neon-green rounded-full"></div>
            <span>FREE TO START</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-neon-purple rounded-full"></div>
            <span>NO CREDIT CARD</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
            <span>INSTANT ACCESS</span>
          </div>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-1/4 left-10 w-4 h-4 bg-neon-green rounded-full animate-bounce-subtle opacity-30"></div>
      <div className="absolute top-1/3 right-20 w-3 h-3 bg-neon-purple rounded-full animate-bounce-subtle opacity-20" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-neon-blue rounded-full animate-bounce-subtle opacity-25" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-neon-orange rounded-full animate-bounce-subtle opacity-15" style={{ animationDelay: '0.5s' }}></div>
    </div>
  );
};

export default LandingPage;