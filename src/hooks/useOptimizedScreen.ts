/**
 * Optimized Screen Hook
 * Provides all optimizations needed for professional screen rendering
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { useOptimizedAPI } from '../utils/apiOptimization';
import { useOptimizedFocus, useBatchedUpdates } from '../utils/screenOptimization';

interface UseOptimizedScreenOptions {
  screenName: string;
  onFocus?: () => void;
  onBlur?: () => void;
  fetchOnFocus?: boolean;
  debounceFocus?: number;
  enableAPICaching?: boolean;
}

/**
 * Comprehensive screen optimization hook
 */
export const useOptimizedScreen = (options: UseOptimizedScreenOptions) => {
  const {
    screenName,
    onFocus,
    onBlur,
    fetchOnFocus = false,
    debounceFocus = 300,
    enableAPICaching = true,
  } = options;

  const { optimizedCall, clearCache } = useOptimizedAPI();
  const hasFocusedRef = useRef(false);
  const isMountedRef = useRef(true);
  const batchedUpdate = useBatchedUpdates();

  // Handle focus with optimization
  const handleFocus = useOptimizedFocus(
    () => {
      if (onFocus) {
        batchedUpdate(() => {
          onFocus();
        });
      }
    },
    {
      debounce: debounceFocus,
      skipFirst: !fetchOnFocus,
      runAfterInteractions: true,
    }
  );

  // Handle blur
  const handleBlur = useCallback(() => {
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Screen focus effect
  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      handleFocus();

      return () => {
        isMountedRef.current = false;
        handleBlur();
      };
    }, [handleFocus, handleBlur])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (enableAPICaching) {
        // Clear screen-specific cache on unmount
        clearCache(`${screenName}_*`);
      }
    };
  }, [screenName, enableAPICaching, clearCache]);

  // Optimized API call wrapper
  const callAPI = useCallback(
    async <T>(
      key: string,
      apiCall: () => Promise<T>,
      options: {
        cache?: boolean;
        cacheDuration?: number;
        deduplicate?: boolean;
      } = {}
    ): Promise<T> => {
      const fullKey = `${screenName}_${key}`;
      return optimizedCall(fullKey, apiCall, {
        cache: enableAPICaching,
        ...options,
      });
    },
    [screenName, optimizedCall, enableAPICaching]
  );

  return {
    callAPI,
    clearCache: useCallback(
      (key?: string) => {
        if (key) {
          clearCache(`${screenName}_${key}`);
        } else {
          clearCache(`${screenName}_*`);
        }
      },
      [screenName, clearCache]
    ),
    isMounted: () => isMountedRef.current,
    hasFocused: () => hasFocusedRef.current,
  };
};
