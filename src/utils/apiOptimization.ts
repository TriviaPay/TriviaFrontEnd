/**
 * API Call Optimization Utilities
 * Prevents duplicate calls, manages request queues, and optimizes backend communication
 */

import { useRef, useCallback } from 'react';

interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    promise?: Promise<any>;
  };
}

class APIOptimizer {
  private requestCache: RequestCache = {};
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds default cache
  private readonly DEBOUNCE_DELAY = 300; // 300ms debounce

  /**
   * Get cached data if available and not expired
   */
  getCached(key: string, maxAge: number = this.CACHE_DURATION): any | null {
    const cached = this.requestCache[key];
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      delete this.requestCache[key];
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache data
   */
  setCache(key: string, data: any): void {
    this.requestCache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if request is pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get pending request promise
   */
  getPending(key: string): Promise<any> | undefined {
    return this.pendingRequests.get(key);
  }

  /**
   * Add pending request
   */
  addPending(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Clear cache for specific key
   */
  clearCache(key: string): void {
    delete this.requestCache[key];
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.requestCache = {};
  }

  /**
   * Optimize API call with caching and deduplication
   */
  async optimizedCall<T>(
    key: string,
    apiCall: () => Promise<T>,
    options: {
      cache?: boolean;
      cacheDuration?: number;
      deduplicate?: boolean;
    } = {}
  ): Promise<T> {
    const { cache = true, cacheDuration = this.CACHE_DURATION, deduplicate = true } = options;

    // Check cache first
    if (cache) {
      const cached = this.getCached(key, cacheDuration);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if request is already pending (deduplication)
    if (deduplicate && this.isPending(key)) {
      return this.getPending(key)!;
    }

    // Make API call
    const promise = apiCall().then(data => {
      if (cache) {
        this.setCache(key, data);
      }
      return data;
    });

    // Track pending request
    if (deduplicate) {
      this.addPending(key, promise);
    }

    return promise;
  }
}

export const apiOptimizer = new APIOptimizer();

/**
 * Hook for optimized API calls
 */
export const useOptimizedAPI = () => {
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const optimizedCall = useCallback(
    async <T>(
      key: string,
      apiCall: () => Promise<T>,
      options: {
        cache?: boolean;
        cacheDuration?: number;
        deduplicate?: boolean;
        debounce?: boolean;
        debounceDelay?: number;
      } = {}
    ): Promise<T> => {
      const { debounce = false, debounceDelay = 300, ...apiOptions } = options;

      if (debounce) {
        return new Promise((resolve, reject) => {
          // Clear existing timer
          const existingTimer = debounceTimers.current.get(key);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // Set new timer
          const timer = setTimeout(async () => {
            debounceTimers.current.delete(key);
            try {
              const result = await apiOptimizer.optimizedCall(key, apiCall, apiOptions);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, debounceDelay);

          debounceTimers.current.set(key, timer);
        });
      }

      return apiOptimizer.optimizedCall(key, apiCall, apiOptions);
    },
    []
  );

  const clearCache = useCallback((key?: string) => {
    if (key) {
      apiOptimizer.clearCache(key);
    } else {
      apiOptimizer.clearAllCache();
    }
  }, []);

  return {
    optimizedCall,
    clearCache,
    getCached: apiOptimizer.getCached.bind(apiOptimizer),
  };
};

/**
 * Batch API calls for better performance
 */
export const batchAPICalls = async <T>(
  calls: Array<{ key: string; call: () => Promise<T> }>,
  options: {
    maxConcurrent?: number;
    cache?: boolean;
  } = {}
): Promise<T[]> => {
  const { maxConcurrent = 5, cache = true } = options;

  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < calls.length; i++) {
    const { key, call } = calls[i];
    const promise = apiOptimizer
      .optimizedCall(key, call, { cache, deduplicate: true })
      .then(result => {
        results[i] = result;
      });

    executing.push(promise);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
};
