import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin({
        id: 'demo-user',
        email: 'demo@magicdj.com',
        name: 'Demo User'
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen gradient-bg-primary flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center shadow-neon-pink">
        <div className="mb-8">
          <div className="w-20 h-20 glass-card flex items-center justify-center mx-auto mb-6 shadow-neon-pink animate-pulse-glow">
            <Music className="w-10 h-10 text-fuchsia-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 font-orbitron">MagicDJ</h1>
          <p className="text-slate-400 font-orbitron">AI-Powered DJ Platform</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="btn-primary w-full py-3 px-6 text-lg font-bold shadow-neon-pink disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              'Continue as Demo User'
            )}
          </button>

          <p className="text-xs text-slate-500 font-orbitron">
            Demo mode provides full access to all DJ features
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;