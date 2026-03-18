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
  private subscriptionPromises: Map<string, Promise<any>> = new Map();
  private callbacks: Map<string, Map<string, Array<(data: any) => void>>> = new Map();

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

    // Register callback
    let channelCallbacks = this.callbacks.get(channelName);
    if (!channelCallbacks) {
      channelCallbacks = new Map();
      this.callbacks.set(channelName, channelCallbacks);
    }

    let eventCallbacks = channelCallbacks.get(eventName);
    if (!eventCallbacks) {
      eventCallbacks = [];
      channelCallbacks.set(eventName, eventCallbacks);
    }

    if (!eventCallbacks.includes(callback)) {
      eventCallbacks.push(callback);
    }

    try {
      // If already subscribed, we're done (callback is registered)
      if (this.channels.has(channelName)) {
        return;
      }

      // If a subscription is currently in progress, wait for it
      if (this.subscriptionPromises.has(channelName)) {
        await this.subscriptionPromises.get(channelName);
        return;
      }

      // Start new subscription
      const subPromise = this.pusher.subscribe({
        channelName,
        onEvent: (event) => {
          // Trigger all registered callbacks for this event
          const registeredCallbacks = this.callbacks.get(channelName)?.get(event.eventName);
          if (registeredCallbacks) {
            registeredCallbacks.forEach(cb => {
              try {
                cb(event.data);
              } catch (e) {
                logger.error(`Error in Pusher callback for ${eventName}`, 'PUSHER', e);
              }
            });
          }
        }
      });

      this.subscriptionPromises.set(channelName, subPromise);

      const channel = await subPromise;
      this.channels.set(channelName, channel);
      this.subscriptionPromises.delete(channelName);

      logger.info(`Subscribed to ${channelName}`, 'PUSHER');
    } catch (error) {
      this.subscriptionPromises.delete(channelName);
      logger.error(`Failed to subscribe to ${channelName}`, 'PUSHER', error);
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channelName: string) {
    if (!this.pusher) return;

    try {
      this.callbacks.delete(channelName);

      if (this.channels.has(channelName)) {
        await this.pusher.unsubscribe({ channelName });
        this.channels.delete(channelName);
        logger.info(`Unsubscribed from ${channelName}`, 'PUSHER');
      }
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
