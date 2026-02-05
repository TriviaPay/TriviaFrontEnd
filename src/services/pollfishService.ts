/**
 * Pollfish Service - Professional Integration
 * Handles Pollfish SDK initialization and survey management
 *
 * @description Professional service for Pollfish survey integration
 * @author TriviaPay Team
 */

import { Alert } from 'react-native';
import { logger } from '../lib/utils/logger';

// Optional import - Pollfish may not be installed
let RNPollfish: any = null;
try {
  RNPollfish = require('react-native-plugin-pollfish');
} catch (error) {
  logger.debug('Pollfish SDK not installed - service will operate in disabled mode', 'POLLFISH');
}

// CRITICAL: Patch NativeEventEmitter methods BEFORE any usage to prevent warnings
// This must happen at module load time, not during initialization
if (RNPollfish && typeof RNPollfish === 'object') {
  if (typeof (RNPollfish as any).addListener !== 'function') {
    (RNPollfish as any).addListener = () => () => { };
  }
  if (typeof (RNPollfish as any).removeListeners !== 'function') {
    (RNPollfish as any).removeListeners = () => { };
  }
}

// Pollfish API Keys
const POLLFISH_API_KEY_ANDROID = '911a8f5c-20df-4b18-8002-11ce7f082dd4';
const POLLFISH_API_KEY_IOS = '911a8f5c-20df-4b18-8002-11ce7f082dd4';

class PollfishService {
  private static instance: PollfishService;
  private isInitialized: boolean = false;
  private isSurveyAvailable: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): PollfishService {
    if (!PollfishService.instance) {
      PollfishService.instance = new PollfishService();
    }
    return PollfishService.instance;
  }

  /**
   * Initialize Pollfish SDK
   * Should be called once at app startup in App.tsx
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Pollfish already initialized', 'POLLFISH');
      return;
    }

    try {
      logger.debug('Initializing Pollfish SDK', 'POLLFISH');

      // Check if RNPollfish is available
      if (!RNPollfish || typeof RNPollfish !== 'object') {
        logger.warn('Pollfish SDK not available', 'POLLFISH');
        return;
      }

      // Methods are already patched at module load time - no need to patch again

      // Create Pollfish builder with API keys
      const builder = new RNPollfish.Builder(POLLFISH_API_KEY_ANDROID, POLLFISH_API_KEY_IOS)
        .rewardMode(true) // Enable reward mode for surveys
        // CRITICAL: Set releaseMode to true for testing - dev mode often doesn't show surveys
        // In dev mode (false), Pollfish may not have surveys available
        // Set to true to test with real surveys (or keep false for production)
        .releaseMode(true) // Changed to true for testing - surveys should appear now
        .requestUUID(null) // Request UUID for tracking (null = auto-generate, or pass string UUID)
        .offerwallMode(false); // Disable offerwall mode

      logger.debug('Pollfish Builder created', 'POLLFISH', {
        releaseMode: true, // Now set to true for testing
        rewardMode: true,
        note: 'Release mode enabled - surveys should be available. Wait 10-30 seconds after initialization.',
      });
      console.log(
        '[POLLFISH] Builder created with releaseMode: true - surveys should be available'
      );

      // Build params object
      const params = builder.build();

      // Initialize Pollfish with built params (synchronous call - wrap in try-catch)
      try {
        RNPollfish.init(params);
      } catch (initError) {
        logger.error('Pollfish init() call failed', 'POLLFISH', initError);
        return; // Exit early if init fails
      }

      // Set up event listeners (non-critical if this fails)
      try {
        this.setupEventListeners();
      } catch (listenerError) {
        logger.warn('Failed to set up Pollfish event listeners', 'POLLFISH', listenerError);
        // Continue anyway - initialization succeeded
      }

      this.isInitialized = true;
      logger.debug('Pollfish SDK initialized successfully', 'POLLFISH');
      logger.debug('[POLLFISH] ✅ SDK initialized successfully', 'POLLFISH', {
        testMode: __DEV__,
        note: 'Release mode enabled - surveys should be available. Wait 30-60 seconds after init for surveys to load from Pollfish servers.',
      });
    } catch (error) {
      logger.error('Failed to initialize Pollfish SDK', 'POLLFISH', error);
      console.error('[POLLFISH] ❌ Initialization failed:', error);
      // Don't throw - allow app to continue without Pollfish
      this.isInitialized = false;
    }
  }

  /**
   * Set up Pollfish event listeners
   */
  private setupEventListeners(): void {
    if (!RNPollfish || typeof RNPollfish !== 'object') {
      logger.warn('Pollfish SDK not available, cannot set up event listeners', 'POLLFISH');
      return;
    }

    try {
      logger.debug('Setting up Pollfish event listeners', 'POLLFISH');

      // Survey available event
      RNPollfish.addEventListener(RNPollfish.PollfishSurveyReceivedListener, (surveyInfo: any) => {
        logger.debug('✅ Pollfish survey received - survey is now available', 'POLLFISH');
        logger.debug(
          `[POLLFISH] onPollfishSurveyReceived called - Survey Info: CPA=${surveyInfo?.cpa}, IR=${surveyInfo?.ir}, LOI=${surveyInfo?.loi}, Class=${surveyInfo?.surveyClass}, Reward=${surveyInfo?.rewardName}=${surveyInfo?.rewardValue}`,
          'POLLFISH'
        );
        this.isSurveyAvailable = true;
      });

      // Survey not available event
      RNPollfish.addEventListener(RNPollfish.PollfishSurveyNotAvailableListener, () => {
        logger.debug('❌ Pollfish survey not available', 'POLLFISH');
        logger.debug('[POLLFISH] ❌ Survey not available', 'POLLFISH');
        this.isSurveyAvailable = false;
      });

      // Survey completed event
      RNPollfish.addEventListener(RNPollfish.PollfishSurveyCompletedListener, (surveyInfo: any) => {
        logger.debug('Pollfish survey completed', 'POLLFISH', surveyInfo);
        this.isSurveyAvailable = false;
      });

      // Survey closed event
      RNPollfish.addEventListener(RNPollfish.PollfishClosedListener, () => {
        logger.debug('Pollfish survey closed', 'POLLFISH');
        this.isSurveyAvailable = false;
      });

      // Survey opened event
      RNPollfish.addEventListener(RNPollfish.PollfishOpenedListener, () => {
        logger.debug('Pollfish survey opened', 'POLLFISH');
        logger.debug('[POLLFISH] 🎉 Survey opened successfully!', 'POLLFISH');
      });

      // User not eligible event
      RNPollfish.addEventListener(RNPollfish.PollfishUserNotEligibleListener, () => {
        logger.debug('User not eligible for Pollfish survey', 'POLLFISH');
        this.isSurveyAvailable = false;
      });

      // User rejected survey event
      RNPollfish.addEventListener(RNPollfish.PollfishUserRejectedSurveyListener, () => {
        logger.debug('User rejected Pollfish survey', 'POLLFISH');
        this.isSurveyAvailable = false;
      });
    } catch (error) {
      logger.error('Failed to set up Pollfish event listeners', 'POLLFISH', error);
    }
  }

  /**
   * Show Pollfish survey if available
   * Should be called when user enters trivia screen and is not subscribed
   */
  public showSurvey(): void {
    logger.debug('[POLLFISH] showSurvey() called', 'POLLFISH');

    if (!this.isInitialized) {
      logger.warn('[POLLFISH] Not initialized', 'POLLFISH');
      logger.warn('Pollfish not initialized, cannot show survey', 'POLLFISH');
      Alert.alert('Pollfish Error', 'Pollfish SDK is not initialized. Please restart the app.');
      return;
    }

    logger.debug('[POLLFISH] SDK is initialized, checking RNPollfish.show availability', 'POLLFISH');

    // Check if RNPollfish is available
    if (!RNPollfish) {
      logger.error('RNPollfish is null or undefined', 'POLLFISH');
      logger.error('RNPollfish is not available', 'POLLFISH');
      Alert.alert(
        'Pollfish Error',
        'Pollfish SDK module is not available. Please rebuild the app.'
      );
      return;
    }

    if (typeof RNPollfish.show !== 'function') {
      logger.error(
        `RNPollfish.show is not a function. Type: ${typeof RNPollfish.show}, Keys: ${Object.keys(RNPollfish || {})}`,
        'POLLFISH'
      );
      logger.error('RNPollfish.show is not available', 'POLLFISH');
      Alert.alert(
        'Pollfish Error',
        'Pollfish show method is not available. The SDK may not be properly linked. Please rebuild the app.'
      );
      return;
    }

    try {
      logger.debug('[POLLFISH] Attempting to show survey', 'POLLFISH', {
        isInitialized: this.isInitialized,
        isSurveyAvailable: this.isSurveyAvailable,
        releaseMode: true, // Now set to true
        hasRNPollfish: !!RNPollfish,
        hasShowMethod: typeof RNPollfish.show === 'function',
      });

      logger.debug('Attempting to show Pollfish survey', 'POLLFISH', {
        isInitialized: this.isInitialized,
        isSurveyAvailable: this.isSurveyAvailable,
        releaseMode: true, // Now set to true
      });

      // CRITICAL: Always call show() - Pollfish SDK will handle availability internally
      // The SDK will show the survey if available, or do nothing if not available
      // We don't need to check isSurveyAvailable - let the SDK handle it
      logger.debug('[POLLFISH] Calling RNPollfish.show()...', 'POLLFISH');
      RNPollfish.show();
      logger.debug('[POLLFISH] RNPollfish.show() called successfully', 'POLLFISH');

      logger.debug('RNPollfish.show() called successfully', 'POLLFISH');

      // Log additional info for debugging
      const note =
        'Release mode enabled. Pollfish needs 30-60 seconds after app start to fetch surveys. If no survey appears, wait longer or check Pollfish dashboard for survey availability.';

      logger.debug(
        '[POLLFISH] Survey show() completed. Survey will appear if available.',
        'POLLFISH',
        note
      );
      logger.debug(
        '[POLLFISH] ⚠️ If no survey appears:',
        'POLLFISH',
        [
          '1. Wait 30-60 seconds after app start (Pollfish needs time to fetch surveys)',
          '2. Check if event listeners fire: Look for "[POLLFISH] ✅ Survey received" in console',
          '3. Verify API key is active and has surveys in Pollfish dashboard',
          '4. Check native logs: adb logcat | grep -i pollfish',
          '5. Rebuild app if needed: cd android && ./gradlew clean && cd .. && npx react-native run-android',
        ].join('\n')
      );

      logger.debug('Pollfish show() completed. Survey will appear if available.', 'POLLFISH', {
        releaseMode: true,
        note,
      });
    } catch (error) {
      console.error('[POLLFISH] Error showing survey:', error);
      logger.error('Failed to show Pollfish survey', 'POLLFISH', error);
      Alert.alert(
        'Pollfish Error',
        `Failed to show survey: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Hide Pollfish survey if visible
   */
  public hideSurvey(): void {
    if (!this.isInitialized || !RNPollfish) {
      return;
    }

    try {
      RNPollfish.hide();
    } catch (error) {
      logger.error('Failed to hide Pollfish survey', 'POLLFISH', error);
    }
  }

  /**
   * Check if survey is available
   */
  public isSurveyReady(): boolean {
    return this.isInitialized && this.isSurveyAvailable;
  }

  /**
   * Check if Pollfish is initialized
   */
  public getInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const pollfishService = PollfishService.getInstance();
export default pollfishService;
