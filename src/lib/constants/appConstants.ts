/**
 * Application Constants
 * Centralized constants for magic numbers and strings
 */

// Animation Durations (milliseconds)
export const ANIMATION_DURATIONS = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500,
  VERY_LONG: 1000,
  TRANSITION: 250,
} as const;

// API Timeouts (milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 30000,
  SHORT: 10000,
  LONG: 60000,
} as const;

// Cache Durations (milliseconds)
export const CACHE_DURATIONS = {
  TOKEN: 60000, // 60 seconds
  DRAW_DATA: 60000, // 60 seconds
  DEFAULT: 30000, // 30 seconds
  SESSION: 60000, // 1 minute
} as const;

// Refresh Intervals (milliseconds)
export const REFRESH_INTERVALS = {
  TOKEN_CHECK: 60000, // 60 seconds
  QUESTION_CHECK: 60000, // 60 seconds
  DEFAULT: 30000, // 30 seconds
} as const;

// Debounce Delays (milliseconds)
export const DEBOUNCE_DELAYS = {
  INPUT: 300,
  SEARCH: 500,
  EMAIL_CHECK: 500,
  TYPING_INDICATOR: 1500,
  SOUND_PLAY: 200,
} as const;

// Retry Attempts
export const RETRY_ATTEMPTS = {
  DEFAULT: 3,
  API_CALL: 3,
  TOKEN_REFRESH: 3,
  ONESIGNAL_REGISTRATION: 3,
} as const;

// Retry Delays (milliseconds)
export const RETRY_DELAYS = {
  DEFAULT: 1000,
  API_CALL: 2000,
  TOKEN_REFRESH: 5000,
  ONESIGNAL_REGISTRATION: 5000,
} as const;

// Token Expiry Thresholds (milliseconds)
export const TOKEN_THRESHOLDS = {
  REFRESH_BEFORE_EXPIRY: 45 * 1000, // 45 seconds before expiry
  EXPIRY_CHECK_INTERVAL: 60000, // Check every 60 seconds
} as const;

// UI Constants
export const UI_CONSTANTS = {
  MAX_LOGS_PER_MINUTE: 100,
  MAX_RETRY_ATTEMPTS: 3,
  DEFAULT_PAGE_SIZE: 20,
  MAX_LIST_ITEMS: 1000,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
  INVALID_TOKEN: 'Invalid authentication token.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in',
  LOGOUT_SUCCESS: 'Successfully logged out',
  UPDATE_SUCCESS: 'Successfully updated',
  DELETE_SUCCESS: 'Successfully deleted',
  SAVE_SUCCESS: 'Successfully saved',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_]+$/,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DD HH:mm:ss',
  TIME_ONLY: 'HH:mm',
} as const;

// File Size Limits (bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
} as const;

// Z-Index Layers
export const Z_INDEX = {
  BACKGROUND: 0,
  CONTENT: 1,
  OVERLAY: 50,
  MODAL: 100,
  TOOLTIP: 200,
  TOAST: 300,
} as const;

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300,
} as const;
