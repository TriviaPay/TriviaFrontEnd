/**
 * TriviaCoin App
 * Production-grade React Native application
 * Built with Clean Architecture principles
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, InteractionManager, View } from 'react-native';
import { Providers } from './Providers';
import AppNavigator from '../navigation/AppNavigator';
import BootSplashScreen from './components/BootSplashScreen';
import GlobalLoader from '../components/GlobalLoader';
import { ErrorBoundary } from './ErrorBoundary';
// AdMob is handled safely inside the initialization logic
import { env } from '@config';
import { decode as atob } from 'base-64';
import {
  logger,
  initializeApiClient,
  storage,
  sentryService,
  pusherService,
  notificationService,
  offlineService,
  backHandler,
} from '@core/services';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { loadStoredAuth } from '@store/authSlice';
import { initializeAudio } from '@store/slices/soundSlice';
import { setInitialized, setConnected } from '@store/slices/appSlice';
import { useNetwork } from '@core/hooks';
import { preloadService } from '../services/preloadService';
import { prefetchCriticalData } from '../services/prefetchService';

import { keychainStorage } from '../services/keychainStorage';
import { KeyboardProvider } from 'react-native-keyboard-controller';


/**
 * Safe AdMob initialization
 * Prevents crash if native module is not linked
 */
const initAdMob = async () => {
  try {
    // Check if native module exists before requiring the JS wrapper
    // This prevents TurboModuleRegistry.getEnforcing() from crashing during the require()
    const { NativeModules } = require('react-native');
    const isNativeModuleAvailable = !!(
      NativeModules.RNGoogleMobileAdsModule ||
      NativeModules.RNGoogleMobileAdsRewardModule ||
      NativeModules.RNGoogleMobileAdsAdModule
    );

    if (!isNativeModuleAvailable) {
      logger.warn('AdMob native module not found in binary. Skipping initialization.', 'APP');
      return;
    }

    // Dynamic require safely after checking native availability
    // Try to require the module
    const mobileAdsModule = require('react-native-google-mobile-ads');

    // Check if it has a default export or is the module itself
    const mobileAds = mobileAdsModule.default || mobileAdsModule;

    if (mobileAds && typeof mobileAds === 'function') {
      await mobileAds().initialize();
      logger.info('AdMob initialized successfully', 'APP');

      // Preload ads
      // IMPORTANT: Require strictly after initialization to ensure SDK is ready
      const { interstitialAdService } = require('../ads/InterstitialAdService');
      const { rewardedAdService } = require('../ads/RewardedAdService');

      interstitialAdService.loadInterstitialAd();
      rewardedAdService.loadRewardedAd();
      logger.info('Ad services preloaded', 'APP');
    } else if (mobileAds && mobileAds.initialize) {
      // Handle case where it might be an object with initialize method
      await mobileAds.initialize();
      logger.info('AdMob initialized successfully (alternative)', 'APP');

      const { interstitialAdService } = require('../ads/InterstitialAdService');
      const { rewardedAdService } = require('../ads/RewardedAdService');

      interstitialAdService.loadInterstitialAd();
      rewardedAdService.loadRewardedAd();
      logger.info('Ad services preloaded', 'APP');
    }
  } catch (error) {
    logger.warn('AdMob init failed: ' + (error instanceof Error ? error.message : String(error)), 'APP');
  }
};

/**
 * App Content
 * Handles initialization and renders navigation
 * OPTIMIZED: Non-blocking initialization pattern
 */
const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isConnected } = useNetwork();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  const authToken = useAppSelector((state: any) => state.auth.token);

  // DEBUG: Global auth token log - UPDATED to show every time it changes
  useEffect(() => {
    const logTokens = async () => {
      if (!authToken) {
        console.log('🔥🔥🔥 [GLOBAL] AUTH TOKEN: NULL/NONE');
        const refreshToken = await keychainStorage.getRefreshToken();
        console.log('🔥🔥🔥 [GLOBAL] REFRESH TOKEN:', refreshToken || 'NULL/NONE');
        return;
      }

      console.log('🔥🔥🔥 [GLOBAL] AUTH TOKEN UPDATED:', authToken);
      console.log('🔥🔥🔥 [GLOBAL] AUTH TOKEN LENGTH:', authToken ? authToken.length : 0);
      if (authToken) {
        // Decode JWT to show payload differences
        try {
          const accessParts = authToken.split('.');
          if (accessParts.length === 3) {
            const accessPayload = JSON.parse(atob(accessParts[1]));
            console.log(
              '🔥🔥🔥 [GLOBAL] ACCESS TOKEN PAYLOAD:',
              JSON.stringify(accessPayload, null, 2)
            );
            console.log(
              '🔥🔥🔥 [GLOBAL] ACCESS TOKEN EXPIRY:',
              accessPayload.exp ? new Date(accessPayload.exp * 1000).toISOString() : 'N/A'
            );
          }
        } catch (e) {
          console.log('🔥🔥🔥 [GLOBAL] Could not decode access token');
        }
      }

      // Always log refresh token immediately after access token
      const refreshToken = await keychainStorage.getRefreshToken();
      console.log('🔥🔥🔥 [GLOBAL] REFRESH TOKEN UPDATED:', refreshToken || 'NULL/NONE');
      console.log('🔥🔥🔥 [GLOBAL] REFRESH TOKEN LENGTH:', refreshToken ? refreshToken.length : 0);
      if (refreshToken) {
        // Decode JWT to show payload differences
        try {
          const refreshParts = refreshToken.split('.');
          if (refreshParts.length === 3) {
            const refreshPayload = JSON.parse(atob(refreshParts[1]));
            console.log(
              '🔥🔥🔥 [GLOBAL] REFRESH TOKEN PAYLOAD:',
              JSON.stringify(refreshPayload, null, 2)
            );
            console.log(
              '🔥🔥🔥 [GLOBAL] REFRESH TOKEN EXPIRY:',
              refreshPayload.exp ? new Date(refreshPayload.exp * 1000).toISOString() : 'N/A'
            );
          }
        } catch (e) {
          console.log('🔥🔥🔥 [GLOBAL] Could not decode refresh token');
        }
      }

      // Compare tokens
      if (refreshToken && authToken) {
        console.log(
          '🔥🔥🔥 [GLOBAL] TOKENS ARE DIFFERENT:',
          refreshToken !== authToken ? 'YES - CORRECT!' : 'NO - ERROR! They are the same!'
        );
        console.log(
          '🔥🔥🔥 [GLOBAL] TOKEN LENGTHS - Access:',
          authToken.length,
          'Refresh:',
          refreshToken.length
        );
      }
    };

    logTokens();

    // Also keep the periodic log but make it clear it's the current token
    const interval = setInterval(async () => {
      if (authToken) {
        console.log('🔥🔥🔥 [GLOBAL] PERIODIC AUTH TOKEN LOG (2 min):', authToken);
        // Always log refresh token immediately after access token
        const refreshToken = await keychainStorage.getRefreshToken();
        console.log(
          '🔥🔥🔥 [GLOBAL] PERIODIC REFRESH TOKEN LOG (2 min):',
          refreshToken || 'NULL/NONE'
        );
        console.log(
          '🔥🔥🔥 [GLOBAL] PERIODIC CHECK - Refresh token same as access?',
          refreshToken === authToken ? 'YES (ERROR!)' : 'NO (GOOD)'
        );
      }
    }, 120000); // 120,000 ms = 2 minutes

    return () => clearInterval(interval);
  }, [authToken]);

  useEffect(() => {
    const initialize = async () => {
      try {
        logger.info('Initializing TriviaCoin App', 'APP');

        // === CRITICAL SERVICES (blocking) ===
        // These MUST complete before app is ready
        sentryService.init();
        initializeApiClient({
          baseURL: env.API_BASE_URL,
          timeout: env.API_TIMEOUT,
        });

        // Initialize AdMob safely
        await initAdMob();

        // Initialize authentication from keychain
        const authResult = await dispatch(loadStoredAuth()).unwrap();
        if (authResult.isAuthenticated) {
          logger.info('Authentication restored from keychain', 'AUTH');
        }

        // Initialize audio settings (non-blocking)
        dispatch(initializeAudio());

        // === MARK READY IMMEDIATELY ===
        // Don't wait for non-critical services - show UI ASAP
        dispatch(setInitialized(true));
        setIsAppReady(true);
        logger.info('TriviaCoin App initialized successfully', 'APP');

        // === NON-CRITICAL SERVICES (non-blocking) ===
        // Run after interactions to prevent blocking first paint
        InteractionManager.runAfterInteractions(() => {
          // Prefetch critical data (non-blocking) if authenticated
          if (authResult.isAuthenticated) {
            prefetchCriticalData().catch(error => {
              logger.warn('Prefetch failed (non-critical)', 'PREFETCH', error);
            });
          }

          // Initialize Pusher (real-time) - fire and forget
          pusherService.init().catch(error => {
            logger.error('Pusher initialization failed (non-critical)', 'APP', error);
          });

          // Initialize OneSignal (push notifications)
          notificationService.init();

          // Initialize Offline service
          offlineService.init();

          // Initialize BackHandler (Android)
          backHandler.init();


        });
      } catch (error) {
        logger.error('App initialization failed', 'APP', error);
        sentryService.captureException(error as Error);
        // Still mark as ready to show error screen
        setIsAppReady(true);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      pusherService.disconnect();
      backHandler.destroy();
    };
  }, [dispatch]);

  // Update network status
  useEffect(() => {
    dispatch(setConnected(isConnected));
  }, [isConnected, dispatch]);

  // Show bootsplash screen while app is initializing or animation is playing
  if (!isAppReady || !isAnimationComplete) {
    return (
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <BootSplashScreen
          onAnimationComplete={() => {
            logger.info('BootSplash animation complete', 'APP');
            setIsAnimationComplete(true);
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <AppNavigator />
      <GlobalLoader />
    </View>
  );
};

/**
 * Main App Component
 * Wraps app with providers and global components
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
        <Providers>
          <AppContent />
        </Providers>
      </KeyboardProvider>
    </ErrorBoundary>
  );
};

export default App;
