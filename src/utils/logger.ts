interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private addLog(level: 'info' | 'warn' | 'error', component: string, message: string, data?: any, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      error
    };

    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with formatting
    const logMessage = `[${entry.timestamp}] ${component}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, data, error);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }
  }

  info(component: string, message: string, data?: any) {
    this.addLog('info', component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.addLog('warn', component, message, data);
  }

  error(component: string, message: string, error?: any) {
    this.addLog('error', component, message, undefined, error);
  }

  async trackOperation<T>(
    component: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now();
    this.info(component, `Starting ${operation}`, metadata);
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(component, `Completed ${operation}`, { duration, metadata });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(component, `Failed ${operation}`, error);
      this.info(component, `Operation failed after ${duration}ms`, { duration, metadata });
      throw error;
    }
  }

  getLogs(level?: 'info' | 'warn' | 'error'): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();