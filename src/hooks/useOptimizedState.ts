/**
 * Optimized State Hook
 * Reduces unnecessary re-renders by batching state updates
 * Works as drop-in replacement for useState
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook that batches state updates to prevent unnecessary re-renders
 * Useful when multiple state updates happen in quick succession
 *
 * @example
 * ```tsx
 * const [state, setState] = useOptimizedState({ count: 0, name: '' });
 *
 * // Multiple updates are batched
 * setState({ count: 1 });
 * setState({ name: 'John' });
 * // Only one re-render occurs
 * ```
 */
export const useOptimizedState = <T>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const batchRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setOptimizedState = useCallback(
    (updates: Partial<T> | ((prev: T) => Partial<T>)) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Accumulate updates
      if (typeof updates === 'function') {
        const newUpdates = updates(state);
        batchRef.current = { ...batchRef.current, ...newUpdates };
      } else {
        batchRef.current = { ...batchRef.current, ...updates };
      }

      // Batch updates using requestAnimationFrame for smooth batching
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, ...batchRef.current }) as T);
        batchRef.current = {};
      }, 0);
    },
    [state]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setOptimizedState] as const;
};

/**
 * Hook for managing multiple related state values together
 * Reduces number of useState calls in large components
 *
 * @example
 * ```tsx
 * const { state, setState } = useCombinedState({
 *   loading: false,
 *   error: null,
 *   data: null,
 * });
 *
 * // Update multiple values at once
 * setState({ loading: true, error: null });
 * ```
 */
export const useCombinedState = <T extends Record<string, any>>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);

  const updateState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    if (typeof updates === 'function') {
      setState(prev => ({ ...prev, ...updates(prev) }));
    } else {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  return { state, setState: updateState };
};

export default { useOptimizedState, useCombinedState };
