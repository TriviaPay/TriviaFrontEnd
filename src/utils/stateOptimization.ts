/**
 * State Management Optimization
 * Provides utilities for Redux optimization without breaking existing code
 */

import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

/**
 * Normalized state selector
 * Use this to select normalized data from Redux
 */
export const createNormalizedSelector = <T>(
  selector: (state: any) => T,
  normalizer?: (data: T) => T
) => {
  return (state: any) => {
    const data = selector(state);
    return normalizer ? normalizer(data) : data;
  };
};

/**
 * Batch action dispatcher
 * Groups multiple actions into a single dispatch
 */
export const useBatchedDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    (actions: any[]) => {
      // Use React's batching if available
      if (require('react-native').unstable_batchedUpdates) {
        require('react-native').unstable_batchedUpdates(() => {
          actions.forEach(action => dispatch(action));
        });
      } else {
        actions.forEach(action => dispatch(action));
      }
    },
    [dispatch]
  );
};

/**
 * Optimistic update helper
 * Updates UI immediately, then syncs with server
 */
export const useOptimisticUpdate = <T>(
  updateAction: (data: T) => any,
  rollbackAction: () => any
) => {
  const dispatch = useDispatch();

  return useCallback(
    async (optimisticData: T, serverUpdate: () => Promise<T>) => {
      // Optimistic update
      dispatch(updateAction(optimisticData));

      try {
        // Server update
        const serverData = await serverUpdate();
        dispatch(updateAction(serverData));
      } catch (error) {
        // Rollback on error
        dispatch(rollbackAction());
        throw error;
      }
    },
    [dispatch, updateAction, rollbackAction]
  );
};

/**
 * Memoized selector hook
 * Prevents unnecessary re-renders
 */
export const useMemoizedSelector = <T>(
  selector: (state: any) => T,
  equalityFn?: (left: T, right: T) => boolean
): T => {
  return useSelector(selector, equalityFn || ((a, b) => a === b));
};

/**
 * State size monitor
 * Warns if state is getting too large
 */
export const monitorStateSize = (state: any, threshold: number = 1000000): void => {
  try {
    const stateString = JSON.stringify(state);
    const size = new Blob([stateString]).size;

    if (size > threshold) {
      console.warn(
        `Redux state size: ${(size / 1024 / 1024).toFixed(2)}MB - Consider normalization`
      );
    }
  } catch (error) {
    // Silent fail - monitoring is non-critical
  }
};

export default {
  createNormalizedSelector,
  useBatchedDispatch,
  useOptimisticUpdate,
  useMemoizedSelector,
  monitorStateSize,
};
