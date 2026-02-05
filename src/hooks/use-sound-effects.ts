/**
 * useSoundEffects Hook - TypeScript Implementation
 * Professional sound effects hook with comprehensive features
 */

import { useRef, useCallback } from 'react';
import { useSound } from './useReduxHooks';
import { logger } from '../lib/utils/logger';

interface SoundEffectsReturn {
  playClick: () => void;
  playSuccess: () => void;
  playError: () => void;
  playCountdown: () => void;
  playMovingCards: () => void;
  playNotificationSound: () => void;
  playMessage: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playWin: () => void;
  playUniversalTap: () => void;
  startScreenMusic: (screenName: string) => Promise<void>;
  stopScreenMusic: () => Promise<void>;
  playCorrectSequence: () => Promise<void>;
  playWrongSequence: () => Promise<void>;
  playWinSequence: () => Promise<void>;
  canPlaySounds: boolean;
  currentScreen: string | null;
  isScreenMusicPlaying: boolean;
}

export const useSoundEffects = (): SoundEffectsReturn => {
  const {
    playSound,
    playEnhancedSound,
    playUniversalTapSound,
    soundEnabled,
    isInitialized,
    startScreenBackgroundMusic,
    stopScreenBackgroundMusic,
    currentScreen,
    isScreenMusicPlaying,
  } = useSound();

  const lastPlayedRef = useRef<number>(0);
  const musicOperationRef = useRef<boolean>(false);

  const playSoundThrottled = useCallback(
    (name: string): void => {
      const now = Date.now();
      if (now - lastPlayedRef.current > 100) {
        playSound(name);
        lastPlayedRef.current = now;
      }
    },
    [playSound]
  );

  const playSoundSafe = useCallback(
    (soundName: string): void => {
      // CRITICAL DEBUG: Block applause sound
      if (
        soundName === 'applause' ||
        soundName.toLowerCase() === 'applause' ||
        soundName.includes('applause')
      ) {
        console.error('🚫🚫🚫 BLOCKED: playSoundSafe attempted to play applause!', soundName);
        logger.error(`🚫 BLOCKED: playSoundSafe attempted to play applause!`, 'HOOK');
        return;
      }

      // ALWAYS try to play sound - don't block on checks
      // The audioManager will handle its own checks internally
      try {
        console.log(`🔊 DEBUG: playSoundSafe called for: ${soundName}`);
        logger.debug(`🔊 DEBUG: playSoundSafe called for: ${soundName}`, 'HOOK');
        if (soundEnabled && isInitialized) {
          playSoundThrottled(soundName);
        } else {
          // Even if checks fail, try to play via audioManager directly
          const audioManager = require('../lib/audio/sound-manager').default;
          if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound(soundName).catch(() => {
              // Silent fail
            });
          }
        }
      } catch (error) {
        // Last resort - try audioManager directly
        try {
          const audioManager = require('../lib/audio/sound-manager').default;
          if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound(soundName).catch(() => {});
          }
        } catch (e) {
          // Silent fail
        }
      }
    },
    [soundEnabled, isInitialized, playSoundThrottled]
  );

  const playEnhancedSoundSafe = useCallback(
    async (soundName: string): Promise<void> => {
      // CRITICAL DEBUG: Block applause sound
      if (
        soundName === 'applause' ||
        soundName.toLowerCase() === 'applause' ||
        soundName.includes('applause')
      ) {
        console.error(
          '🚫🚫🚫 BLOCKED: playEnhancedSoundSafe attempted to play applause!',
          soundName
        );
        logger.error(`🚫 BLOCKED: playEnhancedSoundSafe attempted to play applause!`, 'HOOK');
        return;
      }

      // ALWAYS try to play sound - don't return early
      try {
        console.log(`🔊 DEBUG: playEnhancedSoundSafe called for: ${soundName}`);
        logger.debug(`🔊 DEBUG: playEnhancedSoundSafe called for: ${soundName}`, 'HOOK');
        if (playEnhancedSound && typeof playEnhancedSound === 'function') {
          await playEnhancedSound(soundName);
        } else {
          playSoundSafe(soundName);
        }
      } catch (error) {
        logger.error('Error', 'HOOK', `❌ Enhanced sound error for ${soundName}:`, error);
        // Fallback to regular sound
        playSoundSafe(soundName);
      }

      // Even if checks fail, try audioManager directly
      if (!soundEnabled || !isInitialized) {
        try {
          const audioManager = require('../lib/audio/sound-manager').default;
          if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound(soundName).catch(() => {});
          }
        } catch (e) {
          // Silent fail
        }
      }
    },
    [soundEnabled, isInitialized, playEnhancedSound, playSoundSafe]
  );

  const startScreenMusic = useCallback(
    async (screenName: string): Promise<void> => {
      if (musicOperationRef.current) return;
      musicOperationRef.current = true;

      try {
        if (startScreenBackgroundMusic && typeof startScreenBackgroundMusic === 'function') {
          await startScreenBackgroundMusic(screenName);
        }
      } catch (error) {
        logger.error('Error', 'HOOK', `❌ Error starting screen music for ${screenName}:`, error);
      } finally {
        setTimeout(() => {
          musicOperationRef.current = false;
        }, 1000);
      }
    },
    [startScreenBackgroundMusic]
  );

  const stopScreenMusic = useCallback(async (): Promise<void> => {
    if (musicOperationRef.current) return;
    musicOperationRef.current = true;

    try {
      if (stopScreenBackgroundMusic && typeof stopScreenBackgroundMusic === 'function') {
        await stopScreenBackgroundMusic();
      }
    } catch (error) {
      logger.error('❌ Error stopping screen music:', 'HOOK', error);
    } finally {
      setTimeout(() => {
        musicOperationRef.current = false;
      }, 500);
    }
  }, [stopScreenBackgroundMusic]);

  return {
    playClick: useCallback(() => {
      // Play button click sound
      playSoundSafe('button');
    }, [playSoundSafe]),
    playSuccess: useCallback(() => playSoundSafe('success'), [playSoundSafe]),
    playError: useCallback(() => playSoundSafe('error'), [playSoundSafe]),
    playCountdown: useCallback(() => playSoundSafe('countdown'), [playSoundSafe]),
    playMovingCards: useCallback(() => playSoundSafe('movingcards'), [playSoundSafe]),
    playNotificationSound: useCallback(() => playSoundSafe('notification'), [playSoundSafe]),
    playMessage: useCallback(() => playSoundSafe('message'), [playSoundSafe]),

    playCorrect: useCallback(() => {}, []),
    playWrong: useCallback(() => {}, []),
    playWin: useCallback(() => playEnhancedSoundSafe('win'), [playEnhancedSoundSafe]),

    playUniversalTap: useCallback(() => {
      // Play button click sound for universal taps
      playSoundSafe('button');
    }, [playSoundSafe]),

    startScreenMusic,
    stopScreenMusic,

    playCorrectSequence: useCallback(async () => {
      await playEnhancedSoundSafe('correct');
      setTimeout(() => playSoundSafe('success'), 300);
    }, [playEnhancedSoundSafe, playSoundSafe]),

    playWrongSequence: useCallback(async () => {
      await playEnhancedSoundSafe('wrong');
      setTimeout(() => playSoundSafe('error'), 200);
    }, [playEnhancedSoundSafe, playSoundSafe]),

    playWinSequence: useCallback(async () => {
      // Removed applause sound - not required
      await playEnhancedSoundSafe('win');
      setTimeout(() => playSoundSafe('success'), 1000);
    }, [playEnhancedSoundSafe, playSoundSafe]),

    canPlaySounds: soundEnabled && isInitialized,
    currentScreen,
    isScreenMusicPlaying,
  };
};
