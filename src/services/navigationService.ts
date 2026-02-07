/**
 * Navigation Service
 * Provides global navigation access for notification handlers and other services
 */

import { NavigationContainerRef } from '@react-navigation/native';
import { logger } from '../lib/utils/logger';

// Global navigation ref
let navigationRef: NavigationContainerRef<any> | null = null;

/**
 * Set the navigation ref (called from App.tsx)
 */
export const setNavigationRef = (ref: NavigationContainerRef<any> | null): void => {
  navigationRef = ref;
  if (ref) {
    logger.log('✅ Navigation ref set', 'NAVIGATION');
  }
};

/**
 * Get the navigation ref
 */
export const getNavigationRef = (): NavigationContainerRef<any> | null => {
  return navigationRef;
};

/**
 * Navigate using the global navigation ref
 */
export const navigate = (name: string, params?: any): void => {
  logger.debug(`🔵 [NAVIGATION SERVICE] navigate(${name}) called`, 'NAVIGATION', { params });

  if (navigationRef?.isReady()) {
    try {
      navigationRef.navigate(name as any, params as any);
      logger.log(`🧭 Navigated to: ${name}`, 'NAVIGATION', params);
    } catch (error) {
      logger.error(`❌ Navigation error to ${name}:`, 'NAVIGATION', error);
    }
  } else {
    console.warn('⚠️ [NAVIGATION SERVICE] Navigation ref not ready');
    logger.warn('⚠️ Navigation ref not ready', 'NAVIGATION');
  }
};

export default {
  setNavigationRef,
  getNavigationRef,
  navigate,
};
