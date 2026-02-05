/**
 * Platform Utilities
 * Platform-specific helpers
 */

import { Platform, Dimensions } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const getDeviceDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

  return {
    window: { width, height },
    screen: { width: screenWidth, height: screenHeight },
  };
};

export const isSmallDevice = () => {
  const { width, height } = Dimensions.get('window');
  return width < 375 || height < 667;
};

export const isTablet = () => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  return Math.min(width, height) >= 600 && aspectRatio < 1.6;
};
