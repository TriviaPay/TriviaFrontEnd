/**
 * Centralized Error Service
 * Standardized error handling across the application
 * Uses structured logger for all error reporting
 */

import { Alert } from 'react-native';
import { logger } from '../lib/utils/logger';
import {
  ApplicationError,
  NetworkError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from '../lib/constants/errorTypes';
import { ERROR_MESSAGES } from '../constants/uiConstants';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorServiceOptions {
  showAlert?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
  context?: ErrorContext;
  category?: string;
}

class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Handle errors with standardized patterns
   */
  handleError(error: unknown, options: ErrorServiceOptions = {}): void {
    const {
      showAlert = false,
      logError = true,
      fallbackMessage = ERROR_MESSAGES.UNKNOWN,
      onError,
      context,
      category = 'ERROR',
    } = options;

    // Extract error information
    let errorMessage = fallbackMessage;
    let errorType = 'Unknown';
    let errorObj: Error | null = null;

    if (error instanceof NetworkError) {
      errorMessage = ERROR_MESSAGES.NETWORK;
      errorType = 'Network';
      errorObj = error;
    } else if (error instanceof TimeoutError) {
      errorMessage = ERROR_MESSAGES.TIMEOUT;
      errorType = 'Timeout';
      errorObj = error;
    } else if (error instanceof UnauthorizedError) {
      errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
      errorType = 'Unauthorized';
      errorObj = error;
    } else if (error instanceof ValidationError) {
      errorMessage = error.message || ERROR_MESSAGES.VALIDATION;
      errorType = 'Validation';
      errorObj = error;
    } else if (error instanceof ApplicationError) {
      errorMessage = error.message || fallbackMessage;
      errorType = 'Application';
      errorObj = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || fallbackMessage;
      errorType = 'Error';
      errorObj = error;
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorObj = new Error(error);
    } else {
      errorObj = new Error(String(error));
    }

    // Build log message with context
    let logMessage = `[${errorType}] ${errorMessage}`;
    if (context?.component) {
      logMessage = `[${context.component}] ${logMessage}`;
    }
    if (context?.action) {
      logMessage += ` - Action: ${context.action}`;
    }

    // Log error using structured logger
    if (logError) {
      const logData: any = {
        errorType,
        errorMessage,
        ...(context?.additionalData || {}),
      };
      if (context?.userId) {
        logData.userId = context.userId;
      }

      logger.error(logMessage, category, errorObj, logData);
    }

    // Show alert if enabled
    if (showAlert) {
      Alert.alert('Error', errorMessage);
    }

    // Call custom error handler if provided
    if (onError && errorObj) {
      onError(errorObj);
    }
  }

  /**
   * Safe async wrapper that handles errors automatically
   */
  async safeAsync<T>(
    asyncFn: () => Promise<T>,
    options: ErrorServiceOptions = {}
  ): Promise<T | null> {
    try {
      return await asyncFn();
    } catch (error) {
      this.handleError(error, options);
      return null;
    }
  }

  /**
   * Safe async wrapper that returns error instead of null
   */
  async safeAsyncWithError<T>(
    asyncFn: () => Promise<T>,
    options: ErrorServiceOptions = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const data = await asyncFn();
      return { data, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, options);
      return { data: null, error: err };
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    options: ErrorServiceOptions = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.debug(
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
            options.category || 'ERROR',
            { error: lastError.message }
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      this.handleError(lastError, {
        ...options,
        context: {
          ...options.context,
          action: `retryWithBackoff (${maxRetries} attempts)`,
        },
      });
    }

    throw lastError || new Error('Retry failed');
  }
}

export const errorService = ErrorService.getInstance();
export default errorService;
