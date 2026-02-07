/**
 * Screen Rendering Optimization Utilities
 * Ensures smooth, professional screen rendering without blocking UI
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Hook to defer heavy operations until after interactions complete
 */
export const useDeferredRender = <T>(
  heavyOperation: () => T,
  dependencies: any[] = []
): T | null => {
  const [result, setResult] = React.useState<T | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    InteractionManager.runAfterInteractions(() => {
      if (isMountedRef.current) {
        const value = heavyOperation();
        setResult(value);
      }
    });

    return () => {
      isMountedRef.current = false;
    };
  }, dependencies);

  return result;
};

/**
 * Hook to prevent unnecessary re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: any[] = []
): T => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  return useCallback(((...args: any[]) => callbackRef.current(...args)) as T, []);
};

/**
 * Hook to memoize expensive computations
 */
export const useMemoizedValue = <T>(
  compute: () => T,
  deps: any[],
  equalityFn?: (a: T, b: T) => boolean
): T => {
  const previousValueRef = useRef<T | null>(null);
  const previousDepsRef = useRef<any[]>([]);

  return useMemo(() => {
    const depsChanged =
      previousDepsRef.current.length !== deps.length ||
      deps.some((dep, index) => dep !== previousDepsRef.current[index]);

    if (!depsChanged && previousValueRef.current !== null) {
      if (equalityFn) {
        if (equalityFn(previousValueRef.current, compute())) {
          return previousValueRef.current;
        }
      } else {
        return previousValueRef.current;
      }
    }

    const newValue = compute();
    previousValueRef.current = newValue;
    previousDepsRef.current = deps;
    return newValue;
  }, deps);
};

/**
 * Hook to batch state updates
 */
export const useBatchedUpdates = () => {
  const updateQueueRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const batchedUpdate = useCallback((update: () => void) => {
    updateQueueRef.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = [...updateQueueRef.current];
      updateQueueRef.current = [];
      timeoutRef.current = null;

      // Batch all updates in a single render cycle
      React.startTransition(() => {
        updates.forEach(updateFn => updateFn());
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchedUpdate;
};

/**
 * Hook to optimize screen focus operations
 */
export const useOptimizedFocus = (
  onFocus: () => void,
  options: {
    debounce?: number;
    skipFirst?: boolean;
    runAfterInteractions?: boolean;
  } = {}
) => {
  const { debounce = 300, skipFirst = false, runAfterInteractions = true } = options;

  const hasFocusedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleFocus = useCallback(() => {
    if (skipFirst && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const execute = () => {
      if (!isMountedRef.current) return;

      if (runAfterInteractions) {
        InteractionManager.runAfterInteractions(() => {
          if (isMountedRef.current) {
            onFocus();
          }
        });
      } else {
        onFocus();
      }
    };

    timeoutRef.current = setTimeout(execute, debounce);
  }, [onFocus, debounce, skipFirst, runAfterInteractions]);

  return handleFocus;
};

/**
 * Optimize component rendering with React.memo and proper comparison
 */
export const createOptimizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, areEqual);
};

/**
 * Prevent layout thrashing by batching layout calculations
 */
export const useLayoutBatching = () => {
  const layoutQueueRef = useRef<Array<(layout: any) => void>>([]);
  const rafRef = useRef<number | null>(null);

  const batchLayout = useCallback((callback: (layout: any) => void) => {
    layoutQueueRef.current.push(callback);

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        const queue = [...layoutQueueRef.current];
        layoutQueueRef.current = [];
        rafRef.current = null;

        queue.forEach(cb => {
          // Execute callbacks with batched layout data
          cb({});
        });
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return batchLayout;
};
