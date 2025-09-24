import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      // Better email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name || formData.email.split('@')[0],
            }
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
      }

      if (result._error) {
        throw new Error(result._error.message);
      }

      if (isSignUp && !result.data.session) {
        alert('Check your email for the confirmation link!');
      }

      onClose();
      setFormData({ email: '', password: '', name: '' });
    } catch (_error) {
      console._error('Auth _error:', _error);
      alert(_error instanceof Error ? _error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '', name: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl
                        glass-card p-8 shadow-2xl transition-all border border-glass">

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 glass-button w-8 h-8 flex items-center justify-center
                     hover:bg-white/10 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 gradient-bg-secondary rounded-full
                          flex items-center justify-center shadow-neon-pink">
              {isSignUp ? (
                <UserPlus className="w-8 h-8 text-white" />
              ) : (
                <LogIn className="w-8 h-8 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gradient-primary font-orbitron">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400 mt-2">
              {isSignUp
                ? 'Join MagicDJ and save your playlists to the cloud'
                : 'Sign in to access your saved playlists'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-glass border border-glass rounded-lg text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500
                           focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-glass border border-glass rounded-lg text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500
                           focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-glass border border-glass rounded-lg text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500
                           focus:border-transparent transition-all"
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 gradient-bg-secondary hover:bg-fuchsia-600/80
                       text-white font-medium rounded-lg transition-all shadow-neon-pink
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center
                       justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-2 text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors"
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;