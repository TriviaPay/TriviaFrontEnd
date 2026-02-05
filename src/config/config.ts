/**
 * Config - TypeScript Implementation
 * Professional configuration with comprehensive features
 * All secrets loaded from environment variables
 */

import { ENV_CONFIG } from './env';

const __DEV__ = process.env.NODE_ENV === 'development';

export const API_BASE_URL = ENV_CONFIG.API_BASE_URL;

export interface AppConfig {
  enableLogging: boolean;
  enableDebugMode: boolean;
  apiTimeout: number;
}

export const APP_CONFIG: AppConfig = {
  enableLogging: __DEV__,
  enableDebugMode: __DEV__,
  apiTimeout: 10000,
};

export interface DailyRewardsConfig {
  showResetButton: boolean;
  enableTestMode: boolean;
}

export const DAILY_REWARDS_CONFIG: DailyRewardsConfig = {
  showResetButton: __DEV__,
  enableTestMode: __DEV__,
};

/**
 * Pusher Configuration
 * Get these values from your Pusher Dashboard: https://dashboard.pusher.com/
 *
 * PUSHER_KEY: Your Pusher App Key (public key, safe to expose in client)
 * PUSHER_CLUSTER: Your Pusher cluster (e.g., 'us2', 'eu', 'ap-southeast-1')
 */
export interface PusherConfig {
  key: string;
  cluster: string;
}

export const PUSHER_CONFIG: PusherConfig = {
  // Pusher App Key (from dashboard) - loaded from environment variables
  key: ENV_CONFIG.PUSHER_KEY || '',

  // Pusher Cluster (from dashboard) - loaded from environment variables
  cluster: ENV_CONFIG.PUSHER_CLUSTER || 'mt1',
};

/**
 * OneSignal Configuration
 * Get your App ID from OneSignal Dashboard: https://app.onesignal.com/
 *
 * ONESIGNAL_APP_ID: Your OneSignal App ID
 * Set this via environment variable: ONESIGNAL_APP_ID or EXPO_PUBLIC_ONESIGNAL_APP_ID
 */
export interface OneSignalConfig {
  appId: string | null;
}

export const ONESIGNAL_CONFIG: OneSignalConfig = {
  // OneSignal App ID (from dashboard) - loaded from environment variables
  appId: ENV_CONFIG.ONESIGNAL_APP_ID || null,
};
