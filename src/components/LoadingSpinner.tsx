import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  variant?: 'default' | 'futuristic' | 'minimal';
  progress?: number;
  subtext?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  className = '',
  variant = 'default',
  progress,
  subtext,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  if (variant === 'futuristic') {
    return (
      <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
        {/* Futuristic circular progress */}
        <div className="relative">
          <div className={`${sizeClasses[size]} glass-card rounded-full flex items-center justify-center animate-pulse-glow`}>
            <div className="w-full h-full rounded-full border-2 border-gradient-primary animate-spin" />
          </div>
          {progress !== undefined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gradient-primary font-mono">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        {text && (
          <div className="text-center">
            <p className={`text-gradient-accent ${textSizeClasses[size]} font-orbitron font-bold tracking-wide`}>
              {text}
            </p>
            {subtext && (
              <p className="text-gray-400 text-xs mt-1 font-mono">{subtext}</p>
            )}
            {progress !== undefined && (
              <div className="w-32 h-1 bg-glass border border-glass rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full gradient-bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin`} />
        {text && <p className={`text-gray-300 ${textSizeClasses[size]}`}>{text}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-glass border-t-gradient-primary rounded-full animate-spin shadow-neon-pink`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`text-gray-300 ${textSizeClasses[size]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
