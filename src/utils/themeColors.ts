/**
 * Theme Color Utilities
 * Maps hardcoded colors to theme system
 * Use this to replace all hardcoded hex colors
 */

import { useTheme } from '../hooks/useReduxHooks';
import { COLORS } from '../constants/uiConstants';

/**
 * Get theme color with fallback
 * Replaces hardcoded colors throughout the app
 */
export const useThemeColors = () => {
  const theme = useTheme();
  const colors = theme?.colors || {};

  return {
    // Primary colors
    primary: COLORS.PRIMARY,
    primaryDark: COLORS.PRIMARY_DARK,
    primaryLight: COLORS.PRIMARY_LIGHT,

    // Secondary colors
    secondary: COLORS.SECONDARY,
    secondaryDark: COLORS.SECONDARY_DARK,

    // Status colors
    success: COLORS.SUCCESS,
    successDark: COLORS.SUCCESS_DARK,
    warning: COLORS.WARNING,
    warningDark: COLORS.WARNING_DARK,
    error: COLORS.ERROR,
    errorDark: COLORS.ERROR_DARK,
    info: COLORS.INFO,
    infoDark: COLORS.INFO_DARK,

    // Neutral colors
    white: COLORS.WHITE,
    black: COLORS.BLACK,
    gray50: COLORS.GRAY_50,
    gray100: COLORS.GRAY_100,
    gray200: COLORS.GRAY_200,
    gray300: COLORS.GRAY_300,
    gray400: COLORS.GRAY_400,
    gray500: COLORS.GRAY_500,
    gray600: COLORS.GRAY_600,
    gray700: COLORS.GRAY_700,
    gray800: COLORS.GRAY_800,
    gray900: COLORS.GRAY_900,

    // Background colors
    background: colors.background || COLORS.BG_LIGHT,
    backgroundDark: COLORS.BG_DARK,
    backgroundDarker: COLORS.BG_DARKER,
    cardBackground: colors.cardBackground || COLORS.BG_CARD,
    cardBackgroundLight: COLORS.BG_CARD_LIGHT,

    // Text colors
    text: colors.text || COLORS.TEXT_DARK,
    textPrimary: COLORS.TEXT_PRIMARY,
    textSecondary: colors.textSecondary || COLORS.TEXT_SECONDARY,
    textDisabled: COLORS.TEXT_DISABLED,
    textDark: COLORS.TEXT_DARK,

    // Chat colors
    chatBubbleUser: COLORS.CHAT_BUBBLE_USER,
    chatBubbleOther: COLORS.CHAT_BUBBLE_OTHER,
    chatBg: COLORS.CHAT_BG,

    // Trivia colors
    triviaCorrect: COLORS.TRIVIA_CORRECT,
    triviaWrong: COLORS.TRIVIA_WRONG,
    triviaOrange: COLORS.TRIVIA_ORANGE,
    triviaPurple: COLORS.TRIVIA_PURPLE,

    // Timer colors
    timerGreen: COLORS.TIMER_GREEN,
    timerOrange: COLORS.TIMER_ORANGE,
    timerYellow: COLORS.TIMER_YELLOW,

    // Border
    border: colors.border || COLORS.GRAY_200,

    // Accent
    accent: colors.accent || COLORS.PRIMARY,
  };
};

/**
 * Color mapping for common hardcoded colors
 * Use this to find theme equivalents
 */
export const COLOR_MAP: Record<string, keyof ReturnType<typeof useThemeColors>> = {
  // Common hardcoded colors and their theme equivalents
  '#8B5CF6': 'primary',
  '#7C3AED': 'primaryDark',
  '#A78BFA': 'primaryLight',
  '#9333EA': 'secondary',
  '#10B981': 'success',
  '#F59E0B': 'warning',
  '#EF4444': 'error',
  '#3B82F6': 'info',
  '#FFFFFF': 'white',
  '#000000': 'black',
  '#F9FAFB': 'gray50',
  '#F3F4F6': 'gray100',
  '#E5E7EB': 'gray200',
  '#D1D5DB': 'gray300',
  '#9CA3AF': 'gray400',
  '#6B7280': 'gray500',
  '#4B5563': 'gray600',
  '#374151': 'gray700',
  '#1F2937': 'gray800',
  '#111827': 'gray900',
  '#1A1A1A': 'backgroundDark',
  '#121212': 'backgroundDarker',
  '#1E293B': 'cardBackground',
  '#36393F': 'chatBg',
  '#FF6B35': 'triviaOrange',
  '#FBBF24': 'timerYellow',
};

/**
 * Get theme color by hex value
 * Useful for migrating hardcoded colors
 */
export const getThemeColorByHex = (hex: string): string => {
  const normalizedHex = hex.toUpperCase();
  const colorKey = COLOR_MAP[normalizedHex];

  if (colorKey) {
    // This would need to be called within a component with useThemeColors
    // For now, return the hex as fallback
    return hex;
  }

  return hex;
};

export default useThemeColors;
