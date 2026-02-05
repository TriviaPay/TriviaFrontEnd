/**
 * Typography System - Enterprise Level
 * Professional typography with responsive scaling and screen-size adaptation
 *
 * @description Comprehensive typography system using:
 * - Architects Daughter (Regular with fontWeight: '700') for headings and buttons
 * - Aoboshi One for body/normal text
 *
 * Features:
 * - Responsive font scaling based on screen size
 * - Platform optimization
 * - Consistent spacing and line heights
 *
 * @author TriviaPay Team
 */

import { moderateScale } from 'react-native-size-matters';
import { Platform, Dimensions } from 'react-native';
import { FONTS, FONT_WEIGHTS } from './fonts';
import { getFontWithFallback } from '../utils/fontLoader';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Helper to get font with fallback at module level
 * Uses fallback system to prevent layout shifts if fonts fail to load
 * Safe to call at module load time - React Native handles font loading automatically
 * Enhanced with better fallback handling to prevent visual jumps
 */
const getFont = (fontType: 'heading' | 'body'): string => {
  try {
    const customFont = fontType === 'heading' ? FONTS.heading : FONTS.body;
    // Use getFontWithFallback which provides immediate fallback to prevent layout shifts
    // React Native will automatically use fallback if custom font isn't loaded yet
    return getFontWithFallback(fontType, customFont || '');
  } catch (error) {
    // Fallback to system fonts if anything goes wrong
    // This ensures text always renders, preventing layout shifts
    return fontType === 'heading'
      ? Platform.select({ ios: 'System', android: 'Roboto-Bold', default: 'System' }) || 'System'
      : Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) || 'System';
  }
};

/**
 * Responsive font size calculation
 * Scales fonts based on screen size and device pixel ratio
 */
export const getResponsiveFontSize = (baseSize: number): number => {
  // Base scale factor (iPhone 12/13 as reference: 390x844)
  const baseWidth = 390;

  // Calculate scale based on width (more important for text readability)
  const widthScale = SCREEN_WIDTH / baseWidth;

  // Use moderateScale for better control, then apply screen-size factor
  const moderateSize = moderateScale(baseSize);
  const responsiveSize = moderateSize * widthScale;

  // Ensure minimum readable size (12px) and maximum reasonable size
  const minSize = 12;
  const maxSize = baseSize * 2;

  return Math.max(minSize, Math.min(responsiveSize, maxSize));
};

/**
 * Responsive line height calculation
 * Optimized for different device types and screen sizes
 */
export const getResponsiveLineHeight = (
  fontSize: number,
  multiplier: number = 1.5,
  deviceType?: 'small' | 'medium' | 'large' | 'tablet',
  isTablet?: boolean
): number => {
  // Adjust multiplier based on device type for better readability
  let adjustedMultiplier = multiplier;

  if (deviceType && isTablet !== undefined) {
    if (isTablet) {
      adjustedMultiplier = 1.6; // More spacious for tablets
    } else if (deviceType === 'small') {
      adjustedMultiplier = 1.4; // Tighter for small screens
    }
  }

  // Round to nearest integer for better rendering
  return Math.round(fontSize * adjustedMultiplier);
};

// Base font sizes (will be scaled responsively)
const BASE_FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
} as const;

/**
 * Typography System
 * - All headings use Architects Daughter Regular with fontWeight: '700' (appears bold)
 * - All buttons use Architects Daughter Regular with fontWeight: '700' (appears bold)
 * - All body text uses Aoboshi One Regular
 */
export const typography = {
  // ==================== HEADINGS ====================
  // All headings use Architects Daughter Regular font with fontWeight: '700' to make it bold

  h1: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h1),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h1), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.5,
  },

  h2: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h2),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h2), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.3,
  },

  h3: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h3),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h3), 1.3),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.2,
  },

  h4: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h4),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h4), 1.3),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0,
  },

  h5: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h5),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h5), 1.4),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0,
  },

  h6: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.h6),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.h6), 1.4),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0,
  },

  // ==================== BODY TEXT ====================
  // All body text uses Aoboshi One Regular font

  body: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.lg),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.lg), 1.5),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
  },

  bodyLarge: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.xl),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.xl), 1.5),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
  },

  bodySmall: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.md),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.md), 1.5),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
  },

  // ==================== CAPTION & SMALL TEXT ====================

  caption: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.sm),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.sm), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0.1,
  },

  small: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.xs),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.xs), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0.1,
  },

  // ==================== BUTTONS ====================
  // Buttons use heading font (Architects Daughter) with bold weight

  button: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.lg),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.lg), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.2,
  },

  buttonLarge: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.xl),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.xl), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.2,
  },

  buttonSmall: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.md),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.md), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.2,
  },

  // ==================== FORM ELEMENTS ====================

  label: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.sm),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.sm), 1.3),
    fontWeight: FONT_WEIGHTS.medium,
    letterSpacing: 0.1,
  },

  input: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.lg),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.lg), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
  },

  placeholder: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.lg),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.lg), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
    opacity: 0.6,
  },

  // ==================== SPECIAL TEXT STYLES ====================

  overline: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.xs),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.xs), 1.2),
    fontWeight: FONT_WEIGHTS.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  subtitle: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.lg),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.lg), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: 0,
  },

  subtitle2: {
    fontFamily: getFont('body'),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.md),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.md), 1.4),
    fontWeight: FONT_WEIGHTS.medium,
    letterSpacing: 0.1,
  },

  // ==================== DISPLAY TEXT ====================
  // Large display text uses heading font

  display1: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(48),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(48), 1.1),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -1,
  },

  display2: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(40),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(40), 1.1),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.8,
  },

  display3: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(36),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(36), 1.1),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.6,
  },

  display4: {
    fontFamily: getFont('heading'),
    fontSize: getResponsiveFontSize(28),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(28), 1.2),
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.4,
  },
};

/**
 * Typography variants for different use cases
 */
export const typographyVariants = {
  // Screen titles
  screenTitle: typography.h1,
  screenSubtitle: typography.h3,

  // Card titles
  cardTitle: typography.h4,
  cardSubtitle: typography.body,

  // List items
  listItemTitle: typography.h6,
  listItemSubtitle: typography.caption,

  // Form elements
  formLabel: typography.label,
  formInput: typography.input,
  formError: {
    ...typography.caption,
    color: '#FF3B30',
  },
  formHelper: typography.caption,

  // Navigation
  navTitle: typography.h6,
  navSubtitle: typography.caption,

  // Buttons
  primaryButton: typography.button,
  secondaryButton: typography.button,
  textButton: typography.button,

  // Status and badges
  statusText: typography.caption,
  badgeText: typography.small,

  // Special content
  quote: {
    ...typography.bodyLarge,
    fontStyle: 'italic' as const,
  },

  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: getResponsiveFontSize(BASE_FONT_SIZES.sm),
    lineHeight: getResponsiveLineHeight(getResponsiveFontSize(BASE_FONT_SIZES.sm), 1.4),
    fontWeight: FONT_WEIGHTS.normal,
  },
};

/**
 * Helper function to get responsive typography
 */
export const getResponsiveTypography = (baseStyle: any, scaleFactor: number = 1) => {
  return {
    ...baseStyle,
    fontSize: getResponsiveFontSize(baseStyle.fontSize * scaleFactor),
    lineHeight: getResponsiveLineHeight(baseStyle.fontSize * scaleFactor, 1.5),
  };
};

/**
 * Helper function to create custom typography styles
 */
export const createTypographyStyle = (
  fontSize: number,
  fontWeight: '400' | '500' | '600' | '700' = '400',
  fontType: 'heading' | 'body' = 'body',
  lineHeight?: number,
  letterSpacing?: number
) => {
  return {
    fontFamily: fontType === 'heading' ? FONTS.heading : FONTS.body,
    fontSize: getResponsiveFontSize(fontSize),
    lineHeight: getResponsiveLineHeight(
      getResponsiveFontSize(fontSize),
      lineHeight ? lineHeight / fontSize : 1.4
    ),
    fontWeight,
    letterSpacing: letterSpacing || 0,
  };
};

/**
 * Export font families for direct use
 */
export { FONTS, FONT_WEIGHTS } from './fonts';

export default typography;
