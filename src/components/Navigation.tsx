import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  User,
  ArrowLeft,
} from 'lucide-react';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  requiresData?: boolean;
}

interface NavigationProps {
  user?: { email: string } | null;
  hasPlaylist?: boolean;
  hasSession?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  user,
  hasPlaylist = false,
  hasSession = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      path: '/',
      label: 'Home',
      icon: Home,
      description: 'Dashboard & Recent Sessions',
    },
    {
      path: '/create',
      label: 'Studio',
      icon: Wand2,
      description: 'AI Magic Studio',
    },
    {
      path: '/play',
      label: 'Player',
      icon: Play,
      description: 'DJ Player & Controls',
      requiresData: true, // Requires playlist
    },
    {
      path: '/library',
      label: 'Library',
      icon: Save,
      description: 'Saved Playlists & Profile',
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Performance Insights',
      requiresData: true, // Requires session data
    },
  ];

  const isItemDisabled = (item: NavigationItem) => {
    if (!item.requiresData) return false;

    // Play requires playlist
    if (item.path === '/play') return !hasPlaylist;

    // Analytics requires session
    if (item.path === '/analytics') return !hasSession;

    return false;
  };

  // Note: getCurrentPath available for future use
  // const getCurrentPath = () => location.pathname;

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) return [];

    return segments.map((segment, index) => {
      const segmentPath = '/' + segments.slice(0, index + 1).join('/');
      const item = navigationItems.find(nav => nav.path === segmentPath);

      return {
        label:
          item?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: segmentPath,
        isLast: index === segments.length - 1,
      };
    });
  };

  const breadcrumbs = getBreadcrumbs();
  const canGoBack = location.pathname !== '/' && window.history.length > 1;

  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="nav-sticky sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              {canGoBack && (
                <button
                  onClick={handleGoBack}
                  className="glass-button hover-lift w-10 h-10 flex items-center justify-center md:hidden"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-fuchsia-400" />
                </button>
              )}
              <Link
                to="/"
                className="flex items-center space-x-3 hover-lift transition-transform"
              >
                <div className="w-12 h-12 glass-card flex items-center justify-center shadow-neon-pink animate-pulse-glow">
                  <Music className="w-7 h-7 text-fuchsia-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-orbitron text-gradient-primary tracking-wider">
                    MagicDJ
                  </h1>
                  <p className="text-xs text-slate-400 font-orbitron hidden sm:block">
                    AI-Powered DJ Platform
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isDisabled = isItemDisabled(item);

                  if (isDisabled) {
                    return (
                      <div
                        key={item.path}
                        className="nav-item opacity-50 cursor-not-allowed"
                        title={`${item.description} (${item.path === '/play' ? 'Requires playlist' : 'Requires session data'})`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold font-orbitron">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        nav-item font-orbitron tracking-wide transition-all
                        ${isActive ? 'active' : ''}
                      `}
                      title={item.description}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Profile & Mobile Menu */}
            <div className="flex items-center space-x-3">
              {user && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 glass-card group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="w-8 h-8 gradient-bg-secondary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-mono truncate">
                      {user.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-gray-400">Profile</span>
                  </div>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-10 h-10 glass-button flex items-center justify-center"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-gradient-accent" />
                ) : (
                  <Menu className="w-5 h-5 text-gradient-accent" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="border-t border-glass bg-glass backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center space-x-2 py-3 text-sm font-orbitron">
                <Link
                  to="/"
                  className="flex items-center text-slate-400 hover:text-fuchsia-400 transition-colors"
                >
                  <Home className="w-4 h-4" />
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    {crumb.isLast ? (
                      <span className="text-white font-semibold">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.path}
                        className="text-fuchsia-400 hover:text-cyan-400 transition-colors font-medium"
                      >
                        {crumb.label}
                      </Link>
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
        <div className="fixed inset-0 z-50 md:hidden" id="mobile-menu">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed top-0 right-0 h-full w-80 max-w-sm glass-card border-l border-glass transform transition-transform">
            <div className="flex items-center justify-between p-4 border-b border-glass">
              <h2 className="text-lg font-bold text-gradient-primary font-orbitron">
                Navigation
              </h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="glass-button hover-lift w-8 h-8 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isDisabled = isItemDisabled(item);

                if (isDisabled) {
                  return (
                    <div
                      key={item.path}
                      className="w-full p-4 rounded-lg flex items-center space-x-3 text-gray-500 cursor-not-allowed opacity-50"
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold font-orbitron">
                          {item.label}
                        </div>
                        <div className="text-xs opacity-75">
                          {item.description} -{' '}
                          {item.path === '/play'
                            ? 'Requires playlist'
                            : 'Requires session data'}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      w-full p-4 rounded-lg flex items-center space-x-3 transition-all text-left block focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-slate-900
                      ${
                        isActive
                          ? 'btn-primary'
                          : 'glass-card hover-lift text-white'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold font-orbitron">
                        {item.label}
                      </div>
                      <div className="text-xs opacity-75">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-glass bg-glass">
                <div className="flex items-center space-x-3 p-3 glass-card shadow-neon-pink">
                  <div className="w-10 h-10 gradient-bg-secondary rounded-sm flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white font-mono">
                      {user.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default Navigation;
