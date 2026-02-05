/**
 * @deprecated This hook is deprecated. Use useStandardResponsive from '../../hooks/useStandardResponsive' instead.
 * This hook will be removed in a future version.
 */

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';
import { useDimensions } from '../../hooks/useDimensions';

interface ResponsiveConfig {
  isSmallDevice: boolean;
  isTablet: boolean;
  scaleFont: (size: number) => number;
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  scaleSize: (size: number) => number;
  getSpacing: (multiplier: number) => number;
  getVerticalSpacing: (multiplier: number) => number;
  getHorizontalSpacing: (multiplier: number) => number;
  getFullWidthSpacing: (multiplier: number) => number;
  deviceType: 'small' | 'medium' | 'large' | 'tablet';
  width: number;
  height: number;
}

const useResponsive = (): ResponsiveConfig => {
  const { width, height } = useDimensions();
  const isTablet = width >= 768;
  const isSmallDevice = width < 375;

  const getDeviceType = (): 'small' | 'medium' | 'large' | 'tablet' => {
    if (isTablet) return 'tablet';
    if (width < 375) return 'small';
    if (width < 414) return 'medium';
    return 'large';
  };

  // Use scaleSize for consistent scaling (maintains same visual alignment)
  const scaleFont = (size: number): number => {
    return scaleSize(size);
  };

  const scaleWidth = (size: number): number => {
    return scaleSize(size);
  };

  const scaleHeight = (size: number): number => {
    return scaleSize(size);
  };

  const scaleSizeFunc = (size: number): number => {
    return scaleSize(size);
  };

  const getSpacing = (multiplier: number): number => {
    return scaleSize(8 * multiplier);
  };

  const getVerticalSpacing = (multiplier: number): number => {
    return scaleSize(8 * multiplier);
  };

  const getHorizontalSpacing = (multiplier: number): number => {
    return scaleSize(8 * multiplier);
  };

  const getFullWidthSpacing = (multiplier: number): number => {
    return scaleSize(16 * multiplier);
  };

  return {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    getFullWidthSpacing,
    deviceType: getDeviceType(),
    width,
    height,
  };
};

export default useResponsive;
