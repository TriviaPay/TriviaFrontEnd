/**
 * Base Application Error
 * All custom errors should extend this class
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorDetails {
  code?: string;
  statusCode?: number;
  data?: unknown;
  originalError?: Error;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly details: ErrorDetails;
  public readonly timestamp: Date;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    userMessage?: string,
    details: ErrorDetails = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Network error. Please check your connection.',
      [ErrorType.AUTHENTICATION]: 'Authentication failed. Please log in again.',
      [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorType.VALIDATION]: 'Invalid input. Please check your data.',
      [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorType.SERVER]: 'Server error. Please try again later.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred.',
    };
    return messages[type];
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      userMessage: this.userMessage,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Network Error
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.NETWORK, undefined, details);
    this.name = 'NetworkError';
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.AUTHENTICATION, undefined, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.AUTHORIZATION, undefined, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.VALIDATION, undefined, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.NOT_FOUND, undefined, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Server Error
 */
export class ServerError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorType.SERVER, undefined, details);
    this.name = 'ServerError';
  }
}
