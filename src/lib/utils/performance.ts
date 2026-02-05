/**
 * Performance Utilities
 * Centralized performance optimization utilities
 */

import { useMemo, useCallback, useRef } from 'react';

/**
 * Memoize expensive computations
 */
export function useMemoized<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Memoize callbacks
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Request deduplication wrapper for fetch
 */
export function createDeduplicatedFetch() {
  const pendingRequests = new Map<string, Promise<Response>>();

  return async (url: string, options?: RequestInit): Promise<Response> => {
    const key = `${options?.method || 'GET'}:${url}`;

    // Check if request is already pending
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    // Create new request
    const requestPromise = fetch(url, options).finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, requestPromise);
    return requestPromise;
  };
}

/**
 * Debounce utility for functions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for functions
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
