/**
 * Screen Performance Hook
 * Prevents screen freezing by managing timers, intervals, and heavy operations
 */

import { useRef, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';

interface UseScreenPerformanceOptions {
  enableHeavyOperationDefer?: boolean;
  maxConcurrentOperations?: number;
}

export const useScreenPerformance = (options: UseScreenPerformanceOptions = {}) => {
  const { enableHeavyOperationDefer = true, maxConcurrentOperations = 3 } = options;

  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const activeOperationsRef = useRef<number>(0);
  const operationQueueRef = useRef<Array<() => Promise<void>>>([]);

  // Safe setTimeout that tracks and cleans up
  const safeSetTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(() => {
      timersRef.current.delete(timeout);
      callback();
    }, delay);
    timersRef.current.add(timeout);
    return timeout;
  }, []);

  // Safe setInterval that tracks and cleans up
  const safeSetInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay);
    intervalsRef.current.add(interval);
    return interval;
  }, []);

  // Clear specific timeout
  const clearSafeTimeout = useCallback((timeout: NodeJS.Timeout | null) => {
    if (timeout) {
      clearTimeout(timeout);
      timersRef.current.delete(timeout);
    }
  }, []);

  // Clear specific interval
  const clearSafeInterval = useCallback((interval: NodeJS.Timeout | null) => {
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(interval);
    }
  }, []);

  // Defer heavy operations to prevent UI blocking
  const deferHeavyOperation = useCallback(
    (operation: () => Promise<void> | void) => {
      if (!enableHeavyOperationDefer) {
        return Promise.resolve(operation());
      }

      return new Promise<void>((resolve, reject) => {
        // Wait for interactions to complete
        InteractionManager.runAfterInteractions(() => {
          // Check if we can run immediately
          if (activeOperationsRef.current < maxConcurrentOperations) {
            activeOperationsRef.current++;
            Promise.resolve(operation())
              .then(() => {
                activeOperationsRef.current--;
                resolve();
                // Process queue
                processOperationQueue();
              })
              .catch(error => {
                activeOperationsRef.current--;
                reject(error);
                processOperationQueue();
              });
          } else {
            // Queue the operation
            operationQueueRef.current.push(async () => {
              await operation();
            });
          }
        });
      });
    },
    [enableHeavyOperationDefer, maxConcurrentOperations]
  );

  // Process queued operations
  const processOperationQueue = useCallback(() => {
    if (operationQueueRef.current.length === 0) return;
    if (activeOperationsRef.current >= maxConcurrentOperations) return;

    const operation = operationQueueRef.current.shift();
    if (operation) {
      activeOperationsRef.current++;
      Promise.resolve(operation())
        .then(() => {
          activeOperationsRef.current--;
          processOperationQueue();
        })
        .catch(() => {
          activeOperationsRef.current--;
          processOperationQueue();
        });
    }
  }, [maxConcurrentOperations]);

  // Cleanup all timers and intervals
  const cleanup = useCallback(() => {
    // Clear all timeouts
    timersRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    timersRef.current.clear();

    // Clear all intervals
    intervalsRef.current.forEach(interval => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();

    // Clear operation queue
    operationQueueRef.current = [];
    activeOperationsRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    safeSetTimeout,
    safeSetInterval,
    clearSafeTimeout,
    clearSafeInterval,
    deferHeavyOperation,
    cleanup,
  };
};

export default useScreenPerformance;
