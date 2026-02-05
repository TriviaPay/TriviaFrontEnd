/**
 * Error Sanitizer
 * Sanitizes error messages to prevent information leakage
 * Removes sensitive data from error messages and stack traces
 */

const __DEV__ = process.env.NODE_ENV === 'development';

interface SanitizedError {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
  userMessage?: string;
}

/**
 * Sanitize error message
 */
function sanitizeErrorMessage(message: string): string {
  if (__DEV__) {
    // In development, return full message
    return message;
  }

  // In production, sanitize sensitive information
  let sanitized = message;

  // Remove API keys
  sanitized = sanitized.replace(/api[_-]?key["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'api_key=***');
  sanitized = sanitized.replace(/apikey["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'apikey=***');

  // Remove tokens
  sanitized = sanitized.replace(/token["\s:=]+([a-zA-Z0-9._-]{20,})/gi, 'token=***');
  sanitized = sanitized.replace(/bearer\s+([a-zA-Z0-9._-]{20,})/gi, 'bearer ***');
  sanitized = sanitized.replace(/jwt["\s:=]+([a-zA-Z0-9._-]{20,})/gi, 'jwt=***');

  // Remove passwords
  sanitized = sanitized.replace(/password["\s:=]+([^\s"']+)/gi, 'password=***');
  sanitized = sanitized.replace(/pwd["\s:=]+([^\s"']+)/gi, 'pwd=***');

  // Remove secrets
  sanitized = sanitized.replace(/secret["\s:=]+([a-zA-Z0-9_-]{10,})/gi, 'secret=***');

  // Remove email addresses
  sanitized = sanitized.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, '***@***');

  // Remove file paths (might reveal structure)
  sanitized = sanitized.replace(/\/[^\s"']+/g, '/***');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***.***.***.***');

  // Remove URLs (keep domain)
  sanitized = sanitized.replace(/https?:\/\/([^\s"']+)/gi, (match, url) => {
    try {
      const urlObj = new URL(match);
      return `${urlObj.protocol}//${urlObj.hostname}/***`;
    } catch {
      return 'https://***/***';
    }
  });

  return sanitized;
}

/**
 * Sanitize stack trace
 */
function sanitizeStackTrace(stack: string | undefined): string | undefined {
  if (!stack) {
    return undefined;
  }

  if (__DEV__) {
    // In development, return full stack trace
    return stack;
  }

  // In production, remove file paths and line numbers
  let sanitized = stack;

  // Remove file paths
  sanitized = sanitized.replace(/\/[^\s:]+/g, '/***');

  // Remove line numbers
  sanitized = sanitized.replace(/:\d+:\d+/g, ':***:***');

  // Keep only function names and error type
  sanitized = sanitized.split('\n').slice(0, 3).join('\n'); // Limit to first 3 lines

  return sanitized;
}

/**
 * Sanitize error object
 */
export function sanitizeError(error: Error | unknown): SanitizedError {
  if (!(error instanceof Error)) {
    return {
      message: 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again.',
    };
  }

  const sanitized: SanitizedError = {
    name: error.name,
    message: sanitizeErrorMessage(error.message),
    stack: sanitizeStackTrace(error.stack),
    userMessage: getUserFriendlyMessage(error),
  };

  // Add error code if available
  if ('code' in error && typeof error.code === 'string') {
    sanitized.code = error.code;
  }

  return sanitized;
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: Error): string {
  // Map common errors to user-friendly messages
  const errorMessages: Record<string, string> = {
    NetworkError: 'Network connection failed. Please check your internet connection.',
    TimeoutError: 'Request timed out. Please try again.',
    UnauthorizedError: 'Session expired. Please log in again.',
    ForbiddenError: 'You do not have permission to perform this action.',
    NotFoundError: 'The requested resource was not found.',
    ValidationError: 'Invalid input. Please check your data and try again.',
    ServerError: 'Server error. Please try again later.',
  };

  // Check error name
  if (error.name in errorMessages) {
    return errorMessages[error.name];
  }

  // Check error message for keywords
  const message = error.message.toLowerCase();
  if (message.includes('network') || message.includes('connection')) {
    return 'Network error. Please check your connection.';
  }
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Session expired. Please log in again.';
  }
  if (message.includes('forbidden') || message.includes('403')) {
    return 'Access denied.';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'Resource not found.';
  }
  if (message.includes('server') || message.includes('500')) {
    return 'Server error. Please try again later.';
  }

  // Generic message
  return 'An error occurred. Please try again.';
}

/**
 * Create safe error for logging
 */
export function createSafeError(error: Error | unknown): Error {
  const sanitized = sanitizeError(error);
  const safeError = new Error(sanitized.message);
  safeError.name = sanitized.name || 'Error';
  if (sanitized.stack) {
    safeError.stack = sanitized.stack;
  }
  return safeError;
}

/**
 * Log error safely (sanitized)
 */
export function logErrorSafely(
  error: Error | unknown,
  context?: string,
  additionalData?: Record<string, any>
): void {
  const sanitized = sanitizeError(error);

  // Log sanitized error
  const { logger } = require('../utils/logger');
  logger.error(sanitized.message, context || 'ERROR', {
    name: sanitized.name,
    code: sanitized.code,
    ...additionalData,
  });

  // In development, also log full error
  if (__DEV__ && error instanceof Error) {
    logger.error('Full error (dev only):', 'ERROR', error);
  }
}

export default {
  sanitizeError,
  createSafeError,
  logErrorSafely,
  sanitizeErrorMessage,
  sanitizeStackTrace,
};
