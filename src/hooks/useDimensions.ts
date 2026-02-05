/**
 * useDimensions Hook - Responsive Dimensions
 * Provides responsive screen dimensions that update on orientation changes
 * Replaces direct Dimensions.get() calls to ensure UI updates on rotation
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

/**
 * Hook to get responsive screen dimensions
 * Updates automatically when screen orientation changes
 */
export const useDimensions = (): ScreenDimensions => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height, scale, fontScale } = Dimensions.get('window');
    // Validate dimensions - ensure they're valid numbers
    return {
      width:
        typeof width === 'number' && !isNaN(width) && isFinite(width) && width > 0 ? width : 375,
      height:
        typeof height === 'number' && !isNaN(height) && isFinite(height) && height > 0
          ? height
          : 667,
      scale: typeof scale === 'number' && !isNaN(scale) && isFinite(scale) && scale > 0 ? scale : 1,
      fontScale:
        typeof fontScale === 'number' && !isNaN(fontScale) && isFinite(fontScale) && fontScale > 0
          ? fontScale
          : 1,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        setDimensions({
          // Validate dimensions - ensure they're valid numbers
          width:
            typeof window.width === 'number' &&
            !isNaN(window.width) &&
            isFinite(window.width) &&
            window.width > 0
              ? window.width
              : 375,
          height:
            typeof window.height === 'number' &&
            !isNaN(window.height) &&
            isFinite(window.height) &&
            window.height > 0
              ? window.height
              : 667,
          scale:
            typeof window.scale === 'number' &&
            !isNaN(window.scale) &&
            isFinite(window.scale) &&
            window.scale > 0
              ? window.scale
              : 1,
          fontScale:
            typeof window.fontScale === 'number' &&
            !isNaN(window.fontScale) &&
            isFinite(window.fontScale) &&
            window.fontScale > 0
              ? window.fontScale
              : 1,
        });
      }
    );

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

/**
 * Hook to get only screen width (for convenience)
 */
export const useScreenWidth = (): number => {
  const { width } = useDimensions();
  return width;
};

/**
 * Hook to get only screen height (for convenience)
 */
export const useScreenHeight = (): number => {
  const { height } = useDimensions();
  return height;
};

export default useDimensions;
