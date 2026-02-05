/**
 * Request Batching Utilities
 * Batch multiple state updates together for better performance
 */

import React from 'react';
import { unstable_batchedUpdates } from 'react-native';

/**
 * Batch multiple state updates
 * Use this when updating multiple pieces of state at once
 */
export const batchUpdates = (callback: () => void) => {
  unstable_batchedUpdates(callback);
};

/**
 * Batch async operations
 */
export const batchAsyncUpdates = async <T>(callback: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    unstable_batchedUpdates(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Hook for batching updates in components
 */
export const useBatchedUpdates = () => {
  return React.useCallback((callback: () => void) => {
    batchUpdates(callback);
  }, []);
};
