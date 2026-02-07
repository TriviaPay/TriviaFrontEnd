/**
 * Sentry Service
 * Error tracking and monitoring
 */

import * as Sentry from '@sentry/react-native';
import { ENV_CONFIG } from '@config/env';

class SentryService {
  private initialized = false;

  /**
   * Initialize Sentry
   */
  init() {
    // Get SENTRY_DSN from ENV_CONFIG (optional)
    const sentryDsn = ENV_CONFIG.SENTRY_DSN || process.env.SENTRY_DSN || '';

    if (this.initialized || !sentryDsn) {
      // Sentry is optional - don't initialize if DSN is not provided
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: ENV_CONFIG.ENVIRONMENT,
        tracesSampleRate: ENV_CONFIG.isDevelopment ? 1.0 : 0.2,
        enableAutoSessionTracking: true,
        enableNative: true,
        enableNativeCrashHandling: true,
      });

      this.initialized = true;
    } catch (error) {
      // Silently fail if Sentry initialization fails
      console.warn('Sentry initialization failed:', error);
    }
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;

    if (context) {
      Sentry.setContext('extra', context);
    }

    Sentry.captureException(error);
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return;
    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, username?: string) {
    if (!this.initialized) return;
    Sentry.setUser({ id: userId, email, username });
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }
}

export const sentryService = new SentryService();
