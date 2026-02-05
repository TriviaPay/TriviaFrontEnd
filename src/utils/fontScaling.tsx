/**
 * Font Scaling Utilities
 * Ensures consistent font scaling across the app with accessibility support
 */

import { Text, TextProps, TextStyle } from 'react-native';

/**
 * Default font scaling configuration
 */
export const FONT_SCALING_CONFIG = {
  maxFontSizeMultiplier: 1.3, // Maximum 30% increase
  allowFontScaling: true,
  minFontSize: 10,
  maxFontSize: 24,
};

/**
 * Get optimized text props with font scaling
 */
export const getScaledTextProps = (options?: {
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  style?: TextStyle;
}): Partial<TextProps> => {
  return {
    allowFontScaling: options?.allowFontScaling ?? FONT_SCALING_CONFIG.allowFontScaling,
    maxFontSizeMultiplier:
      options?.maxFontSizeMultiplier ?? FONT_SCALING_CONFIG.maxFontSizeMultiplier,
    style: options?.style,
  };
};

/**
 * Create a scaled text style
 */
export const createScaledTextStyle = (
  baseSize: number,
  options?: {
    maxMultiplier?: number;
    minSize?: number;
    maxSize?: number;
  }
): TextStyle => {
  const {
    maxMultiplier = FONT_SCALING_CONFIG.maxFontSizeMultiplier,
    minSize = FONT_SCALING_CONFIG.minFontSize,
    maxSize = FONT_SCALING_CONFIG.maxFontSize,
  } = options || {};

  const maxSizeWithMultiplier = baseSize * maxMultiplier;
  const finalMaxSize = Math.min(maxSizeWithMultiplier, maxSize);

  return {
    fontSize: Math.max(minSize, Math.min(baseSize, finalMaxSize)),
  };
};

/**
 * Scaled Text Component
 * Wrapper for Text with proper font scaling
 */
export const ScaledText: React.FC<TextProps> = ({
  style,
  allowFontScaling,
  maxFontSizeMultiplier,
  ...props
}) => {
  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling ?? FONT_SCALING_CONFIG.allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? FONT_SCALING_CONFIG.maxFontSizeMultiplier}
      style={style}
    />
  );
};

export default {
  getScaledTextProps,
  createScaledTextStyle,
  ScaledText,
  FONT_SCALING_CONFIG,
};
