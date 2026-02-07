/**
 * Interaction Manager Utilities
 * Defer non-critical operations until interactions are complete
 */

import { InteractionManager } from 'react-native';
import { logger } from '../lib/utils/logger';

/**
 * Run function after all interactions are complete
 */
export const runAfterInteractions = <T>(callback: () => T | Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const result = callback();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        logger.error('Error in runAfterInteractions callback', 'INTERACTION', error);
        reject(error);
      }
    });
  });
};

/**
 * Defer heavy operations
 */
export const deferHeavyOperation = <T>(
  operation: () => T | Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'low'
): Promise<T> => {
  return runAfterInteractions(() => {
    // Add delay for low priority operations
    if (priority === 'low') {
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          try {
            const result = operation();
            if (result instanceof Promise) {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        }, 100);
      });
    }

    return operation();
  });
};

/**
 * Batch multiple operations to run after interactions
 */
export const batchAfterInteractions = (
  operations: Array<() => void | Promise<void>>
): Promise<void[]> => {
  return runAfterInteractions(async () => {
    return Promise.all(
      operations.map(op => {
        try {
          const result = op();
          return result instanceof Promise ? result : Promise.resolve();
        } catch (error) {
          logger.error('Error in batched operation', 'INTERACTION', error);
          return Promise.resolve();
        }
      })
    );
  });
};

/**
 * Create a debounced function that runs after interactions
 */
export const createDebouncedInteractionHandler = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      runAfterInteractions(() => {
        fn(...args);
      });
    }, delay);
  };
};

export default {
  runAfterInteractions,
  deferHeavyOperation,
  batchAfterInteractions,
  createDebouncedInteractionHandler,
};
