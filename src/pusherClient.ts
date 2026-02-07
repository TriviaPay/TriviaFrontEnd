/**
 * Pusher Client - React Native Implementation
 * Handles Pusher WebSocket connection and private channel authentication
 */

import { Pusher, PusherAuthorizerResult } from '@pusher/pusher-websocket-react-native';
import { logger } from './lib/utils/logger';
import { API_CONFIG } from './config/api';
import { ENV_CONFIG } from './config/env';

// Get Pusher configuration from config file
const PUSHER_KEY = ENV_CONFIG.PUSHER_KEY;
const PUSHER_CLUSTER = ENV_CONFIG.PUSHER_CLUSTER;

// Store user token for authentication
let currentUserToken: string | null = null;
let isInitialized = false;

// Get Pusher instance (singleton)
const pusher = Pusher.getInstance();

/**
 * Initialize Pusher connection with authentication
 * @param userToken - User's authentication token for private channel auth
 */
export async function initPusher(userToken: string): Promise<void> {
  try {
    if (!PUSHER_KEY) {
      logger.warn(
        '⚠️ Pusher key not configured. Please set PUSHER_KEY or EXPO_PUBLIC_PUSHER_KEY',
        'APP'
      );
      return;
    }

    // Skip if already initialized with the same token
    if (isInitialized && currentUserToken === userToken) {
      if (__DEV__) {
        logger.debug('⏭️ Pusher already initialized with this token, skipping', 'PUSHER');
      }
      return;
    }

    // If already initialized but token changed, we might need to reconnect
    if (isInitialized && currentUserToken !== userToken) {
      if (__DEV__) {
        logger.debug('🔄 Pusher token changed, re-initializing', 'PUSHER');
      }
      try {
        await pusher.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    // Store token for use in onAuthorizer
    currentUserToken = userToken;

    await pusher.init({
      apiKey: PUSHER_KEY,
      cluster: PUSHER_CLUSTER,
      onAuthorizer: async (
        channelName: string,
        socketId: string
      ): Promise<PusherAuthorizerResult> => {
        // Call your backend /pusher/auth endpoint with Authorization header
        try {
          // Backend expects form-encoded data, not JSON
          const formData = new URLSearchParams();
          formData.append('socket_id', socketId);
          formData.append('channel_name', channelName);

          // User requested debug logs
          console.log("socket_id", socketId);
          console.log("channel_name", channelName);

          if (__DEV__) {
            logger.debug(`🔐 Authorizing Pusher channel: ${channelName}`, 'PUSHER');
          }

          const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.PUSHER_AUTH}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${currentUserToken}`,
              },
              body: formData.toString(),
            }
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            if (__DEV__) {
              logger.error(`❌ Pusher auth failed: ${response.status} - ${errorText}`, 'PUSHER');
            }

            // For 422 errors, conversation might not exist yet - gracefully fall back to polling
            if (response.status === 422) {
              if (__DEV__) {
                logger.warn(
                  `⚠️ Channel ${channelName} not ready (422). Will retry later.`,
                  'PUSHER'
                );
              }
              throw new Error(`Channel not ready`);
            }

            // For other errors, also fall back gracefully
            if (__DEV__) {
              logger.warn(`⚠️ Pusher auth error (${response.status}). Will retry later.`, 'PUSHER');
            }
            throw new Error(`Auth failed: ${response.status}`);
          }

          const data = await response.json();
          if (__DEV__) {
            logger.debug(`✅ Pusher channel authorized: ${channelName}`, 'PUSHER');
          }

          // Ensure channel_data is valid JSON or undefined
          let channelData = data.channel_data;
          if (channelData === '' || channelData === null) {
            channelData = undefined; // Let Pusher handle undefined properly
          }

          return {
            auth: data.auth || '',
            channel_data: channelData,
            shared_secret: data.shared_secret || '',
          };
        } catch (error) {
          // Check if it's a network error
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNetworkError =
            errorMessage.includes('Network request failed') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('Unable to resolve host') ||
            errorMessage.includes('UnknownHostException');

          if (isNetworkError) {
            // Silently handle network errors - app will work in offline mode
            if (__DEV__) {
              logger.warn('⚠️ Pusher auth network error (offline mode)', 'PUSHER');
            }
          } else if (__DEV__) {
            logger.error('❌ Pusher auth error:', 'PUSHER', error);
          }
          // Re-throw the error - let subscription fail gracefully
          throw error;
        }
      },
      onConnectionStateChange: (currentState: string, previousState: string) => {
        if (__DEV__) {
          logger.debug(`🔄 Pusher connection state: ${previousState} -> ${currentState}`, 'PUSHER');
        }

        // When connection is fully established, log the socket ID
        if (currentState === 'CONNECTED') {
          setTimeout(async () => {
            try {
              const socketId = await pusher.getSocketId();
              if (socketId && __DEV__) {
                logger.debug(`✅ Pusher connected with socket ID: ${socketId}`, 'PUSHER');
              }
            } catch (error) {
              if (__DEV__) {
                logger.error('❌ Error getting socket ID on connection:', 'PUSHER', error);
              }
            }
          }, 500);
        }
      },
      onError: (message: string, code: number, error: any) => {
        // Only log non-network errors in production, or all errors in dev
        const isNetworkError =
          message.includes('UnknownHostException') ||
          message.includes('Unable to resolve host') ||
          message.includes('Network request failed') ||
          (error && error.toString && error.toString().includes('UnknownHostException'));

        if (isNetworkError) {
          // Silently handle network errors - app will work in offline mode
          if (__DEV__) {
            logger.warn('Warning', 'PUSHER', `⚠️ Pusher network error (offline mode): ${message}`);
          }
        } else {
          // Log other errors
          logger.error('Error', 'PUSHER', `❌ Pusher error: ${message} (code: ${code})`, error);
        }
      },
      onSubscriptionSucceeded: (channelName: string, data: any) => {
        if (__DEV__) {
          logger.debug(`✅ Subscribed to Pusher channel: ${channelName}`, 'PUSHER');
        }
      },
      onSubscriptionError: (channelName: string, message: string, error: any) => {
        // Only log subscription errors in dev mode, or if it's not a network error
        const isNetworkError =
          message.includes('UnknownHostException') ||
          message.includes('Unable to resolve host') ||
          message.includes('Network request failed');

        if (!isNetworkError || __DEV__) {
          logger.error(
            'Error',
            'PUSHER',
            `❌ Subscription error for ${channelName}: ${message}`,
            error
          );
        }
      },
    });

    await pusher.connect();
    isInitialized = true;
    if (__DEV__) {
      logger.debug('✅ Pusher connection initiated', 'PUSHER');
    }

    // Get socket ID with retry mechanism (socket ID may not be available immediately)
    const getSocketIdWithRetry = async (maxRetries = 5, delay = 500): Promise<string | null> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const socketId = await pusher.getSocketId();
          if (socketId) {
            return socketId;
          }
          // If null, wait and retry
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          logger.error(
            'Error',
            'PUSHER',
            `❌ Error getting socket ID (attempt ${i + 1}/${maxRetries}):`,
            error
          );
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      return null;
    };

    // Try to get socket ID after connection is established
    setTimeout(async () => {
      const socketId = await getSocketIdWithRetry();
      if (socketId && __DEV__) {
        logger.debug(`✅ Pusher socket ID obtained: ${socketId}`, 'PUSHER');
      } else if (!socketId && __DEV__) {
        logger.warn(
          '⚠️ Could not get Pusher socket ID after multiple attempts. Connection may still be establishing.',
          'PUSHER'
        );
      }
    }, 1000);
  } catch (error) {
    logger.error('❌ Pusher init error:', 'PUSHER', error);
    throw error;
  }
}

/**
 * Get current Pusher socket ID
 * @returns Promise<string | null> - Socket ID or null if not connected
 */
export async function getSocketId(): Promise<string | null> {
  try {
    const socketId = await pusher.getSocketId();
    return socketId;
  } catch (error) {
    logger.error('❌ Error getting socket ID:', 'PUSHER', error);
    return null;
  }
}

/**
 * Disconnect Pusher
 */
export async function disconnectPusher(): Promise<void> {
  try {
    await pusher.disconnect();
    if (__DEV__) {
      logger.debug('✅ Pusher disconnected', 'PUSHER');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting Pusher:', 'PUSHER', error);
  }
}

/**
 * Subscribe to a channel
 * @param channelName - Name of the channel to subscribe to
 * @param onEvent - Optional callback for channel events (receives PusherEvent)
 * @returns Promise<PusherChannel> - Pusher channel instance
 */
export async function subscribeToChannel(
  channelName: string,
  onEvent?: (event: { eventName: string; data: any; channelName: string }) => void
) {
  try {
    const channel = await pusher.subscribe({
      channelName,
      onEvent: onEvent
        ? event => {
          // Transform PusherEvent to simpler format if needed
          onEvent({
            eventName: event.eventName,
            data: event.data,
            channelName: event.channelName,
          });
        }
        : undefined,
    });
    if (__DEV__) {
      logger.debug(`✅ Subscribed to channel: ${channelName}`, 'PUSHER');
    }
    return channel;
  } catch (error) {
    logger.error('Error', 'PUSHER', `❌ Error subscribing to channel ${channelName}:`, error);
    throw error;
  }
}

/**
 * Unsubscribe from a channel
 * @param channelName - Name of the channel to unsubscribe from
 */
export function unsubscribeFromChannel(channelName: string): void {
  try {
    pusher.unsubscribe({ channelName });
    if (__DEV__) {
      logger.debug(`✅ Unsubscribed from channel: ${channelName}`, 'PUSHER');
    }
  } catch (error) {
    logger.error('Error', 'PUSHER', `❌ Error unsubscribing from channel ${channelName}:`, error);
  }
}

// Export the pusher instance for direct access if needed
export default pusher;
