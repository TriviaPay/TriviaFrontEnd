/**
 * useStageAudio - Custom hook for managing stage-based background music
 * Handles clean transitions between stages with no overlaps
 */

import { useEffect, useRef } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import audioManager from '../lib/audio/sound-manager';
import { logger } from '../lib/utils/logger';

interface StageAudioConfig {
  stage: number;
  isFocused?: boolean;
}

/**
 * Stage audio mapping:
 * - Stage 1: No background music
 * - Stage 2: No background music
 * - Stage 3: 'live_winners' background music (loops continuously) - ONLY music that plays
 */

export const useStageAudio = ({ stage, isFocused = true }: StageAudioConfig): void => {
  const currentStageRef = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const screenFocused = useIsFocused(); // Automatically detects screen focus state
  const navigation = useNavigation();

  // Debug: Log when stage or focus changes
  useEffect(() => {
    logger.debug(
      `useStageAudio: Stage=${stage}, screenFocused=${screenFocused}, isFocused=${isFocused}`,
      'AUDIO'
    );
  }, [stage, screenFocused, isFocused]);

  // CRITICAL: Add navigation listeners as backup to ensure music stops
  // This is more reliable than just relying on useIsFocused
  useEffect(() => {
    if (!navigation) return;

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // CRITICAL: Stop music immediately when screen loses focus
      logger.debug('useStageAudio: Navigation blur - force stopping music', 'AUDIO');

      const forceStop = () => {
        try {
          // Stop music multiple times
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});

          // Force stop player directly
          if ((audioManager as any)?.screenMusicPlayer) {
            try {
              const player = (audioManager as any).screenMusicPlayer;
              (player as any).stop();
              (player as any).setNumberOfLoops(0);
              (player as any).release();
            } catch (e) {
              // Silent fail
            }
          }

          // Clear flags
          if (audioManager) {
            (audioManager as any).isScreenMusicPlaying = false;
            (audioManager as any).currentScreen = null;
          }
        } catch (error) {
          // Silent fail
        }
      };

      forceStop();
      setTimeout(forceStop, 10);
      setTimeout(forceStop, 50);
      setTimeout(forceStop, 100);
    });

    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
      // CRITICAL: Stop music before navigation
      logger.debug('useStageAudio: Navigation beforeRemove - force stopping music', 'AUDIO');

      const forceStop = () => {
        try {
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});

          if ((audioManager as any)?.screenMusicPlayer) {
            try {
              const player = (audioManager as any).screenMusicPlayer;
              (player as any).stop();
              (player as any).setNumberOfLoops(0);
              (player as any).release();
            } catch (e) {
              // Silent fail
            }
          }

          if (audioManager) {
            (audioManager as any).isScreenMusicPlaying = false;
            (audioManager as any).currentScreen = null;
          }
        } catch (error) {
          // Silent fail
        }
      };

      forceStop();
      setTimeout(forceStop, 10);
      setTimeout(forceStop, 50);
    });

    return () => {
      unsubscribeBlur();
      unsubscribeBeforeRemove();
    };
  }, [navigation]);

  useEffect(() => {
    // CRITICAL: Only manage audio when screen is focused
    // Music stops immediately when screen loses focus (user navigates away)
    // This applies to ALL stages including stage 3
    if (!screenFocused || !isFocused) {
      // Stop all audio immediately when screen loses focus - CRITICAL for proper cleanup
      // This ensures music doesn't continue playing when user leaves winner screen
      logger.debug(
        'Screen lost focus - stopping background music immediately (stage 3 fix)',
        'AUDIO'
      );

      // CRITICAL: Stop immediately - match old working code exactly
      // Direct synchronous calls - no async/await delays
      // This is especially important for stage 3 music
      const stopAllAudio = () => {
        try {
          // Stop background music immediately - call multiple times
          // CRITICAL: For stage 3, we need to be extra aggressive
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});

          // CRITICAL: Also force stop the screen music player directly if it exists
          // This ensures music stops even if stopScreenBackgroundMusic has issues
          // This is the KEY FIX for stage 3 music not stopping
          if ((audioManager as any)?.screenMusicPlayer) {
            try {
              const player = (audioManager as any).screenMusicPlayer;
              // Force stop multiple ways
              (player as any).stop();
              (player as any).stop(() => {}); // With callback
              (player as any).release();
            } catch (e) {
              // Silent fail
            }
          }

          // Force clear music flags to prevent music from restarting
          // CRITICAL: Set these flags BEFORE any async operations
          if (audioManager) {
            (audioManager as any).isScreenMusicPlaying = false;
            (audioManager as any).currentScreen = null;
            (audioManager as any).isStoppingMusic = true; // Prevent restart
          }

          // Stop all sounds immediately (removed applause - not used)
          audioManager.stopSound?.('countdown');
          audioManager.stopSound?.('movingcards');
          audioManager.stopSound?.('win');
          audioManager.stopSound?.('message');
          audioManager.stopSound?.('click');
        } catch (error) {
          // Silent fail - audio manager may not be available
        }
      };

      // Stop immediately - CRITICAL: This must run synchronously
      stopAllAudio();

      // Also stop with small delays to ensure it stops (aggressive cleanup)
      // Extra delays for stage 3 music which might be harder to stop
      setTimeout(stopAllAudio, 10);
      setTimeout(stopAllAudio, 50);
      setTimeout(stopAllAudio, 100);
      setTimeout(stopAllAudio, 200);
      setTimeout(stopAllAudio, 500);

      currentStageRef.current = null;
      isInitializedRef.current = false;

      // CRITICAL: Return early to prevent handleScreenMusic from running
      // This ensures music doesn't restart after we stop it
      return;
    }

    // CRITICAL: Music is tied to SCREEN, not to stages
    // Start music ONCE when screen is focused, continue through all stages
    const handleScreenMusic = async () => {
      // Only manage music based on screen focus, NOT stage changes
      // Music should start once when screen is focused and continue through all stages

      // Screen is focused - check if music is already playing
      // If playing, keep it playing (don't restart for stage changes)
      if (audioManager.isScreenMusicPlaying && audioManager.currentScreen === 'live_winners') {
        // Verify it's actually playing
        if ((audioManager as any)?.screenMusicPlayer) {
          try {
            const isPlaying =
              ((audioManager as any).screenMusicPlayer as any).isPlaying?.() || false;
            if (isPlaying) {
              logger.debug('Music already playing - continuing across all stages', 'AUDIO');
              currentStageRef.current = stage;
              isInitializedRef.current = true;
              return; // Already playing, keep it playing - don't restart
            } else {
              logger.debug(`Flag says playing but isPlaying() is false - will start`, 'AUDIO');
              // Fall through to start music
            }
          } catch (e) {
            logger.debug(`Could not verify playing state, will start to be safe`, 'AUDIO', e);
            // Fall through to start music
          }
        } else {
          // Flag says playing but no player - need to start
          logger.debug(`Flag says playing but no player instance - starting music`, 'AUDIO');
          // Fall through to start music
        }
      }

      // Music is not playing - start it ONCE (for the screen, not for the stage)
      logger.debug(
        `Screen focused - starting live_winners music (will continue through all stages)`,
        'AUDIO',
        {
          isScreenMusicPlaying: audioManager.isScreenMusicPlaying,
          currentScreen: audioManager.currentScreen,
          isMusicEnabled: audioManager.isMusicEnabled,
        }
      );

      logger.debug(
        'Starting live_winners music for screen (will continue through all stages)',
        'AUDIO'
      );

      try {
        // Clear stopping flag before starting
        if ((audioManager as any).isStoppingMusic) {
          console.log(`✅ Clearing isStoppingMusic flag to allow music to start`);
          (audioManager as any).isStoppingMusic = false;
        }

        console.log(`🎵 Calling startScreenBackgroundMusic("live_winners")...`);
        await audioManager.startScreenBackgroundMusic('live_winners').catch(error => {
          console.log(`⚠️ Failed to start music, retrying...`, error);
          logger.debug('Failed to start music, retrying', 'AUDIO', error);
          // Retry after delay
          setTimeout(async () => {
            if (screenFocused && isFocused) {
              try {
                if ((audioManager as any).isStoppingMusic) {
                  (audioManager as any).isStoppingMusic = false;
                }
                console.log(`🔄 Retrying to start music...`);
                await audioManager.startScreenBackgroundMusic('live_winners');
              } catch (retryError) {
                console.log(`⚠️ Retry also failed`, retryError);
              }
            }
          }, 500);
        });

        currentStageRef.current = stage;
        isInitializedRef.current = true;
      } catch (error) {
        console.log(`❌ Error starting music`, error);
        logger.debug('Error starting music', 'AUDIO', error);
      }
    };

    handleScreenMusic();

    // Cleanup function - ONLY stop music when screen loses focus, NOT when stage changes
    return () => {
      // CRITICAL: Only stop music if screen is losing focus, NOT when stage changes
      // Music should continue playing across all stages (1, 2, 3)
      // Only stop when screen actually loses focus (navigating away)
      if (!screenFocused || !isFocused) {
        // Screen is losing focus - stop music
        const stopMusic = () => {
          try {
            // Stop background music immediately - synchronous calls for immediate effect
            audioManager.stopScreenBackgroundMusic().catch(() => {});
            audioManager.stopScreenBackgroundMusic().catch(() => {});
            audioManager.stopScreenBackgroundMusic().catch(() => {});

            // CRITICAL: Also force stop the screen music player directly if it exists
            if ((audioManager as any)?.screenMusicPlayer) {
              try {
                const player = (audioManager as any).screenMusicPlayer;
                (player as any).stop();
                (player as any).release();
              } catch (e) {
                // Silent fail
              }
            }

            // Force clear music flags to prevent music from restarting
            if (audioManager) {
              (audioManager as any).isScreenMusicPlaying = false;
              (audioManager as any).currentScreen = null;
            }
          } catch (error) {
            // Silent fail
          }
        };

        // Stop immediately when screen loses focus
        stopMusic();
        setTimeout(stopMusic, 10);
        setTimeout(stopMusic, 50);
        setTimeout(stopMusic, 100);
      }
      // If screen is still focused, don't stop music - let it continue across stages
    };
  }, [stage, screenFocused, isFocused]); // CRITICAL: Include all dependencies so effect re-runs on focus change

  // Cleanup on unmount or when screen loses focus
  useEffect(() => {
    return () => {
      // CRITICAL: Force stop music on unmount - multiple attempts to ensure it stops
      // This is especially important for stage 3 music
      const forceStopMusic = () => {
        try {
          // Stop background music immediately - call multiple times
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});
          audioManager.stopScreenBackgroundMusic().catch(() => {});

          // CRITICAL: Also force stop the screen music player directly
          if ((audioManager as any)?.screenMusicPlayer) {
            try {
              const player = (audioManager as any).screenMusicPlayer;
              (player as any).stop();
              (player as any).release();
            } catch (e) {
              // Silent fail
            }
          }

          // Force clear music flags
          if (audioManager) {
            (audioManager as any).isScreenMusicPlaying = false;
            (audioManager as any).currentScreen = null;
          }
        } catch (error) {
          // Silent fail
        }
      };

      // Stop immediately
      forceStopMusic();

      // Immediate retry to ensure music stops
      setTimeout(forceStopMusic, 50);
      setTimeout(forceStopMusic, 100);
      setTimeout(forceStopMusic, 200);
      setTimeout(forceStopMusic, 500);

      currentStageRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);
};

export default useStageAudio;
