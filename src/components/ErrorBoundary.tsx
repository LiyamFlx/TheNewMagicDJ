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
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // Log the error
    logger.error('ErrorBoundary', 'React component error caught', {
      error,
      errorInfo,
      errorId,
      componentStack: errorInfo.componentStack
    });

    // Handle with error handler
    const appError = {
      code: 'REACT_ERROR_BOUNDARY',
      message: error.message,
      userMessage: 'A component error occurred. The page will be refreshed automatically.',
      severity: 'high' as const,
      recoverable: true,
      context: {
        errorId,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString()
    };

    errorHandler.handleError(appError);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    logger.info('ErrorBoundary', 'User initiated retry', {
      errorId: this.state.errorId
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    logger.info('ErrorBoundary', 'User navigated to home', {
      errorId: this.state.errorId
    });
    
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold mb-4 text-white">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              We encountered an unexpected error. Don't worry, our team has been notified and we're working on a fix.
            </p>

            {this.state.error && (
              <div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-400 mb-2">Error Details:</p>
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
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