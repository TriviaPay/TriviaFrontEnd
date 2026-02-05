import React from 'react';
import { View } from 'react-native';

// Safely import AdMob components
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const { NativeModules } = require('react-native');
  const isNativeAdModuleAvailable = !!(
    NativeModules.RNGoogleMobileAdsModule ||
    NativeModules.RNGoogleMobileAdsRewardModule ||
    NativeModules.RNGoogleMobileAdsAdModule
  );

  if (isNativeAdModuleAvailable) {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
    console.log('[AdBanner] AdMob module loaded successfully');
  } else {
    console.warn('[AdBanner] AdMob native module not available. Run: npx react-native run-android');
  }
} catch (error) {
  console.error('[AdBanner] Failed to load AdMob:', error);
}

const AdBanner: React.FC = () => {
  const [loadError, setLoadError] = React.useState(false);

  // If native module is missing, return empty View
  if (!BannerAd || !BannerAdSize || !TestIds) {
    return (
      <View style={{ height: 50, backgroundColor: 'transparent' }} />
    );
  }

  // If there was an error loading the ad, hide the component entirely to prevent empty gaps
  if (loadError) {
    return null;
  }

  // Always use test IDs in development
  const bannerUnitId = __DEV__ ? TestIds.BANNER : TestIds.BANNER;

  return (
    <View style={{ width: '100%', alignItems: 'center', marginVertical: 0 }}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('[AdBanner] Ad loaded successfully');
          setLoadError(false);
        }}
        onAdFailedToLoad={(error: any) => {
          console.error('[AdBanner] Ad failed to load:', error);
          setLoadError(true);
        }}
      />
    </View>
  );
};

export default AdBanner;
