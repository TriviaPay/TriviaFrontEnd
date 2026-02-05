/**
 * useErrorHandler Hook
 * Provides standardized error handling for React components
 * Wraps errorService for easy use in components
 */

import { useCallback, useMemo } from 'react';
import { errorService, ErrorServiceOptions, ErrorContext } from '../services/errorService';

export interface UseErrorHandlerOptions {
  component?: string;
  category?: string;
  showAlert?: boolean;
  defaultContext?: ErrorContext;
}

/**
 * Hook for standardized error handling in components
 *
 * @example
 * ```tsx
 * const { handleError, safeAsync } = useErrorHandler({
 *   component: 'MyComponent',
 *   category: 'MY_FEATURE'
 * });
 *
 * // In try-catch
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, { showAlert: true });
 * }
 *
 * // Or use safeAsync wrapper
 * const result = await safeAsync(async () => {
 *   return await someAsyncOperation();
 * });
 * ```
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    component,
    category = 'ERROR',
    showAlert: defaultShowAlert = false,
    defaultContext,
  } = options;

  // Memoize default context
  const context = useMemo<ErrorContext>(
    () => ({
      component,
      ...defaultContext,
    }),
    [component, defaultContext]
  );

  /**
   * Handle an error with standardized patterns
   */
  const handleError = useCallback(
    (error: unknown, overrideOptions?: Partial<ErrorServiceOptions>) => {
      errorService.handleError(error, {
        showAlert: defaultShowAlert,
        category,
        context,
        ...overrideOptions,
      });
    },
    [category, context, defaultShowAlert]
  );

  /**
   * Safe async wrapper that handles errors automatically
   */
  const safeAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      overrideOptions?: Partial<ErrorServiceOptions>
    ): Promise<T | null> => {
      return errorService.safeAsync(asyncFn, {
        category,
        context,
        showAlert: defaultShowAlert,
        ...overrideOptions,
      });
    },
    [category, context, defaultShowAlert]
  );

  /**
   * Safe async wrapper that returns error instead of null
   */
  const safeAsyncWithError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      overrideOptions?: Partial<ErrorServiceOptions>
    ): Promise<{ data: T | null; error: Error | null }> => {
      return errorService.safeAsyncWithError(asyncFn, {
        category,
        context,
        showAlert: defaultShowAlert,
        ...overrideOptions,
      });
    },
    [category, context, defaultShowAlert]
  );

  /**
   * Retry with exponential backoff
   */
  const retryWithBackoff = useCallback(
    async <T>(
      fn: () => Promise<T>,
      maxRetries: number = 3,
      initialDelay: number = 1000,
      overrideOptions?: Partial<ErrorServiceOptions>
    ): Promise<T> => {
      return errorService.retryWithBackoff(fn, maxRetries, initialDelay, {
        category,
        context,
        showAlert: defaultShowAlert,
        ...overrideOptions,
      });
    },
    [category, context, defaultShowAlert]
  );

  return {
    handleError,
    safeAsync,
    safeAsyncWithError,
    retryWithBackoff,
  };
}

export default useErrorHandler;
