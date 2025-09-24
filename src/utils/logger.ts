interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | '_error';
  component: string;
  message: string;
  data?: any;
  _error?: Error;
  sessionId?: string;
  userId?: string;
  correlationId?: string;
}

interface TelemetryData {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 2000;
  private sessionId: string;
  private logLevel: string;
  private telemetryEndpoint?: string;
  private enableObservability: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
    this.telemetryEndpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT;
    this.enableObservability =
      import.meta.env.VITE_ENABLE_OBSERVABILITY === 'true';

    this.info('Logger', 'Logger initialized', {
      sessionId: this.sessionId,
      logLevel: this.logLevel,
      observabilityEnabled: this.enableObservability,
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | '_error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, _error: 3 };
    return levels[level] >= levels[this.logLevel as keyof typeof levels];
  }

  private addLog(
    level: 'debug' | 'info' | 'warn' | '_error',
    component: string,
    message: string,
    data?: any,
    _error?: Error,
    userId?: string,
    correlationId?: string
  ) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      _error,
      sessionId: this.sessionId,
      userId,
      correlationId,
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with formatting
    const logMessage = `[${entry.timestamp}] ${component}: ${message}`;
    const logData = { ...data, sessionId: this.sessionId, correlationId };

    if (level === '_error') {
      console.error(logMessage, logData, _error);
    } else if (level === 'warn') {
      console.warn(logMessage, logData);
    } else if (level === 'debug') {
      console.debug(logMessage, logData);
    } else {
      console.log(logMessage, logData);
    }

    // Send to telemetry if enabled
    if (this.enableObservability && this.telemetryEndpoint) {
      this.sendTelemetry({
        event: `log_${level}`,
        properties: {
          component,
          message,
          data,
          _error: _error?.message,
          stack: _error?.stack,
        },
        timestamp: entry.timestamp,
        sessionId: this.sessionId,
        userId,
      });
    }
  }

  private async sendTelemetry(data: TelemetryData) {
    try {
      await fetch(this.telemetryEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (_error) {
      console.warn('Failed to send telemetry:', _error);
    }
  }

  debug(
    component: string,
    message: string,
    data?: any,
    userId?: string,
    correlationId?: string
  ) {
    this.addLog(
      'debug',
      component,
      message,
      data,
      undefined,
      userId,
      correlationId
    );
  }

  info(
    component: string,
    message: string,
    data?: any,
    userId?: string,
    correlationId?: string
  ) {
    this.addLog(
      'info',
      component,
      message,
      data,
      undefined,
      userId,
      correlationId
    );
  }

  warn(
    component: string,
    message: string,
    data?: any,
    userId?: string,
    correlationId?: string
  ) {
    this.addLog(
      'warn',
      component,
      message,
      data,
      undefined,
      userId,
      correlationId
    );
  }

  _error(
    component: string,
    message: string,
    _error?: any,
    userId?: string,
    correlationId?: string
  ) {
    this.addLog(
      '_error',
      component,
      message,
      undefined,
      _error,
      userId,
      correlationId
    );
  }

  async trackOperation<T>(
    component: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: any,
    userId?: string
  ): Promise<T> {
    const correlationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.info(
      component,
      `Starting ${operation}`,
      { metadata, correlationId },
      userId,
      correlationId
    );

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.info(
        component,
        `Completed ${operation}`,
        {
          duration,
          metadata,
          correlationId,
          success: true,
        },
        userId,
        correlationId
      );

      // Track successful operations
      if (this.enableObservability) {
        this.trackEvent(
          'operation_success',
          {
            component,
            operation,
            duration,
            metadata,
          },
          userId
        );
      }

      return result;
    } catch (_error) {
      const duration = Date.now() - startTime;

      this.error(
        component,
        `Failed ${operation}`,
        _error,
        userId,
        correlationId
      );
      this.info(
        component,
        `Operation failed after ${duration}ms`,
        {
          duration,
          metadata,
          correlationId,
          success: false,
          errorMessage:
            _error instanceof Error ? _error.message : String(_error),
        },
        userId,
        correlationId
      );

      // Track failed operations
      if (this.enableObservability) {
        this.trackEvent(
          'operation_failure',
          {
            component,
            operation,
            duration,
            metadata,
            _error: _error instanceof Error ? _error.message : String(_error),
          },
          userId
        );
      }

      throw _error;
    }
  }

  trackEvent(event: string, properties: Record<string, any>, userId?: string) {
    if (!this.enableObservability) return;

    const telemetryData: TelemetryData = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId,
    };

    this.info('Analytics', `Event: ${event}`, properties, userId);

    if (this.telemetryEndpoint) {
      this.sendTelemetry(telemetryData);
    }
  }

  trackUserAction(
    action: string,
    properties?: Record<string, any>,
    userId?: string
  ) {
    this.trackEvent(`user_${action}`, properties || {}, userId);
  }

  trackAPICall(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    userId?: string
  ) {
    this.trackEvent(
      'api_call',
      {
        service,
        endpoint,
        duration,
        success,
      },
      userId
    );
  }

  getLogs(
    level?: 'debug' | 'info' | 'warn' | '_error',
    component?: string
  ): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    return filteredLogs;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clearLogs() {
    this.logs = [];
    this.info('Logger', 'Logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
