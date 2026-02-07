/**
 * Orientation Handler Utilities
 * Manages screen orientation and responsive layouts
 */

import { Dimensions, ScaledSize } from 'react-native';
import { useEffect, useState, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape';

interface OrientationState {
  orientation: Orientation;
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
}

/**
 * Get current orientation
 */
export const getOrientation = (): Orientation => {
  const { width, height } = Dimensions.get('window');
  return width > height ? 'landscape' : 'portrait';
};

/**
 * Get current dimensions
 */
export const getDimensions = (): { width: number; height: number; orientation: Orientation } => {
  const { width, height } = Dimensions.get('window');
  return {
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
  };
};

/**
 * Hook to track orientation changes
 */
export const useOrientation = (): OrientationState => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const orientation: Orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';

  return {
    orientation,
    width: dimensions.width,
    height: dimensions.height,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  };
};

/**
 * Lock orientation (requires native module)
 */
export const lockOrientation = async (orientation: Orientation | 'all'): Promise<void> => {
  try {
    // This would typically use react-native-orientation-locker
    // For now, we'll just log the intent
    // const Orientation = require('react-native-orientation-locker').default;
    // if (orientation === 'portrait') {
    //   Orientation.lockToPortrait();
    // } else if (orientation === 'landscape') {
    //   Orientation.lockToLandscape();
    // } else {
    //   Orientation.unlockAllOrientations();
    // }
  } catch (error) {
    logger.error('Failed to lock orientation', 'APP', error);
  }
};

/**
 * Unlock orientation
 */
export const unlockOrientation = async (): Promise<void> => {
  try {
    // const Orientation = require('react-native-orientation-locker').default;
    // Orientation.unlockAllOrientations();
  } catch (error) {
    logger.error('Failed to unlock orientation', 'APP', error);
  }
};

/**
 * Get responsive layout values based on orientation
 */
export const getResponsiveLayout = (
  portrait: { [key: string]: any },
  landscape?: { [key: string]: any }
): { [key: string]: any } => {
  const orientation = getOrientation();
  return orientation === 'landscape' && landscape ? landscape : portrait;
};

/**
 * Hook for responsive layout values
 */
export const useResponsiveLayout = <T>(portrait: T, landscape?: T): T => {
  const { isLandscape } = useOrientation();
  return isLandscape && landscape ? landscape : portrait;
};

export default {
  getOrientation,
  getDimensions,
  useOrientation,
  lockOrientation,
  unlockOrientation,
  getResponsiveLayout,
  useResponsiveLayout,
};
