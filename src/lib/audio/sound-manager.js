import { Platform, AppState, Vibration, NativeModules, NativeEventEmitter } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { logger } from '../utils/logger';

const KEYCHAIN_SERVICE = 'TriviaPay_GamingSoundSettings';

// Audio import with comprehensive fallbacks
let Audio = null;
try {
  const expoAv = require('expo-av');
  Audio = expoAv.Audio;
} catch (e) {
  // Silent fallback - this is expected on some platforms, no need to warn
  // logger.warn('expo-av not available, using fallback systems', 'AUDIO');
}

class SoundManager {
  static instance = null;
  sounds = {};
  backgroundMusic = null;
  isSoundEnabled = true;
  isMusicEnabled = true;
  isNotificationEnabled = true;
  isInitialized = false;
  appStateListener = null;
  isBackgroundMusicPlaying = false;
  soundVolume = 1.0;
  musicVolume = 0.7;
  webViewRef = null;
  webViewLoaded = false;
  webViewEventEmitter = null;
  volumeChangeTimeout = null;

  static getInstance() {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  setWebViewRef(ref) {
    logger.log('WebView reference set for SoundManager', 'AUDIO');
    this.webViewRef = ref;

    if (ref) {
      this.setupWebViewEventEmitter();
    }
  }

  setupWebViewEventEmitter() {
    if (Platform.OS !== 'android' || !this.webViewRef) return;

    try {
      // Create event emitter for WebView messages
      this.webViewEventEmitter = new NativeEventEmitter(
        NativeModules.WebViewMessageModule || NativeModules.RNCWebView
      );

      this.webViewEventEmitter.addListener('message', event => {
        if (event.data === 'WEBVIEW_LOADED') {
          logger.log('🌐 WebView fully loaded', 'AUDIO');
          this.webViewLoaded = true;
        }
      });
    } catch (e) {
      logger.warn('Could not setup WebView event emitter', 'AUDIO', e);
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Silent initialization - expected behavior
      // logger.log('🔧 Initializing Sound Manager', 'AUDIO');

      // Load settings first as they're needed regardless of audio method
      await this.loadSettingsFromKeychain();

      // Check if we should use WebView fallback for Android
      const shouldUseWebViewFallback =
        Platform.OS === 'android' && (!Audio || !Audio.setAudioModeAsync);

      if (shouldUseWebViewFallback) {
        // Silent - WebView fallback is expected on Android
        // logger.log('🔄 Using WebView audio fallback for Android', 'AUDIO');
        await this.initializeWebViewFallback();
      } else if (Audio && Audio.setAudioModeAsync) {
        // Silent - using expo-av is expected
        // logger.log('🎵 Using expo-av for audio', 'AUDIO');
        await this.initializeExpoAV();
      } else {
        // Silent - vibration fallback is expected behavior
        // logger.warn('⚠️ No audio system available, using vibration fallback', 'AUDIO');
        this.initializeVibrationFallback();
      }

      this.setupAppStateListener();
      this.isInitialized = true;
      // Silent success - initialization is expected
      // logger.log('✅ Sound Manager initialized successfully', 'AUDIO');
    } catch (error) {
      // Silent error - fallback to vibration is expected
      // logger.error('Failed to initialize Sound Manager', 'AUDIO', error);
      this.initializeVibrationFallback();
      this.isInitialized = true;
    }
  }

  async initializeExpoAV() {
    try {
      // CRITICAL: Initialize fallback sounds first so they're always available
      if (!this.sounds || Object.keys(this.sounds).length === 0) {
        this.sounds = this.createFallbackSounds();
        // Silent - fallback sounds are expected
        // logger.log('✅ Fallback sounds pre-initialized', 'AUDIO');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
      await this.initializeSounds();
    } catch (error) {
      // Silent error - fallback to vibration is expected
      // logger.error('Error initializing expo-av', 'AUDIO', error);
      this.initializeVibrationFallback();
    }
  }

  async initializeWebViewFallback() {
    if (!this.webViewRef) {
      // Silent fallback - WebView ref may not be available, use vibration instead
      // logger.warn('WebView ref not set, cannot initialize audio', 'AUDIO');
      this.initializeVibrationFallback();
      return;
    }

    logger.log('🌐 Initializing WebView audio system', 'AUDIO');

    // Inject audio initialization script with correct Android paths
    const initScript = `
      window.audioElements = {};
      window.playSound = function(name, volume = 1.0) {
        if (!window.audioElements[name]) {
          const audio = new Audio();
          // Use correct Android asset path format
          audio.src = 'file:///android_asset/sounds/' + name + '.mp3';
          audio.volume = volume;
          window.audioElements[name] = audio;
        }
        window.audioElements[name].currentTime = 0;
        window.audioElements[name].volume = volume;
        const playPromise = window.audioElements[name].play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            logger.error('Playback failed:', 'AUDIO', error);
            window.ReactNativeWebView.postMessage(
              JSON.stringify({type: 'AUDIO_ERROR', error: error.toString(), sound: name})
            );
          });
        }
      };
      
      window.playBackgroundMusic = function(volume = 0.7) {
        if (!window.backgroundMusic) {
          window.backgroundMusic = new Audio();
          window.backgroundMusic.src = 'file:///android_asset/sounds/background_music.mp3';
          window.backgroundMusic.loop = true;
        }
        window.backgroundMusic.volume = volume;
        const playPromise = window.backgroundMusic.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            logger.error('Background music playback failed:', 'AUDIO', error);
            window.ReactNativeWebView.postMessage(
              JSON.stringify({type: 'AUDIO_ERROR', error: error.toString(), sound: 'background_music'})
            );
          });
        }
      };
      
      window.pauseBackgroundMusic = function() {
        if (window.backgroundMusic) {
          window.backgroundMusic.pause();
        }
      };
      
      window.stopBackgroundMusic = function() {
        if (window.backgroundMusic) {
          window.backgroundMusic.pause();
          window.backgroundMusic.currentTime = 0;
        }
      };
      
      window.setSoundVolume = function(volume) {
        Object.values(window.audioElements).forEach(audio => {
          audio.volume = volume;
        });
      };
      
      window.setMusicVolume = function(volume) {
        if (window.backgroundMusic) {
          window.backgroundMusic.volume = volume;
        }
      };
      
      window.WebViewMessage = window.ReactNativeWebView.postMessage;
      window.WebViewMessage('WEBVIEW_LOADED');
    `;

    try {
      // Inject script immediately without waiting
      this.webViewRef.injectJavaScript(initScript);
      logger.log('✅ WebView audio system initialized', 'AUDIO');

      // Create proxy methods for WebView audio
      this.sounds = this.createWebViewSounds();
      this.backgroundMusic = this.createWebViewBackgroundMusic();
    } catch (error) {
      logger.error('WebView audio initialization failed', 'AUDIO', error);
      this.initializeVibrationFallback();
    }
  }

  createWebViewSounds() {
    const soundNames = [
      'click',
      'success',
      'error',
      'correct',
      'wrong',
      'countdown',
      'win',
      'notification',
      'message',
    ];
    const webViewSounds = {};

    soundNames.forEach(name => {
      webViewSounds[name] = {
        playAsync: async () => {
          if (!this.webViewRef) {
            this.playGamingVibration(name);
            return;
          }
          const script = `playSound('${name}', ${this.soundVolume});`;
          this.webViewRef.injectJavaScript(script);
          logger.log(`🌐 WebView sound played: ${name}`, 'AUDIO');
        },
        setVolumeAsync: async volume => {
          this.soundVolume = volume;
          const script = `setSoundVolume(${volume});`;
          this.webViewRef.injectJavaScript(script);
        },
        stopAsync: async () => {
          // Not implemented in WebView fallback
        },
        unloadAsync: async () => {
          // Not implemented in WebView fallback
        },
      };
    });

    return webViewSounds;
  }

  createWebViewBackgroundMusic() {
    return {
      playAsync: async () => {
        if (!this.webViewRef) {
          logger.log('🎵 Starting fallback background music', 'AUDIO');
          return;
        }
        const script = `playBackgroundMusic(${this.musicVolume});`;
        this.webViewRef.injectJavaScript(script);
        this.isBackgroundMusicPlaying = true;
        logger.log('🌐 WebView background music started', 'AUDIO');
      },
      pauseAsync: async () => {
        if (!this.webViewRef) {
          logger.log('⏸️ Pausing fallback background music', 'AUDIO');
          return;
        }
        const script = `pauseBackgroundMusic();`;
        this.webViewRef.injectJavaScript(script);
        this.isBackgroundMusicPlaying = false;
        logger.log('🌐 WebView background music paused', 'AUDIO');
      },
      stopAsync: async () => {
        if (!this.webViewRef) {
          logger.log('⏹️ Stopping fallback background music', 'AUDIO');
          return;
        }
        const script = `stopBackgroundMusic();`;
        this.webViewRef.injectJavaScript(script);
        this.isBackgroundMusicPlaying = false;
        logger.log('🌐 WebView background music stopped', 'AUDIO');
      },
      setVolumeAsync: async volume => {
        this.musicVolume = volume;
        if (!this.webViewRef) return;
        const script = `setMusicVolume(${volume});`;
        this.webViewRef.injectJavaScript(script);
      },
    };
  }

  async loadSettingsFromKeychain() {
    try {
      logger.log('🔐 Loading sound settings from secure keychain...', 'STORAGE');
      const credentials = await Keychain.getInternetCredentials(KEYCHAIN_SERVICE);

      if (credentials && credentials.password) {
        const settings = JSON.parse(credentials.password);
        this.isSoundEnabled = settings.sound !== undefined ? settings.sound : true;
        this.isMusicEnabled = settings.music !== undefined ? settings.music : true;
        this.isNotificationEnabled =
          settings.notifications !== undefined ? settings.notifications : true;
        this.soundVolume = settings.soundVolume !== undefined ? settings.soundVolume : 1.0;
        this.musicVolume = settings.musicVolume !== undefined ? settings.musicVolume : 0.7;
        logger.log('✅ Sound settings loaded from secure keychain', 'AUDIO');
      } else {
        logger.log('🔐 No existing settings found, using defaults', 'AUDIO');
        await this.saveSettingsToKeychain();
      }
    } catch (error) {
      logger.warn('Failed to load sound settings from keychain:', 'AUDIO', error);
      this.isSoundEnabled = true;
      this.isMusicEnabled = true;
      this.isNotificationEnabled = true;
      this.soundVolume = 1.0;
      this.musicVolume = 0.7;
      try {
        await this.saveSettingsToKeychain();
      } catch (saveError) {
        logger.warn('Could not save default settings', 'STORAGE', saveError);
      }
    }
  }

  async saveSettingsToKeychain() {
    try {
      const settings = {
        sound: this.isSoundEnabled,
        music: this.isMusicEnabled,
        notifications: this.isNotificationEnabled,
        soundVolume: this.soundVolume,
        musicVolume: this.musicVolume,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      };

      await Keychain.setInternetCredentials(
        KEYCHAIN_SERVICE,
        'soundSettings',
        JSON.stringify(settings)
      );
      logger.log('✅ Sound settings saved to secure keychain', 'AUDIO');
    } catch (error) {
      logger.warn('Failed to save sound settings to keychain:', 'AUDIO', error);
    }
  }

  async initializeSounds() {
    logger.log('🎯 Loading sound files from assets...', 'AUDIO');

    // Create fallback sounds first
    const fallbackSounds = this.createFallbackSounds();

    // Define sound assets - Using actual file names from TriviaCoin assets
    // Path: from src/lib/audio/ to assets/sounds/ = ../../../assets/sounds/
    const soundAssets = {
      click: require('../../../assets/sounds/button.mp3'),
      button: require('../../../assets/sounds/button.mp3'),
      buttonMenu: require('../../../assets/sounds/buttonMenu.mp3'),
      success: require('../../../assets/sounds/button.mp3'), // Fallback to button
      error: require('../../../assets/sounds/button.mp3'), // Fallback to button
      correct: require('../../../assets/sounds/button.mp3'), // Fallback to button
      wrong: require('../../../assets/sounds/button.mp3'), // Fallback to button
      countdown: require('../../../assets/sounds/button.mp3'), // Fallback to button
      win: require('../../../assets/sounds/button.mp3'), // Fallback to button
      notification: require('../../../assets/sounds/notification-291228.mp3'),
      message: require('../../../assets/sounds/button.mp3'), // Fallback to button
      'daily bonus': require('../../../assets/sounds/daily bonus gems collection.mp3'),
      hint: require('../../../assets/sounds/hint.mp3'),
      'change question': require('../../../assets/sounds/change question.mp3'),
      'trivia auto': require('../../../assets/sounds/trivia auto.mp3'),
      'trivia bomb': require('../../../assets/sounds/trivia bomb.mp3'),
      'Live winners screen': require('../../../assets/sounds/Live winners screen.mp3'),
      'Shop Item purchase': require('../../../assets/sounds/Shop Item purchase.mp3'),
      // background_music may not exist, handle gracefully
      background_music: require('../../../assets/sounds/button.mp3'), // Fallback to button if background_music doesn't exist
    };

    // Handle case where Audio is not available
    if (!Audio || !Audio.Sound) {
      logger.warn('Audio not available, using vibration fallback', 'AUDIO');
      this.initializeVibrationFallback();
      return;
    }

    // Load each sound file
    for (const [name, source] of Object.entries(soundAssets)) {
      try {
        // Skip background_music if file doesn't exist
        if (name === 'background_music' && !source) {
          logger.warn('Background music file not found, using fallback', 'AUDIO');
          this.backgroundMusic = this.createFallbackBackgroundMusic();
          continue;
        }

        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume: name === 'background_music' ? this.musicVolume : this.soundVolume,
          isLooping: name === 'background_music',
        });

        if (name === 'background_music') {
          this.backgroundMusic = sound;
          logger.log('✅ Background music loaded', 'AUDIO');
        } else {
          this.sounds[name] = sound;
          logger.log(`✅ Sound loaded: ${name}`, 'AUDIO');
        }
      } catch (error) {
        logger.warn(
          `⚠️ Failed to load sound ${name}, using fallback:`,
          'AUDIO',
          error?.message || error
        );
        if (name === 'background_music') {
          this.backgroundMusic = this.createFallbackBackgroundMusic();
        } else {
          // Use fallback sound if available, otherwise use button sound
          this.sounds[name] = fallbackSounds[name] || fallbackSounds.click || fallbackSounds.button;
          logger.log(`✅ Fallback sound set for: ${name}`, 'AUDIO');
        }
      }
    }

    // Ensure critical sounds have fallbacks if they failed to load
    if (!this.sounds.button && fallbackSounds.button) {
      this.sounds.button = fallbackSounds.button;
      logger.log('✅ Fallback button sound ensured', 'AUDIO');
    }
    if (!this.sounds.click && fallbackSounds.click) {
      this.sounds.click = fallbackSounds.click;
      logger.log('✅ Fallback click sound ensured', 'AUDIO');
    }

    logger.log('✅ Sound initialization complete', 'AUDIO');
  }

  createFallbackSounds() {
    const soundNames = [
      'click',
      'button',
      'buttonMenu',
      'success',
      'error',
      'correct',
      'wrong',
      'countdown',
      'win',
      'notification',
      'message',
      'daily bonus',
      'hint',
      'change question',
      'trivia auto',
      'trivia bomb',
      'Live winners screen',
      'Shop Item purchase',
    ];
    const fallbackSounds = {};

    soundNames.forEach(name => {
      fallbackSounds[name] = {
        playAsync: async () => {
          logger.log(`📳 Playing vibration fallback: ${name}`, 'AUDIO');
          this.playGamingVibration(name);
          return { status: 'ok' };
        },
        setVolumeAsync: async () => ({ status: 'ok' }),
        stopAsync: async () => {
          Vibration.cancel();
          return { status: 'ok' };
        },
        unloadAsync: async () => ({ status: 'ok' }),
        setPositionAsync: async () => ({ status: 'ok' }),
      };
    });

    return fallbackSounds;
  }

  createFallbackBackgroundMusic() {
    return {
      playAsync: async () => {
        logger.log('🎵 Starting fallback background music', 'AUDIO');
        return { status: 'ok' };
      },
      pauseAsync: async () => {
        logger.log('⏸️ Pausing fallback background music', 'AUDIO');
        return { status: 'ok' };
      },
      stopAsync: async () => {
        logger.log('⏹️ Stopping fallback background music', 'AUDIO');
        return { status: 'ok' };
      },
      setVolumeAsync: async () => ({ status: 'ok' }),
      unloadAsync: async () => ({ status: 'ok' }),
      setPositionAsync: async () => ({ status: 'ok' }),
    };
  }

  initializeVibrationFallback() {
    logger.log('🔧 Initializing vibration fallback system', 'AUDIO');
    this.sounds = this.createFallbackSounds();
    this.backgroundMusic = this.createFallbackBackgroundMusic();
    logger.log('✅ Vibration fallback system initialized', 'AUDIO');
  }

  playGamingVibration(soundName) {
    // Silent vibration - no need to log every vibration
    const gamingVibrationPatterns = {
      click: [25],
      success: [60, 30, 60, 30, 120],
      error: [120, 60, 120, 60, 180],
      correct: [40, 20, 40, 20, 40, 20, 100],
      wrong: [180, 90, 180, 90, 250],
      win: [80, 40, 80, 40, 120, 60, 120, 60, 300],
      countdown: [50],
      notification: [70, 35, 70, 35, 70],
      message: [45],
    };

    const pattern = gamingVibrationPatterns[soundName] || [40];

    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(pattern);
      } else {
        Vibration.vibrate();
      }
      // Silent vibration - no need to log every vibration
      // logger.log(`📳 Gaming vibration: ${soundName} - [${pattern.join(', ')}]`, 'AUDIO');
    } catch (error) {
      // Silent error - vibration failure is non-critical
      // logger.warn(`Vibration not available: ${error}`, 'AUDIO');
    }
  }

  setupAppStateListener() {
    this.appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        if (this.isMusicEnabled && this.isBackgroundMusicPlaying) {
          logger.log('🎵 App resumed - restarting background music', 'AUDIO');
          this.startContinuousBackgroundMusic();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.log('🎵 App paused - pausing background music', 'AUDIO');
        this.pauseContinuousBackgroundMusic();
      }
    });
  }

  async playSound(name) {
    logger.debug(`🎮 Sound requested: ${name}`, 'AUDIO');

    if (!this.isSoundEnabled) {
      logger.log('❌ Sounds disabled', 'AUDIO');
      return;
    }

    // If sound not found, try to use fallback or 'click' sound
    if (!this.sounds[name]) {
      logger.warn(`⚠️ Sound not found: ${name}, trying fallback`, 'AUDIO');

      // Try to use 'click' as fallback, or 'button' if click doesn't exist
      const fallbackName = this.sounds.click ? 'click' : this.sounds.button ? 'button' : null;

      if (fallbackName && this.sounds[fallbackName]) {
        // Silent fallback - no need to log
        name = fallbackName;
      } else {
        // If no fallback available, try to initialize sounds or create fallbacks
        if (!this.isInitialized) {
          // Silent initialization - no need to log
          try {
            await this.initialize();
          } catch (error) {
            // Silent error handling - initialization failure is expected in some cases
            // Even if initialization fails, create fallback sounds
            if (!this.sounds || Object.keys(this.sounds).length === 0) {
              this.sounds = this.createFallbackSounds();
            }
          }

          // Try again after initialization
          if (!this.sounds[name] && this.sounds.click) {
            name = 'click';
          } else if (!this.sounds[name] && this.sounds.button) {
            name = 'button';
          } else if (!this.sounds[name]) {
            // Last resort: use vibration as fallback (silent)
            this.playGamingVibration(name);
            return;
          }
        } else {
          // Sounds are initialized but this specific sound is missing
          // Use vibration as fallback (silent)
          this.playGamingVibration(name);
          return;
        }
      }
    }

    try {
      const sound = this.sounds[name];

      await sound.stopAsync();
      if (sound.setPositionAsync) {
        await sound.setPositionAsync(0);
      }

      await sound.setVolumeAsync(this.soundVolume);
      await sound.playAsync();

      // Silent success - no need to log every sound play
      // logger.debug(`✅ Sound played successfully: ${name}`, 'AUDIO');
    } catch (error) {
      // Silent error handling - use vibration fallback without logging
      this.playGamingVibration(name);
    }
  }

  playNotification(name = 'notification') {
    if (!this.isNotificationEnabled) {
      logger.log('❌ Notifications disabled', 'AUDIO');
      return;
    }
    this.playSound(name);
  }

  async startContinuousBackgroundMusic() {
    if (!this.isMusicEnabled) {
      logger.log('🎵 Background music disabled', 'AUDIO');
      return;
    }

    if (this.isBackgroundMusicPlaying) {
      logger.log('🎵 Background music already playing', 'AUDIO');
      return;
    }

    logger.log('🎵 Starting background music', 'AUDIO');

    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.setVolumeAsync(this.musicVolume);
        await this.backgroundMusic.playAsync();
        this.isBackgroundMusicPlaying = true;
        logger.log('✅ Background music started', 'AUDIO');
      } else {
        logger.warn('Background music not loaded', 'AUDIO');
        this.backgroundMusic = this.createFallbackBackgroundMusic();
        await this.backgroundMusic.playAsync();
        this.isBackgroundMusicPlaying = true;
      }
    } catch (error) {
      logger.error('❌ Error starting background music:', 'AUDIO', error);
      this.backgroundMusic = this.createFallbackBackgroundMusic();
      await this.backgroundMusic.playAsync();
      this.isBackgroundMusicPlaying = true;
    }
  }

  async pauseContinuousBackgroundMusic() {
    logger.log('⏸️ Pausing background music', 'AUDIO');

    try {
      if (this.backgroundMusic && this.backgroundMusic.pauseAsync) {
        await this.backgroundMusic.pauseAsync();
      }
      this.isBackgroundMusicPlaying = false;
    } catch (error) {
      logger.error('❌ Error pausing background music:', 'AUDIO', error);
    }
  }

  async stopContinuousBackgroundMusic() {
    logger.log('⏹️ Stopping background music', 'AUDIO');

    try {
      if (this.backgroundMusic && this.backgroundMusic.stopAsync) {
        await this.backgroundMusic.stopAsync();
      }
      this.isBackgroundMusicPlaying = false;
    } catch (error) {
      logger.error('❌ Error stopping background music:', 'AUDIO', error);
    }
  }

  async toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    logger.log(`🎮 Sounds: ${this.isSoundEnabled ? 'ON' : 'OFF'}`, 'AUDIO');
    await this.saveSettingsToKeychain();
    if (this.isSoundEnabled) {
      setTimeout(() => this.playSound('click'), 100);
    }
    return this.isSoundEnabled;
  }

  async toggleMusic() {
    this.isMusicEnabled = !this.isMusicEnabled;
    logger.log(`🎵 Music: ${this.isMusicEnabled ? 'ON' : 'OFF'}`, 'AUDIO');
    await this.saveSettingsToKeychain();

    if (this.isMusicEnabled) {
      this.startContinuousBackgroundMusic();
    } else {
      this.stopContinuousBackgroundMusic();
    }

    return this.isMusicEnabled;
  }

  async toggleNotifications() {
    this.isNotificationEnabled = !this.isNotificationEnabled;
    logger.log(`🔔 Notifications: ${this.isNotificationEnabled ? 'ON' : 'OFF'}`, 'AUDIO');
    await this.saveSettingsToKeychain();
    if (this.isSoundEnabled) {
      setTimeout(() => this.playSound('click'), 100);
    }
    return this.isNotificationEnabled;
  }

  async setSoundVolume(volume) {
    // Throttle volume changes to prevent UI freeze
    if (this.volumeChangeTimeout) {
      clearTimeout(this.volumeChangeTimeout);
    }

    return new Promise(resolve => {
      this.volumeChangeTimeout = setTimeout(async () => {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        logger.debug(`🔊 Sound volume set to: ${this.soundVolume}`, 'AUDIO');

        // Only update if difference is significant
        for (const sound of Object.values(this.sounds)) {
          try {
            if (sound && sound.setVolumeAsync) {
              await sound.setVolumeAsync(this.soundVolume);
            }
          } catch (error) {
            logger.warn('Error setting sound volume:', 'AUDIO', error);
          }
        }

        await this.saveSettingsToKeychain();
        resolve(this.soundVolume);
      }, 300); // 300ms debounce
    });
  }

  async setMusicVolume(volume) {
    // Throttle volume changes to prevent UI freeze
    if (this.volumeChangeTimeout) {
      clearTimeout(this.volumeChangeTimeout);
    }

    return new Promise(resolve => {
      this.volumeChangeTimeout = setTimeout(async () => {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        logger.debug(`🔊 Music volume set to: ${this.musicVolume}`, 'AUDIO');

        try {
          if (this.backgroundMusic && this.backgroundMusic.setVolumeAsync) {
            await this.backgroundMusic.setVolumeAsync(this.musicVolume);
          }
        } catch (error) {
          logger.warn('Error setting music volume:', 'AUDIO', error);
        }

        await this.saveSettingsToKeychain();
        resolve(this.musicVolume);
      }, 300); // 300ms debounce
    });
  }

  getSettings() {
    return {
      sound: this.isSoundEnabled,
      music: this.isMusicEnabled,
      notifications: this.isNotificationEnabled,
      soundVolume: this.soundVolume,
      musicVolume: this.musicVolume,
      initialized: this.isInitialized,
      backgroundMusicPlaying: this.isBackgroundMusicPlaying,
    };
  }

  debugSounds() {
    logger.log('=== 🎮 AUDIO DEBUG ===', 'AUDIO');
    logger.log(`Platform: ${Platform.OS}`, 'AUDIO');
    logger.log('React Native: 0.77', 'AUDIO');
    logger.log(
      `Audio Method: ${this.backgroundMusic === this.createFallbackBackgroundMusic() ? 'Vibration Fallback' : 'expo-av/WebView'}`,
      'AUDIO'
    );
    logger.log(`System Initialized: ${this.isInitialized}`, 'AUDIO');
    logger.log(`Sounds Enabled: ${this.isSoundEnabled}`, 'AUDIO');
    logger.log(`Sound Volume: ${this.soundVolume}`, 'AUDIO');
    logger.log(`Music Enabled: ${this.isMusicEnabled}`, 'AUDIO');
    logger.log(`Music Volume: ${this.musicVolume}`, 'AUDIO');
    logger.log(`Background Music Playing: ${this.isBackgroundMusicPlaying}`, 'AUDIO');
    logger.log(`Notifications Enabled: ${this.isNotificationEnabled}`, 'AUDIO');
    logger.log(`Available Sounds: ${Object.keys(this.sounds).join(', ')}`, 'AUDIO');
    logger.log(`WebView Ready: ${this.webViewLoaded}`, 'AUDIO');
    logger.log('=====================================', 'AUDIO');
  }

  async release() {
    logger.log('🗑️ Releasing sound manager...', 'AUDIO');

    await this.stopContinuousBackgroundMusic();

    if (this.volumeChangeTimeout) {
      clearTimeout(this.volumeChangeTimeout);
      this.volumeChangeTimeout = null;
    }

    if (this.backgroundMusic) {
      try {
        if (this.backgroundMusic.stopAsync) await this.backgroundMusic.stopAsync();
        if (this.backgroundMusic.unloadAsync) await this.backgroundMusic.unloadAsync();
      } catch (error) {
        logger.warn('Error releasing background music', 'AUDIO', error);
      }
    }

    for (const sound of Object.values(this.sounds)) {
      try {
        if (sound && sound.stopAsync) await sound.stopAsync();
        if (sound && sound.unloadAsync) await sound.unloadAsync();
      } catch (error) {
        logger.warn('Error releasing sound', 'AUDIO', error);
      }
    }

    try {
      Vibration.cancel();
    } catch (error) {
      logger.warn('Could not cancel vibrations:', 'AUDIO', error);
    }

    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }

    if (this.webViewEventEmitter) {
      this.webViewEventEmitter.removeAllListeners();
      this.webViewEventEmitter = null;
    }

    this.sounds = {};
    this.backgroundMusic = null;
    this.isInitialized = false;
    this.isBackgroundMusicPlaying = false;
    this.webViewLoaded = false;

    logger.log('✅ Sound manager released', 'AUDIO');
  }

  // COMPATIBILITY METHODS for TriviaCoin codebase
  // These methods provide compatibility with AudioManagerSafe API

  /**
   * Initialize in background (non-blocking)
   */
  initializeInBackground() {
    if (this.isInitialized || this.isInitializing) {
      return;
    }
    this.isInitializing = true;
    this.initialize().catch(error => {
      logger.warn('Background audio initialization failed', 'AUDIO', error);
      // Even if initialization fails, set up fallback sounds so playSound doesn't crash
      if (!this.sounds || Object.keys(this.sounds).length === 0) {
        this.sounds = this.createFallbackSounds();
        logger.log('✅ Fallback sounds initialized after failure', 'AUDIO');
      }
      this.isInitialized = true; // Mark as initialized with fallbacks
      this.isInitializing = false;
    });
  }

  /**
   * Start screen-specific background music (compatibility method)
   * For TriviaCoin, this just starts regular background music
   */
  async startScreenBackgroundMusic(screenName) {
    logger.log(`🎵 Starting screen background music for: ${screenName}`, 'AUDIO');
    return this.startContinuousBackgroundMusic();
  }

  /**
   * Stop screen-specific background music (compatibility method)
   */
  async stopScreenBackgroundMusic() {
    logger.log('⏹️ Stopping screen background music', 'AUDIO');
    return this.stopContinuousBackgroundMusic();
  }

  /**
   * Stop a specific sound (compatibility method)
   */
  stopSound(soundName) {
    try {
      const sound = this.sounds[soundName];
      if (sound && sound.stopAsync) {
        sound.stopAsync().catch(() => {});
      }
    } catch (error) {
      logger.warn(`Error stopping sound ${soundName}:`, 'AUDIO', error);
    }
  }

  /**
   * Preload a sound (compatibility method - sounds are already loaded)
   */
  async preloadSound(soundName) {
    // Sounds are already loaded during initialization
    // This is a no-op for compatibility
    logger.debug(`Preload requested for ${soundName} (already loaded)`, 'AUDIO');
    return Promise.resolve();
  }

  // Screen music tracking (for compatibility)
  isScreenMusicPlaying = false;
  currentScreen = null;
}

export default SoundManager.getInstance();
