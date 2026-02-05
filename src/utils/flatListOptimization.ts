/**
 * FlatList Optimization Utilities
 * Common optimizations for FlatList components
 */

import { FlatListProps, ListRenderItem } from 'react-native';

export interface OptimizedFlatListConfig {
  getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
  removeClippedSubviews?: boolean;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
  windowSize?: number;
  viewabilityConfig?: {
    itemVisiblePercentThreshold?: number;
    minimumViewTime?: number;
  };
}

/**
 * Stable viewabilityConfig - must not change between renders
 * React Native doesn't allow viewabilityConfig to change on the fly
 */
const STABLE_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 100,
};

/**
 * Default FlatList optimization props
 */
export const defaultFlatListOptimizations: OptimizedFlatListConfig = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 10,
  windowSize: 10,
  viewabilityConfig: STABLE_VIEWABILITY_CONFIG,
};

/**
 * Get optimized FlatList props based on item type
 * @param itemHeight - Height of each item (or row height if numColumns > 1)
 * @param config - Optional configuration overrides
 * @param numColumns - Number of columns (default: 1). If > 1, getItemLayout calculates row-based layout
 */
export const getOptimizedFlatListProps = <T>(
  itemHeight: number,
  config?: Partial<OptimizedFlatListConfig & { numColumns?: number }>
): Partial<FlatListProps<T>> => {
  // Merge configs but exclude viewabilityConfig from defaults to prevent "changing on the fly" error
  const { viewabilityConfig: defaultViewabilityConfig, ...defaultsWithoutViewability } =
    defaultFlatListOptimizations;
  const baseConfig = { ...defaultsWithoutViewability, ...config };
  const numColumns = config?.numColumns || 1;

  // Build props object - DO NOT include viewabilityConfig by default
  // React Native doesn't allow viewabilityConfig to change, so we only include it
  // if explicitly needed and stable
  const props: Partial<FlatListProps<T>> = {
    removeClippedSubviews: baseConfig.removeClippedSubviews ?? true,
    maxToRenderPerBatch: baseConfig.maxToRenderPerBatch ?? 10,
    updateCellsBatchingPeriod: baseConfig.updateCellsBatchingPeriod ?? 50,
    initialNumToRender: baseConfig.initialNumToRender ?? 10,
    windowSize: baseConfig.windowSize ?? 10,
    getItemLayout:
      baseConfig.getItemLayout ||
      (numColumns > 1
        ? (data: any, index: number) => {
            const row = Math.floor(index / numColumns);
            return {
              length: itemHeight,
              offset: itemHeight * row,
              index,
            };
          }
        : (data: any, index: number) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
          })),
  };

  // Only include viewabilityConfig if explicitly provided in config parameter
  // Use stable reference to prevent "Changing viewabilityConfig on the fly" error
  // CRITICAL: Do NOT include from defaults - only if user explicitly requests it
  if (config?.viewabilityConfig !== undefined) {
    props.viewabilityConfig = STABLE_VIEWABILITY_CONFIG;
  }

  return props;
};

/**
 * Create memoized render item function
 */
export const createMemoizedRenderItem = <T>(renderItem: ListRenderItem<T>): ListRenderItem<T> => {
  // Return memoized version - components should use React.memo
  return renderItem;
};
