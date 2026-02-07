import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to handle safe API calls with automatic cancellation on unmount
 * Prevents "Can't perform a React state update on an unmounted component" errors
 */
export const useSafeApiCall = () => {
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Safe wrapper for async functions
   * @param apiFn Function that returns a promise
   * @returns Promise that resolves if component is mounted, or never if unmounted
   */
  const safeCall = useCallback(
    async <T>(apiFn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await apiFn(controller.signal);

        // Only return result if component is still mounted and request wasn't cancelled
        if (isMountedRef.current && !controller.signal.aborted) {
          return result;
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === 'AbortError' || controller.signal.aborted) {
          return undefined;
        }
        throw error;
      }

      return undefined;
    },
    []
  );

  return { safeCall, isMountedRef };
};
