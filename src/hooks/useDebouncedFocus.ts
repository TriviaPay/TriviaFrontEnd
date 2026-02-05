/**
 * Hook for debounced API calls on screen focus
 * Prevents multiple API calls when screen is focused rapidly
 * Works with useFocusEffect from React Navigation
 */

import { useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRequestDeduplication } from '../utils/networkOptimization';
import { logger } from '../lib/utils/logger';

interface UseDebouncedFocusOptions {
  /**
   * Delay in milliseconds before executing the callback
   * @default 300
   */
  debounceMs?: number;

  /**
   * Whether to deduplicate requests
   * @default true
   */
  deduplicate?: boolean;

  /**
   * Unique key for request deduplication
   */
  deduplicationKey?: string;

  /**
   * Whether to skip if already fetched
   * @default false
   */
  skipIfFetched?: boolean;

  /**
   * Callback to check if already fetched
   */
  isFetched?: () => boolean;
}

/**
 * Hook for debounced API calls on screen focus
 * Prevents multiple rapid API calls when screen is focused
 *
 * @example
 * ```tsx
 * useDebouncedFocus(
 *   () => dispatch(fetchData()),
 *   { debounceMs: 300, deduplicationKey: 'fetchData' }
 * );
 * ```
 */
export const useDebouncedFocus = (
  callback: () => void | Promise<void>,
  options: UseDebouncedFocusOptions = {}
) => {
  const {
    debounceMs = 300,
    deduplicate = true,
    deduplicationKey,
    skipIfFetched = false,
    isFetched,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);
  const deduplicateRequest = useRequestDeduplication();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Skip if already fetched and skipIfFetched is true
      if (skipIfFetched && isFetched && isFetched()) {
        logger.debug('Skipping focus fetch - already fetched', 'API');
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Create debounced callback
      const executeCallback = async () => {
        if (!isMountedRef.current) return;

        try {
          if (deduplicate && deduplicationKey) {
            // Use deduplication if key is provided
            await deduplicateRequest(deduplicationKey, async () => {
              await callback();
            });
          } else {
            // Execute directly
            await callback();
          }

          hasFetchedRef.current = true;
        } catch (error) {
          logger.error('Error in debounced focus callback', 'API', error);
        }
      };

      // Debounce the execution
      timeoutRef.current = setTimeout(() => {
        executeCallback();
      }, debounceMs);

      // Cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [
      callback,
      debounceMs,
      deduplicate,
      deduplicationKey,
      skipIfFetched,
      isFetched,
      deduplicateRequest,
    ])
  );

  // Reset hasFetched when screen is unfocused
  useFocusEffect(
    useCallback(() => {
      return () => {
        hasFetchedRef.current = false;
      };
    }, [])
  );
};

export default useDebouncedFocus;
