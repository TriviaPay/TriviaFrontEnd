/**
 * Comprehensive Optimization Helpers
 * Utilities for applying all performance optimizations
 */

import React, { useMemo, useCallback, memo, ComponentType } from 'react';
import { InteractionManager, unstable_batchedUpdates } from 'react-native';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../store';

/**
 * Memoized component wrapper with shallow equality
 */
export const memoized = <P extends object>(
  Component: ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, areEqual || shallowEqual);
};

/**
 * Hook for memoized selector with shallow equality
 */
export const useMemoizedSelector = <T>(
  selector: (state: RootState) => T,
  equalityFn = shallowEqual
): T => {
  return useSelector(selector, equalityFn);
};

/**
 * Defer heavy operations
 */
export const useDeferredOperation = () => {
  return useCallback((callback: () => void) => {
    InteractionManager.runAfterInteractions(callback);
  }, []);
};

/**
 * Batch state updates
 */
export const useBatchedUpdates = () => {
  return useCallback((callback: () => void) => {
    unstable_batchedUpdates(callback);
  }, []);
};

/**
 * Memoized callback with stable reference
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const ref = React.useRef(callback);
  ref.current = callback;

  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
};

/**
 * Debounced callback hook
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Throttled callback hook
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRunRef = React.useRef<number>(0);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Optimistic update hook
 */
export const useOptimisticUpdate = <T>(
  initialValue: T,
  updateFn: (current: T, optimistic: T) => T
) => {
  const [value, setValue] = React.useState(initialValue);
  const [optimisticValue, setOptimisticValue] = React.useState<T | null>(null);

  const setOptimistic = useCallback(
    (newValue: T) => {
      setOptimisticValue(newValue);
      setValue(updateFn(value, newValue));
    },
    [value, updateFn]
  );

  const confirm = useCallback((confirmedValue: T) => {
    setValue(confirmedValue);
    setOptimisticValue(null);
  }, []);

  const revert = useCallback(() => {
    if (optimisticValue !== null) {
      setValue(initialValue);
      setOptimisticValue(null);
    }
  }, [optimisticValue, initialValue]);

  return {
    value: optimisticValue !== null ? optimisticValue : value,
    setOptimistic,
    confirm,
    revert,
    isOptimistic: optimisticValue !== null,
  };
};

/**
 * Prefetch hook
 */
export const usePrefetch = () => {
  return useCallback((prefetchFn: () => Promise<void>) => {
    InteractionManager.runAfterInteractions(() => {
      prefetchFn().catch(() => {
        // Silent fail
      });
    });
  }, []);
};

/**
 * Request queue hook
 */
export const useRequestQueue = () => {
  const queueRef = React.useRef<Array<() => Promise<any>>>([]);
  const processingRef = React.useRef(false);

  const enqueue = useCallback((request: () => Promise<any>, priority = 0) => {
    queueRef.current.push({ request, priority });
    queueRef.current.sort((a, b) => b.priority - a.priority);
    processQueue();
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const { request } = queueRef.current.shift()!;
      try {
        await request();
      } catch (error) {
        // Handle error
      }
    }

    processingRef.current = false;
  }, []);

  return { enqueue };
};

/**
 * Retry with exponential backoff
 */
export const useRetry = () => {
  return useCallback(
    async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError!;
    },
    []
  );
};

/**
 * Error recovery hook
 */
export const useErrorRecovery = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const recover = useCallback(async (recoveryFn: () => Promise<void>) => {
    try {
      await recoveryFn();
      setError(null);
      setRetryCount(0);
    } catch (err) {
      setError(err as Error);
      setRetryCount(prev => prev + 1);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return { error, retryCount, recover, reset };
};
