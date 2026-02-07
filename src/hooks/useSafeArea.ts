/**
 * Safe Area Hook
 * Provides consistent safe area handling across all screens
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export const useSafeArea = () => {
  const insets = useSafeAreaInsets();

  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    // Platform-specific safe area styles
    safeAreaStyle: {
      paddingTop: Platform.OS === 'ios' ? insets.top : 0,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    // Safe area for content (excluding header)
    contentSafeAreaStyle: {
      paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
  };
};
