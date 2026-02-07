/**
 * Offline Service
 * Offline mode and sync management
 */

import NetInfo from '@react-native-community/netinfo';
import { storage } from './Storage';
import { logger } from './Logger';

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
}

class OfflineService {
  private isOnline = true;
  private requestQueue: QueuedRequest[] = [];
  private readonly QUEUE_KEY = 'offline_request_queue';

  /**
   * Initialize offline service
   */
  init() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      logger.info(`Network status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`, 'OFFLINE');

      // Sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncQueue();
      }
    });

    // Load queued requests
    this.loadQueue();
  }

  /**
   * Check if online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Queue request for later
   */
  async queueRequest(method: string, url: string, data?: any) {
    const request: QueuedRequest = {
      id: Date.now().toString(),
      method,
      url,
      data,
      timestamp: Date.now(),
    };

    this.requestQueue.push(request);
    await this.saveQueue();
    logger.info('Request queued for offline sync', 'OFFLINE', request);
  }

  /**
   * Sync queued requests
   */
  private async syncQueue() {
    if (!this.isOnline || this.requestQueue.length === 0) return;

    logger.info(`Syncing ${this.requestQueue.length} queued requests`, 'OFFLINE');

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        // Process request (would call actual API)
        logger.info('Synced request', 'OFFLINE', request);
      } catch (error) {
        // Re-queue failed requests
        this.requestQueue.push(request);
        logger.error('Failed to sync request', 'OFFLINE', error);
      }
    }

    await this.saveQueue();
  }

  /**
   * Save queue to storage
   */
  private async saveQueue() {
    storage.setJSON(this.QUEUE_KEY, this.requestQueue);
  }

  /**
   * Load queue from storage
   */
  private async loadQueue() {
    try {
      const data = storage.getJSON<QueuedRequest[]>(this.QUEUE_KEY);
      if (data) {
        this.requestQueue = data;
      }
    } catch (error) {
      logger.error('Failed to load offline queue', 'OFFLINE', error);
    }
  }
}

export const offlineService = new OfflineService();
