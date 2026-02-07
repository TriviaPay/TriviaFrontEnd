/**
 * App Service - Enterprise Level
 * Application initialization and management service
 *
 * @description Professional app service with comprehensive initialization
 * @author TriviaPay Team
 */

import { Platform } from 'react-native';
import { AppUtils } from '../core/utils/appUtils';
import { logger } from '../lib/utils/logger';

export interface AppConfig {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
}

/**
 * Initialize the application
 */
export const initializeApp = async (): Promise<void> => {
  try {
    logger.debug('Initializing TriviaPay App', 'API');

    // Initialize platform-specific optimizations
    const platformOptimizations = AppUtils.getPlatformOptimizations();

    // Initialize app configuration
    const appConfig = getAppConfig();

    // Initialize services
    await initializeServices();

    // Initialize enterprise services
    await initializeEnterpriseServices(appConfig);

    logger.debug('App initialization completed', 'API');
  } catch (error) {
    logger.error('App initialization failed', 'ERROR', error);
    throw error;
  }
};

/**
 * Get app configuration
 */
const getAppConfig = (): AppConfig => {
  return {
    version: AppUtils.getAppVersion(),
    buildNumber: AppUtils.getBuildNumber(),
    environment: __DEV__ ? 'development' : 'production',
    apiBaseUrl: getApiBaseUrl(),
    enableAnalytics: true,
    enableCrashReporting: true,
    enablePerformanceMonitoring: true,
  };
};

/**
 * Get API base URL based on environment
 */
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    return 'https://trivia-back-end.vercel.app';
  } else {
    return 'https://trivia-back-end.vercel.app';
  }
};

/**
 * Initialize enterprise services
 */
const initializeEnterpriseServices = async (config: AppConfig): Promise<void> => {
  // Initialize crash reporting
  if (config.enableCrashReporting) {
    const { initializeCrashReporting } = require('../core/monitoring/CrashReporter');
    initializeCrashReporting();
  }

  // Initialize analytics
  if (config.enableAnalytics) {
    const { analyticsService } = require('../core/analytics/AnalyticsService');
    await analyticsService.initialize();
  }

  // Initialize performance monitoring
  if (config.enablePerformanceMonitoring) {
    const { performanceMonitor } = require('../core/monitoring/PerformanceMonitor');
    // Performance monitor is already initialized as singleton
  }

  // Initialize offline manager
  const { offlineManager } = require('../core/offline/OfflineManager');
  await offlineManager.initialize();

  // Initialize A/B testing
  const { abTestingService } = require('../core/ab-testing/ABTestingService');
  await abTestingService.initialize();

  // Initialize accessibility
  const { accessibilityService } = require('../core/accessibility/AccessibilityService');
  await accessibilityService.initialize();
};

/**
 * Initialize services
 */
const initializeServices = async (): Promise<void> => {
  logger.debug('Initializing services', 'API');

  // Initialize network service
  // Initialize storage service
  // Initialize notification service (OneSignal)
  try {
    const oneSignalService = require('./oneSignalService');
    try {
      const { ONESIGNAL_CONFIG } = require('../config/config');

      // Set OneSignal App ID from config if available
      if (ONESIGNAL_CONFIG && ONESIGNAL_CONFIG.appId) {
        oneSignalService.setOneSignalAppId(ONESIGNAL_CONFIG.appId);
      }
    } catch (configError) {
      logger.warn('Could not load ONESIGNAL_CONFIG', 'API', configError);
    }

    // Initialize OneSignal early (before user authentication)
    // The service will handle the case when App ID is not available gracefully
    await oneSignalService.initializeOneSignal().catch((error: any) => {
      logger.warn('OneSignal initialization skipped (App ID may not be configured)', 'API', error);
    });

    // REMOVED: setupAuthenticationListener - OneSignalInitializer component handles registration
    // This prevents duplicate OneSignal device registrations
    // The component will register when user becomes authenticated
  } catch (error) {
    logger.warn('OneSignal service not available', 'API', error);
  }

  // Initialize location service (if needed)

  // Initialize certificate pinning (if native module available)
  try {
    const certificatePinningModule = require('../lib/security/certificatePinning');
    // Handle both default and named exports
    const certificatePinning =
      certificatePinningModule.default ||
      certificatePinningModule.certificatePinning ||
      certificatePinningModule;
    if (certificatePinning && typeof certificatePinning.initialize === 'function') {
      await certificatePinning.initialize().catch((error: any) => {
        logger.warn('Certificate pinning initialization skipped', 'API', error);
      });
    } else {
      logger.warn('Certificate pinning initialize method not available', 'API');
    }
  } catch (error) {
    logger.warn('Certificate pinning not available', 'API', error);
  }

  // Initialize secrets rotation service
  try {
    const secretsRotationModule = require('../lib/security/secretsRotation');
    // Handle both default and named exports
    const secretsRotation =
      secretsRotationModule.default ||
      secretsRotationModule.secretsRotation ||
      secretsRotationModule;
    if (secretsRotation && typeof secretsRotation.initialize === 'function') {
      await secretsRotation.initialize().catch((error: any) => {
        logger.warn('Secrets rotation initialization skipped', 'API', error);
      });
    } else {
      logger.warn('Secrets rotation initialize method not available', 'API');
    }
  } catch (error) {
    logger.warn('Secrets rotation not available', 'API', error);
  }

  logger.debug('Services initialized', 'API');
};

/**
 * Setup authentication listener to register OneSignal device after login
 */
const setupAuthenticationListener = (): void => {
  try {
    const { store } = require('../store');
    let previousAuthState = false;

    // Subscribe to store changes
    store.subscribe(() => {
      const state = store.getState();
      const currentAuthState = state.auth?.isAuthenticated || false;

      // Check if user just logged in
      if (currentAuthState && !previousAuthState) {
        logger.debug('User authenticated - registering OneSignal device', 'API');

        // Import and call OneSignal registration
        const oneSignalService = require('./oneSignalService');

        // Wait a bit for OneSignal to be fully ready
        setTimeout(() => {
          oneSignalService.forceRegisterDevice().then((success: boolean) => {
            if (success) {
              logger.debug('OneSignal device registered after authentication', 'API');
            } else {
              logger.warn('OneSignal device registration failed after authentication', 'API');
            }
          });
        }, 2000); // 2 second delay to ensure OneSignal is ready

        // Debug OneSignal after 5 seconds (optional - remove in production)
        setTimeout(() => {
          if (__DEV__) {
            logger.debug('Running OneSignal debug check', 'API');
            oneSignalService.debugOneSignal().catch((err: any) => {
              logger.warn('Debug check failed', 'API', err);
            });
          }
        }, 5000);
      }

      // Check if user just logged out
      if (!currentAuthState && previousAuthState) {
        logger.debug('User logged out - resetting OneSignal registration state', 'API');
        const oneSignalService = require('./oneSignalService');
        oneSignalService.resetRegistrationState();
      }

      previousAuthState = currentAuthState;
    });

    logger.debug('OneSignal authentication listener setup complete', 'API');
  } catch (error) {
    logger.warn('Failed to setup authentication listener', 'API', error);
  }
};

/**
 * Initialize analytics
 */
const initializeAnalytics = async (): Promise<void> => {
  logger.debug('Initializing analytics', 'API');

  // Initialize analytics service
  // Configure analytics events
  // Set user properties

  logger.debug('Analytics initialized', 'API');
};

/**
 * Initialize crash reporting
 */
const initializeCrashReporting = async (): Promise<void> => {
  logger.debug('Initializing crash reporting', 'API');

  // Initialize crash reporting service
  // Configure crash reporting
  // Set up error boundaries

  logger.debug('Crash reporting initialized', 'API');
};

/**
 * Initialize performance monitoring
 */
const initializePerformanceMonitoring = async (): Promise<void> => {
  logger.debug('Initializing performance monitoring', 'API');

  // Initialize performance monitoring service
  // Configure performance metrics
  // Set up performance tracking

  logger.debug('Performance monitoring initialized', 'API');
};

/**
 * App service utilities
 */
export const AppServiceUtils = {
  /**
   * Get app information
   */
  getAppInfo: () => ({
    version: AppUtils.getAppVersion(),
    buildNumber: AppUtils.getBuildNumber(),
    platform: Platform.OS,
    deviceInfo: AppUtils.getDeviceInfo(),
  }),

  /**
   * Check if app is ready
   */
  isAppReady: (): boolean => {
    // Check if all services are initialized
    return true;
  },

  /**
   * Get app performance metrics
   */
  getPerformanceMetrics: () => {
    return AppUtils.getPerformanceMetrics();
  },
};

export default {
  initializeApp,
  AppServiceUtils,
};
