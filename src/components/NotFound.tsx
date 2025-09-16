import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Music } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen gradient-bg-primary flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto glass-card flex items-center justify-center shadow-neon-pink animate-pulse-glow">
            <Music className="w-16 h-16 text-fuchsia-400" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-8xl font-bold font-orbitron text-gradient-primary mb-4">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 font-orbitron">
          Beat Not Found
        </h2>
        <p className="text-lg text-slate-400 mb-8 font-orbitron leading-relaxed">
          Looks like this track went off the grid. The page you're looking for doesn't exist in our DJ library.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="btn-primary px-8 py-4 flex items-center space-x-3 font-orbitron"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="btn-secondary px-8 py-4 flex items-center space-x-3 font-orbitron"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 glass-card">
          <h3 className="text-lg font-bold text-white mb-4 font-orbitron">
            Need Help Finding Your Beat?
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-orbitron">
            <Link
              to="/create"
              className="text-fuchsia-400 hover:text-cyan-400 transition-colors"
            >
              Create New Mix
            </Link>
            <Link
              to="/library"
              className="text-cyan-400 hover:text-fuchsia-400 transition-colors"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;