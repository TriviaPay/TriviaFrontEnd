/**
 * Text Utilities - Text Optimization and Truncation
 * Provides utilities for text rendering optimization
 * Prevents layout shifts and ensures consistent text rendering
 */

import { TextStyle, TextProps, Platform } from 'react-native';

/**
 * Get optimized line height based on font size and device type
 * Optimized to prevent layout shifts and improve readability
 */
export const getOptimalLineHeight = (
  fontSize: number,
  deviceType: 'small' | 'medium' | 'large' | 'tablet',
  isTablet: boolean
): number => {
  // Base multipliers for different device types
  // Optimized for better text rendering and readability
  const multipliers = {
    small: 1.45, // Slightly tighter for small screens (prevents overflow)
    medium: 1.5, // Standard - optimal for most devices
    large: 1.55, // Slightly more spacious for large screens
    tablet: 1.6, // More spacious for tablets (better readability)
  };

  const multiplier = isTablet ? multipliers.tablet : multipliers[deviceType];
  const lineHeight = fontSize * multiplier;

  // Round to nearest even number for better rendering consistency
  // This prevents sub-pixel rendering issues that can cause layout shifts
  return Math.round(lineHeight / 2) * 2;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Get text style with truncation support
 */
export const getTruncatedTextProps = (
  numberOfLines: number = 1,
  ellipsizeMode: 'head' | 'middle' | 'tail' | 'clip' = 'tail'
): Partial<TextProps> => ({
  numberOfLines,
  ellipsizeMode,
});

/**
 * Calculate optimal font size for long content
 * Reduces font size slightly for very long text to improve readability
 */
export const getOptimalFontSizeForContent = (
  baseFontSize: number,
  contentLength: number
): number => {
  // Reduce font size for very long content (>500 chars)
  if (contentLength > 500) {
    return Math.max(baseFontSize * 0.9, 12);
  }
  return baseFontSize;
};

/**
 * Get responsive text style with optimal settings
 * Note: This is a utility function - use useStandardResponsive hook in components
 * and pass the values to this function
 * Includes optimizations to prevent layout shifts
 */
export const getResponsiveTextStyle = (
  fontSize: number,
  deviceType: 'small' | 'medium' | 'large' | 'tablet',
  isTablet: boolean
): TextStyle => {
  const lineHeight = getOptimalLineHeight(fontSize, deviceType, isTablet);

  return {
    fontSize: Math.round(fontSize), // Round to prevent sub-pixel issues
    lineHeight,
    includeFontPadding: false, // Android: Remove extra padding (prevents layout shifts)
    textAlignVertical: 'center', // Android: Better vertical alignment
    // Add text rendering optimizations
    ...(Platform.OS === 'android' && {
      textBreakStrategy: 'highQuality', // Better text breaking on Android
    }),
  };
};

/**
 * Text optimization for list items
 * Note: Pass deviceType and isTablet from useStandardResponsive hook
 * Ensures proper truncation to prevent layout issues
 */
export const getListItemTextStyle = (
  fontSize: number = 14,
  deviceType: 'small' | 'medium' | 'large' | 'tablet',
  isTablet: boolean,
  numberOfLines: number = 2
): TextStyle => {
  return {
    ...getResponsiveTextStyle(fontSize, deviceType, isTablet),
    // Ensure text doesn't overflow
    flexShrink: 1,
  };
};

/**
 * Get optimized text style for long content
 * Automatically adjusts font size and line height for better readability
 */
export const getLongContentTextStyle = (
  baseFontSize: number,
  contentLength: number,
  deviceType: 'small' | 'medium' | 'large' | 'tablet',
  isTablet: boolean,
  maxLines?: number
): TextStyle => {
  const optimalFontSize = getOptimalFontSizeForContent(baseFontSize, contentLength);
  const lineHeight = getOptimalLineHeight(optimalFontSize, deviceType, isTablet);

  const style: TextStyle = {
    ...getResponsiveTextStyle(optimalFontSize, deviceType, isTablet),
    lineHeight,
  };

  // Add truncation if maxLines is specified
  if (maxLines !== undefined) {
    return {
      ...style,
    };
  }

  return style;
};

export default {
  getOptimalLineHeight,
  truncateText,
  getTruncatedTextProps,
  getOptimalFontSizeForContent,
  getResponsiveTextStyle,
  getListItemTextStyle,
  getLongContentTextStyle,
};
