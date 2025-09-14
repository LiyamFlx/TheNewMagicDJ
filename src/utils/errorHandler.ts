import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: Record<string, any>;
  timestamp: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private maxErrors = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private constructor() {
    // Global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  private handleGlobalError(event: ErrorEvent): void {
    this.handleError({
      code: 'GLOBAL_ERROR',
      message: event.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      severity: 'high',
      recoverable: true,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.handleError({
      code: 'UNHANDLED_PROMISE_REJECTION',
      message: String(event.reason),
      userMessage: 'A background operation failed. Some features may not work correctly.',
      severity: 'medium',
      recoverable: true,
      context: {
        reason: event.reason,
        stack: event.reason?.stack
      },
      timestamp: new Date().toISOString()
    });
  }

  handleError(error: AppError): void {
    // Add to queue
    this.errorQueue.push(error);
    if (this.errorQueue.length > this.maxErrors) {
      this.errorQueue.shift();
    }

    // Log the error
    logger.error('ErrorHandler', error.message, {
      code: error.code,
      severity: error.severity,
      recoverable: error.recoverable,
      context: error.context
    });

    // Track error analytics
    logger.trackEvent('error_occurred', {
      code: error.code,
      severity: error.severity,
      recoverable: error.recoverable,
      userMessage: error.userMessage
    });

    // Notify user if appropriate
    if (error.severity === 'high' || error.severity === 'critical') {
      this.notifyUser(error);
    }
  }

  private notifyUser(error: AppError): void {
    // This would integrate with your notification system
    console.warn('User notification:', error.userMessage);
    
    // You could dispatch a custom event here for UI components to listen to
    window.dispatchEvent(new CustomEvent('app-error', { 
      detail: error 
    }));
  }

  // Specific error creators
  createAPIError(service: string, endpoint: string, status: number, message: string): AppError {
    return {
      code: `API_ERROR_${service.toUpperCase()}`,
      message: `${service} API error: ${message}`,
      userMessage: `Unable to connect to ${service}. Please check your internet connection and try again.`,
      severity: status >= 500 ? 'high' : 'medium',
      recoverable: true,
      context: {
        service,
        endpoint,
        status,
        originalMessage: message
      },
      timestamp: new Date().toISOString()
    };
  }

  createAuthError(service: string): AppError {
    return {
      code: `AUTH_ERROR_${service.toUpperCase()}`,
      message: `Authentication failed for ${service}`,
      userMessage: `Unable to authenticate with ${service}. Please check your API credentials.`,
      severity: 'high',
      recoverable: false,
      context: { service },
      timestamp: new Date().toISOString()
    };
  }

  createRateLimitError(service: string, retryAfter: number): AppError {
    return {
      code: `RATE_LIMIT_${service.toUpperCase()}`,
      message: `Rate limit exceeded for ${service}`,
      userMessage: `Too many requests to ${service}. Please wait ${Math.ceil(retryAfter / 1000)} seconds and try again.`,
      severity: 'medium',
      recoverable: true,
      context: { service, retryAfter },
      timestamp: new Date().toISOString()
    };
  }

  createValidationError(field: string, value: any, rule: string): AppError {
    return {
      code: 'VALIDATION_ERROR',
      message: `Validation failed for ${field}: ${rule}`,
      userMessage: `Please check your input for ${field} and try again.`,
      severity: 'low',
      recoverable: true,
      context: { field, value, rule },
      timestamp: new Date().toISOString()
    };
  }

  createNetworkError(operation: string): AppError {
    return {
      code: 'NETWORK_ERROR',
      message: `Network error during ${operation}`,
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      severity: 'medium',
      recoverable: true,
      context: { operation },
      timestamp: new Date().toISOString()
    };
  }

  getErrors(severity?: AppError['severity']): AppError[] {
    if (severity) {
      return this.errorQueue.filter(error => error.severity === severity);
    }
    return [...this.errorQueue];
  }

  clearErrors(): void {
    this.errorQueue = [];
  }

  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.errorQueue.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1;
    });
    return stats;
  }
}

export const errorHandler = ErrorHandler.getInstance();