/**
 * ScaleSize Utility - Proportional scaling based on screen width
 * Ensures all UI elements scale proportionally across different screen sizes
 * Reference screen width = 390px (Base layout device)
 *
 * NOTE: This function uses Dimensions.get() for module-level initialization.
 * For components that need to respond to orientation changes, use useScaleSize() hook instead.
 */

import { Dimensions } from 'react-native';

const BASE_WIDTH = 390;

/**
 * Get current screen width (static, updates on app restart)
 */
const getScreenWidth = (): number => {
  return Dimensions.get('window').width;
};

/**
 * Scales a size value proportionally based on screen width
 * @param size - The size value to scale (width, height, margin, padding, fontSize, borderRadius, etc.)
 * @returns The scaled size value
 *
 * NOTE: This function uses static Dimensions.get(). For components that need
 * to update on orientation changes, import and use useScaleSize hook instead.
 */
export const scaleSize = (size: number): number => {
  const screenWidth = getScreenWidth();
  return (screenWidth / BASE_WIDTH) * size;
};

/**
 * Get base width constant
 */
export const getBaseWidth = (): number => BASE_WIDTH;

/**
 * Get current screen width
 */
export const getScreenWidthValue = (): number => getScreenWidth();

/**
 * Get current screen height
 */
/**
 * Get current screen height
 */
export const getScreenHeight = (): number => Dimensions.get('window').height;

/**
 * Hook for dynamic responsive scaling that updates on orientation change
 */
import { useWindowDimensions } from 'react-native';

export const useScaleSize = () => {
  const { width, height } = useWindowDimensions();

  // Use the smaller dimension as "width" for consistent scaling in both portrait and landscape
  // or stick to actual width if we want layout to change significantly
  // For mobile apps, usually width is the scaling factor.
  const effectiveWidth = width;

  const scale = (size: number) => {
    return (effectiveWidth / BASE_WIDTH) * size;
  };

  return {
    scale,
    width,
    height,
    isLandscape: width > height
  };
};

export default scaleSize;
