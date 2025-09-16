import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  Wand2,
  Music,
  BarChart3,
  Save,
  Play,
  ChevronRight,
  User
} from 'lucide-react';

export type NavigationView = 'home' | 'create' | 'play' | 'library' | 'analytics';

interface NavigationProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  user?: { email: string } | null;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  showBackButton?: boolean;
  onBack?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  user,
  breadcrumbs = [],
  showBackButton,
  onBack
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems = [
    {
      id: 'home' as NavigationView,
      label: 'Home',
      icon: Home,
      description: 'Dashboard & Recent Sessions'
    },
    {
      id: 'create' as NavigationView,
      label: 'Create',
      icon: Wand2,
      description: 'AI Magic Studio'
    },
    {
      id: 'play' as NavigationView,
      label: 'Play',
      icon: Play,
      description: 'DJ Player & Controls',
      disabled: currentView !== 'play' // Only enabled when in play mode
    },
    {
      id: 'library' as NavigationView,
      label: 'Library',
      icon: Save,
      description: 'Saved Playlists & Profile'
    },
    {
      id: 'analytics' as NavigationView,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Performance Insights',
      disabled: currentView !== 'analytics' // Only enabled when analytics available
    }
  ];

  const handleNavigation = (view: NavigationView) => {
    if (navigationItems.find(item => item.id === view)?.disabled) return;
    
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const getCurrentNavItem = () => {
    return navigationItems.find(item => item.id === currentView);
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="nav-sticky sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="w-10 h-10 bg-cyber-medium border border-neon-green hover:neon-glow-green rounded-sm flex items-center justify-center transition-all md:hidden"
                  aria-label="Go back"
                >
                  <ChevronRight className="w-5 h-5 neon-text-green rotate-180" />
                </button>
              )}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 glass-card flex items-center justify-center animate-pulse-glow">
                  <Music className="w-6 h-6 text-gradient-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-orbitron text-gradient-primary tracking-wider">MagicDJ</h1>
                  <p className="text-xs text-gray-400 font-mono hidden sm:block">AI-Powered DJ Platform</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isDisabled = item.disabled;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      disabled={isDisabled}
                      className={`
                        nav-item font-inter tracking-wide
                        ${isActive ? 'active' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      title={item.description}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Profile & Mobile Menu */}
            <div className="flex items-center space-x-3">
              {user && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-cyber-medium border border-neon-purple rounded-sm">
                  <User className="w-4 h-4 neon-text-purple" />
                  <span className="text-sm text-cyber-white font-mono max-w-24 truncate">
                    {user.email.split('@')[0]}
                  </span>
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-10 h-10 bg-cyber-medium border border-neon-green rounded-sm flex items-center justify-center transition-all"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 neon-text-green" />
                ) : (
                  <Menu className="w-5 h-5 neon-text-green" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="border-t border-glass bg-glass">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center space-x-2 py-3 text-sm font-mono">
                <Home className="w-4 h-4 text-gray-400" />
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    {crumb.onClick ? (
                      <button
                        onClick={crumb.onClick}
                        className="text-gradient-accent hover:text-neon-glow transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-white">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="fixed top-0 right-0 h-full w-80 max-w-sm glass-card border-l border-glass">
            <div className="flex items-center justify-between p-4 border-b border-glass">
              <h2 className="text-lg font-bold text-gradient-primary font-orbitron">Navigation</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="glass-button w-8 h-8 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isDisabled = item.disabled;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    disabled={isDisabled}
                    className={`
                      w-full p-4 rounded-sm flex items-center space-x-3 transition-all text-left
                      ${isActive 
                        ? 'bg-neon-green text-cyber-black border border-neon-green' 
                        : isDisabled
                          ? 'text-cyber-dim cursor-not-allowed opacity-50 bg-cyber-darker'
                          : 'bg-cyber-medium hover:bg-cyber-light text-cyber-white hover:neon-glow-green'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold font-mono">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyber-light bg-cyber-darker">
                <div className="flex items-center space-x-3 p-3 bg-cyber-medium rounded-sm border border-neon-purple">
                  <div className="w-10 h-10 bg-neon-purple rounded-sm flex items-center justify-center">
                    <User className="w-5 h-5 text-cyber-black" />
                  </div>
                  <div>
                    <div className="font-medium text-cyber-white font-mono">{user.email.split('@')[0]}</div>
                    <div className="text-xs text-cyber-gray">{user.email}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions Bar (Desktop) */}
      <div className="hidden lg:block bg-cyber-darker border-b border-cyber-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4 text-sm font-mono">
              <span className="text-cyber-dim">Quick Actions:</span>
              <button 
                onClick={() => handleNavigation('create')}
                className="text-neon-green hover:text-neon-green-bright transition-colors"
              >
                + New Mix
              </button>
              <button 
                onClick={() => handleNavigation('library')}
                className="text-neon-purple hover:text-neon-purple-bright transition-colors"
              >
                Browse Library
              </button>
            </div>
            <div className="text-xs text-cyber-dim font-mono">
              Current: {getCurrentNavItem()?.description}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;