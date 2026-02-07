/**
 * Request Deduplication Utility
 * Prevents duplicate API requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplication {
  private static instance: RequestDeduplication;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): RequestDeduplication {
    if (!RequestDeduplication.instance) {
      RequestDeduplication.instance = new RequestDeduplication();
    }
    return RequestDeduplication.instance;
  }

  /**
   * Generate request key from URL and options
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if request is already pending
   */
  isPending(url: string, options?: RequestInit): boolean {
    const key = this.generateKey(url, options);
    const pending = this.pendingRequests.get(key);

    if (!pending) {
      return false;
    }

    // Check if request timed out
    if (Date.now() - pending.timestamp > this.REQUEST_TIMEOUT) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get pending request promise
   */
  getPending(url: string, options?: RequestInit): Promise<any> | null {
    const key = this.generateKey(url, options);
    const pending = this.pendingRequests.get(key);

    if (pending && Date.now() - pending.timestamp <= this.REQUEST_TIMEOUT) {
      return pending.promise;
    }

    return null;
  }

  /**
   * Add pending request
   */
  addPending(url: string, options: RequestInit | undefined, promise: Promise<any>): void {
    const key = this.generateKey(url, options);

    // Clean up promise when it resolves/rejects
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Clear expired requests
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

export const requestDeduplication = RequestDeduplication.getInstance();

// Clean up expired requests every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    requestDeduplication.clearExpired();
  }, 60000);
}

export default requestDeduplication;
