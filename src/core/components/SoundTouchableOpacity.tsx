/**
 * Sound TouchableOpacity - Professional Implementation
 * TouchableOpacity component with sound effects integration
 * Uses AudioManager directly for reliable sound playback
 */

import React, { useRef, forwardRef, useEffect } from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
// Use Safe Audio Manager (react-native-sound based)
import audioManager from '../../lib/audio/AudioManagerSafe';
import { logger } from '../../lib/utils/logger';

interface SoundTouchableOpacityProps extends TouchableOpacityProps {
  children: React.ReactNode;
  soundType?: 'click' | 'button' | 'message' | 'notification';
  onPress?: () => void;
  className?: string;
  disableSound?: boolean; // Option to disable sound for this specific component
}

// Debouncing for button sounds - OPTIMIZED FOR INSTANT FEEDBACK
let lastButtonSound = 0;
const BUTTON_SOUND_DEBOUNCE_MS = 250; // Professional balance: prevent double-taps without feeling sluggish
const BUTTON_SOUND_DELAY_MS = 0; // ZERO delay for instant professional feel

const SoundTouchableOpacity = forwardRef<React.ElementRef<typeof TouchableOpacity>, SoundTouchableOpacityProps>(
  ({ children, soundType = 'button', onPress, className, disableSound = false, ...props }, ref) => {
    const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // PROFESSIONAL: Play sound on PRESS IN for instant feedback
    const handlePressIn = () => {
      // INSTANT AUDIO FEEDBACK - trigger sound the moment user touches
      if (!disableSound && audioManager) {
        const isSoundEnabled = audioManager.isSoundEnabled !== false;

        if (isSoundEnabled) {
          const now = Date.now();
          if (now - lastButtonSound > BUTTON_SOUND_DEBOUNCE_MS) {
            lastButtonSound = now;

            // Clear any existing timeout
            if (soundTimeoutRef.current) {
              clearTimeout(soundTimeoutRef.current);
              soundTimeoutRef.current = null;
            }

            // Determine which sound to play
            let soundToPlay = 'button'; // Default
            switch (soundType) {
              case 'click':
              case 'button':
                soundToPlay = 'button';
                break;
              case 'message':
                soundToPlay = 'message';
                break;
              case 'notification':
                soundToPlay = 'notification';
                break;
              default:
                soundToPlay = 'button';
            }

            // Ensure audio is initialized before playing
            if (
              !audioManager.isInitialized &&
              typeof audioManager.initializeInBackground === 'function'
            ) {
              audioManager.initializeInBackground();
            }

            // INSTANT PLAYBACK - NO DELAY (0ms)
            // Use timeout pattern for safety but with 0ms delay
            soundTimeoutRef.current = setTimeout(() => {
              try {
                if (audioManager && typeof audioManager.playSound === 'function') {
                  audioManager.playSound(soundToPlay).catch(() => {
                    // Silent fail - audio is optional
                  });
                }
              } catch (error) {
                // Silent fail - audio is optional
              }
              soundTimeoutRef.current = null;
            }, BUTTON_SOUND_DELAY_MS);
          }
        }
      }
    };

    const handlePress = () => {
      // Execute the actual onPress handler - sound already played on press in
      if (onPress) {
        onPress();
      }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (soundTimeoutRef.current) {
          clearTimeout(soundTimeoutRef.current);
          soundTimeoutRef.current = null;
        }
      };
    }, []);

    return (
      <TouchableOpacity ref={ref} onPressIn={handlePressIn} onPress={handlePress} {...props}>
        {children}
      </TouchableOpacity>
    );
  }
);

SoundTouchableOpacity.displayName = 'SoundTouchableOpacity';

export default SoundTouchableOpacity;
