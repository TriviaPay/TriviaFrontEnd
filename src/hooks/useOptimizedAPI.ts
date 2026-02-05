/**
 * Optimized API Hook
 * Combines deduplication, caching, and debouncing
 * Drop-in replacement for direct API calls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useRequestDeduplication,
  useCachedRequest,
  useDebouncedRequest,
} from '../utils/networkOptimization';
import { showErrorAlert } from '../utils/errorHandling';

interface UseOptimizedAPIOptions {
  cacheKey?: string;
  cacheTTL?: number;
  debounceMs?: number;
  deduplicate?: boolean;
  onError?: (error: any) => void;
}

/**
 * Optimized API hook with all optimizations
 */
export const useOptimizedAPI = <T>(
  apiCall: () => Promise<T>,
  options: UseOptimizedAPIOptions = {}
) => {
  const { cacheKey, cacheTTL = 300000, debounceMs, deduplicate = true, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const deduplicateRequest = useRequestDeduplication();
  const cachedRequest = useCachedRequest(apiCall, cacheKey || '', cacheTTL);
  const debouncedRequest = useDebouncedRequest(apiCall, debounceMs || 0);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: T;

      if (debounceMs && debounceMs > 0) {
        result = await debouncedRequest(cacheKey || 'api-call');
      } else if (cacheKey) {
        result = await cachedRequest();
      } else if (deduplicate) {
        result = await deduplicateRequest(cacheKey || 'api-call', apiCall);
      } else {
        result = await apiCall();
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      } else {
        showErrorAlert(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    apiCall,
    cacheKey,
    cacheTTL,
    debounceMs,
    deduplicate,
    onError,
    deduplicateRequest,
    cachedRequest,
    debouncedRequest,
  ]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute,
  };
};

export default useOptimizedAPI;
