import { TestIds } from 'react-native-google-mobile-ads';

/**
 * AdMob Unit IDs
 * Using Test IDs for development and testing as requested.
 * Replace with real IDs in production configuration if needed, using __DEV__ check.
 */
export const AD_UNITS = {
    // Always use TestIds.INTERSTITIAL for development/testing
    INTERSTITIAL: TestIds.INTERSTITIAL,

    // Always use TestIds.REWARDED for development/testing
    REWARDED: TestIds.REWARDED,

    // Banner ads are handled separately, but keeping reference here for completeness if needed later
    BANNER: TestIds.BANNER,
};
