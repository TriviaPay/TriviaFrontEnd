/**
 * Configuration Validator
 * Validates environment variables and configuration
 */

import { ENV_CONFIG } from './env';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DESCOPE_PROJECT_ID',
  'ONESIGNAL_APP_ID',
  'PUSHER_KEY',
  'PUSHER_CLUSTER',
  'API_BASE_URL',
] as const;

/**
 * Validate environment configuration
 */
export const validateConfig = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    const value = ENV_CONFIG[key as keyof typeof ENV_CONFIG];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate API URL format
  if (ENV_CONFIG.API_BASE_URL) {
    try {
      new URL(ENV_CONFIG.API_BASE_URL);
    } catch {
      errors.push(`Invalid API_BASE_URL format: ${ENV_CONFIG.API_BASE_URL}`);
    }
  }

  // Validate Pusher cluster
  const validClusters = ['mt1', 'us2', 'us3', 'eu', 'ap1', 'ap2', 'ap3', 'ap4'];
  if (ENV_CONFIG.PUSHER_CLUSTER && !validClusters.includes(ENV_CONFIG.PUSHER_CLUSTER)) {
    warnings.push(
      `Unknown Pusher cluster: ${ENV_CONFIG.PUSHER_CLUSTER}. Valid clusters: ${validClusters.join(', ')}`
    );
  }

  // Check for placeholder values in production
  if (process.env.NODE_ENV === 'production') {
    if (
      ENV_CONFIG.DESCOPE_PROJECT_ID?.includes('your_') ||
      ENV_CONFIG.DESCOPE_PROJECT_ID?.includes('example')
    ) {
      errors.push('DESCOPE_PROJECT_ID appears to be a placeholder value');
    }
    if (
      ENV_CONFIG.ONESIGNAL_APP_ID?.includes('your_') ||
      ENV_CONFIG.ONESIGNAL_APP_ID?.includes('example')
    ) {
      errors.push('ONESIGNAL_APP_ID appears to be a placeholder value');
    }
    if (ENV_CONFIG.PUSHER_KEY?.includes('your_') || ENV_CONFIG.PUSHER_KEY?.includes('example')) {
      errors.push('PUSHER_KEY appears to be a placeholder value');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate and throw if invalid
 */
export const validateConfigOrThrow = (): void => {
  const result = validateConfig();

  if (result.warnings.length > 0) {
    logger.warn('Configuration warnings:', 'APP', result.warnings);
  }

  if (!result.isValid) {
    throw new Error(`Configuration validation failed:\n${result.errors.join('\n')}`);
  }
};
