/**
 * Structured Logger Service
 * Centralized logging with production mode support
 * Replaces all console.log/warn/error statements across the application
 */

const __DEV__ = process.env.NODE_ENV === 'development';

// Import console sanitizer for production
let sanitizeConsoleOutput: ((...args: any[]) => any[]) | null = null;
if (!__DEV__) {
  try {
    const sanitizer = require('../security/consoleSanitizer');
    sanitizeConsoleOutput = sanitizer.sanitizeConsoleOutput;
  } catch (e) {
    // Sanitizer not available, continue without it
  }
}

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  category?: string;
  data?: any;
  stack?: string;
}

interface LoggerConfig {
  enableLogging: boolean;
  logLevel: LogLevel[];
  allowedCategories: string[];
  enableRemoteLogging: boolean;
  maxLogHistory: number;
}

const config: LoggerConfig = {
  enableLogging: __DEV__,
  logLevel: __DEV__ ? ['log', 'warn', 'error', 'info', 'debug'] : ['error', 'warn'],
  allowedCategories: [
    'AUTH',
    'AUTH_TOKEN',
    'ONESIGNAL',
    'PUSHER',
    'CHAT',
    'CHAT_DETAIL',
    'LIVE_CHAT',
    'WALLET',
    'AUDIO',
    'PRIVATE_CHAT',
    'ERROR',
    'NETWORK',
    'API',
    'STORAGE',
    'PERFORMANCE',
    'ANIMATION',
  ],
  enableRemoteLogging: false,
  maxLogHistory: 1000,
};

class Logger {
  private static instance: Logger;
  private logCount = 0;
  private readonly MAX_LOGS_PER_MINUTE = 100;
  private logHistory: LogEntry[] = [];
  private lastResetTime = Date.now();

  private constructor() {
    // Reset log count periodically
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.resetLogCount();
      }, 60000);
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel, category?: string): boolean {
    // Always log errors
    if (level === 'error') {
      return true;
    }

    if (!config.enableLogging) {
      return false;
    }

    // Check log level
    if (!config.logLevel.includes(level)) {
      return false;
    }

    // Check if category is allowed
    if (category && !config.allowedCategories.includes(category)) {
      return false;
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.logCount = 0;
      this.lastResetTime = now;
    }

    this.logCount++;
    if (this.logCount > this.MAX_LOGS_PER_MINUTE) {
      return false;
    }

    return true;
  }

  private serializeError(error: any): any {
    if (!error) return error;

    // If it's an Error object, extract useful information
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...(error as any), // Include any additional properties
      };
    }

    // If it's an object with error-like properties
    if (typeof error === 'object') {
      try {
        // Try to stringify to see if it's serializable
        JSON.stringify(error);
        return error;
      } catch (e) {
        // If not serializable, extract what we can
        return {
          message: error.message || String(error),
          name: error.name || 'Error',
          stack: error.stack,
          toString: error.toString(),
        };
      }
    }

    return error;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    category?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    // Serialize data if it's an error object
    let serializedData = data;
    if (data && (data instanceof Error || (typeof data === 'object' && data.message))) {
      serializedData = this.serializeError(data);
    } else if (data) {
      serializedData = sanitizeConsoleOutput ? sanitizeConsoleOutput(data)[0] : data;
    }

    return {
      timestamp: Date.now(),
      level,
      message,
      category,
      data: serializedData,
      stack: error?.stack || (data instanceof Error ? data.stack : data?.stack),
    };
  }

  private writeLog(entry: LogEntry): void {
    // Store in history
    this.logHistory.push(entry);
    if (this.logHistory.length > config.maxLogHistory) {
      this.logHistory.shift();
    }

    // Write to console only in development
    if (__DEV__) {
      const prefix = entry.category ? `[${entry.category}]` : '';
      const formattedMessage = `${prefix} ${entry.message}`;

      switch (entry.level) {
        case 'error':
          // Properly serialize error data for console
          let errorData = entry.data;
          if (errorData && typeof errorData === 'object') {
            try {
              // Try to create a readable error message
              if (errorData.message) {
                errorData = `${errorData.name || 'Error'}: ${errorData.message}`;
              } else {
                errorData = JSON.stringify(errorData, null, 2);
              }
            } catch (e) {
              errorData = String(errorData);
            }
          }

          if (entry.stack) {
            console.error(formattedMessage, errorData || '', entry.stack);
          } else {
            console.error(formattedMessage, errorData || '');
          }
          break;
        case 'warn':
          console.warn(formattedMessage, entry.data || '');
          break;
        case 'info':
          console.info(formattedMessage, entry.data || '');
          break;
        case 'debug':
          console.debug(formattedMessage, entry.data || '');
          break;
        default:
          console.log(formattedMessage, entry.data || '');
      }
    } else {
      // In production, only log errors to console
      if (entry.level === 'error') {
        const sanitizedData =
          entry.data && sanitizeConsoleOutput ? sanitizeConsoleOutput(entry.data)[0] : entry.data;
        console.error(`[${entry.category || 'ERROR'}] ${entry.message}`, sanitizedData || '');
      }
    }

    // Future: Send to remote logging service if enabled
    if (config.enableRemoteLogging && entry.level === 'error') {
      // Integration point for remote logging service
    }
  }

  log(message: string, category?: string, ...args: any[]): void {
    if (this.shouldLog('log', category)) {
      const entry = this.createLogEntry(
        'log',
        message,
        category,
        args.length > 0 ? args : undefined
      );
      this.writeLog(entry);
    }
  }

  warn(message: string, category?: string, ...args: any[]): void {
    if (this.shouldLog('warn', category)) {
      const entry = this.createLogEntry(
        'warn',
        message,
        category,
        args.length > 0 ? args : undefined
      );
      this.writeLog(entry);
    }
  }

  error(message: string, category?: string, error?: Error | any, ...args: any[]): void {
    // Always log errors
    // Properly handle error objects - serialize them for better logging
    let errorData: any = error;
    let errorObj: Error | undefined;

    if (error instanceof Error) {
      errorObj = error;
      errorData = this.serializeError(error);
    } else if (error && typeof error === 'object') {
      // If it's an object with error-like properties, try to extract useful info
      errorData = this.serializeError(error);
      if (error.message || error.stack) {
        errorObj = new Error(error.message || String(error));
        if (error.stack) {
          errorObj.stack = error.stack;
        }
      }
    } else if (error) {
      errorData = String(error);
    }

    const entry = this.createLogEntry(
      'error',
      message,
      category,
      args.length > 0 ? args : errorData,
      errorObj
    );
    this.writeLog(entry);
  }

  info(message: string, category?: string, ...args: any[]): void {
    if (this.shouldLog('info', category)) {
      const entry = this.createLogEntry(
        'info',
        message,
        category,
        args.length > 0 ? args : undefined
      );
      this.writeLog(entry);
    }
  }

  debug(message: string, category?: string, ...args: any[]): void {
    if (__DEV__ && this.shouldLog('debug', category)) {
      const entry = this.createLogEntry(
        'debug',
        message,
        category,
        args.length > 0 ? args : undefined
      );
      this.writeLog(entry);
    }
  }

  // Reset log count
  resetLogCount(): void {
    this.logCount = 0;
  }

  // Get log history (for debugging)
  getLogHistory(level?: LogLevel, limit?: number): LogEntry[] {
    let logs = this.logHistory;
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    if (limit) {
      logs = logs.slice(-limit);
    }
    return logs;
  }

  // Clear log history
  clearHistory(): void {
    this.logHistory = [];
  }
}

export const logger = Logger.getInstance();
export default logger;
