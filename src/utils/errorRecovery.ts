/**
 * Error Recovery Utilities
 * Automatic retry and recovery mechanisms
 */

import { Alert } from 'react-native';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number) => void;
  onFailure?: (error: Error) => void;
}

/**
 * Retry with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onFailure,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  onFailure?.(lastError!);
  throw lastError!;
};

/**
 * Recovery strategies
 */
export const RecoveryStrategy = {
  /**
   * Silent retry - no user notification
   */
  SILENT: async <T>(fn: () => Promise<T>): Promise<T> => {
    return retryWithBackoff(fn, { maxRetries: 2 });
  },

  /**
   * User notification on failure
   */
  NOTIFY: async <T>(fn: () => Promise<T>, message?: string): Promise<T> => {
    try {
      return await retryWithBackoff(fn, { maxRetries: 2 });
    } catch (error) {
      Alert.alert('Error', message || 'An error occurred. Please try again.', [{ text: 'OK' }]);
      throw error;
    }
  },

  /**
   * Fallback value on failure
   */
  FALLBACK: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await retryWithBackoff(fn, { maxRetries: 2 });
    } catch (error) {
      return fallback;
    }
  },
};

/**
 * Network error recovery
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('Network') ||
    error?.message?.includes('timeout') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'TIMEOUT'
  );
};

/**
 * Recoverable error check
 */
export const isRecoverableError = (error: any): boolean => {
  if (isNetworkError(error)) {
    return true;
  }

  // 5xx errors are usually recoverable
  if (error?.response?.status >= 500 && error?.response?.status < 600) {
    return true;
  }

  return false;
};
