import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setShowPassword(false);
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md">
        {/* Enhanced Modal Container */}
        <div className="cyber-card rounded-sm p-6 lg:p-8 bg-gradient-to-b from-cyber-medium to-cyber-dark border-2 border-neon-green neon-glow-green animate-fade-in-up">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center neon-glow-green">
                <User className="w-5 h-5 neon-text-green" />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold neon-text-green tracking-wide">
                {isLogin ? 'DJ LOGIN' : 'JOIN THE MIX'}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 bg-cyber-dark border border-red-500 rounded-sm flex items-center justify-center hover:bg-red-900/20 transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-cyber-gray mb-2 tracking-wide">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neon-green" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-cyber-dark border border-neon-green rounded-sm focus:outline-none focus:border-neon-purple text-cyber-white placeholder-cyber-dim"
                  placeholder="dj@magicdj.com"
                  required
                />
              </div>
            </div>

            {/* Display Name Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-cyber-gray mb-2 tracking-wide">
                  DJ NAME
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neon-purple" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-cyber-dark border border-neon-purple rounded-sm focus:outline-none focus:border-neon-green text-cyber-white placeholder-cyber-dim"
                    placeholder="DJ Cyber"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-cyber-gray mb-2 tracking-wide">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neon-blue" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-cyber-dark border border-neon-blue rounded-sm focus:outline-none focus:border-neon-green text-cyber-white placeholder-cyber-dim"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyber-dim hover:text-neon-blue transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-sm">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="cyber-button w-full py-4 px-6 rounded-sm font-bold text-lg flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-sm animate-spin"></div>
              ) : (
                <>
                  <Zap className="w-5 h-5 neon-text-green" />
                  <span>{isLogin ? 'LOGIN TO MIX' : 'CREATE DJ ACCOUNT'}</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            <p className="text-cyber-gray text-sm mb-3">
              {isLogin ? "New to the decks?" : "Already have an account?"}
            </p>
            <button
              type="button"
              onClick={handleModeSwitch}
              className="cyber-button cyber-button-purple px-6 py-2 rounded-sm font-bold text-sm"
            >
              {isLogin ? 'SIGN UP' : 'LOGIN'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-cyber-darker border border-neon-green/30 rounded-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-neon-pulse-fast"></div>
              <span className="text-xs font-bold text-neon-green tracking-wider">DEMO MODE</span>
            </div>
            <p className="text-xs text-cyber-dim leading-relaxed">
              {isLogin 
                ? "Sign in to save your mixes and access your personal library."
                : "Join MagicDJ to save playlists, track your sessions, and unlock advanced features."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;