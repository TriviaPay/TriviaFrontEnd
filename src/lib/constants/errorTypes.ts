/**
 * Error Type Definitions
 * Standardized error types for the application
 */

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: number;
  stack?: string;
}

export class ApplicationError extends Error implements AppError {
  public readonly code: ErrorCode;
  public readonly timestamp: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.timestamp = Date.now();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.TIMEOUT_ERROR, message, details);
    this.name = 'TimeoutError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}
