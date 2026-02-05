/**
 * Feature Flags Configuration
 * Remote and local feature flag management
 */

import { getEnvironmentConfig } from './environments';

export interface FeatureFlags {
  // Authentication features
  enableBiometricAuth: boolean;
  enableSocialLogin: boolean;

  // Chat features
  enableE2EEChat: boolean;
  enableGroupChat: boolean;
  enableVoiceMessages: boolean;

  // Trivia features
  enableDailyBonus: boolean;
  enableLeaderboard: boolean;
  enableTournaments: boolean;

  // Shop features
  enableShop: boolean;
  enableCosmetics: boolean;

  // Analytics
  enableAnalytics: boolean;
  enableCrashReporting: boolean;

  // Experimental features
  enableNewUI: boolean;
  enableBetaFeatures: boolean;
}

/**
 * Default feature flags based on environment
 */
const getDefaultFeatureFlags = (): FeatureFlags => {
  const envConfig = getEnvironmentConfig();

  return {
    // Authentication
    enableBiometricAuth: envConfig.name === 'production',
    enableSocialLogin: envConfig.name !== 'test',

    // Chat
    enableE2EEChat: true,
    enableGroupChat: true,
    enableVoiceMessages: envConfig.name === 'production',

    // Trivia
    enableDailyBonus: true,
    enableLeaderboard: true,
    enableTournaments: envConfig.name !== 'test',

    // Shop
    enableShop: true,
    enableCosmetics: true,

    // Analytics
    enableAnalytics: envConfig.enableAnalytics,
    enableCrashReporting: envConfig.enableCrashReporting,

    // Experimental
    enableNewUI: envConfig.name === 'development',
    enableBetaFeatures: envConfig.name !== 'production',
  };
};

/**
 * Feature flag storage (can be replaced with remote config)
 */
let featureFlags: FeatureFlags = getDefaultFeatureFlags();

/**
 * Get all feature flags
 */
export const getFeatureFlags = (): FeatureFlags => {
  return { ...featureFlags };
};

/**
 * Get a specific feature flag
 */
export const getFeatureFlag = <K extends keyof FeatureFlags>(key: K): FeatureFlags[K] => {
  return featureFlags[key];
};

/**
 * Set feature flags (for testing or remote config)
 */
export const setFeatureFlags = (flags: Partial<FeatureFlags>): void => {
  featureFlags = { ...featureFlags, ...flags };
};

/**
 * Reset feature flags to defaults
 */
export const resetFeatureFlags = (): void => {
  featureFlags = getDefaultFeatureFlags();
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return getFeatureFlag(flag);
};

/**
 * Initialize feature flags (can load from remote config)
 */
export const initializeFeatureFlags = async (): Promise<void> => {
  try {
    // In the future, load from remote config service
    // const remoteFlags = await fetchRemoteFeatureFlags();
    // setFeatureFlags(remoteFlags);

    // For now, use defaults
    resetFeatureFlags();
  } catch (error) {
    logger.warn('Failed to load remote feature flags, using defaults', 'APP', error);
    resetFeatureFlags();
  }
};
