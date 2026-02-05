/**
 * Error Handler Utility
 * Standardized error handling patterns and utilities
 * Now uses centralized errorService
 */

import { errorService, ErrorServiceOptions, ErrorContext } from '../services/errorService';
import { ERROR_MESSAGES } from '../constants/uiConstants';

export type ErrorHandlerOptions = {
  showAlert?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
  context?: ErrorContext;
  category?: string;
};

/**
 * Handle errors with standardized patterns
 * Backward compatible wrapper around errorService
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const {
    showAlert = false,
    logError = true,
    fallbackMessage = ERROR_MESSAGES.UNKNOWN,
    onError,
    context,
    category = 'ERROR',
  } = options;

  errorService.handleError(error, {
    showAlert,
    logError,
    fallbackMessage,
    onError,
    context,
    category,
  });
}

/**
 * Safe async wrapper that handles errors automatically
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T | null> {
  return errorService.safeAsync(asyncFn, options);
}

/**
 * Safe async wrapper that returns error instead of null
 */
export async function safeAsyncWithError<T>(
  asyncFn: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  return errorService.safeAsyncWithError(asyncFn, options);
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  options: ErrorHandlerOptions = {}
): Promise<T> {
  return errorService.retryWithBackoff(fn, maxRetries, initialDelay, options);
}
