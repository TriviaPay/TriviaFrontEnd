/**
 * Logger Service
 * Centralized logging with levels and formatting
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: Date;
}

class LoggerService {
  private isDevelopment = __DEV__;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  /**
   * Log debug message
   */
  debug(message: string, context?: string, data?: unknown) {
    this.log('debug', message, context, data);
  }

  /**
   * Log info message
   */
  info(message: string, context?: string, data?: unknown) {
    this.log('info', message, context, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, data?: unknown) {
    this.log('warn', message, context, data);
  }

  /**
   * Log error message
   */
  error(message: string, context?: string, data?: unknown) {
    this.log('error', message, context, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      context,
      data,
      timestamp: new Date(),
    };

    // Add to history
    this.addToHistory(entry);

    // Only log in development or for errors/warnings
    if (this.isDevelopment || level === 'error' || level === 'warn') {
      this.consoleLog(entry);
    }
  }

  /**
   * Output to console
   */
  private consoleLog(entry: LogEntry) {
    const prefix = entry.context ? `[${entry.context}]` : '';
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log(`[DEBUG] ${message}`, entry.data || '');
        }
        break;
      case 'info':
        console.log(`[INFO] ${message}`, entry.data || '');
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, entry.data || '');
        break;
      case 'error':
        console.error(`[ERROR] ${message}`, entry.data || '');
        break;
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: LogEntry) {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }
}

export const logger = new LoggerService();
