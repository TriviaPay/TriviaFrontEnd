/**
 * Network Optimization System
 * Request deduplication, debouncing, caching, and offline support
 * Works with existing API calls without breaking them
 */

import { useCallback, useRef, useMemo } from 'react';

/**
 * Request deduplication
 * Prevents duplicate API calls
 */
class RequestDeduplicator {
  private static instance: RequestDeduplicator | null = null;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Return existing promise if request is in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(key?: string): void {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }
}

/**
 * Hook for debounced API calls
 */
export const useDebouncedRequest = <T>(requestFn: () => Promise<T>, delay: number = 300) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deduplicator = RequestDeduplicator.getInstance();

  return useCallback(
    async (key: string) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Create debounced request
      return new Promise<T>((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await deduplicator.deduplicate(key, requestFn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    },
    [requestFn, delay]
  );
};

/**
 * Simple cache implementation
 */
class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

const cache = new SimpleCache();

/**
 * Cached API request hook
 */
export const useCachedRequest = <T>(
  requestFn: () => Promise<T>,
  cacheKey: string,
  ttl: number = 300000 // 5 minutes default
) => {
  return useCallback(async (): Promise<T> => {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch and cache
    const data = await requestFn();
    cache.set(cacheKey, data, ttl);
    return data;
  }, [requestFn, cacheKey, ttl]);
};

/**
 * Batch API requests
 */
export const batchRequests = async <T>(
  requests: Array<() => Promise<T>>,
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(req => req()));
    results.push(...batchResults);
  }

  return results;
};

/**
 * Request deduplication hook
 */
export const useRequestDeduplication = () => {
  const deduplicator = useMemo(() => RequestDeduplicator.getInstance(), []);

  return useCallback(
    async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
      return deduplicator.deduplicate(key, requestFn);
    },
    [deduplicator]
  );
};

export default {
  useDebouncedRequest,
  useCachedRequest,
  batchRequests,
  useRequestDeduplication,
  RequestDeduplicator,
};
