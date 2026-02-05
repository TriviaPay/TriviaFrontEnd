/**
 * Retry Utility Functions
 * Handles retry logic for API requests with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...defaultRetryOptions,
    ...options,
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain error types
      if (error instanceof Error) {
        // Don't retry on authentication errors or client errors (4xx)
        if (
          error.message.includes('401') ||
          error.message.includes('403') ||
          error.message.includes('400')
        ) {
          break;
        }
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Enhanced fetch with timeout and retry
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number; retry?: RetryOptions } = {}
): Promise<Response> {
  const { timeout = 15000, retry, ...fetchOptions } = options;

  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, retry);
}
