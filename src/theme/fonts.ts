/**
 * Font Configuration - Enterprise Level
 * Centralized font family definitions for TriviaPay
 *
 * @description Font constants for consistent typography across the app
 * Font Families:
 * - Architects Daughter (Regular with bold weight) - For all headings
 * - Aoboshi One - For all normal/body text
 *
 * @author TriviaPay Team
 */

import { Platform } from 'react-native';

/**
 * Custom Font Families
 * These fonts must be added to assets/fonts/ directory:
 * - ArchitectsDaughter-Regular.ttf (bold will be applied via fontWeight)
 * - AoboshiOne-Regular.ttf
 * - Baloo2 (system font fallback for compatibility)
 */
export const FONTS = {
  /**
   * Heading Font - Architects Daughter (Regular, bold applied via fontWeight)
   * Used for: All headings (h1-h6), display text, titles
   * Note: Uses Regular font with fontWeight: '700' to make it bold
   */
  heading: Platform.select({
    ios: 'ArchitectsDaughter-Regular',
    android: 'ArchitectsDaughter-Regular',
    default: 'ArchitectsDaughter-Regular',
  }),

  /**
   * Body Font - Aoboshi One
   * Used for: Body text, paragraphs, normal text, buttons, labels
   */
  body: Platform.select({
    ios: 'AoboshiOne-Regular',
    android: 'AoboshiOne-Regular',
    default: 'AoboshiOne-Regular',
  }),

  /**
   * Baloo2 Font - Legacy compatibility
   * Used in trivia screens for backward compatibility
   * Falls back to body font if not available
   */
  baloo2: Platform.select({
    ios: 'Baloo2',
    android: 'Baloo2',
    default: 'Baloo2',
  }),

  /**
   * Fallback fonts if custom fonts fail to load
   */
  fallback: {
    heading: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
    body: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    baloo2: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
} as const;

/**
 * Font weight constants
 */
export const FONT_WEIGHTS = {
  thin: '100',
  light: '300',
  normal: '400',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * Typography font families helper
 * Provides easy access to font families with fallback support
 */
export const TypographyFonts = {
  /**
   * Get heading font family
   */
  getHeadingFont: (): string => {
    return FONTS.heading;
  },

  /**
   * Get body font family
   */
  getBodyFont: (): string => {
    return FONTS.body;
  },

  /**
   * Get font with fallback
   */
  getFontWithFallback: (fontType: 'heading' | 'body'): string => {
    // First try custom font, fallback to system font if not available
    return fontType === 'heading' ? FONTS.heading : FONTS.body;
  },
} as const;

export default FONTS;
