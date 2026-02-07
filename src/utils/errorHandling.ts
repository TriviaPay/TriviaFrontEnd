/**
 * Enhanced Error Handling Utilities
 * Provides user-friendly error messages and better error handling
 */

import { Alert, Platform } from 'react-native';
import { logger } from '../lib/utils/logger';

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Extract user-friendly error message from error object
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle error objects with message
  if (error.message) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }

    // Server errors
    if (message.includes('500') || message.includes('server')) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }

    // Auth errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }

    // Permission errors
    if (message.includes('403') || message.includes('forbidden')) {
      return ERROR_MESSAGES.FORBIDDEN;
    }

    // Not found errors
    if (message.includes('404') || message.includes('not found')) {
      return ERROR_MESSAGES.NOT_FOUND;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return ERROR_MESSAGES.VALIDATION_ERROR;
    }

    return error.message;
  }

  // Handle error objects with error property
  if (error.error) {
    return getErrorMessage(error.error);
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * Show user-friendly error alert
 * Replaces silent error handling with visible feedback
 */
export const showErrorAlert = (error: any, title: string = 'Error', onRetry?: () => void) => {
  const message = getErrorMessage(error);

  logger.error('Showing error alert', 'ERROR', { error, message });

  Alert.alert(
    title,
    message,
    [
      ...(onRetry ? [{ text: 'Retry', onPress: onRetry, style: 'default' as const }] : []),
      { text: 'OK', style: 'cancel' as const },
    ],
    { cancelable: true }
  );
};

/**
 * Show success alert
 */
export const showSuccessAlert = (message: string, title: string = 'Success') => {
  Alert.alert(title, message, [{ text: 'OK', style: 'default' as const }]);
};

/**
 * Handle API errors with proper logging and user feedback
 */
export const handleApiError = (
  error: any,
  context: string = 'API',
  showAlert: boolean = true,
  onRetry?: () => void
) => {
  // Log error for debugging
  logger.error(`Error in ${context}`, context, error);

  // Show user-friendly alert if requested
  if (showAlert) {
    showErrorAlert(error, 'Error', onRetry);
  }

  // Return error message for programmatic handling
  return getErrorMessage(error);
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout')
  );
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  if (!error) return false;

  // Network errors are retryable
  if (isNetworkError(error)) return true;

  // Server errors (5xx) are retryable
  const status = error.status || error.response?.status;
  if (status >= 500 && status < 600) return true;

  // Timeout errors are retryable
  const message = (error.message || '').toLowerCase();
  if (message.includes('timeout')) return true;

  return false;
};

export default {
  getErrorMessage,
  showErrorAlert,
  showSuccessAlert,
  handleApiError,
  isNetworkError,
  isRetryableError,
  ERROR_MESSAGES,
};
