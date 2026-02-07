/**
 * FlatList Stability Utilities
 * Prevents jumping and layout shifts in FlatList components
 */

import { FlatListProps } from 'react-native';

/**
 * Optimized FlatList props to prevent jumping and improve performance
 */
export const getStableFlatListProps = <T>(
  itemHeight: number,
  overrides?: Partial<FlatListProps<T>>
): Partial<FlatListProps<T>> => {
  return {
    // Performance optimizations
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 10,

    // Stability props to prevent jumping
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10,
    },

    // Layout stability
    getItemLayout: (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),

    // Scroll performance
    scrollEventThrottle: 16,
    decelerationRate: 'fast',

    // Prevent layout shifts
    disableIntervalMomentum: true,
    overScrollMode: 'never',

    // Viewability (stable config)
    viewabilityConfig: {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    },

    // Apply overrides
    ...overrides,
  };
};

/**
 * Stable viewability config (must not change between renders)
 */
export const STABLE_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 100,
  waitForInteraction: false,
};

/**
 * Get optimized props for variable height items
 */
export const getVariableHeightFlatListProps = <T>(
  overrides?: Partial<FlatListProps<T>>
): Partial<FlatListProps<T>> => {
  return {
    // Performance optimizations
    removeClippedSubviews: true,
    maxToRenderPerBatch: 5, // Lower for variable height
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 5, // Lower for variable height
    windowSize: 5, // Lower for variable height

    // Stability props
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10,
    },

    // Scroll performance
    scrollEventThrottle: 16,
    decelerationRate: 'fast',

    // Prevent layout shifts
    disableIntervalMomentum: true,
    overScrollMode: 'never',

    // Viewability (stable config)
    viewabilityConfig: STABLE_VIEWABILITY_CONFIG,

    // Apply overrides
    ...overrides,
  };
};
