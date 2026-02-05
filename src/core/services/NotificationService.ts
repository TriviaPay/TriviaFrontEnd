/**
 * Notification Service
 * Push notification management (OneSignal)
 */

import { ENV_CONFIG } from '@config/env';
import { logger } from './Logger';

// Optional import - OneSignal may not be installed
let OneSignal: any = null;
let OneSignalInstance: any = null;
try {
  const OneSignalModule = require('react-native-onesignal');
  // Handle different export patterns
  OneSignal = OneSignalModule.default || OneSignalModule || OneSignalModule.OneSignal;

  // The actual OneSignal instance is at OneSignal.OneSignal (based on v5.x structure)
  if (OneSignal && OneSignal.OneSignal) {
    OneSignalInstance = OneSignal.OneSignal;
  } else {
    OneSignalInstance = OneSignal;
  }
} catch (error) {
  logger.debug('OneSignal SDK not installed - notifications will be disabled', 'NOTIFICATIONS');
}

class NotificationService {
  private initialized = false;

  /**
   * Initialize OneSignal
   */
  init() {
    if (this.initialized || !ENV_CONFIG.ONESIGNAL_APP_ID) return;

    if (!OneSignal || !OneSignalInstance) {
      logger.debug('OneSignal not available - skipping initialization', 'NOTIFICATIONS');
      return;
    }

    try {
      // Try different initialization methods based on version
      let initialized = false;

      // Method 1: Use OneSignal instance's setAppId
      if (typeof OneSignalInstance.setAppId === 'function') {
        OneSignalInstance.setAppId(ENV_CONFIG.ONESIGNAL_APP_ID);
        initialized = true;
      }
      // Method 2: v5.x initialize on instance
      else if (typeof OneSignalInstance.initialize === 'function') {
        OneSignalInstance.initialize(ENV_CONFIG.ONESIGNAL_APP_ID);
        initialized = true;
      }
      // Method 3: Direct property assignment
      else if (OneSignalInstance && typeof OneSignalInstance === 'object') {
        try {
          (OneSignalInstance as any).appId = ENV_CONFIG.ONESIGNAL_APP_ID;
          initialized = true;
        } catch (e) {
          logger.debug('Direct assignment failed', 'NOTIFICATIONS', e);
        }
      }

      if (!initialized) {
        logger.debug('OneSignal initialization method not found', 'NOTIFICATIONS');
        return;
      }

      // Request permission for push notifications
      try {
        if (OneSignalInstance.promptForPushNotificationsWithUserResponse) {
          OneSignalInstance.promptForPushNotificationsWithUserResponse();
        } else if (
          OneSignalInstance.Notifications &&
          typeof OneSignalInstance.Notifications.requestPermission === 'function'
        ) {
          OneSignalInstance.Notifications.requestPermission(true);
        }
      } catch (permError) {
        logger.debug('Push notification permission error', 'NOTIFICATIONS', permError);
      }

      // Set notification handlers
      this.setupHandlers();

      this.initialized = true;
      logger.info('OneSignal initialized', 'NOTIFICATIONS');
    } catch (error) {
      logger.error('Failed to initialize OneSignal', 'NOTIFICATIONS', error);
    }
  }

  /**
   * Setup notification handlers
   */
  private setupHandlers() {
    if (!OneSignalInstance) return;

    // Handle notification opened
    if (OneSignalInstance.setNotificationOpenedHandler) {
      OneSignalInstance.setNotificationOpenedHandler((result: any) => {
        logger.info('Notification opened', 'NOTIFICATIONS', result);
        // Handle navigation based on notification data
      });
    } else if (
      OneSignalInstance.Notifications &&
      OneSignalInstance.Notifications.addEventListener
    ) {
      OneSignalInstance.Notifications.addEventListener('click', (event: any) => {
        logger.info('Notification clicked', 'NOTIFICATIONS', event);
      });
    }

    // Handle notification received (foreground)
    if (OneSignalInstance.setNotificationWillShowInForegroundHandler) {
      OneSignalInstance.setNotificationWillShowInForegroundHandler(
        (notificationReceivedEvent: any) => {
          logger.info('Notification received', 'NOTIFICATIONS');
          notificationReceivedEvent.complete(notificationReceivedEvent.getNotification());
        }
      );
    } else if (
      OneSignalInstance.Notifications &&
      OneSignalInstance.Notifications.addEventListener
    ) {
      OneSignalInstance.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        logger.info('Notification received in foreground', 'NOTIFICATIONS');
        event.getNotification();
      });
    }
  }

  /**
   * Set user ID
   */
  setExternalUserId(userId: string) {
    if (!this.initialized || !OneSignalInstance) return;
    if (typeof OneSignalInstance.setExternalUserId === 'function') {
      OneSignalInstance.setExternalUserId(userId);
    }
  }

  /**
   * Remove user ID
   */
  removeExternalUserId() {
    if (!this.initialized || !OneSignalInstance) return;
    if (typeof OneSignalInstance.removeExternalUserId === 'function') {
      OneSignalInstance.removeExternalUserId();
    }
  }

  /**
   * Send tag
   */
  sendTag(key: string, value: string) {
    if (!this.initialized || !OneSignalInstance) return;
    if (typeof OneSignalInstance.sendTag === 'function') {
      OneSignalInstance.sendTag(key, value);
    }
  }
}

export const notificationService = new NotificationService();
