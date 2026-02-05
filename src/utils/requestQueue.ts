/**
 * Request Queue and Prioritization
 * Manages API requests with priority and cancellation
 */

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  priority: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  cancelled: boolean;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private activeCount = 0;

  /**
   * Enqueue a request
   */
  enqueue<T>(request: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`;
      this.queue.push({
        id,
        request,
        priority,
        resolve,
        reject,
        cancelled: false,
      });

      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.process();
    });
  }

  /**
   * Cancel a request
   */
  cancel(id: string): void {
    const request = this.queue.find(r => r.id === id);
    if (request) {
      request.cancelled = true;
    }
  }

  /**
   * Process the queue
   */
  private async process(): Promise<void> {
    if (this.processing || this.activeCount >= this.maxConcurrent) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const queued = this.queue.shift();
      if (!queued || queued.cancelled) {
        continue;
      }

      this.activeCount++;

      queued
        .request()
        .then(result => {
          if (!queued.cancelled) {
            queued.resolve(result);
          }
        })
        .catch(error => {
          if (!queued.cancelled) {
            queued.reject(error);
          }
        })
        .finally(() => {
          this.activeCount--;
          this.process();
        });
    }

    this.processing = false;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach(req => {
      req.cancelled = true;
      req.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
  }
}

export const requestQueue = new RequestQueue();

/**
 * Priority levels
 */
export const PRIORITY = {
  CRITICAL: 100,
  HIGH: 50,
  NORMAL: 0,
  LOW: -50,
} as const;
