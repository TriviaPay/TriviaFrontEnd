import { Platform } from 'react-native';

/**
 * Platform detection hook
 * Returns platform-specific information
 */
export const usePlatform = () => {
  return {
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    OS: Platform.OS,
    Version: Platform.Version,
  };
};

export default usePlatform;
