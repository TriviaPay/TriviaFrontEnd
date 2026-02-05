/**
 * Environment Configuration
 * Environment-specific configurations
 */

import { ENV_CONFIG } from './env';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  name: Environment;
  apiBaseUrl: string;
  enableLogging: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enableDebugMode: boolean;
  pusherCluster: string;
  onesignalAppId: string | null;
}

/**
 * Get current environment
 */
export const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'test') return 'test';
  if (process.env.APP_ENV === 'staging') return 'staging';
  if (process.env.APP_ENV === 'production' || env === 'production') return 'production';

  return 'development';
};

/**
 * Development environment configuration
 */
const developmentConfig: EnvironmentConfig = {
  name: 'development',
  apiBaseUrl: ENV_CONFIG.API_BASE_URL || 'https://trivia-back-end.vercel.app',
  enableLogging: true,
  enableAnalytics: false,
  enableCrashReporting: false,
  enableDebugMode: true,
  pusherCluster: ENV_CONFIG.PUSHER_CLUSTER || 'mt1',
  onesignalAppId: ENV_CONFIG.ONESIGNAL_APP_ID || null,
};

/**
 * Staging environment configuration
 */
const stagingConfig: EnvironmentConfig = {
  name: 'staging',
  apiBaseUrl: process.env.API_BASE_URL || 'https://staging-api.triviapay.com',
  enableLogging: true,
  enableAnalytics: true,
  enableCrashReporting: true,
  enableDebugMode: false,
  pusherCluster: ENV_CONFIG.PUSHER_CLUSTER || 'mt1',
  onesignalAppId: ENV_CONFIG.ONESIGNAL_APP_ID || null,
};

/**
 * Production environment configuration
 */
const productionConfig: EnvironmentConfig = {
  name: 'production',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.triviapay.com',
  enableLogging: false,
  enableAnalytics: true,
  enableCrashReporting: true,
  enableDebugMode: false,
  pusherCluster: ENV_CONFIG.PUSHER_CLUSTER || 'mt1',
  onesignalAppId: ENV_CONFIG.ONESIGNAL_APP_ID || null,
};

/**
 * Test environment configuration
 */
const testConfig: EnvironmentConfig = {
  name: 'test',
  apiBaseUrl: 'http://localhost:3000',
  enableLogging: false,
  enableAnalytics: false,
  enableCrashReporting: false,
  enableDebugMode: false,
  pusherCluster: 'mt1',
  onesignalAppId: null,
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = getEnvironment();

  switch (env) {
    case 'test':
      return testConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => getEnvironment() === 'development';

/**
 * Check if running in production
 */
export const isProduction = (): boolean => getEnvironment() === 'production';

/**
 * Check if running in test
 */
export const isTest = (): boolean => getEnvironment() === 'test';

/**
 * Check if running in staging
 */
export const isStaging = (): boolean => getEnvironment() === 'staging';
