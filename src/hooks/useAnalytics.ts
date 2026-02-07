/**
 * Analytics Hook
 * Provides easy access to analytics tracking in components
 */

import { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { analyticsService } from '../core/analytics/AnalyticsService';

/**
 * Track screen view on mount
 */
export const useTrackScreenView = (
  screenName?: string,
  properties?: Record<string, unknown>
): void => {
  const route = useRoute();

  useEffect(() => {
    const name = screenName || route.name;
    analyticsService.trackScreenView(name, properties);
  }, [screenName, route.name]);
};

/**
 * Track event helper
 */
export const useAnalytics = () => {
  return {
    trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
      analyticsService.track({
        name: eventName,
        properties,
      });
    },
    trackAction: (action: string, properties?: Record<string, unknown>) => {
      analyticsService.trackAction(action, properties);
    },
    trackPurchase: (amount: number, currency: string, items?: unknown[]) => {
      analyticsService.trackPurchase(amount, currency, items);
    },
  };
};
