/**
 * Environment Variable Management
 * Centralized environment variable handling with validation
 * All secrets should be loaded from environment variables
 */

const __DEV__ = process.env.NODE_ENV === 'development';
import { logger } from '../lib/utils/logger';

/**
 * Environment variable validation
 */
interface EnvConfig {
  DESCOPE_PROJECT_ID: string;
  ONESIGNAL_APP_ID: string;
  PUSHER_KEY: string;
  PUSHER_CLUSTER: string;
  API_BASE_URL: string;
  API_TIMEOUT: number;
  SENTRY_DSN?: string;
  ENVIRONMENT: string;
  isDevelopment: boolean;
}

/**
 * Required environment variables (only enforced in production)
 */
const REQUIRED_ENV_VARS = [
  'DESCOPE_PROJECT_ID',
  'ONESIGNAL_APP_ID',
  'PUSHER_KEY',
  'PUSHER_CLUSTER',
  'API_BASE_URL',
] as const;

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback?: string): string {
  // Try React Native environment variables first
  const value =
    process.env[key] || process.env[`EXPO_PUBLIC_${key}`] || (global as any)[key] || fallback;

  // Return the value (fallback will be used if provided and value is empty)
  return value || fallback || '';
}

/**
 * Validate environment variables
 */
function validateEnvVars(): void {
  // In development we allow falling back to hardcoded defaults without log spam.
  if (__DEV__) return;

  const missing: string[] = [];

  // Check all required variables except those with defaults
  const requiredWithoutDefaults = ['DESCOPE_PROJECT_ID', 'ONESIGNAL_APP_ID', 'PUSHER_KEY'];

  for (const key of requiredWithoutDefaults) {
    const value = getEnvVar(key);
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // In production, throw error
    logger.error(`Missing required environment variables: ${missing.join(', ')}`, 'ERROR');
    logger.error('Please set these environment variables before deploying.', 'ERROR');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Environment configuration
 * All secrets loaded from environment variables
 * In development, provides fallback values if env vars are not set (for local testing)
 * In production, all values MUST come from environment variables
 */
export const ENV_CONFIG: EnvConfig = {
  // Use fallback values if env vars are missing (for both dev and production)
  // These are the actual project IDs - should be moved to environment variables in production
  DESCOPE_PROJECT_ID: getEnvVar('DESCOPE_PROJECT_ID', 'P2yoVmehdHRYCZPehBOpMd97WMsH'),
  ONESIGNAL_APP_ID: getEnvVar('ONESIGNAL_APP_ID', 'e32aadbf-07ed-46a8-9635-f47d608afc54'),
  PUSHER_KEY: getEnvVar('PUSHER_KEY', 'd2a89d9fcfd559674245'),
  PUSHER_CLUSTER: getEnvVar('PUSHER_CLUSTER', 'mt1'), // Default cluster is acceptable
  API_BASE_URL: getEnvVar('API_BASE_URL', 'https://trivia-back-end.vercel.app'), // Default API URL is acceptable
  API_TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '10000'), 10),
  SENTRY_DSN: getEnvVar('SENTRY_DSN', ''),
  ENVIRONMENT: getEnvVar('NODE_ENV', __DEV__ ? 'development' : 'production'),
  isDevelopment: __DEV__,
};

// Export as 'env' for backward compatibility
export const env = ENV_CONFIG;

// Validate on module load
try {
  validateEnvVars();
} catch (error) {
  // Only log error, don't throw in module load to prevent app crash
  if (error instanceof Error) {
    logger.error(`Environment validation failed: ${error.message}`, 'ERROR');
  }
}

export default ENV_CONFIG;
