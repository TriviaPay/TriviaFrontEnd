/**
 * Enhanced FlatList Optimization Hook
 * Professional FlatList performance with better rendering strategies
 */

import { useRef, useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, ViewToken, Platform } from 'react-native';

interface FlatListOptimizationConfig {
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  windowSize: number;
  removeClippedSubviews: boolean;
  getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
}

interface FlatListOptimizationReturn {
  optimizedProps: any;
  onViewableItemsChanged: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewableItems: ViewToken[];
  isItemVisible: (index: number) => boolean;
  getVisibleRange: () => { start: number; end: number };
}

export const useFlatListOptimization = (
  config: Partial<FlatListOptimizationConfig> = {}
): FlatListOptimizationReturn => {
  const defaultConfig: FlatListOptimizationConfig = {
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    windowSize: 10,
    removeClippedSubviews: true,
    ...config,
  };

  const viewableItemsRef = useRef<ViewToken[]>([]);
  const onViewableItemsChangedRef = useRef<
    ((info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void) | null
  >(null);

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      viewableItemsRef.current = info.viewableItems;

      if (onViewableItemsChangedRef.current) {
        onViewableItemsChangedRef.current(info);
      }
    },
    []
  );

  const isItemVisible = useCallback((index: number): boolean => {
    return viewableItemsRef.current.some(item => item.index === index);
  }, []);

  const getVisibleRange = useCallback((): { start: number; end: number } => {
    if (viewableItemsRef.current.length === 0) {
      return { start: 0, end: 0 };
    }

    const indices = viewableItemsRef.current
      .map(item => item.index)
      .filter(index => index !== null) as number[];

    return {
      start: Math.min(...indices),
      end: Math.max(...indices),
    };
  }, []);

  const optimizedProps = useMemo(
    () => ({
      initialNumToRender: defaultConfig.initialNumToRender,
      maxToRenderPerBatch: defaultConfig.maxToRenderPerBatch,
      windowSize: defaultConfig.windowSize,
      removeClippedSubviews: defaultConfig.removeClippedSubviews,
      getItemLayout: defaultConfig.getItemLayout,
      onViewableItemsChanged,
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      },
      maintainVisibleContentPosition: {
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      },
      scrollEventThrottle: 16,
      decelerationRate: 'fast',
      bounces: true,
      showsVerticalScrollIndicator: true,
      keyboardShouldPersistTaps: 'handled',
      nestedScrollEnabled: false,
      directionalLockEnabled: true,
      overScrollMode: 'never',
      disableIntervalMomentum: true,
    }),
    [defaultConfig, onViewableItemsChanged]
  );

  return {
    optimizedProps,
    onViewableItemsChanged,
    viewableItems: viewableItemsRef.current,
    isItemVisible,
    getVisibleRange,
  };
};
