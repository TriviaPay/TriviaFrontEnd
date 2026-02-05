/**
 * Design Tokens - Shadows
 * Elevation shadows for iOS and Android
 */

import { Platform } from 'react-native';

const createShadow = (elevation: number) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: 0.1 + elevation * 0.02,
      shadowRadius: elevation,
    };
  }
  return {
    elevation,
  };
};

export const shadows = {
  none: {},
  sm: createShadow(2),
  md: createShadow(4),
  lg: createShadow(8),
  xl: createShadow(12),
  '2xl': createShadow(16),
} as const;

export type ShadowToken = typeof shadows;
