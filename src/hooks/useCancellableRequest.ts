/**
 * Cancellable Request Hook
 * Automatically cancels API requests when component unmounts
 * Prevents memory leaks and state updates on unmounted components
 */

import { useRef, useEffect, useCallback } from 'react';
import { logger } from '../lib/utils/logger';

interface CancellableRequest {
  cancel: () => void;
  isCancelled: boolean;
}

/**
 * Hook for making cancellable API requests
 * Automatically cancels requests when component unmounts
 *
 * @example
 * ```tsx
 * const { makeRequest } = useCancellableRequest();
 *
 * const fetchData = async () => {
 *   const request = makeRequest(async (signal) => {
 *     const response = await fetch('/api/data', { signal });
 *     return response.json();
 *   });
 *
 *   try {
 *     const data = await request.promise;
 *     // Handle data
 *   } catch (error) {
 *     if (!request.isCancelled) {
 *       // Handle error
 *     }
 *   }
 * };
 * ```
 */
export const useCancellableRequest = () => {
  const abortControllersRef = useRef<AbortController[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel all pending requests on unmount
      abortControllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (error) {
          // Ignore abort errors
        }
      });
      abortControllersRef.current = [];
    };
  }, []);

  const makeRequest = useCallback(
    <T>(
      requestFn: (signal: AbortSignal) => Promise<T>
    ): { promise: Promise<T>; cancel: () => void; isCancelled: boolean } => {
      const abortController = new AbortController();
      abortControllersRef.current.push(abortController);

      let isCancelled = false;

      const promise = requestFn(abortController.signal)
        .then(result => {
          // Remove from list if successful
          const index = abortControllersRef.current.indexOf(abortController);
          if (index > -1) {
            abortControllersRef.current.splice(index, 1);
          }

          if (!isMountedRef.current) {
            logger.debug('Request completed after unmount, ignoring result', 'API');
            throw new Error('Component unmounted');
          }

          return result;
        })
        .catch(error => {
          // Remove from list on error
          const index = abortControllersRef.current.indexOf(abortController);
          if (index > -1) {
            abortControllersRef.current.splice(index, 1);
          }

          if (error.name === 'AbortError' || abortController.signal.aborted) {
            isCancelled = true;
            logger.debug('Request cancelled', 'API');
          }

          throw error;
        });

      const cancel = () => {
        if (!abortController.signal.aborted) {
          abortController.abort();
          isCancelled = true;
        }
      };

      return { promise, cancel, isCancelled };
    },
    []
  );

  return { makeRequest };
};

export default useCancellableRequest;
