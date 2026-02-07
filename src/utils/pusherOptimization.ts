/**
 * Pusher Connection Optimization
 * Optimizes Pusher connections for better performance
 * Works with existing Pusher setup without breaking it
 */

/**
 * Pusher connection configuration
 */
export const PUSHER_CONFIG = {
  // Connection timeout
  CONNECTION_TIMEOUT: 10000,

  // Reconnection strategy
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,

  // Channel subscription limits
  MAX_CHANNELS: 10,

  // Event batching
  EVENT_BATCH_SIZE: 10,
  EVENT_BATCH_DELAY: 100,
} as const;

/**
 * Optimize Pusher channel subscriptions
 * Prevents subscribing to too many channels
 */
export const optimizeChannelSubscriptions = (
  channels: string[],
  maxChannels: number = PUSHER_CONFIG.MAX_CHANNELS
): string[] => {
  // Prioritize channels - keep most important ones
  if (channels.length <= maxChannels) {
    return channels;
  }

  // Return most important channels (you can customize priority logic)
  return channels.slice(0, maxChannels);
};

/**
 * Batch Pusher events
 * Groups rapid events to reduce processing
 */
export class PusherEventBatcher {
  private events: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchCallback: (events: any[]) => void;

  constructor(callback: (events: any[]) => void) {
    this.batchCallback = callback;
  }

  add(event: any): void {
    this.events.push(event);

    if (this.events.length >= PUSHER_CONFIG.EVENT_BATCH_SIZE) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flush();
    }, PUSHER_CONFIG.EVENT_BATCH_DELAY);
  }

  flush(): void {
    if (this.events.length > 0) {
      this.batchCallback([...this.events]);
      this.events = [];
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

/**
 * Connection health monitor
 */
export class PusherHealthMonitor {
  private reconnectCount = 0;
  private lastConnectedTime: number | null = null;
  private connectionStartTime: number | null = null;

  onConnect(): void {
    this.lastConnectedTime = Date.now();
    this.reconnectCount = 0;
  }

  onDisconnect(): void {
    this.connectionStartTime = Date.now();
  }

  onReconnect(): void {
    this.reconnectCount++;
    this.lastConnectedTime = Date.now();
  }

  shouldReconnect(): boolean {
    return this.reconnectCount < PUSHER_CONFIG.MAX_RECONNECT_ATTEMPTS;
  }

  getConnectionHealth(): 'healthy' | 'degraded' | 'poor' {
    if (!this.lastConnectedTime) return 'poor';

    const timeSinceConnect = Date.now() - this.lastConnectedTime;
    if (timeSinceConnect < 60000) return 'healthy';
    if (timeSinceConnect < 300000) return 'degraded';
    return 'poor';
  }
}

export default {
  PUSHER_CONFIG,
  optimizeChannelSubscriptions,
  PusherEventBatcher,
  PusherHealthMonitor,
};
