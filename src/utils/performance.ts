/**
 * Performance Optimization Utilities
 * Centralized performance helpers for the app
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { InteractionManager, unstable_batchedUpdates } from 'react-native';
import { shallowEqual } from 'react-redux';

/**
 * Defer heavy operations until after interactions complete
 */
export const deferHeavy = (callback: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

/**
 * Batch multiple state updates together
 */
export const batchUpdates = (callback: () => void) => {
  unstable_batchedUpdates(callback);
};

/**
 * Memoized selector with shallow equality check
 */
export const createShallowEqualSelector = <T>(selector: (state: any) => T) => {
  let lastResult: T | undefined;
  return (state: any): T => {
    const result = selector(state);
    if (lastResult === undefined || !shallowEqual(result, lastResult)) {
      lastResult = result;
    }
    return lastResult!;
  };
};

/**
 * Custom comparison function for React.memo
 */
export const shallowEqualProps = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      // Deep check for objects/arrays
      if (
        typeof prevProps[key] === 'object' &&
        prevProps[key] !== null &&
        typeof nextProps[key] === 'object' &&
        nextProps[key] !== null
      ) {
        if (!shallowEqual(prevProps[key], nextProps[key])) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  return true;
};

/**
 * Hook for deferred value updates (React 18+)
 */
export const useDeferredValue = <T>(value: T): T => {
  // Fallback for React Native (doesn't have useDeferredValue)
  // In React Native, we use InteractionManager instead
  const [deferredValue, setDeferredValue] = React.useState(value);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setDeferredValue(value);
    });
  }, [value]);

  return deferredValue;
};

/**
 * Hook for memoized callback with stable reference
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const ref = useRef(callback);
  ref.current = callback;

  return useCallback(
    ((...args: any[]) => {
      return ref.current(...args);
    }) as T,
    []
  );
};

/**
 * Hook for memoized value with custom equality
 */
export const useMemoWithEquality = <T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn: (a: T, b: T) => boolean = (a, b) => a === b
): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();

  if (!ref.current || !deps.every((dep, i) => dep === ref.current!.deps[i])) {
    const newValue = factory();
    if (!ref.current || !equalityFn(ref.current.value, newValue)) {
      ref.current = { deps, value: newValue };
    }
  }

  return ref.current.value;
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > 16) {
        // Log slow renders (> 1 frame at 60fps)
        if (__DEV__) {
          logger.warn(
            'Warning',
            'PERFORMANCE',
            `[PERF] ${componentName} render took ${renderTime.toFixed(2)}ms`
          );
        }
      }
    };
  });
};

/**
 * Throttle function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
};

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

import React from 'react';
