import React, { useState } from 'react';
import { Music, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      if (!formData.email || !formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (!formData.password || formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Simulate authentication with error handling
      setTimeout(() => {
        try {
          // Additional validation for email format
          const emailParts = formData.email.split('@');
          if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
            throw new Error('Invalid email format');
          }

          const user = {
            id: Date.now().toString(),
            email: formData.email,
            name: formData.name || emailParts[0],
            created_at: new Date().toISOString(),
          };

          onLogin(user);
        } catch (error) {
          console.error('Authentication failed:', error);
          alert(
            error instanceof Error ? error.message : 'Authentication failed'
          );
        } finally {
          setIsLoading(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Form validation failed:', error);
      alert(error instanceof Error ? error.message : 'Please check your input');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen gradient-bg-primary flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full shadow-neon-pink">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 glass-card flex items-center justify-center mx-auto mb-4 shadow-neon-pink">
            <Music className="w-8 h-8 text-fuchsia-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-orbitron">
            MagicDJ
          </h1>
          <p className="text-slate-400 text-sm font-orbitron">
            AI-Powered DJ Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required={!isLogin}
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 px-6 text-lg font-bold shadow-neon-pink disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin"></div>
                <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
              </div>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-fuchsia-400 transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
