/**
 * Analytics Service
 * Centralized analytics tracking
 */

import { BaseService } from '../services/BaseService';
import { isProduction, getEnvironment } from '../../config/environments';
import { logger } from '../../lib/utils/logger';
import analyticsConnector from './AnalyticsConnector';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: number;
}

export interface AnalyticsUser {
  id: string;
  email?: string;
  username?: string;
  properties?: Record<string, unknown>;
}

/**
 * Analytics Service
 * Handles all analytics tracking
 */
export class AnalyticsService extends BaseService {
  private static instance: AnalyticsService;
  private userId: string | null = null;
  private userProperties: Record<string, unknown> = {};
  private enabled: boolean = false;

  private constructor() {
    super();
    this.enabled = isProduction() || process.env.ENABLE_ANALYTICS === 'true';
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  protected async onInitialize(): Promise<void> {
    if (!this.enabled) {
      logger.debug('Analytics disabled', 'ANALYTICS');
      return;
    }

    try {
      // Initialize unified analytics connector (handles Firebase, Mixpanel, Amplitude)
      await analyticsConnector.initialize();

      logger.debug('Analytics initialized', 'ANALYTICS');
    } catch (error) {
      logger.warn('Analytics initialization failed (non-critical)', 'ANALYTICS', error);
      // Don't block app initialization if analytics fails
    }
  }

  /**
   * Initialize Firebase Analytics
   */
  private async initializeFirebase(): Promise<void> {
    try {
      // Check if Firebase is available
      const firebase = require('@react-native-firebase/analytics');
      if (firebase && firebase.default) {
        await firebase.default.setAnalyticsCollectionEnabled(true);
        logger.debug('Firebase Analytics initialized', 'ANALYTICS');
      }
    } catch (error) {
      // Firebase not installed or not available - this is okay
      // Analytics will work without Firebase
    }
  }

  /**
   * Initialize Mixpanel
   */
  private async initializeMixpanel(): Promise<void> {
    try {
      // Check if Mixpanel is available
      const Mixpanel = require('mixpanel-react-native');
      if (Mixpanel && Mixpanel.default) {
        // Mixpanel initialization would go here
        // const mixpanel = Mixpanel.default.init('YOUR_MIXPANEL_TOKEN');
        logger.debug('Mixpanel initialized', 'ANALYTICS');
      }
    } catch (error) {
      // Mixpanel not installed or not available - this is okay
      // Analytics will work without Mixpanel
    }
  }

  protected async onCleanup(): Promise<void> {
    // Cleanup analytics resources
  }

  /**
   * Identify user
   */
  identify(user: AnalyticsUser): void {
    if (!this.enabled) return;

    this.userId = user.id;
    this.userProperties = { ...user.properties };

    // Send to unified analytics connector
    analyticsConnector.identify(user.id, {
      email: user.email,
      username: user.username,
      ...user.properties,
    });

    logger.debug(`User identified: ${user.id}`, 'ANALYTICS');
  }

  /**
   * Track event
   */
  track(event: AnalyticsEvent): void {
    if (!this.enabled) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      userId: this.userId || undefined,
      timestamp: event.timestamp || Date.now(),
    };

    // Send to unified analytics connector
    analyticsConnector.track(event.name, {
      ...event.properties,
      userId: this.userId,
      timestamp: fullEvent.timestamp,
    });

    if (!isProduction()) {
      logger.debug(`Event tracked: ${event.name}`, 'ANALYTICS', event.properties);
    }
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties?: Record<string, unknown>): void {
    // Use unified analytics connector for screen tracking
    analyticsConnector.screen(screenName, properties);

    // Also track as event for backward compatibility
    this.track({
      name: 'screen_view',
      properties: {
        screen_name: screenName,
        ...properties,
      },
    });
  }

  /**
   * Track user action
   */
  trackAction(action: string, properties?: Record<string, unknown>): void {
    this.track({
      name: 'user_action',
      properties: {
        action,
        ...properties,
      },
    });
  }

  /**
   * Track purchase/transaction
   */
  trackPurchase(amount: number, currency: string, items?: unknown[]): void {
    this.track({
      name: 'purchase',
      properties: {
        amount,
        currency,
        items,
      },
    });
  }

  /**
   * Set user property
   */
  setUserProperty(key: string, value: unknown): void {
    if (!this.enabled) return;

    this.userProperties[key] = value;

    // Send to unified analytics connector
    analyticsConnector.setUserProperties({ [key]: value });
  }

  /**
   * Reset user (on logout)
   */
  reset(): void {
    if (!this.enabled) return;

    this.userId = null;
    this.userProperties = {};

    // Reset analytics services
    try {
      // Firebase Analytics
      const firebase = require('@react-native-firebase/analytics');
      if (firebase && firebase.default) {
        firebase.default.resetAnalyticsData();
      }
    } catch (error) {
      // Firebase not available - continue
    }

    try {
      // Mixpanel
      const Mixpanel = require('mixpanel-react-native');
      if (Mixpanel && Mixpanel.default) {
        // Mixpanel reset would go here
        // mixpanel.reset();
      }
    } catch (error) {
      // Mixpanel not available - continue
    }
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && (isProduction() || process.env.ENABLE_ANALYTICS === 'true');
  }
}

export const analyticsService = AnalyticsService.getInstance();
