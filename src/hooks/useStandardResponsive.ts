/**
 * Standardized Responsive Hook
 * Single source of truth for responsive design
 * Replaces: useResponsiveLayout, useDimensions, useResponsive
 *
 * Use this hook everywhere instead of multiple responsive hooks
 * Handles orientation changes automatically
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useDimensions } from './useDimensions';
import { scaleSize as staticScaleSize } from '../utils/scaleSize';
import { ASPECT_RATIOS } from '../constants/uiConstants';

interface StandardResponsiveConfig {
  // Dimensions
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;

  // Orientation
  isLandscape: boolean;
  isPortrait: boolean;
  orientation: 'portrait' | 'landscape';

  // Device type
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isTablet: boolean;
  isLargeDevice: boolean;
  deviceType: 'small' | 'medium' | 'large' | 'tablet';

  // Aspect ratio helpers
  isNarrowScreen: boolean;
  isWideScreen: boolean;

  // Scaling functions
  scaleFont: (size: number) => number;
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  scaleSize: (size: number) => number;

  // Spacing functions
  getSpacing: (multiplier: number) => number;
  getVerticalSpacing: (multiplier: number) => number;
  getHorizontalSpacing: (multiplier: number) => number;
  getFullWidthSpacing: (multiplier: number) => number;

  // Responsive helpers (for compatibility with useResponsiveLayout)
  getResponsiveFontSize: (baseSize: number) => number;
  getResponsiveSpacing: (baseSpacing: number) => number;
  getResponsiveImageSize: (baseSize: number) => number;
  getResponsiveIconSize: (baseSize: number) => number;
  getResponsiveButtonHeight: (baseHeight: number) => number;
  getResponsiveButtonWidth: (baseWidth: number) => number;
  getResponsiveMargin: (baseMargin: number) => number;
  getResponsivePadding: (basePadding: number) => number;

  // Layout values (responsive based on device type)
  horizontalPadding: number;
  verticalPadding: number;
  cardSpacing: number;
  headerHeight: number;
  bottomSpacing: number;
}

/**
 * Standardized Responsive Hook
 * Use this everywhere instead of multiple responsive hooks
 * Automatically handles orientation changes via useDimensions
 */
export const useStandardResponsive = (): StandardResponsiveConfig => {
  const { width, height } = useDimensions();

  return useMemo(() => {
    // Orientation detection
    const isLandscape = width > height;
    const isPortrait = !isLandscape;
    const orientation: 'portrait' | 'landscape' = isLandscape ? 'landscape' : 'portrait';
    const aspectRatio = width / height;

    // Device type detection - EXACTLY matching useResponsive breakpoints
    // useResponsive uses: isTablet = width >= 768, isSmallDevice = width < 375
    const isTablet = width >= 768;
    const isSmallDevice = width < 375;
    const isMediumDevice = width >= 375 && width < 414;
    const isLargeDevice = width >= 414 && width < 768;

    const getDeviceType = (): 'small' | 'medium' | 'large' | 'tablet' => {
      if (isTablet) return 'tablet';
      if (isSmallDevice) return 'small';
      if (isMediumDevice) return 'medium';
      return 'large';
    };

    // Aspect ratio helpers
    const isNarrowScreen = aspectRatio < ASPECT_RATIOS.NARROW;
    const isWideScreen = aspectRatio >= ASPECT_RATIOS.WIDE;

    // All scaling uses scaleSize for consistency - EXACTLY matching useResponsive behavior
    const BASE_WIDTH = 390;

    // Functions defined inside useMemo are naturally stable relative to the memoized result.
    // We do NOT use useCallback here because we are already inside a useMemo block.
    const dynamicScale = (size: number) => (width / BASE_WIDTH) * size;

    const scaleFont = (size: number): number => dynamicScale(size);
    const scaleWidth = (size: number): number => dynamicScale(size);
    const scaleHeight = (size: number): number => dynamicScale(size);
    const scaleSizeFunc = (size: number): number => dynamicScale(size);

    // Spacing functions - EXACTLY matching useResponsive behavior
    const getSpacing = (multiplier: number): number => {
      return staticScaleSize(8 * multiplier);
    };

    const getVerticalSpacing = (multiplier: number): number => {
      return staticScaleSize(8 * multiplier);
    };

    const getHorizontalSpacing = (multiplier: number): number => {
      return staticScaleSize(8 * multiplier);
    };

    const getFullWidthSpacing = (multiplier: number): number => {
      return staticScaleSize(16 * multiplier);
    };

    // Layout values - using scaleSizeFunc to maintain exact alignment
    const horizontalPadding = isSmallDevice
      ? scaleSizeFunc(16)
      : isTablet
        ? scaleSizeFunc(24)
        : scaleSizeFunc(20);

    const verticalPadding = isSmallDevice
      ? scaleSizeFunc(12)
      : isTablet
        ? scaleSizeFunc(20)
        : scaleSizeFunc(14);

    const cardSpacing = isSmallDevice
      ? scaleSizeFunc(12)
      : isTablet
        ? scaleSizeFunc(20)
        : scaleSizeFunc(16);

    const headerHeight = isSmallDevice
      ? scaleSizeFunc(60)
      : isTablet
        ? scaleSizeFunc(80)
        : scaleSizeFunc(70);

    const bottomSpacing =
      Platform.OS === 'ios'
        ? isSmallDevice
          ? scaleSizeFunc(90)
          : scaleSizeFunc(100)
        : isSmallDevice
          ? scaleSizeFunc(70)
          : scaleSizeFunc(80);

    return {
      // Dimensions
      width,
      height,
      screenWidth: width,
      screenHeight: height,
      aspectRatio,

      // Orientation
      isLandscape,
      isPortrait,
      orientation,

      // Device type
      isSmallDevice,
      isMediumDevice,
      isTablet,
      isLargeDevice,
      deviceType: getDeviceType(),

      // Aspect ratio helpers
      isNarrowScreen,
      isWideScreen,

      // Scaling functions
      scaleFont,
      scaleWidth,
      scaleHeight,
      scaleSize: scaleSizeFunc,

      // Spacing functions
      getSpacing,
      getVerticalSpacing,
      getHorizontalSpacing,
      getFullWidthSpacing,

      // Responsive helpers (for compatibility)
      getResponsiveFontSize: scaleFont,
      getResponsiveSpacing: scaleSizeFunc,
      getResponsiveImageSize: scaleSizeFunc,
      getResponsiveIconSize: scaleSizeFunc,
      getResponsiveButtonHeight: scaleSizeFunc,
      getResponsiveButtonWidth: scaleSizeFunc,
      getResponsiveMargin: scaleSizeFunc,
      getResponsivePadding: scaleSizeFunc,

      // Layout values
      horizontalPadding,
      verticalPadding,
      cardSpacing,
      headerHeight,
      bottomSpacing,
    };
  }, [width, height]);
};

export default useStandardResponsive;
