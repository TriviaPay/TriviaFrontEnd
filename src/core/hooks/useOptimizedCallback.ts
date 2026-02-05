/**
 * Optimized Callback Hook
 * Memoized callback with deep comparison
 */

import { useCallback, useRef } from 'react';
import { deepEqual } from '@core/utils/performance';

export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const depsRef = useRef(deps);

  // Only update if deps actually changed
  if (!deepEqual(depsRef.current, deps)) {
    depsRef.current = deps;
  }

  return useCallback(callback, depsRef.current);
}
