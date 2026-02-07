/**
 * Core Types
 * Shared types used across the application
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
  };
}

/**
 * Async state for data fetching
 */
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

/**
 * Sort params
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * User role enum
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * Environment enum
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Platform type
 */
export type Platform = 'ios' | 'android';
