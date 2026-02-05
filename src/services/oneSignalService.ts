/**
 * OneSignal Push Notification Service
 * Handles OneSignal initialization and device registration with backend
 */

import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api';
import { authenticatedRequest } from './api/apiclient';
import { logger } from '../lib/utils/logger';
import { handleNotificationNavigation } from '../components/InAppNotificationComponent';
import { getNavigationRef } from './navigationService';

// Import OneSignal - try different import patterns
let OneSignal: any = null;
let OneSignalInstance: any = null;
try {
  // Try standard import first
  const OneSignalModule = require('react-native-onesignal');
  // Handle different export patterns
  OneSignal = OneSignalModule.default || OneSignalModule || OneSignalModule.OneSignal;

  // If still null, try direct access
  if (!OneSignal && OneSignalModule) {
    OneSignal = OneSignalModule;
  }

  // The actual OneSignal instance is at OneSignal.OneSignal (based on object keys)
  if (OneSignal && OneSignal.OneSignal) {
    OneSignalInstance = OneSignal.OneSignal;
  } else {
    OneSignalInstance = OneSignal;
  }
  logger.log('📦 OneSignal.OneSignal available:', 'SERVICE', !!(OneSignal && OneSignal.OneSignal));

  // Debug: Log the full structure
  if (OneSignal && OneSignal.OneSignal) {
    logger.log(
      '📦 OneSignal.OneSignal keys:',
      'SERVICE',
      Object.keys(OneSignal.OneSignal).slice(0, 20)
    );
    if (OneSignal.OneSignal.User) {
      if (OneSignal.OneSignal.User.pushSubscription) {
        logger.log(
          '📦 pushSubscription keys:',
          'SERVICE',
          Object.keys(OneSignal.OneSignal.User.pushSubscription)
        );
      }
    }
  }
} catch (error) {
  logger.warn('⚠️ OneSignal module not available:', 'SERVICE', error);
}

// Type definitions for OneSignal v5.x API (types are incomplete in package)
type OneSignalV5 = any;

// OneSignal App ID - should be set via environment variable or config
// For now, we'll initialize it when the service is initialized
let oneSignalAppId: string | null = null;
let isInitialized = false;
let isRegistering = false;
let subscriptionObserverAdded = false;
let registrationAttempts = 0;
const MAX_REGISTRATION_ATTEMPTS = 3;

/**
 * Initialize OneSignal SDK
 * @param appId - OneSignal App ID (optional, can be set later via setOneSignalAppId)
 */
export const initializeOneSignal = async (appId?: string): Promise<void> => {
  try {
    if (isInitialized) {
      return;
    }

    // If appId is provided, use it; otherwise, it should be set via environment variable or setOneSignalAppId
    if (appId) {
      oneSignalAppId = appId;
    }

    if (!oneSignalAppId) {
      logger.warn(
        '⚠️ OneSignal App ID not provided. Call setOneSignalAppId() or provide appId parameter. Push notifications will not work until App ID is set.',
        'SERVICE'
      );
      return;
    }

    // Check if OneSignal is available
    if (!OneSignal || !OneSignalInstance) {
      throw new Error(
        'OneSignal module is not available. Make sure react-native-onesignal is properly installed and linked.'
      );
    }
    // Initialize OneSignal with App ID using the instance
    // Try different initialization methods based on version
    let initialized = false;

    // Method 1: Use OneSignal instance's setAppId
    if (typeof OneSignalInstance.setAppId === 'function') {
      OneSignalInstance.setAppId(oneSignalAppId);
      initialized = true;
    }
    // Method 2: v5.x initialize on instance
    else if (typeof OneSignalInstance.initialize === 'function') {
      OneSignalInstance.initialize(oneSignalAppId);
      initialized = true;
    }
    // Method 3: Direct property assignment
    else if (OneSignalInstance && typeof OneSignalInstance === 'object') {
      try {
        (OneSignalInstance as any).appId = oneSignalAppId;
        initialized = true;
      } catch (e) {
        logger.warn('⚠️ Direct assignment failed:', 'SERVICE', e);
      }
    }

    if (!initialized) {
      throw new Error(
        `OneSignal initialization method not found. Available methods: ${Object.keys(OneSignalInstance || {}).join(', ')}`
      );
    }

    // Request permission for push notifications
    try {
      if (OneSignalInstance.promptForPushNotificationsWithUserResponse) {
        OneSignalInstance.promptForPushNotificationsWithUserResponse((response: boolean) => {});
      } else if (
        OneSignalInstance.Notifications &&
        typeof OneSignalInstance.Notifications.requestPermission === 'function'
      ) {
        const accepted = await OneSignalInstance.Notifications.requestPermission(true);
      }
    } catch (permError) {
      logger.warn('⚠️ Push notification permission error:', 'SERVICE', permError);
    }

    // Set up notification event listeners for in-app notifications
    // Import showInAppNotification function (will be available when component is loaded)
    let showInAppNotificationFn: ((notification: any) => void) | null = null;

    // Try to import the function
    try {
      const inAppNotificationModule = require('../components/InAppNotificationComponent');
      showInAppNotificationFn = inAppNotificationModule.showInAppNotification;
    } catch (error) {
      logger.warn('⚠️ InAppNotificationComponent not available yet', 'SERVICE');
    }

    // Handler for notifications received in foreground
    if (OneSignalInstance.setNotificationWillShowInForegroundHandler) {
      OneSignalInstance.setNotificationWillShowInForegroundHandler(
        (notificationReceivedEvent: any) => {
          const notification = notificationReceivedEvent.getNotification();
          const data = notification.additionalData || {};

          logger.log('📬 Notification received in foreground:', 'ONESIGNAL', {
            title: notification.title,
            body: notification.body,
            show_as_in_app: data.show_as_in_app,
          });

          // Check if this should be shown as in-app notification
          if (data.show_as_in_app === true) {
            // Cancel the system notification
            notificationReceivedEvent.complete();

            // Show custom in-app notification
            if (showInAppNotificationFn) {
              showInAppNotificationFn(notification);
            } else {
              // Try to import again if not available
              try {
                const inAppNotificationModule = require('../components/InAppNotificationComponent');
                inAppNotificationModule.showInAppNotification(notification);
              } catch (error) {
                logger.warn('⚠️ Could not show in-app notification:', 'SERVICE', error);
              }
            }
          } else {
            // Let OneSignal show the system notification (when app is in background)
            notificationReceivedEvent.complete(notification);
          }
        }
      );
    } else if (
      OneSignalInstance.Notifications &&
      OneSignalInstance.Notifications.addEventListener
    ) {
      OneSignalInstance.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        const notification = event.getNotification();
        const data = notification.additionalData || {};

        if (data.show_as_in_app === true) {
          // Prevent default notification display
          event.preventDefault();

          // Show custom in-app notification
          if (showInAppNotificationFn) {
            showInAppNotificationFn(notification);
          }
        }
      });
    }

    // Handler for notification opened (when user taps notification)
    if (OneSignalInstance.setNotificationOpenedHandler) {
      OneSignalInstance.setNotificationOpenedHandler((result: any) => {
        const data = result.notification?.additionalData || {};
        logger.log('👆 Notification opened:', 'ONESIGNAL', { type: data.type, data });

        // Navigate to appropriate screen based on notification type
        const navigationRef = getNavigationRef();
        if (navigationRef && navigationRef.isReady()) {
          handleNotificationNavigation(data, navigationRef);
        } else {
          logger.warn('⚠️ Navigation ref not ready, will retry navigation', 'ONESIGNAL');
          // Retry after a short delay if navigation isn't ready yet
          setTimeout(() => {
            const retryNavRef = getNavigationRef();
            if (retryNavRef && retryNavRef.isReady()) {
              handleNotificationNavigation(data, retryNavRef);
            }
          }, 500);
        }
      });
    } else if (
      OneSignalInstance.Notifications &&
      OneSignalInstance.Notifications.addEventListener
    ) {
      OneSignalInstance.Notifications.addEventListener('click', (event: any) => {
        const data = event.notification?.additionalData || {};
        logger.log('👆 Notification clicked:', 'ONESIGNAL', { type: data.type, data });

        // Navigate to appropriate screen based on notification type
        const navigationRef = getNavigationRef();
        if (navigationRef && navigationRef.isReady()) {
          handleNotificationNavigation(data, navigationRef);
        } else {
          logger.warn('⚠️ Navigation ref not ready, will retry navigation', 'ONESIGNAL');
          // Retry after a short delay if navigation isn't ready yet
          setTimeout(() => {
            const retryNavRef = getNavigationRef();
            if (retryNavRef && retryNavRef.isReady()) {
              handleNotificationNavigation(data, retryNavRef);
            }
          }, 500);
        }
      });
    }

    // Set up subscription change listener for v5.x API
    // This will fire when the Player ID becomes available
    if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
      const user = OneSignal.OneSignal.User;
      if (user.pushSubscription && typeof user.pushSubscription.addEventListener === 'function') {
        user.pushSubscription.addEventListener('change', async (event: any) => {
          // Try to get Player ID from the event or directly
          let playerId: string | null = null;

          if (event.current?.id) {
            playerId = event.current.id;
          } else if (typeof user.pushSubscription.getIdAsync === 'function') {
            try {
              playerId = await user.pushSubscription.getIdAsync();
            } catch (e) {
              // Ignore
            }
          }

          if (!playerId && typeof user.pushSubscription.getPushSubscriptionId === 'function') {
            try {
              playerId = user.pushSubscription.getPushSubscriptionId();
            } catch (e) {
              // Ignore
            }
          }

          if (playerId) {
            // Try to register with backend
            setTimeout(() => {
              registerDeviceWithBackend(false);
            }, 1000);
          }
        });
      }
    }

    isInitialized = true;
    // Register device with backend once we have a player ID
    // Try immediately, and also set up delayed retries
    await registerDeviceWithBackend();

    // Set up additional retries in case Player ID takes longer to generate
    // Retry after 3 seconds
    setTimeout(async () => {
      if (!isRegistering) {
        await registerDeviceWithBackend();
      }
    }, 3000);

    // Retry after 10 seconds as well
    setTimeout(async () => {
      if (!isRegistering) {
        await registerDeviceWithBackend();
      }
    }, 10000);
  } catch (error) {
    logger.error('❌ OneSignal initialization error:', 'SERVICE', error);
    throw error;
  }
};

/**
 * Get the current platform string for backend registration
 */
const getPlatformString = (): 'ios' | 'android' | 'web' => {
  if (Platform.OS === 'ios') {
    return 'ios';
  } else if (Platform.OS === 'android') {
    return 'android';
  } else {
    return 'web';
  }
};

/**
 * Register device with backend API
 * This should be called after user is authenticated
 */
export const registerDeviceWithBackend = async (forceRetry: boolean = false): Promise<boolean> => {
  try {
    if (isRegistering && !forceRetry) {
      return false;
    }

    if (!isInitialized) {
      logger.warn('⚠️ OneSignal not initialized yet. Skipping backend registration.', 'SERVICE');
      return false;
    }

    // Check registration attempts
    if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS && !forceRetry) {
      logger.warn('⚠️ Max registration attempts reached. Use forceRetry to try again.', 'SERVICE');
      return false;
    }

    // Check if OneSignal is available
    if (!OneSignalInstance) {
      logger.warn('⚠️ OneSignal instance not available', 'SERVICE');
      return false;
    }

    // Get the player ID from OneSignal
    let playerId: string | null = null;

    // Try v5.x API first - access through OneSignal.OneSignal.User.pushSubscription
    try {
      if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
        const user = OneSignal.OneSignal.User;
        if (user.pushSubscription) {
          // Use getIdAsync() (recommended, non-deprecated method)
          if (typeof user.pushSubscription.getIdAsync === 'function') {
            try {
              playerId = await user.pushSubscription.getIdAsync();
              if (playerId) {
              }
            } catch (e) {
              logger.warn('⚠️ getIdAsync() failed:', 'SERVICE', e);
            }
          }

          // Fallback to deprecated getPushSubscriptionId() if getIdAsync() didn't work
          if (!playerId && typeof user.pushSubscription.getPushSubscriptionId === 'function') {
            try {
              playerId = user.pushSubscription.getPushSubscriptionId();
              if (playerId) {
              }
            } catch (e) {
              logger.warn('⚠️ getPushSubscriptionId() failed:', 'SERVICE', e);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ v5.x API access failed:', 'SERVICE', error);
    }

    // Try getDeviceState as fallback
    if (!playerId) {
      try {
        if (typeof OneSignalInstance.getDeviceState === 'function') {
          const deviceState = await OneSignalInstance.getDeviceState();
          playerId = deviceState?.userId || null;
          if (playerId) {
          }
        }
      } catch (error) {
        logger.warn('⚠️ getDeviceState failed:', 'SERVICE', error);
      }
    }

    // Try alternative path
    if (!playerId && OneSignalInstance?.User?.pushSubscription?.id) {
      playerId = OneSignalInstance.User.pushSubscription.id;
    }

    if (!playerId) {
      logger.warn(
        '⚠️ OneSignal player ID not available yet. Will retry when available.',
        'SERVICE'
      );

      // Only add observer once
      if (!subscriptionObserverAdded) {
        subscriptionObserverAdded = true;

        // Try subscription observer - v5.x API
        if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
          const user = OneSignal.OneSignal.User;
          if (
            user.pushSubscription &&
            typeof user.pushSubscription.addEventListener === 'function'
          ) {
            user.pushSubscription.addEventListener('change', async (event: any) => {
              // Try to get Player ID
              let playerId: string | null = null;
              if (event.current?.id) {
                playerId = event.current.id;
              } else if (typeof user.pushSubscription.getIdAsync === 'function') {
                try {
                  playerId = await user.pushSubscription.getIdAsync();
                } catch (e) {
                  // Ignore
                }
              }

              if (!playerId && typeof user.pushSubscription.getPushSubscriptionId === 'function') {
                try {
                  playerId = user.pushSubscription.getPushSubscriptionId();
                } catch (e) {
                  // Ignore
                }
              }

              if (playerId && !isRegistering) {
                registerDeviceWithBackend(false);
              }
            });
          }
        }
        // Fallback to older API
        else if (OneSignalInstance.addSubscriptionObserver) {
          OneSignalInstance.addSubscriptionObserver((event: any) => {
            if (event.to?.userId && !isRegistering) {
              registerDeviceWithBackend(false);
            }
          });
        }
      }
      return false;
    }

    isRegistering = true;
    registrationAttempts++;
    logger.log(
      `📱 Registering OneSignal device with backend (attempt ${registrationAttempts}/${MAX_REGISTRATION_ATTEMPTS})...`,
      'ONESIGNAL',
      {
        playerId,
        platform: getPlatformString(),
      }
    );

    const platform = getPlatformString();

    // Make authenticated request to register device
    const response = await authenticatedRequest(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ONESIGNAL.REGISTER}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          player_id: playerId,
          platform,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('❌ OneSignal registration failed:', 'SERVICE', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      isRegistering = false;

      // Retry after delay if not max attempts
      if (registrationAttempts < MAX_REGISTRATION_ATTEMPTS) {
        setTimeout(() => registerDeviceWithBackend(false), 5000);
      }

      return false;
    }

    const data = await response.json();
    // Reset attempts on success
    registrationAttempts = 0;
    isRegistering = false;

    return true;
  } catch (error) {
    isRegistering = false;
    logger.error('❌ Error registering OneSignal device with backend:', 'SERVICE', error);

    // Retry after delay if not max attempts
    if (registrationAttempts < MAX_REGISTRATION_ATTEMPTS) {
      setTimeout(() => registerDeviceWithBackend(false), 5000);
    }

    return false;
  }
};

/**
 * Get list of registered players (for debugging)
 */
export const getRegisteredPlayers = async (): Promise<any> => {
  try {
    const response = await authenticatedRequest(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ONESIGNAL.PLAYERS}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get players: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('❌ Error getting registered players:', 'SERVICE', error);
    throw error;
  }
};

/**
 * Set OneSignal App ID (can be called before initialization)
 */
export const setOneSignalAppId = (appId: string): void => {
  oneSignalAppId = appId;
};

/**
 * Check if OneSignal is initialized
 */
export const isOneSignalInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Get current player ID
 */
export const getPlayerId = async (): Promise<string | null> => {
  try {
    if (!isInitialized || !OneSignalInstance) {
      return null;
    }

    // Try getDeviceState first
    try {
      if (typeof OneSignalInstance.getDeviceState === 'function') {
        const deviceState = await OneSignalInstance.getDeviceState();
        if (deviceState?.userId) {
          return deviceState.userId;
        }
      }
    } catch (error) {
      // Continue to try other methods
    }

    // Try v5.x API through OneSignal.OneSignal
    if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
      const user = OneSignal.OneSignal.User;
      if (user.pushSubscription) {
        // Use getIdAsync() (recommended, non-deprecated method)
        if (typeof user.pushSubscription.getIdAsync === 'function') {
          try {
            const id = await user.pushSubscription.getIdAsync();
            if (id) return id;
          } catch (e) {
            // Ignore
          }
        }
        // Fallback to deprecated getPushSubscriptionId() if getIdAsync() didn't work
        if (typeof user.pushSubscription.getPushSubscriptionId === 'function') {
          try {
            const id = user.pushSubscription.getPushSubscriptionId();
            if (id) return id;
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // Try alternative path
    if (OneSignalInstance?.User?.pushSubscription?.id) {
      return OneSignalInstance.User.pushSubscription.id;
    } else if (OneSignalInstance?.User?.pushSubscription?.getId) {
      const id = OneSignalInstance.User.pushSubscription.getId();
      return id || null;
    }

    return null;
  } catch (error) {
    logger.error('❌ Error getting player ID:', 'SERVICE', error);
    return null;
  }
};

/**
 * Force re-registration with backend (useful after login)
 */
export const forceRegisterDevice = async (): Promise<boolean> => {
  registrationAttempts = 0; // Reset attempts
  return await registerDeviceWithBackend(true);
};

/**
 * Update player activity (last_active timestamp)
 * Should be called when app comes to foreground or periodically
 * This is used by backend to determine if user is active (within 30 seconds)
 */
export const updatePlayerActivity = async (): Promise<boolean> => {
  try {
    if (!isInitialized) {
      logger.warn('⚠️ OneSignal not initialized, cannot update activity', 'SERVICE');
      return false;
    }

    // Get player ID
    const playerId = await getPlayerId();
    if (!playerId) {
      logger.warn('⚠️ Player ID not available, cannot update activity', 'SERVICE');
      return false;
    }

    // Call register endpoint to update last_active
    const platform = getPlatformString();
    const response = await authenticatedRequest(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ONESIGNAL.REGISTER}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          player_id: playerId,
          platform,
        }),
      }
    );

    if (response.ok) {
      logger.log('✅ Player activity updated', 'SERVICE');
      return true;
    } else {
      logger.warn('⚠️ Failed to update player activity:', 'SERVICE', response.status);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error updating player activity:', 'SERVICE', error);
    return false;
  }
};

/**
 * Debug function to check OneSignal status and Player ID
 * Call this from console: import { debugOneSignal } from './services/oneSignalService'; debugOneSignal();
 */
export const debugOneSignal = async (): Promise<void> => {
  if (OneSignal) {
    logger.log('  - OneSignal keys:', 'SERVICE', Object.keys(OneSignal));
  }

  if (OneSignalInstance) {
    logger.log(
      '  - Available methods:',
      'SERVICE',
      Object.keys(OneSignalInstance)
        .filter(key => typeof OneSignalInstance[key] === 'function')
        .slice(0, 10)
    );
  }
  try {
    // Try getDeviceState
    if (OneSignalInstance && typeof OneSignalInstance.getDeviceState === 'function') {
      const deviceState = await OneSignalInstance.getDeviceState();
      if (deviceState?.userId) {
      } else {
      }
    } else {
    }

    // Try User.pushSubscription through OneSignal.OneSignal
    if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
      const user = OneSignal.OneSignal.User;
      if (user.pushSubscription) {
        logger.log('  - pushSubscription keys:', 'SERVICE', Object.keys(user.pushSubscription));

        // Try getIdAsync() first (recommended, non-deprecated)
        if (typeof user.pushSubscription.getIdAsync === 'function') {
          try {
            const id = await user.pushSubscription.getIdAsync();
            if (id) {
            } else {
            }
          } catch (e) {}
        }

        // Fallback to deprecated getPushSubscriptionId() (synchronous)
        if (typeof user.pushSubscription.getPushSubscriptionId === 'function') {
          try {
            const id = user.pushSubscription.getPushSubscriptionId();
            if (id) {
            } else {
            }
          } catch (e) {}
        }
      } else {
      }
    } else if (OneSignalInstance?.User?.pushSubscription) {
      if (OneSignalInstance.User.pushSubscription.id) {
      } else {
      }
    } else {
    }

    // Try our getPlayerId function

    const playerId = await getPlayerId();
    if (playerId) {
    } else {
    }
  } catch (error) {
    logger.error('  - ❌ Error checking Player ID:', 'SERVICE', error);
  }
};

/**
 * Reset registration state (useful for testing or after logout)
 */
export const resetRegistrationState = (): void => {
  isRegistering = false;
  registrationAttempts = 0;
};

/**
 * Disable OneSignal push notifications (opt out)
 * This prevents notifications from being received when the app is closed
 */
export const disableOneSignalNotifications = async (): Promise<void> => {
  try {
    if (!OneSignalInstance) {
      logger.warn('⚠️ OneSignal instance not available, cannot disable notifications', 'SERVICE');
      return;
    }

    let disabled = false;

    // Method 1: v5.x API - disable push subscription
    if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
      const user = OneSignal.OneSignal.User;
      if (user.pushSubscription) {
        // Opt out of push notifications
        if (typeof user.pushSubscription.optOut === 'function') {
          try {
            await user.pushSubscription.optOut();
            logger.log('🔕 OneSignal notifications disabled (optOut)', 'SERVICE');
            disabled = true;
          } catch (e) {
            logger.warn('⚠️ optOut failed, trying alternative methods', 'SERVICE', e);
          }
        }
        // Alternative: set enabled to false
        if (!disabled && typeof user.pushSubscription.setOptedIn === 'function') {
          try {
            await user.pushSubscription.setOptedIn(false);
            logger.log('🔕 OneSignal notifications disabled (setOptedIn false)', 'SERVICE');
            disabled = true;
          } catch (e) {
            logger.warn('⚠️ setOptedIn(false) failed', 'SERVICE', e);
          }
        }
      }
    }

    // Method 2: Older API - disable notifications
    if (!disabled && typeof OneSignalInstance.disablePush === 'function') {
      try {
        OneSignalInstance.disablePush();
        logger.log('🔕 OneSignal notifications disabled (disablePush)', 'SERVICE');
        disabled = true;
      } catch (e) {
        logger.warn('⚠️ disablePush failed', 'SERVICE', e);
      }
    }

    // Method 3: Set subscription to false
    if (!disabled && typeof OneSignalInstance.setSubscription === 'function') {
      try {
        OneSignalInstance.setSubscription(false);
        logger.log('🔕 OneSignal notifications disabled (setSubscription false)', 'SERVICE');
        disabled = true;
      } catch (e) {
        logger.warn('⚠️ setSubscription(false) failed', 'SERVICE', e);
      }
    }

    // Method 4: Disable notifications via Notifications API (v5.x)
    if (!disabled && OneSignalInstance.Notifications) {
      try {
        if (
          typeof OneSignalInstance.Notifications.setNotificationWillShowInForegroundHandler ===
          'function'
        ) {
          // Set handler to suppress notifications
          OneSignalInstance.Notifications.setNotificationWillShowInForegroundHandler(() => {
            // Suppress notification
            return null;
          });
          logger.log('🔕 OneSignal notifications disabled (foreground handler)', 'SERVICE');
          disabled = true;
        }
      } catch (e) {
        logger.warn('⚠️ Notifications API disable failed', 'SERVICE', e);
      }
    }

    if (!disabled) {
      logger.warn(
        '⚠️ Could not disable OneSignal notifications - no working method found',
        'SERVICE'
      );
    }
  } catch (error) {
    logger.error('❌ Error disabling OneSignal notifications:', 'SERVICE', error);
  }
};

/**
 * Enable OneSignal push notifications (opt in)
 * This allows notifications to be received when the app is closed
 */
export const enableOneSignalNotifications = async (): Promise<void> => {
  try {
    if (!OneSignalInstance) {
      logger.warn('⚠️ OneSignal instance not available, cannot enable notifications', 'SERVICE');
      return;
    }

    let enabled = false;

    // Method 1: v5.x API - enable push subscription
    if (OneSignal && OneSignal.OneSignal && OneSignal.OneSignal.User) {
      const user = OneSignal.OneSignal.User;
      if (user.pushSubscription) {
        // Opt in to push notifications
        if (typeof user.pushSubscription.optIn === 'function') {
          try {
            await user.pushSubscription.optIn();
            logger.log('🔔 OneSignal notifications enabled (optIn)', 'SERVICE');
            enabled = true;
          } catch (e) {
            logger.warn('⚠️ optIn failed, trying alternative methods', 'SERVICE', e);
          }
        }
        // Alternative: set enabled to true
        if (!enabled && typeof user.pushSubscription.setOptedIn === 'function') {
          try {
            await user.pushSubscription.setOptedIn(true);
            logger.log('🔔 OneSignal notifications enabled (setOptedIn true)', 'SERVICE');
            enabled = true;
          } catch (e) {
            logger.warn('⚠️ setOptedIn(true) failed', 'SERVICE', e);
          }
        }
      }
    }

    // Method 2: Older API - enable notifications
    if (!enabled && typeof OneSignalInstance.enablePush === 'function') {
      try {
        OneSignalInstance.enablePush();
        logger.log('🔔 OneSignal notifications enabled (enablePush)', 'SERVICE');
        enabled = true;
      } catch (e) {
        logger.warn('⚠️ enablePush failed', 'SERVICE', e);
      }
    }

    // Method 3: Set subscription to true
    if (!enabled && typeof OneSignalInstance.setSubscription === 'function') {
      try {
        OneSignalInstance.setSubscription(true);
        logger.log('🔔 OneSignal notifications enabled (setSubscription true)', 'SERVICE');
        enabled = true;
      } catch (e) {
        logger.warn('⚠️ setSubscription(true) failed', 'SERVICE', e);
      }
    }

    if (!enabled) {
      logger.warn(
        '⚠️ Could not enable OneSignal notifications - no working method found',
        'SERVICE'
      );
    }
  } catch (error) {
    logger.error('❌ Error enabling OneSignal notifications:', 'SERVICE', error);
  }
};

export default {
  initializeOneSignal,
  registerDeviceWithBackend,
  getRegisteredPlayers,
  setOneSignalAppId,
  isOneSignalInitialized,
  getPlayerId,
  forceRegisterDevice,
  resetRegistrationState,
  debugOneSignal,
  disableOneSignalNotifications,
  enableOneSignalNotifications,
  updatePlayerActivity,
};
