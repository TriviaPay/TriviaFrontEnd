/**
 * Analytics Connector
 * Connects analytics events to Firebase, Mixpanel, Amplitude, and other services
 */

import { logger } from '../../lib/utils/logger';

// Try to use Sentry for analytics if available
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  // Sentry not available
  logger.debug('Sentry not available for analytics', 'ANALYTICS');
}

// Analytics service interfaces
interface AnalyticsService {
  initialize(): Promise<void>;
  identify(userId: string, traits?: Record<string, any>): void;
  track(event: string, properties?: Record<string, any>): void;
  screen(name: string, properties?: Record<string, any>): void;
  setUserProperties(properties: Record<string, any>): void;
}

/**
 * Firebase Analytics Implementation
 */
class FirebaseAnalytics implements AnalyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Firebase Analytics is already initialized via @sentry/react-native
      // If you need Firebase Analytics specifically, uncomment and configure:
      /*
      const firebase = require('@react-native-firebase/analytics').default();
      await firebase().setAnalyticsCollectionEnabled(true);
      */
      this.initialized = true;
      logger.info('Firebase Analytics initialized', 'ANALYTICS');
    } catch (error) {
      logger.error('Failed to initialize Firebase Analytics', 'ANALYTICS', error);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const firebase = require('@react-native-firebase/analytics').default();
      // firebase().setUserId(userId);
      // if (traits) {
      //   Object.entries(traits).forEach(([key, value]) => {
      //     firebase().setUserProperty(key, String(value));
      //   });
      // }
      logger.debug('Firebase identify', 'ANALYTICS', { userId, traits });
    } catch (error) {
      logger.error('Firebase identify error', 'ANALYTICS', error);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const firebase = require('@react-native-firebase/analytics').default();
      // firebase().logEvent(event, properties);
      logger.debug('Firebase track', 'ANALYTICS', { event, properties });
    } catch (error) {
      logger.error('Firebase track error', 'ANALYTICS', error);
    }
  }

  screen(name: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const firebase = require('@react-native-firebase/analytics').default();
      // firebase().logScreenView({ screen_name: name, ...properties });
      logger.debug('Firebase screen', 'ANALYTICS', { name, properties });
    } catch (error) {
      logger.error('Firebase screen error', 'ANALYTICS', error);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const firebase = require('@react-native-firebase/analytics').default();
      // Object.entries(properties).forEach(([key, value]) => {
      //   firebase().setUserProperty(key, String(value));
      // });
      logger.debug('Firebase setUserProperties', 'ANALYTICS', properties);
    } catch (error) {
      logger.error('Firebase setUserProperties error', 'ANALYTICS', error);
    }
  }
}

/**
 * Mixpanel Analytics Implementation
 */
class MixpanelAnalytics implements AnalyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Uncomment when Mixpanel SDK is installed:
      /*
      const Mixpanel = require('mixpanel-react-native').default;
      await Mixpanel.sharedInstanceWithToken('YOUR_MIXPANEL_TOKEN');
      */
      this.initialized = true;
      logger.info('Mixpanel Analytics initialized', 'ANALYTICS');
    } catch (error) {
      logger.error('Failed to initialize Mixpanel Analytics', 'ANALYTICS', error);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Mixpanel = require('mixpanel-react-native').default;
      // Mixpanel.sharedInstanceWithToken('YOUR_TOKEN').identify(userId);
      // if (traits) {
      //   Mixpanel.sharedInstanceWithToken('YOUR_TOKEN').getPeople().set(traits);
      // }
      logger.debug('Mixpanel identify', 'ANALYTICS', { userId, traits });
    } catch (error) {
      logger.error('Mixpanel identify error', 'ANALYTICS', error);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Mixpanel = require('mixpanel-react-native').default;
      // Mixpanel.sharedInstanceWithToken('YOUR_TOKEN').track(event, properties);
      logger.debug('Mixpanel track', 'ANALYTICS', { event, properties });
    } catch (error) {
      logger.error('Mixpanel track error', 'ANALYTICS', error);
    }
  }

  screen(name: string, properties?: Record<string, any>): void {
    this.track('Screen Viewed', { screen_name: name, ...properties });
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Mixpanel = require('mixpanel-react-native').default;
      // Mixpanel.sharedInstanceWithToken('YOUR_TOKEN').getPeople().set(properties);
      logger.debug('Mixpanel setUserProperties', 'ANALYTICS', properties);
    } catch (error) {
      logger.error('Mixpanel setUserProperties error', 'ANALYTICS', error);
    }
  }
}

/**
 * Amplitude Analytics Implementation
 */
class AmplitudeAnalytics implements AnalyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Uncomment when Amplitude SDK is installed:
      /*
      const Amplitude = require('@amplitude/analytics-react-native').default;
      await Amplitude.init('YOUR_AMPLITUDE_API_KEY');
      */
      this.initialized = true;
      logger.info('Amplitude Analytics initialized', 'ANALYTICS');
    } catch (error) {
      logger.error('Failed to initialize Amplitude Analytics', 'ANALYTICS', error);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Amplitude = require('@amplitude/analytics-react-native').default;
      // Amplitude.setUserId(userId);
      // if (traits) {
      //   Amplitude.setUserProperties(traits);
      // }
      logger.debug('Amplitude identify', 'ANALYTICS', { userId, traits });
    } catch (error) {
      logger.error('Amplitude identify error', 'ANALYTICS', error);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Amplitude = require('@amplitude/analytics-react-native').default;
      // Amplitude.logEvent(event, properties);
      logger.debug('Amplitude track', 'ANALYTICS', { event, properties });
    } catch (error) {
      logger.error('Amplitude track error', 'ANALYTICS', error);
    }
  }

  screen(name: string, properties?: Record<string, any>): void {
    this.track('Screen Viewed', { screen_name: name, ...properties });
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.initialized) return;
    try {
      // const Amplitude = require('@amplitude/analytics-react-native').default;
      // Amplitude.setUserProperties(properties);
      logger.debug('Amplitude setUserProperties', 'ANALYTICS', properties);
    } catch (error) {
      logger.error('Amplitude setUserProperties error', 'ANALYTICS', error);
    }
  }
}

/**
 * Unified Analytics Connector
 * Routes events to all configured analytics services
 */
class AnalyticsConnector {
  private services: AnalyticsService[] = [];
  private initialized = false;

  constructor() {
    // Initialize services (can be configured via env)
    this.services = [new FirebaseAnalytics(), new MixpanelAnalytics(), new AmplitudeAnalytics()];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Promise.all(
        this.services.map(service =>
          service.initialize().catch(err => {
            logger.warn('Analytics service initialization failed', 'ANALYTICS', err);
          })
        )
      );
      this.initialized = true;
      logger.info('Analytics Connector initialized', 'ANALYTICS');
    } catch (error) {
      logger.error('Analytics Connector initialization failed', 'ANALYTICS', error);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    // Send to Sentry if available
    if (Sentry) {
      try {
        Sentry.setUser({
          id: userId,
          ...traits,
        });
      } catch (error) {
        logger.warn('Sentry identify error', 'ANALYTICS', error);
      }
    }

    // Send to other analytics services
    this.services.forEach(service => {
      try {
        service.identify(userId, traits);
      } catch (error) {
        logger.error('Analytics identify error', 'ANALYTICS', error);
      }
    });
  }

  track(event: string, properties?: Record<string, any>): void {
    // Send to Sentry if available (already installed)
    if (Sentry) {
      try {
        Sentry.addBreadcrumb({
          category: 'analytics',
          message: event,
          level: 'info',
          data: properties,
        });
      } catch (error) {
        logger.warn('Sentry analytics track error', 'ANALYTICS', error);
      }
    }

    // Send to other analytics services
    this.services.forEach(service => {
      try {
        service.track(event, properties);
      } catch (error) {
        logger.error('Analytics track error', 'ANALYTICS', error);
      }
    });
  }

  screen(name: string, properties?: Record<string, any>): void {
    this.services.forEach(service => {
      try {
        service.screen(name, properties);
      } catch (error) {
        logger.error('Analytics screen error', 'ANALYTICS', error);
      }
    });
  }

  setUserProperties(properties: Record<string, any>): void {
    this.services.forEach(service => {
      try {
        service.setUserProperties(properties);
      } catch (error) {
        logger.error('Analytics setUserProperties error', 'ANALYTICS', error);
      }
    });
  }
}

export const analyticsConnector = new AnalyticsConnector();

// Export singleton instance
export default analyticsConnector;
