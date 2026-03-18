/**
 * UI Constants
 * Centralized constants for UI values, colors, spacing, and magic numbers
 */

// Colors
export const COLORS = {
  // Primary colors
  PRIMARY: '#2563EB',
  PRIMARY_DARK: '#1E40AF',
  PRIMARY_LIGHT: '#3B82F6',

  // Secondary colors
  SECONDARY: '#1E3A8A',
  SECONDARY_DARK: '#1E40AF',

  // Status colors
  SUCCESS: '#10B981',
  SUCCESS_DARK: '#059669',
  WARNING: '#F59E0B',
  WARNING_DARK: '#D97706',
  ERROR: '#EF4444',
  ERROR_DARK: '#DC2626',
  INFO: '#3B82F6',
  INFO_DARK: '#2563EB',

  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',

  // Background colors
  BG_DARK: '#1A1A1A',
  BG_DARKER: '#121212',
  BG_LIGHT: '#F9FAFB',
  BG_CARD: '#1E293B',
  BG_CARD_LIGHT: '#F3F4F6',

  // Text colors
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#9CA3AF',
  TEXT_DISABLED: '#6B7280',
  TEXT_DARK: '#1F2937',

  // Chat colors
  CHAT_BUBBLE_USER: '#8B5CF6',
  CHAT_BUBBLE_OTHER: '#36393F',
  CHAT_BG: '#36393F',

  // Trivia colors
  TRIVIA_CORRECT: '#10B981',
  TRIVIA_WRONG: '#EF4444',
  TRIVIA_ORANGE: '#FF6B35',
  TRIVIA_PURPLE: '#8B5CF6',

  // Timer colors
  TIMER_GREEN: '#10B981',
  TIMER_ORANGE: '#F59E0B',
  TIMER_YELLOW: '#FBBF24',
} as const;

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

// Border radius
export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  FULL: 9999,
} as const;

// Font sizes
export const FONT_SIZES = {
  XS: 10,
  SM: 12,
  MD: 14,
  LG: 16,
  XL: 18,
  XXL: 24,
  XXXL: 32,
} as const;

// Animation durations (ms)
export const ANIMATION_DURATION = {
  FAST: 100,
  NORMAL: 200,
  SLOW: 300,
  VERY_SLOW: 500,
  EXTRA_SLOW: 800,
} as const;

// Timeouts (ms)
export const TIMEOUTS = {
  TYPING_INDICATOR: 2000,
  DEBOUNCE: 300,
  API_REQUEST: 30000,
  TOKEN_REFRESH: 5000,
  RECONNECT_DELAY: 1000,
  SCROLL_DELAY: 100,
} as const;

// Dimensions
export const DIMENSIONS = {
  AVATAR_SM: 32,
  AVATAR_MD: 40,
  AVATAR_LG: 64,
  AVATAR_XL: 80,
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 48,
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
} as const;

// List/FlatList defaults
export const LIST_CONFIG = {
  INITIAL_NUM_TO_RENDER: 15,
  MAX_TO_RENDER_PER_BATCH: 10,
  WINDOW_SIZE: 21,
  UPDATE_CELLS_BATCHING_PERIOD: 50,
  ITEM_HEIGHT_ESTIMATE: 80,
} as const;

// Limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_USERNAME_LENGTH: 30,
  MAX_EMAIL_LENGTH: 255,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGES_PER_MESSAGE: 5,
} as const;

// Regex patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
} as const;

// API endpoints (common paths)
export const API_PATHS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
  },
  CHAT: {
    MESSAGES: '/chat/messages',
    SEND: '/chat/send',
    CONVERSATIONS: '/chat/conversations',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION: 'Please check your input and try again.',
  UNKNOWN: 'An unexpected error occurred.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  SENT: 'Message sent successfully.',
  DELETED: 'Deleted successfully.',
  UPDATED: 'Updated successfully.',
} as const;

// Platform-specific values
export const PLATFORM = {
  IOS: 'ios',
  ANDROID: 'android',
} as const;

// Responsive breakpoints (single source of truth)
export const BREAKPOINTS = {
  SMALL: 375, // Small devices (< 375px)
  MEDIUM: 414, // Medium devices (375px - 413px)
  LARGE: 768, // Tablets (>= 768px)
  XLARGE: 1024, // Large tablets/desktop (>= 1024px)
} as const;

// Base design dimensions
export const BASE_DIMENSIONS = {
  WIDTH: 390, // Base width for scaling calculations
  HEIGHT: 844, // Base height for scaling calculations
} as const;

// Aspect ratio thresholds
export const ASPECT_RATIOS = {
  NARROW: 1.6, // Below this is considered narrow (tablet-like)
  WIDE: 2.0, // Above this is considered wide (phone-like)
} as const;
