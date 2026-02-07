/**
 * Pusher Service
 * Real-time communication
 */

import { Pusher } from '@pusher/pusher-websocket-react-native';
import { env } from '@config/env';
import { logger } from './Logger';

class PusherService {
  private pusher: Pusher | null = null;
  private channels: Map<string, any> = new Map();

  /**
   * Initialize Pusher
   */
  async init() {
    if (this.pusher) return;

    try {
      // Get Pusher instance (singleton) - called at module level in TriviaPay
      this.pusher = Pusher.getInstance();

      if (!env.PUSHER_KEY) {
        logger.warn('Pusher key not configured, skipping initialization', 'PUSHER');
        return;
      }

      await this.pusher.init({
        apiKey: env.PUSHER_KEY,
        cluster: env.PUSHER_CLUSTER,
      });

      await this.pusher.connect();
      logger.info('Pusher connected', 'PUSHER');
    } catch (error) {
      logger.error('Failed to initialize Pusher', 'PUSHER', error);
      // Don't throw - make it non-blocking
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channelName: string, eventName: string, callback: (data: any) => void) {
    if (!this.pusher) return;

    try {
      const channel = await this.pusher.subscribe({ channelName });

      await channel.bind({ eventName, onEvent: callback });

      this.channels.set(channelName, channel);
      logger.info(`Subscribed to ${channelName}`, 'PUSHER');
    } catch (error) {
      logger.error(`Failed to subscribe to ${channelName}`, 'PUSHER', error);
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channelName: string) {
    if (!this.pusher) return;

    try {
      await this.pusher.unsubscribe({ channelName });
      this.channels.delete(channelName);
      logger.info(`Unsubscribed from ${channelName}`, 'PUSHER');
    } catch (error) {
      logger.error(`Failed to unsubscribe from ${channelName}`, 'PUSHER', error);
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (!this.pusher) return;

    try {
      await this.pusher.disconnect();
      this.channels.clear();
      logger.info('Pusher disconnected', 'PUSHER');
    } catch (error) {
      logger.error('Failed to disconnect Pusher', 'PUSHER', error);
    }
  }

  /**
   * Get Socket ID
   */
  async getSocketId(): Promise<string | null> {
    if (!this.pusher) return null;
    try {
      return await this.pusher.getSocketId();
    } catch (error) {
      logger.warn('Failed to get Pusher socket ID', 'PUSHER', error);
      return null;
    }
  }
}

export const pusherService = new PusherService();
