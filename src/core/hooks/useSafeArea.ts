/**
 * useSafeArea Hook
 * Get safe area insets
 */

import { useSafeAreaInsets as useRNSafeAreaInsets } from 'react-native-safe-area-context';

export const useSafeArea = () => {
  const insets = useRNSafeAreaInsets();

  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
};
