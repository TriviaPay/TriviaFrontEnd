/**
 * @deprecated This hook is deprecated. Use useStandardResponsive from '../../hooks/useStandardResponsive' instead.
 * This hook will be removed in a future version.
 *
 * useResponsiveLayout - Responsive layout hook for home screen
 * Provides responsive dimensions and spacing based on screen size
 */

import { useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';

interface ResponsiveLayout {
  screenWidth: number;
  screenHeight: number;
  isSmallDevice: boolean;
  isTablet: boolean;
  isLargeDevice: boolean;
  horizontalPadding: number;
  verticalPadding: number;
  cardSpacing: number;
  headerHeight: number;
  bottomSpacing: number;
  getResponsiveFontSize: (baseSize: number) => number;
  getResponsiveSpacing: (baseSpacing: number) => number;
  getResponsiveImageSize: (baseSize: number) => number;
  getResponsiveIconSize: (baseSize: number) => number;
  getResponsiveButtonHeight: (baseHeight: number) => number;
  getResponsiveButtonWidth: (baseWidth: number) => number;
  getResponsiveMargin: (baseMargin: number) => number;
  getResponsivePadding: (basePadding: number) => number;
}

export const useResponsiveLayout = (): ResponsiveLayout => {
  if (__DEV__) {
    console.warn(
      'useResponsiveLayout is deprecated. Please use useStandardResponsive from "../../hooks/useStandardResponsive" instead.'
    );
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const layout = useMemo(() => {
    const isSmallDevice = screenWidth < 375;
    const isTablet = screenWidth >= 768;
    const isLargeDevice = screenWidth >= 1024;

    const horizontalPadding = scaleSize(20);
    const verticalPadding = scaleSize(14);
    const cardSpacing = scaleSize(16);
    const headerHeight = scaleSize(70);
    const bottomSpacing = Platform.OS === 'ios' ? scaleSize(100) : scaleSize(80);

    const getResponsiveFontSize = (baseSize: number): number => {
      return scaleSize(baseSize);
    };

    const getResponsiveSpacing = (baseSpacing: number): number => {
      return scaleSize(baseSpacing);
    };

    const getResponsiveImageSize = (baseSize: number): number => {
      return scaleSize(baseSize);
    };

    const getResponsiveIconSize = (baseSize: number): number => {
      return scaleSize(baseSize);
    };

    const getResponsiveButtonHeight = (baseHeight: number): number => {
      return scaleSize(baseHeight);
    };

    const getResponsiveButtonWidth = (baseWidth: number): number => {
      return scaleSize(baseWidth);
    };

    const getResponsiveMargin = (baseMargin: number): number => {
      return scaleSize(baseMargin);
    };

    const getResponsivePadding = (basePadding: number): number => {
      return scaleSize(basePadding);
    };

    return {
      screenWidth,
      screenHeight,
      isSmallDevice,
      isTablet,
      isLargeDevice,
      horizontalPadding,
      verticalPadding,
      cardSpacing,
      headerHeight,
      bottomSpacing,
      getResponsiveFontSize,
      getResponsiveSpacing,
      getResponsiveImageSize,
      getResponsiveIconSize,
      getResponsiveButtonHeight,
      getResponsiveButtonWidth,
      getResponsiveMargin,
      getResponsivePadding,
    };
  }, [screenWidth, screenHeight]);

  return layout;
};

export default useResponsiveLayout;
