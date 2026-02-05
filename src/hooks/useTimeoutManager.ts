/**
 * Timeout Manager Hook
 * Tracks and cleans up all timeouts to prevent memory leaks
 */

import { useRef, useEffect, useCallback } from 'react';

export const useTimeoutManager = () => {
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  // Create a tracked timeout
  const createTimeout = useCallback(
    (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
      const timeout = setTimeout(() => {
        timeoutsRef.current.delete(timeout);
        callback();
      }, delay);
      timeoutsRef.current.add(timeout);
      return timeout;
    },
    []
  );

  // Create a tracked interval
  const createInterval = useCallback(
    (callback: () => void, delay: number): ReturnType<typeof setInterval> => {
      const interval = setInterval(callback, delay);
      intervalsRef.current.add(interval);
      return interval;
    },
    []
  );

  // Clear a specific timeout
  const clearTimeout = useCallback((timeout: ReturnType<typeof setTimeout> | null) => {
    if (timeout) {
      global.clearTimeout(timeout as any);
      timeoutsRef.current.delete(timeout);
    }
  }, []);

  // Clear a specific interval
  const clearInterval = useCallback((interval: ReturnType<typeof setInterval> | null) => {
    if (interval) {
      global.clearInterval(interval as any);
      intervalsRef.current.delete(interval);
    }
  }, []);

  // Cleanup all timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutsRef.current.forEach(timeout => {
        global.clearTimeout(timeout as any);
      });
      timeoutsRef.current.clear();

      // Clear all intervals
      intervalsRef.current.forEach(interval => {
        global.clearInterval(interval as any);
      });
      intervalsRef.current.clear();
    };
  }, []);

  return {
    createTimeout,
    createInterval,
    clearTimeout,
    clearInterval,
  };
};
