import { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, Zap, Play } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(false); // Start with signup by default
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            setError('Account not found. Try signing up first!');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('Logged in successfully!');
          setTimeout(onClose, 1000);
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Account exists! Use login instead.');
            setIsLogin(true);
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('Account created! You can now login.');
          setIsLogin(true);
          // Don't clear email/password so they can immediately login
        }
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    onClose();
  };

  const handleQuickDemo = () => {
    setEmail('demo@magicdj.com');
    setPassword('demo123456');
    setIsLogin(false); // Will create account if it doesn't exist
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md">
        <div className="cyber-card rounded-sm p-6 lg:p-8 bg-gradient-to-b from-cyber-medium to-cyber-dark border-2 border-neon-green neon-glow-green animate-fade-in-up">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-cyber-dark border-2 border-neon-green rounded-sm flex items-center justify-center neon-glow-green">
                <User className="w-5 h-5 neon-text-green" />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold neon-text-green tracking-wide">
                {isLogin ? 'WELCOME BACK' : 'JOIN MAGICDJ'}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 bg-cyber-dark border border-red-500 rounded-sm flex items-center justify-center hover:bg-red-900/20 transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>

          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleQuickDemo}
              className="cyber-button py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 neon-text-green" />
              <span>DEMO</span>
            </button>
            <button
              onClick={handleGuestMode}
              className="cyber-button cyber-button-purple py-3 px-4 rounded-sm text-sm font-bold flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 neon-text-purple" />
              <span>GUEST</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-cyber-light"></div>
            <span className="px-3 text-xs text-cyber-dim font-mono">OR</span>
            <div className="flex-1 h-px bg-cyber-light"></div>
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
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

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
                  minLength={6}
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

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-sm">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}

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
                  <span>{isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            <p className="text-cyber-gray text-sm mb-3">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="cyber-button cyber-button-purple px-6 py-2 rounded-sm font-bold text-sm"
            >
              {isLogin ? 'SIGN UP' : 'LOGIN'}
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-cyber-darker border border-neon-green/30 rounded-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-neon-pulse-fast"></div>
              <span className="text-xs font-bold text-neon-green tracking-wider">PRO TIP</span>
            </div>
            <p className="text-xs text-cyber-dim leading-relaxed">
              {isLogin 
                ? "New users should sign up first! Click 'DEMO' for instant access with sample data."
                : "Create your account to save playlists and track your DJ sessions. Use 'GUEST' to try without signing up."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;