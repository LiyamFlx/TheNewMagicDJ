import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';

    // Log the error
    logger.error('ErrorBoundary', 'React component error caught', {
      error,
      errorInfo,
      errorId,
      componentStack: errorInfo.componentStack,
    });

    // Handle with error handler
    const appError = {
      code: 'REACT_ERROR_BOUNDARY',
      message: error.message,
      userMessage:
        'A component error occurred. The page will be refreshed automatically.',
      severity: 'high' as const,
      recoverable: true,
      context: {
        errorId,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
    };

    errorHandler.handleError(appError);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    logger.info('ErrorBoundary', 'User initiated retry', {
      errorId: this.state.errorId,
    });

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    logger.info('ErrorBoundary', 'User navigated to home', {
      errorId: this.state.errorId,
    });

    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen gradient-bg-primary flex-center p-4 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-float"></div>
            <div
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-float"
              style={{ animationDelay: '1s' }}
            ></div>
          </div>

          <div className="relative z-10 max-w-md w-full glass-card p-xl text-center shadow-neon-hard animate-scale-in">
            <div className="w-16 h-16 glass-card flex-center mx-auto mb-6 shadow-neon-pink animate-pulse-glow">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold mb-4 text-gradient-primary font-orbitron tracking-wide">
              SYSTEM ERROR
            </h1>

            <p className="text-gray-300 mb-6 leading-relaxed font-inter">
              We encountered an unexpected error. Don't worry, our team has been
              notified and we're working on a fix.
            </p>

            {this.state.error && (
              <div className="glass-card p-md mb-6 text-left">
                <p className="text-sm text-gray-400 mb-2 font-inter font-bold">ERROR DETAILS:</p>
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            <div className="flex-center space-md">
              <button
                onClick={this.handleRetry}
                className="btn-primary btn-lg flex-center space-sm ease-bounce shadow-neon-medium"
                aria-label="Try again"
                title="Try again"
              >
                <RefreshCw className="w-5 h-5" />
                <span>TRY AGAIN</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="btn-secondary btn-lg flex-center space-sm ease-elastic shadow-neon-hard"
                aria-label="Go home"
                title="Go home"
              >
                <Home className="w-5 h-5" />
                <span>GO HOME</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6 font-mono">
              If this problem persists, please contact our support team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
