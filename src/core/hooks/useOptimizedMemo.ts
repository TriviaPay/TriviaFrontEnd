/**
 * Optimized Memo Hook
 * Memoized value with deep comparison
 */

import { useMemo, useRef } from 'react';
import { deepEqual } from '@core/utils/performance';

export function useOptimizedMemo<T>(factory: () => T, deps: any[]): T {
  const depsRef = useRef(deps);
  const valueRef = useRef<T>();

  // Only recompute if deps actually changed
  if (!deepEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    valueRef.current = factory();
  }

  return valueRef.current!;
}
