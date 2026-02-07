/**
 * CRITICAL: RNFS-FREE Audio Manager
 *
 * This version COMPLETELY ELIMINATES React Native File System (RNFS) to prevent
 * "Parameter specified as non-null is null" crashes that occur at the native bridge level.
 *
 * Key changes:
 * - NO file system operations (no copy, unlink, exists, readDir)
 * - Direct asset loading only (bundled with app)
 * - Vibration-only fallback (never crashes)
 * - All operations wrapped in multiple safety layers
 * - Never throws errors, never rejects promises
 */

import { Platform, AppState } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { logger } from '../utils/logger';

import Sound from 'react-native-sound';

const KEYCHAIN_SERVICE = 'TriviaCoin_AudioSettings';

interface SoundConfig {
  url?: string;
  isLoaded?: boolean;
  duration?: number;
  isRealFile?: boolean;
  isVibration?: boolean;
  pattern?: number[];
}

interface ScreenBackgroundMusic {
  trivia: SoundConfig | null;
  winner: SoundConfig | null;
}

interface AudioSettings {
  sound: boolean;
  music: boolean;
  notifications: boolean;
  lastUpdated: string;
  version: string;
}

class AudioManagerSafe {
  static instance: AudioManagerSafe | null = null;
  backgroundMusicPlayer: Sound | null = null;
  sounds: { [key: string]: SoundConfig } = {};
  isSoundEnabled: boolean = true;
  isMusicEnabled: boolean = true;
  isNotificationEnabled: boolean = true;
  isInitialized: boolean = false;
  appStateListener: any = null;
  isBackgroundMusicPlaying: boolean = false;
  musicLoopTimeout: NodeJS.Timeout | null = null;
  musicPlaybackListener: any = null;
  soundQueue: any[] = [];
  isPlayingSound: boolean = false;

  // Screen-specific background music support
  screenBackgroundMusic: ScreenBackgroundMusic = {
    trivia: null,
    winner: null,
  };
  currentScreen: string | null = null;
  isScreenMusicPlaying: boolean = false;
  originalMusicVolume: number = 0.7;
  duckedMusicVolume: number = 0.1;
  isDucking: boolean = false;
  universalTapEnabled: boolean = true;
  musicStartPromise: Promise<void> | null = null;
  // Add debouncing properties
  musicOperationTimeout: NodeJS.Timeout | null = null;
  lastMusicOperation: string | null = null;
  MUSIC_DEBOUNCE_TIME: number = 2000; // 2 seconds to prevent rapid operations
  // Add simple flags to prevent race conditions
  isStartingMusic: boolean = false;
  isStoppingMusic: boolean = false;
  screenMusicPlayer: Sound | null = null;
  _restartTimeout: NodeJS.Timeout | null = null;
  _liveWinnersRetryCount: number = 0; // Track retry attempts for live_winners music
  MAX_LIVE_WINNERS_RETRIES: number = 3; // Maximum retry attempts
  activeSounds: Map<string, Sound> = new Map(); // Track active sound instances to stop them
  _isRetryingLiveWinners: boolean = false; // Prevent multiple simultaneous retries
  failedSounds: Map<string, string[]> = new Map(); // Track failed sound paths for debugging

  static getInstance(): AudioManagerSafe {
    if (!AudioManagerSafe.instance) {
      AudioManagerSafe.instance = new AudioManagerSafe();
    }
    return AudioManagerSafe.instance;
  }

  /**
   * CRITICAL: Get Android resource paths WITHOUT any file system operations
   * Only use bundled assets, never copy files
   *
   * react-native-sound with Sound.MAIN_BUNDLE expects relative paths from assets folder
   * Tries multiple path formats for maximum compatibility (like old working version)
   */
  getAndroidResourcePaths(soundName: string): string[] {
    const packageName = 'com.triviacoin';
    const resourceName = this.getResourceName(soundName);

    // CRITICAL: Handle "Live winners screen" with exact filename
    if (soundName === 'Live winners screen') {
      return [
        'sounds/Live winners screen.mp3', // Exact path with spaces - PRIMARY
        'asset:/sounds/Live winners screen.mp3', // Asset path format
        'Live winners screen.mp3', // Direct in assets root
        `sounds/${resourceName}.mp3`, // Fallback
      ];
    }

    // Try multiple path formats for maximum compatibility
    // react-native-sound with Sound.MAIN_BUNDLE on Android expects relative paths
    return [
      `sounds/${resourceName}.mp3`, // Primary path - relative from assets folder
      `sounds/${soundName}.mp3`, // Fallback with original name
      `${resourceName}.mp3`, // Direct in assets root
      `${soundName}.mp3`, // Direct with original name
      // Also try Android resource paths (some devices may support these)
      `android.resource://${packageName}/raw/${resourceName}`,
      `android.resource://${packageName}/raw/${resourceName}.mp3`,
      `android.resource://${packageName}/raw/${soundName}`,
      `android.resource://${packageName}/raw/${soundName}.mp3`,
    ];
  }

  getIOSPaths(soundName: string): string[] {
    const resourceName = this.getResourceName(soundName);

    // CRITICAL: Handle "Live winners screen" with exact filename
    if (soundName === 'Live winners screen') {
      return [
        'sounds/Live winners screen.mp3', // Exact path with spaces - PRIMARY
        'Live winners screen.mp3', // Direct in bundle root
        `sounds/${resourceName}.mp3`, // Fallback
      ];
    }

    // iOS also uses relative paths from bundle
    return [
      `sounds/${resourceName}.mp3`, // Primary path
      `sounds/${soundName}.mp3`, // Fallback with original name
      `${resourceName}.mp3`, // Direct in bundle root
      `${soundName}.mp3`, // Direct with original name
    ];
  }

  getResourceName(soundName: string): string {
    const resourceMap: { [key: string]: string } = {
      click: "button", // Remapped to match Free tab sound
      success: "success",
      error: "error",
      correct: "correct_answer",
      wrong: "wrong_answer",
      win: "win",
      countdown: "countdown",
      notification: "notification",
      message: "message",
      background_music: "background_music",
      trivia: "trivia",
      movingcards: "movingcards",
      button: "button",
      buttonMenu: "buttonMenu",
      "trivia bomb": "trivia bomb",
      "trivia auto": "trivia auto",
      "change question": "change question",
      hint: "hint",
      "Live winners screen": "Live winners screen",
      "Shop Item purchase": "Shop Item purchase",
    }
    return resourceMap[soundName] || soundName
  }

  /**
   * CRITICAL: Initialize audio WITHOUT any file system operations
   * Only register bundled asset paths
   * This method is non-blocking and safe to call from UI thread
   */
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      logger.debug('Audio already initialized', 'AUDIO');
      return;
    }

    // CRITICAL: Run initialization in background to prevent UI blocking
    // Use setTimeout to defer heavy operations off the main thread
    return new Promise<void>(resolve => {
      // Defer initialization to next event loop tick to prevent UI blocking
      setTimeout(async () => {
        // Wrap EVERYTHING in try-catch to prevent ANY crashes
        try {
          logger.debug('Initializing Safe Audio Manager (RNFS-free)', 'AUDIO');

          // Set Sound configuration (lightweight operation)
          try {
            if (Sound && typeof Sound.setCategory === 'function') {
              Sound.setCategory('Playback', true);
            }
          } catch (soundConfigError) {
            logger.warn('Sound category setup failed', 'AUDIO', soundConfigError);
          }

          // Load settings from keychain (safe operation, but async)
          try {
            await this.loadSettingsFromKeychain();
          } catch (settingsError) {
            // Silent fail - use defaults
            logger.warn('Failed to load settings, using defaults', 'AUDIO', settingsError);
            this.isSoundEnabled = true;
            this.isMusicEnabled = true;
            this.isNotificationEnabled = true;
          }

          // Initialize sounds in background (NO file system operations)
          // Use setTimeout to further defer heavy sound initialization
          setTimeout(async () => {
            try {
              await this.initializeSoundsDirectly();
            } catch (soundInitError) {
              logger.warn('Sound initialization failed', 'AUDIO', soundInitError);
            }

            // Setup app state listener (safe operation)
            try {
              this.setupAppStateListener();
            } catch (listenerError) {
              // Silent fail - not critical
              logger.warn('App state listener setup failed', 'AUDIO', listenerError);
            }

            this.isInitialized = true;
            logger.debug('Safe Audio Manager initialized successfully', 'AUDIO');
            resolve();
          }, 0); // Defer sound initialization to prevent blocking
        } catch (error) {
          // CRITICAL: Never let initialization crash the app
          logger.error('Audio initialization error', 'AUDIO', error);
          this.isInitialized = true;
          resolve();
        }
      }, 0); // Defer to next event loop tick
    });
  }

  /**
   * Initialize audio in background without blocking
   * Safe to call from UI thread - returns immediately
   */
  initializeInBackground(): void {
    if (this.isInitialized) {
      return;
    }

    // Fire and forget - don't wait for initialization
    this.initialize().catch(error => {
      logger.warn('Background audio initialization failed', 'AUDIO', error);
    });
  }

  /**
   * CRITICAL: Initialize sounds directly from bundled assets
   * NO file system operations whatsoever
   */
  async initializeSoundsDirectly(): Promise<void> {
    logger.debug('Initializing sounds from bundled assets only', 'AUDIO');

    const soundNames = [
      'click',
      'success',
      'error',
      'correct',
      'wrong',
      'win',
      'countdown',
      'notification',
      'message',
      'background_music',
      'trivia',
      'movingcards',
      'button',
      'buttonMenu',
      'trivia bomb',
      'trivia auto',
      'change question',
      'hint',
      'Live winners screen',
    ];

    for (const soundName of soundNames) {
      try {
        const resourceName = this.getResourceName(soundName);
        let workingPath: string | null = null;

        // Get paths based on platform (NO file system operations)
        if (Platform.OS === 'android') {
          const paths = this.getAndroidResourcePaths(soundName);
          workingPath = paths && paths.length > 0 ? paths[0] : null;
        } else {
          const paths = this.getIOSPaths(soundName);
          workingPath = paths && paths.length > 0 ? paths[0] : null;
        }

        if (workingPath && workingPath.length > 0) {
          this.sounds[soundName] = {
            url: workingPath,
            isLoaded: true,
            duration: this.getSoundDuration(soundName),
            isRealFile: true,
          };
          logger.debug(`Registered sound: ${soundName}`, 'AUDIO', { workingPath });
        } else {
          // No valid path found - log warning but don't register
          logger.warn(`No valid path found for: ${soundName}`, 'AUDIO');
        }
      } catch (error) {
        logger.warn(`Failed to register sound ${soundName}`, 'AUDIO', error);
      }
    }

    logger.debug('Sound initialization complete', 'AUDIO');
  }

  getSoundDuration(soundName: string): number {
    const durations: { [key: string]: number } = {
      click: 300,
      success: 1200,
      error: 1500,
      correct: 800,
      wrong: 1200,
      win: 2500,
      countdown: 800,
      notification: 1000,
      message: 800,
      background_music: 8000,
      button: 300,
      buttonMenu: 300,
      'trivia bomb': 2000,
      'trivia auto': 2000,
      'change question': 1500,
      hint: 1000,
      'Live winners screen': 60000,
    };
    return durations[soundName] || 1000;
  }

  async loadSettingsFromKeychain(): Promise<void> {
    try {
      logger.debug('Loading audio settings...', 'AUDIO');
      const credentials = await Keychain.getInternetCredentials(KEYCHAIN_SERVICE);

      if (credentials && credentials.password) {
        const settings: AudioSettings = JSON.parse(credentials.password);
        this.isSoundEnabled = settings.sound !== undefined ? settings.sound : true;
        this.isMusicEnabled = settings.music !== undefined ? settings.music : true;
        this.isNotificationEnabled =
          settings.notifications !== undefined ? settings.notifications : true;
        logger.debug('Audio settings loaded', 'AUDIO');
      } else {
        logger.debug('Using default settings', 'AUDIO');
        await this.saveSettingsToKeychain();
      }
    } catch (error) {
      logger.warn('Failed to load settings', 'AUDIO', error);
      this.isSoundEnabled = true;
      this.isMusicEnabled = true;
      this.isNotificationEnabled = true;
    }
  }

  async saveSettingsToKeychain(): Promise<void> {
    try {
      const settings: AudioSettings = {
        sound: this.isSoundEnabled,
        music: this.isMusicEnabled,
        notifications: this.isNotificationEnabled,
        lastUpdated: new Date().toISOString(),
        version: '9.0.0-safe',
      };

      await Keychain.setInternetCredentials(
        KEYCHAIN_SERVICE,
        'audioSettings',
        JSON.stringify(settings)
      );
      logger.debug('Settings saved', 'AUDIO');
    } catch (error) {
      logger.warn('Failed to save settings', 'AUDIO', error);
    }
  }

  setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active') {
        if (this.isMusicEnabled && this.isBackgroundMusicPlaying) {
          this.resumeBackgroundMusic().catch(() => { });
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // CRITICAL: Stop screen background music when app goes to background/minimized
        // This ensures music doesn't continue playing when app is closed or minimized
        logger.debug('App moved to inactive/background, stopping screen music', 'AUDIO');
        this.stopScreenBackgroundMusic().catch(() => { });
        // Also pause regular background music
        this.pauseBackgroundMusic().catch(() => { });
      }
    });
  }

  /**
   * CRITICAL: Play sound WITHOUT any file system operations
   * Uses same robust logic as old working version but WITHOUT RNFS
   * Tries multiple paths until one works - exactly like old version
   */
  async playSound(name: string): Promise<void> {
    // CRITICAL: Block applause sound completely - it should never play
    if (name === 'applause' || name.toLowerCase() === 'applause' || name.includes('applause')) {
      // Log stack trace to find caller
      let stack: string | undefined;
      if (typeof Error !== 'undefined') {
        stack = new Error().stack;
      }
      logger.error(
        `🚫 BLOCKED: Attempted to play applause sound - THIS SHOULD NOT HAPPEN!`,
        'AUDIO'
      );
      logger.error(
        `🚫 DEBUG: Check stack trace to find where applause is being called from`,
        'AUDIO'
      );
      if (stack) {
        logger.error(`🚫 Stack trace:`, 'AUDIO', stack);
      }
      return; // Block applause completely
    }

    if (!this.isSoundEnabled || name === 'background_music') {
      logger.debug(`Sound disabled or background_music, skipping ${name}`, 'AUDIO');
      return;
    }

    // Auto-initialize if not initialized (non-blocking)
    if (!this.isInitialized) {
      this.initializeInBackground();
    }

    // Always play REAL audio sounds - ignore initialization state, always try audio first
    logger.debug(`AudioManager.playSound called for: ${name}`, 'AUDIO');

    try {
      // Map sound names to file names (same as old working version)
      // CRITICAL: applause is NOT in this map - it should never be played
      const soundFileMap: { [key: string]: string } = {
        click: 'button.mp3', // Standardized to button.mp3
        success: 'success.mp3',
        error: 'error.mp3',
        correct: 'correct_answer.mp3',
        wrong: 'wrong_answer.mp3',
        win: 'win.mp3',
        countdown: 'countdown.mp3',
        notification: 'notification-291228.mp3', // Updated to requested sound
        message: 'message.mp3',
        trivia: 'trivia.mp3',
        movingcards: 'movingcards.mp3',
        button: 'button.mp3',
        buttonMenu: 'buttonMenu.mp3',
        'trivia bomb': 'trivia bomb.mp3',
        'trivia auto': 'trivia auto.mp3',
        'change question': 'change question.mp3',
        hint: 'hint.mp3',
        'daily bonus gems collection': 'daily bonus gems collection.mp3',
        'daily bonus': 'daily bonus gems collection.mp3',
        'Live winners screen': 'Live winners screen.mp3',
        'Shop Item purchase': 'Shop Item purchase.mp3',
        // NOTE: applause.mp3 exists in assets but is BLOCKED - do not add it here
      };

      // CRITICAL: Double-check - if fileName would be applause.mp3, block it
      const fileName = soundFileMap[name] || `${this.getResourceName(name)}.mp3`;
      if (fileName.toLowerCase().includes('applause') || fileName === 'applause.mp3') {
        logger.error(`🚫 BLOCKED: Attempted to play applause.mp3 file directly!`, 'AUDIO', {
          fileName,
          soundName: name,
        });
        return;
      }

      logger.debug(`Looking for file: ${fileName}`, 'AUDIO');

      const pathsToTry: string[] = [];

      if (Platform.OS === 'android') {
        // Use direct asset paths (NO RNFS copy operations)
        // Try multiple Android resource paths (same as old version but without cache)
        const baseName = fileName.replace('.mp3', '').replace(/\s+/g, '_').toLowerCase();
        const baseNameOriginal = fileName.replace('.mp3', '');
        const resourceName = this.getResourceName(name);

        // Primary paths - relative from assets folder (works with Sound.MAIN_BUNDLE)
        // CRITICAL: Try sounds/ path FIRST as that's where files are located
        pathsToTry.push(
          `sounds/${fileName}`, // Primary: sounds/fileName.mp3 (MOST LIKELY)
          `sounds/${resourceName}.mp3`, // Primary: sounds/resourceName.mp3
          `sounds/${baseNameOriginal}.mp3`, // Alternative name in sounds/
          fileName, // Direct in assets root
          `${resourceName}.mp3`, // Direct resource name
          // Also try Android resource paths
          `android.resource://com.triviacoin/raw/${baseName}`,
          `android.resource://com.triviacoin/raw/${baseNameOriginal}`,
          `android.resource://com.triviacoin/raw/${baseName}.mp3`,
          // Try asset paths with asset:/ prefix
          `asset:/sounds/${fileName}`,
          `asset:/${fileName}`,
          // Try file paths
          `file:///android_asset/sounds/${fileName}`,
          `file:///android_asset/${fileName}`
        );
        logger.debug(
          `Will try ${pathsToTry.length} paths for ${name}`,
          'AUDIO',
          pathsToTry.slice(0, 3)
        );
      }
      else {
        // iOS paths
        const baseName = fileName.replace('.mp3', '');
        const resourceName = this.getResourceName(name);
        pathsToTry.push(
          fileName,
          `sounds/${fileName}`,
          `${baseName}.mp3`,
          `sounds/${baseName}.mp3`,
          `${resourceName}.mp3`,
          `sounds/${resourceName}.mp3`
        );
        logger.debug(`Will try ${pathsToTry.length} iOS paths for ${name}`, 'AUDIO');
      }

      // Try each path until one works - EXACT same logic as old working version
      let soundPlayed = false;
      let soundInstance: Sound | null = null;

      for (const path of pathsToTry) {
        // Skip undefined or empty paths
        if (!path || typeof path !== 'string' || path.length === 0) {
          continue;
        }

        // CRITICAL: Block any path that contains applause
        if (path.toLowerCase().includes('applause')) {
          logger.error(`🚫 BLOCKED: Attempted to load applause from path: ${path}`, 'AUDIO');
          continue; // Skip this path
        }

        // Use EXACT same Promise pattern as old working version
        await new Promise<void>(resolve => {
          try {
            // Set category before creating sound
            if (!Sound) {
              logger.warn(`Sound not available, skipping load for ${name}`, 'AUDIO');
              resolve();
              return;
            }

            if (Sound && typeof Sound.setCategory === 'function') {
              Sound.setCategory('Playback', true);
            }

            const isRemoteOrAsset = path.includes('://') || path.startsWith('asset:') || path.startsWith('file:');
            const basePath = Platform.OS === 'android'
              ? (isRemoteOrAsset ? '' : (Sound.MAIN_BUNDLE || ''))
              : '';

            const sound = new Sound(
              path,
              basePath,
              (error: any) => {
                if (error) {
                  logger.debug(`Failed to load ${name} from ${path} (basePath: ${basePath})`, 'AUDIO', error);
                  resolve();
                  return;
                }

                logger.debug(`Successfully loaded ${name} from ${path}`, 'AUDIO');

                // Store sound instance for countdown and movingcards so we can stop them
                if (name === 'countdown' || name === 'movingcards') {
                  soundInstance = sound;
                  this.activeSounds.set(name, sound);
                  logger.debug(`Stored ${name} sound instance for potential stopping`, 'AUDIO');
                }

                // Set volume before playing
                try {
                  sound.setVolume(1.0);
                } catch (volError) {
                  // Ignore volume errors
                }

                // Successfully loaded, play it immediately
                sound.play((success: boolean) => {
                  if (success) {
                    // CRITICAL: Double-check we didn't play applause
                    if (
                      name.toLowerCase().includes('applause') ||
                      path.toLowerCase().includes('applause')
                    ) {
                      logger.error(
                        `🚫 CRITICAL: Applause sound was played! Stopping immediately!`,
                        'AUDIO',
                        { soundName: name, path }
                      );
                      sound.stop();
                      sound.release();
                      return;
                    }
                    // CRITICAL: Also check if "win" sound is actually applause.mp3 file
                    if (name === 'win' && path.toLowerCase().includes('applause')) {
                      logger.error(
                        `🚫 CRITICAL: Win sound is actually applause file! Blocking!`,
                        'AUDIO'
                      );
                      sound.stop();
                      sound.release();
                      return;
                    }
                    logger.debug(`Successfully played: ${name} from ${path}`, 'AUDIO');
                    soundPlayed = true;
                  } else {
                    logger.warn(`Failed to play sound ${name} from ${path}`, 'AUDIO');
                  }
                  // Only release if not countdown or movingcards (we need to keep them to stop)
                  if (name !== 'countdown' && name !== 'movingcards') {
                    // Small delay before release to ensure sound plays
                    setTimeout(() => {
                      try {
                        sound.release();
                      } catch (releaseError) {
                        // Silent fail
                      }
                    }, 200); // Increased delay to ensure sound plays
                  } else {
                    // Auto-release after sound duration for countdown/movingcards
                    const duration = this.getSoundDuration(name);
                    setTimeout(() => {
                      if (this.activeSounds.has(name)) {
                        try {
                          const storedSound = this.activeSounds.get(name);
                          if (storedSound) {
                            storedSound.stop();
                            storedSound.release();
                          }
                          this.activeSounds.delete(name);
                          logger.debug(`Auto-released ${name} sound after duration`, 'AUDIO');
                        } catch (error) {
                          logger.warn(`Error auto-releasing ${name}:`, 'AUDIO', error);
                        }
                      }
                    }, duration);
                  }
                  resolve();
                });
              }
            );
          } catch (soundError) {
            logger.warn(`Error creating sound for ${name} with path ${path}:`, 'AUDIO', soundError);
            resolve();
          }
        });

        if (soundPlayed) {
          break;
        }
      }

      if (!soundPlayed) {
        // Store failed paths for debugging
        this.failedSounds.set(name, pathsToTry);
        logger.error(`❌ All ${pathsToTry.length} path attempts failed for ${name}`, 'AUDIO');
        logger.error(`Tried paths: ${pathsToTry.slice(0, 5).join(', ')}...`, 'AUDIO');
        logger.error(`❌ INTERACTIVE SOUND FAILED TO FIND: ${name}`, 'AUDIO');
        logger.error(`❌ PATH FAILED: All ${pathsToTry.length} paths attempted`, 'AUDIO');
        return;
      }

      // Clear failed status if sound played successfully
      if (this.failedSounds.has(name)) {
        this.failedSounds.delete(name);
      }

      // If we get here, sound played successfully
      logger.debug(`✅ AudioManager successfully played ${name}`, 'AUDIO');
    } catch (systemError: any) {
      logger.error(`System error playing ${name}:`, 'AUDIO', systemError?.message || systemError);
    }
  }

  // Stop a specific sound by name
  stopSound(name: string): void {
    // CRITICAL: Log if trying to stop applause (shouldn't exist, but debug)
    if (name === 'applause' || name.toLowerCase() === 'applause') {
      logger.debug(`🛑 DEBUG: Attempted to stop applause sound`, 'AUDIO');
    }

    if (this.activeSounds.has(name)) {
      try {
        const sound = this.activeSounds.get(name);
        if (sound) {
          sound.stop();
          sound.release();
        }
        this.activeSounds.delete(name);
        logger.debug(`✅ Stopped sound: ${name}`, 'AUDIO');
      } catch (error) {
        this.activeSounds.delete(name);
        logger.warn(`⚠️ Error stopping sound ${name}:`, 'AUDIO', error);
      }
    } else {
      // Log if trying to stop a sound that's not in activeSounds
      logger.debug(`ℹ️ stopSound called for ${name} but not in activeSounds`, 'AUDIO');
    }
  }

  // Get failed sounds for debugging
  getFailedSounds(): Map<string, string[]> {
    return this.failedSounds;
  }

  // Check if a sound failed to load
  hasSoundFailed(name: string): boolean {
    return this.failedSounds.has(name);
  }

  // Get failed paths for a specific sound
  getFailedPaths(name: string): string[] {
    return this.failedSounds.get(name) || [];
  }

  playNotification(name: string = 'notification'): void {
    if (!this.isNotificationEnabled) {
      return;
    }
    this.playSound(name).catch(() => { });
  }

  async pauseBackgroundMusic(): Promise<void> {
    try {
      if (this.backgroundMusicPlayer) {
        await (this.backgroundMusicPlayer as any).pausePlayer().catch(() => { });
      }

      if (this.musicPlaybackListener) {
        (this.backgroundMusicPlayer as any)!.removePlayBackListener();
        this.musicPlaybackListener = null;
      }
    } catch (error) {
      // Silent fail
    }
  }

  async resumeBackgroundMusic(): Promise<void> {
    if (!this.isMusicEnabled || !this.isBackgroundMusicPlaying) {
      return;
    }

    try {
      if (this.backgroundMusicPlayer) {
        await (this.backgroundMusicPlayer as any).resumePlayer().catch(() => { });
      }
    } catch (error) {
      // Silent fail
    }
  }

  async toggleSound(): Promise<boolean> {
    this.isSoundEnabled = !this.isSoundEnabled;
    await this.saveSettingsToKeychain();
    if (this.isSoundEnabled) {
      setTimeout(() => this.playSound('click').catch(() => { }), 100);
    }
    return this.isSoundEnabled;
  }

  async toggleMusic(): Promise<boolean> {
    this.isMusicEnabled = !this.isMusicEnabled;
    await this.saveSettingsToKeychain();
    return this.isMusicEnabled;
  }

  async toggleNotifications(): Promise<boolean> {
    this.isNotificationEnabled = !this.isNotificationEnabled;
    await this.saveSettingsToKeychain();
    if (this.isSoundEnabled) {
      setTimeout(() => this.playSound('click').catch(() => { }), 100);
    }
    return this.isNotificationEnabled;
  }

  getSettings(): { [key: string]: any } {
    return {
      sound: this.isSoundEnabled,
      music: this.isMusicEnabled,
      notifications: this.isNotificationEnabled,
      initialized: this.isInitialized,
      backgroundMusicPlaying: this.isBackgroundMusicPlaying,
      audioMethod: 'Safe Audio System (RNFS-free)',
      version: '9.0.0-safe',
    };
  }

  playUniversalTapSound(): void {
    if (this.universalTapEnabled && this.isSoundEnabled) {
      this.playSound('click').catch(() => { });
    }
  }

  setUniversalTapEnabled(enabled: boolean): void {
    this.universalTapEnabled = enabled;
  }

  /**
   * Start screen background music (simplified version without file operations)
   */
  async startScreenBackgroundMusic(screenName: string): Promise<void> {
    // CRITICAL: If we're in the process of stopping, wait a bit then allow start
    if (this.isStoppingMusic) {
      // Wait for stopping to complete, then allow start
      await new Promise(resolve => setTimeout(resolve, 100));
      // Clear the flag after waiting
      this.isStoppingMusic = false;
    }

    // CRITICAL: If the SAME screen music is already playing, check if it's actually playing
    // If the Sound instance exists and is playing, don't restart
    if (this.currentScreen === screenName && this.isScreenMusicPlaying && this.screenMusicPlayer) {
      // Check if the sound is actually playing by checking the player
      try {
        const isPlaying = (this.screenMusicPlayer as any).isPlaying?.() || false;
        if (isPlaying) {
          logger.debug(`${screenName} music already playing`, 'AUDIO');
          return;
        } else {
          logger.debug(
            `Flag says music is playing but Sound.isPlaying() returned false - restarting`,
            'AUDIO'
          );
          // Music flag is true but sound isn't actually playing - restart it
          await this.stopScreenBackgroundMusic();
        }
      } catch (e) {
        // Can't check if playing - try to restart anyway
        logger.debug(`Could not check if music is playing - restarting to be safe`, 'AUDIO');
        await this.stopScreenBackgroundMusic();
      }
    }

    // CRITICAL: For live_winners, if music is already playing, keep it playing (don't restart)
    // Music should continue playing across all stages without interruption
    if (
      screenName === 'live_winners' &&
      this.isScreenMusicPlaying &&
      this.currentScreen === 'live_winners' &&
      this.screenMusicPlayer
    ) {
      try {
        const isPlaying = (this.screenMusicPlayer as any).isPlaying?.() || false;
        if (isPlaying) {
          logger.debug(`live_winners music already playing - continuing across stages`, 'AUDIO');
          return; // Already playing, keep it playing
        } else {
          logger.debug(`live_winners flag is true but not actually playing - restarting`, 'AUDIO');
          await this.stopScreenBackgroundMusic();
        }
      } catch (e) {
        logger.debug(`Could not check live_winners playing state - will try to start`, 'AUDIO');
        // Don't stop here - just try to start
      }
    }

    // CRITICAL: If we're in the process of stopping music, clear the flag if we're starting for a new screen
    // This allows music to start when user enters a screen, even if previous music was just stopped
    // Only block if we're trying to start the SAME screen music while stopping
    if (this.isStoppingMusic && this.currentScreen === screenName) {
      logger.debug(`Music is being stopped for ${screenName} - NOT starting duplicate`, 'AUDIO');
      return;
    }

    // If stopping flag is set but we're starting a different screen, clear it to allow new music
    if (this.isStoppingMusic && this.currentScreen !== screenName) {
      logger.debug(`Clearing stopping flag to allow ${screenName} music to start`, 'AUDIO');
      this.isStoppingMusic = false;
    }

    if (!this.isMusicEnabled) {
      logger.debug('Music disabled, cannot start screen music', 'AUDIO');
      return;
    }

    logger.debug(`Starting ${screenName} screen background music`, 'AUDIO');

    try {
      // Stop any existing screen music first (only if different screen)
      if (this.currentScreen !== screenName && this.currentScreen !== null) {
        logger.debug(`Stopping previous screen music: ${this.currentScreen}`, 'AUDIO');
        await this.stopScreenBackgroundMusic();
      }

      // CRITICAL: Clear stopping flag but DON'T set playing flag yet
      // We'll only set isScreenMusicPlaying to true AFTER play() succeeds
      // This prevents false positives where flag says playing but sound isn't actually playing
      this.isStoppingMusic = false; // Clear stopping flag
      // DO NOT set isScreenMusicPlaying or currentScreen here - wait for play() to succeed

      // Log the attempt (flags will be set after play() succeeds)
      logger.debug(`Starting ${screenName} screen background music`, 'AUDIO', {
        previous: this.currentScreen,
        wasPlaying: this.isScreenMusicPlaying,
      });

      let musicFile: SoundConfig | null = null;

      switch (screenName) {
        case 'trivia':
          musicFile = this.sounds.trivia;
          break;
        case 'winner':
          musicFile = this.sounds.background_music;
          break;
        case 'live_winners':
          musicFile = this.sounds['Live winners screen'];
          break;
        default:
          logger.warn(`No music configuration for screen: ${screenName}`, 'AUDIO');
          return;
      }

      // Get all possible paths for this music file
      const musicSoundName =
        screenName === 'trivia'
          ? 'trivia'
          : screenName === 'live_winners'
            ? 'Live winners screen'
            : 'background_music';
      const allPaths =
        Platform.OS === 'android'
          ? this.getAndroidResourcePaths(musicSoundName)
          : this.getIOSPaths(musicSoundName);

      // CRITICAL: For "Live winners screen", paths are already handled in getAndroidResourcePaths/getIOSPaths
      // No need to modify allPaths here - let the path functions handle it

      // Use the path from musicFile, or try all paths
      let workingPath = musicFile?.url || '';

      if (!workingPath || workingPath.length === 0) {
        if (allPaths.length > 0) {
          workingPath = allPaths[0];
          logger.debug(`Using on-demand path for ${screenName}: ${workingPath}`, 'AUDIO');
        } else {
          logger.error(`No paths available for ${screenName} music`, 'AUDIO');
          return;
        }
      }

      // Validate URL before using it
      if (!workingPath || typeof workingPath !== 'string' || workingPath.length === 0) {
        logger.warn(`Invalid music file URL for ${screenName}`, 'AUDIO');
        return;
      }

      // Create and start screen music player
      // Note: Flags (currentScreen, isScreenMusicPlaying) are set above before creating Sound
      logger.debug(`Creating Sound instance for ${screenName}`, 'AUDIO', {
        path: workingPath,
        pathCount: allPaths.length,
      });

      if (!Sound) {
        logger.warn('Sound not available, cannot play background music', 'AUDIO');
        return;
      }

      const sound = new Sound(
        workingPath,
        Platform.OS === 'android' ? Sound.MAIN_BUNDLE : '',
        (error: any) => {
          if (error) {
            // CRITICAL: Reset flags if loading failed
            this.isScreenMusicPlaying = false;
            this.currentScreen = null;

            // Silently handle missing music file - don't log as error since file may not exist
            // Only log in debug mode
            logger.debug(
              `Music file not found for ${screenName} (this is OK if file doesn't exist)`,
              'AUDIO',
              { path: workingPath }
            );
            // Try other paths if first one failed
            let pathIndex = 1;
            const tryNextPath = () => {
              if (pathIndex < allPaths.length) {
                const nextPath = allPaths[pathIndex];
                pathIndex++;
                if (!Sound) {
                  logger.warn('Sound not available, cannot try alternative path', 'AUDIO');
                  return;
                }
                try {
                  const altSound = new Sound(
                    nextPath,
                    Platform.OS === 'android' ? Sound.MAIN_BUNDLE : '',
                    (altError: any) => {
                      if (!altError) {
                        // This path works, use it
                        workingPath = nextPath;
                        altSound.setVolume(this.originalMusicVolume);
                        altSound.setNumberOfLoops(-1);

                        // CRITICAL: Store reference but don't set playing flag until play succeeds
                        this.screenMusicPlayer = altSound;
                        this.currentScreen = screenName;

                        altSound.play((success: boolean) => {
                          if (success) {
                            logger.debug(
                              `Successfully loaded ${screenName} screen music from ${nextPath}`,
                              'AUDIO'
                            );
                            // Set flags only after successful play
                            this.isScreenMusicPlaying = true;
                            this.currentScreen = screenName;
                            this.screenMusicPlayer = altSound;
                          } else {
                            logger.warn(
                              `Failed to play ${screenName} from alternate path`,
                              'AUDIO',
                              { path: nextPath }
                            );
                            // Reset flags if play failed
                            this.isScreenMusicPlaying = false;
                            this.currentScreen = null;
                            this.screenMusicPlayer = null;
                            tryNextPath();
                          }
                        });
                      } else {
                        // Try next path
                        altSound.release();
                        tryNextPath();
                      }
                    }
                  );
                } catch (e) {
                  tryNextPath();
                }
              } else {
                // All paths failed - reset flags
                this.isScreenMusicPlaying = false;
                this.currentScreen = null;
                this.screenMusicPlayer = null;
                logger.error(`All paths failed for ${screenName} music`, 'AUDIO');
              }
            };
            tryNextPath();
          } else {
            // Sound loaded successfully - now play it
            logger.debug(
              `Successfully loaded ${screenName} screen music from ${workingPath}`,
              'AUDIO'
            );
            try {
              // CRITICAL: Don't set flags until we know the sound will play
              // Set flags right before playing, but verify in callback
              sound.setVolume(this.originalMusicVolume);
              sound.setNumberOfLoops(-1); // Loop indefinitely

              // Store reference before playing
              this.screenMusicPlayer = sound;
              this.currentScreen = screenName;

              sound.play((playSuccess: boolean) => {
                if (playSuccess) {
                  logger.debug(`${screenName} screen music started playing`, 'AUDIO');
                  // Set flags only after successful play
                  this.isScreenMusicPlaying = true;
                  this.currentScreen = screenName;
                  this.screenMusicPlayer = sound;

                  // Verify it's actually playing after a short delay
                  setTimeout(() => {
                    try {
                      const isPlaying = (sound as any).isPlaying?.() || false;
                      if (isPlaying) {
                        logger.debug(`Verified: ${screenName} music is actually playing`, 'AUDIO');
                      } else {
                        logger.warn(
                          `${screenName} music play() succeeded but isPlaying() returns false`,
                          'AUDIO'
                        );
                        // Try to play again
                        sound.play((retrySuccess: boolean) => {
                          if (retrySuccess) {
                            logger.debug(`Retry play succeeded for ${screenName}`, 'AUDIO');
                          } else {
                            logger.warn(`Retry play also failed for ${screenName}`, 'AUDIO');
                            this.isScreenMusicPlaying = false;
                            this.currentScreen = null;
                            this.screenMusicPlayer = null;
                          }
                        });
                      }
                    } catch (e) {
                      logger.debug(`Could not verify playing state`, 'AUDIO', e);
                    }
                  }, 200);
                } else {
                  logger.error(`Failed to play ${screenName} screen music`, 'AUDIO');
                  // Reset flags if play failed
                  this.isScreenMusicPlaying = false;
                  this.currentScreen = null;
                  this.screenMusicPlayer = null;

                  // Try to start again after a delay
                  setTimeout(() => {
                    if (!this.currentScreen || this.currentScreen === screenName) {
                      logger.debug(
                        `Retrying to play ${screenName} music after play failure`,
                        'AUDIO'
                      );
                      this.startScreenBackgroundMusic(screenName).catch(() => { });
                    }
                  }, 500);
                }
              });
            } catch (playError) {
              // Reset flags on error
              this.isScreenMusicPlaying = false;
              this.currentScreen = null;
              this.screenMusicPlayer = null;
              logger.error(`Error playing ${screenName} screen music`, 'AUDIO', playError);
            }
          }
        }
      ) as any;

      // Store reference IMMEDIATELY
      this.screenMusicPlayer = sound;

      logger.debug(
        `${screenName} screen music started (flags set: playing=${this.isScreenMusicPlaying}, screen=${this.currentScreen})`,
        'AUDIO'
      );
    } catch (error) {
      logger.error(`Error starting ${screenName} music`, 'AUDIO', error);
      this.isScreenMusicPlaying = false;
      this.currentScreen = null;
      this.screenMusicPlayer = null;
    }
  }

  /**
   * Stop screen background music - CRITICAL: Must stop immediately when screen loses focus
   */
  async stopScreenBackgroundMusic(): Promise<void> {
    logger.debug(
      `Stopping screen background music (was playing: ${this.isScreenMusicPlaying}, screen: ${this.currentScreen})`,
      'AUDIO'
    );

    // CRITICAL: Set flags IMMEDIATELY and SYNCHRONOUSLY to prevent any new music from starting
    // This must happen BEFORE any async operations
    this.isStoppingMusic = true; // Prevent new music from starting while stopping
    this.isScreenMusicPlaying = false;
    const previousScreen = this.currentScreen;
    this.currentScreen = null;
    this.isDucking = false;

    // CRITICAL: Also clear the screenMusicPlayer reference IMMEDIATELY to prevent any operations on it
    // Store reference before clearing so we can still stop it
    const playerToStop = this.screenMusicPlayer;
    this.screenMusicPlayer = null; // Clear immediately to prevent restart

    try {
      // Clear any pending restart timeout
      if (this._restartTimeout) {
        clearTimeout(this._restartTimeout);
        this._restartTimeout = null;
      }

      // Stop audio player using react-native-sound API - FORCE STOP IMMEDIATELY
      // Match old working code - direct synchronous stop
      // CRITICAL: Use stored reference (already cleared above to prevent restart)
      if (playerToStop) {
        try {
          const sound = playerToStop as Sound;

          // CRITICAL: For looping music (like live_winners), we MUST set loops to 0 FIRST
          // This prevents the sound from continuing to loop after stop()
          // Then stop immediately - match old working code exactly
          try {
            // CRITICAL: Set loops to 0 FIRST before stopping (for live_winners music)
            // This is the key fix - stop the loop before stopping playback
            try {
              sound.setNumberOfLoops(0); // Stop loop FIRST
            } catch (e) {
              // Silent fail
            }

            // Now stop immediately - don't wait for callback
            sound.stop(() => {
              // Release in callback
              try {
                sound.release();
              } catch (releaseError) {
                // Silent fail
              }
            });

            // Also try to stop without callback (more aggressive)
            try {
              (sound as any).stop();
            } catch (e) {
              // Silent fail
            }

            // Set loops to 0 again (redundant but safe)
            try {
              sound.setNumberOfLoops(0);
            } catch (e) {
              // Silent fail
            }

            // Force release immediately (don't wait)
            try {
              sound.release();
            } catch (e) {
              // Silent fail
            }
          } catch (stopError) {
            // Force release even if stop fails
            try {
              sound.release();
            } catch (releaseError) {
              // Silent fail
            }
          }
        } catch (error) {
          // Force cleanup even if stop fails
        }
      }

      // CRITICAL: Also try to stop the stored reference one more time
      // This ensures we catch the player even if reference was cleared
      // Do this BEFORE clearing the reference completely
      if (playerToStop) {
        try {
          const sound = playerToStop as Sound;
          // Try multiple stop methods
          sound.stop(() => { });
          (sound as any).stop(); // Direct stop without callback
          sound.setNumberOfLoops(0); // CRITICAL: Stop loop for live_winners music
          sound.release();
          // Try one more time after a tiny delay
          setTimeout(() => {
            try {
              sound.stop(() => { });
              sound.setNumberOfLoops(0);
              sound.release();
            } catch (e) {
              // Silent fail
            }
          }, 10);
        } catch (e) {
          // Silent fail
        }
      }

      // Ensure flags are set (already set above, but ensure they're set)
      this.isScreenMusicPlaying = false;
      this.currentScreen = null;

      // CRITICAL: Keep stopping flag true longer to prevent music from restarting
      // For stage 3 music, we need to keep it stopped longer
      setTimeout(() => {
        this.isStoppingMusic = false;
      }, 500); // Increased from 100ms to 500ms to prevent restart

      logger.debug(`Screen background music stopped (was: ${previousScreen})`, 'AUDIO');
    } catch (error) {
      logger.error('Error in stopScreenBackgroundMusic', 'AUDIO', error);
      // Force cleanup on error - ensure everything is cleared
      this.isScreenMusicPlaying = false;
      this.currentScreen = null;
      this.screenMusicPlayer = null;
      this._restartTimeout = null;
      this.isStoppingMusic = false;
    }
  }

  async release(): Promise<void> {
    try {
      if (this.backgroundMusicPlayer) {
        await (this.backgroundMusicPlayer as any)
          .stopPlayer()
          .catch(() => { })(this.backgroundMusicPlayer as any)
          .removePlayBackListener();
      }

      if (this.appStateListener) {
        this.appStateListener.remove();
        this.appStateListener = null;
      }

      this.sounds = {};
      this.backgroundMusicPlayer = null;
      this.isInitialized = false;
      this.isBackgroundMusicPlaying = false;
      this.musicPlaybackListener = null;
    } catch (error) {
      // Silent fail
    }
  }
}

export default AudioManagerSafe.getInstance();
