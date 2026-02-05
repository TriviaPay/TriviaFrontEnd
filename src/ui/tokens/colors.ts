/**
 * Design Tokens - Colors
 * Centralized color palette
 */

export const colors = {
  // Primary
  primary: {
    50: '#f0e6ff',
    100: '#d9c3ff',
    200: '#c09dff',
    300: '#a777ff',
    400: '#8e51ff',
    500: '#7c3aed', // Main primary
    600: '#6d28d9',
    700: '#5b21b6',
    800: '#4c1d95',
    900: '#3b0764',
  },

  // Secondary
  secondary: {
    50: '#fef3c7',
    100: '#fde68a',
    200: '#fcd34d',
    300: '#fbbf24',
    400: '#f59e0b',
    500: '#d97706', // Main secondary
    600: '#b45309',
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
  },

  // Success
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Error
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Warning
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Neutral/Gray
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic colors
  background: '#ffffff',
  backgroundDark: '#0f172a',
  surface: '#f8fafc',
  surfaceDark: '#1e293b',
  text: '#1e293b',
  textDark: '#f1f5f9',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  borderDark: '#334155',

  // Special
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = typeof colors;
