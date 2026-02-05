import { scaleSize } from '../utils/scaleSize';

// Base spacing values (based on iPhone 14 Pro - 393x852)
const BASE_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Responsive spacing system - All use scaleSize for consistent scaling
export const spacing = {
  // Extra small spacing
  xs: scaleSize(BASE_SPACING.xs),
  xsVertical: scaleSize(BASE_SPACING.xs),

  // Small spacing
  sm: scaleSize(BASE_SPACING.sm),
  smVertical: scaleSize(BASE_SPACING.sm),

  // Medium spacing
  md: scaleSize(BASE_SPACING.md),
  mdVertical: scaleSize(BASE_SPACING.md),

  // Large spacing
  lg: scaleSize(BASE_SPACING.lg),
  lgVertical: scaleSize(BASE_SPACING.lg),

  // Extra large spacing
  xl: scaleSize(BASE_SPACING.xl),
  xlVertical: scaleSize(BASE_SPACING.xl),

  // Extra extra large spacing
  xxl: scaleSize(BASE_SPACING.xxl),
  xxlVertical: scaleSize(BASE_SPACING.xxl),

  // Extra extra extra large spacing
  xxxl: scaleSize(BASE_SPACING.xxxl),
  xxxlVertical: scaleSize(BASE_SPACING.xxxl),
};

// Helper functions for consistent spacing - All use scaleSize
export const getSpacing = (multiplier: number = 1) => scaleSize(BASE_SPACING.md * multiplier);
export const getVerticalSpacing = (multiplier: number = 1) =>
  scaleSize(BASE_SPACING.md * multiplier);
export const getHorizontalSpacing = (multiplier: number = 1) =>
  scaleSize(BASE_SPACING.md * multiplier);

// Specific spacing tokens for common use cases
export const spacingTokens = {
  // Padding
  paddingXs: spacing.xs,
  paddingSm: spacing.sm,
  paddingMd: spacing.md,
  paddingLg: spacing.lg,
  paddingXl: spacing.xl,

  // Margin
  marginXs: spacing.xs,
  marginSm: spacing.sm,
  marginMd: spacing.md,
  marginLg: spacing.lg,
  marginXl: spacing.xl,

  // Gaps
  gapXs: spacing.xs,
  gapSm: spacing.sm,
  gapMd: spacing.md,
  gapLg: spacing.lg,
  gapXl: spacing.xl,

  // Border radius - All use scaleSize
  radiusXs: scaleSize(4),
  radiusSm: scaleSize(8),
  radiusMd: scaleSize(12),
  radiusLg: scaleSize(16),
  radiusXl: scaleSize(20),
  radiusXxl: scaleSize(24),
  radiusRound: scaleSize(50),

  // Component specific spacing - All use scaleSize
  buttonPadding: {
    horizontal: scaleSize(16),
    vertical: scaleSize(12),
  },
  inputPadding: {
    horizontal: scaleSize(12),
    vertical: scaleSize(16),
  },
  cardPadding: {
    horizontal: scaleSize(16),
    vertical: scaleSize(16),
  },
  screenPadding: {
    horizontal: scaleSize(16),
    vertical: scaleSize(16),
  },
  headerPadding: {
    horizontal: scaleSize(16),
    vertical: scaleSize(12),
  },
};

// Responsive spacing for different screen sizes - All use scaleSize
export const responsiveSpacing = {
  small: {
    xs: scaleSize(2),
    sm: scaleSize(4),
    md: scaleSize(8),
    lg: scaleSize(12),
    xl: scaleSize(16),
    xxl: scaleSize(24),
    xxxl: scaleSize(32),
  },
  medium: {
    xs: scaleSize(4),
    sm: scaleSize(8),
    md: scaleSize(16),
    lg: scaleSize(24),
    xl: scaleSize(32),
    xxl: scaleSize(48),
    xxxl: scaleSize(64),
  },
  large: {
    xs: scaleSize(6),
    sm: scaleSize(12),
    md: scaleSize(20),
    lg: scaleSize(28),
    xl: scaleSize(36),
    xxl: scaleSize(56),
    xxxl: scaleSize(72),
  },
  tablet: {
    xs: scaleSize(8),
    sm: scaleSize(16),
    md: scaleSize(24),
    lg: scaleSize(32),
    xl: scaleSize(40),
    xxl: scaleSize(64),
    xxxl: scaleSize(80),
  },
};

// Helper function to get responsive spacing based on device type
export const getResponsiveSpacing = (
  size: keyof typeof BASE_SPACING,
  deviceType: 'small' | 'medium' | 'large' | 'tablet' = 'medium'
) => {
  return responsiveSpacing[deviceType][size];
};

export default spacing;
