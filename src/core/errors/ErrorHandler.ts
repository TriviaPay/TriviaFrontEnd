/**
 * Global Error Handler
 * Centralized error handling and reporting
 */

import { AppError, ErrorType } from './AppError';
import { logger } from '../services/Logger';

export interface ErrorHandlerConfig {
  logErrors: boolean;
  reportToSentry: boolean;
  showUserNotification: boolean;
}

class ErrorHandlerService {
  private config: ErrorHandlerConfig = {
    logErrors: true,
    reportToSentry: true,
    showUserNotification: true,
  };

  private errorCallbacks: Array<(error: AppError) => void> = [];

  configure(config: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register callback to be called on errors
   */
  onError(callback: (error: AppError) => void) {
    this.errorCallbacks.push(callback);
  }

  /**
   * Handle an error
   */
  handle(error: unknown): AppError {
    const appError = this.normalizeError(error);

    if (this.config.logErrors && logger && typeof logger.error === 'function') {
      logger.error('Error handled', appError.type, appError);
    }

    if (this.config.reportToSentry) {
      this.reportToSentry(appError);
    }

    // Notify all registered callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(appError);
      } catch (err) {
        if (logger && typeof logger.error === 'function') {
          logger.error('Error in error callback', ErrorType.UNKNOWN, err);
        }
      }
    });

    return appError;
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorType.UNKNOWN, undefined, {
        originalError: error,
      });
    }

    if (typeof error === 'string') {
      return new AppError(error, ErrorType.UNKNOWN);
    }

    return new AppError('An unknown error occurred', ErrorType.UNKNOWN, undefined, {
      data: error,
    });
  }

  /**
   * Report error to Sentry
   */
  private reportToSentry(error: AppError) {
    try {
      // Sentry integration will be added later
      // For now, just log that we would report
      if (__DEV__) {
        console.warn('[Sentry] Would report:', error.message);
      }
    } catch (err) {
      logger.error('Failed to report to Sentry', ErrorType.UNKNOWN, err);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AppError): boolean {
    return error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER;
  }
}

export const errorHandler = new ErrorHandlerService();
