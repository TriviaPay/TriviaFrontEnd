/**
 * UniversalTouchable - Wrapper for all touchable components
 * Automatically plays button click sound on press
 * Can be used as drop-in replacement for TouchableOpacity, TouchableHighlight, etc.
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  TouchableHighlight,
  TouchableHighlightProps,
  TouchableWithoutFeedback,
  TouchableWithoutFeedbackProps,
  Pressable,
  PressableProps,
} from 'react-native';
import audioManager from '../../lib/audio/AudioManagerSafe';

// Debouncing for universal tap sounds - OPTIMIZED FOR INSTANT FEEDBACK
let lastTapSound = 0;
const TAP_SOUND_DEBOUNCE_MS = 250; // Professional balance

const playTapSound = () => {
  if (!audioManager.isSoundEnabled) return;

  const now = Date.now();
  if (now - lastTapSound > TAP_SOUND_DEBOUNCE_MS) {
    lastTapSound = now;
    // INSTANT playback - no delay
    audioManager.playSound('button').catch(() => {
      // Silently fail if sound can't play
    });
  }
};

/**
 * Universal TouchableOpacity - plays sound on press IN (instant feedback)
 */
export const UniversalTouchableOpacity: React.FC<TouchableOpacityProps> = ({
  onPress,
  onPressIn,
  ...props
}) => {
  const handlePressIn = (event: any) => {
    playTapSound(); // Play sound instantly when touch begins
    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePress = (event: any) => {
    if (onPress) {
      onPress(event);
    }
  };

  return <TouchableOpacity {...props} onPressIn={handlePressIn} onPress={handlePress} />;
};

/**
 * Universal TouchableHighlight - plays sound on press IN (instant feedback)
 */
export const UniversalTouchableHighlight: React.FC<TouchableHighlightProps> = ({
  onPress,
  onPressIn,
  ...props
}) => {
  const handlePressIn = (event: any) => {
    playTapSound();
    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePress = (event: any) => {
    if (onPress) {
      onPress(event);
    }
  };

  return <TouchableHighlight {...props} onPressIn={handlePressIn} onPress={handlePress} />;
};

/**
 * Universal Pressable - plays sound on press IN (instant feedback)
 */
export const UniversalPressable: React.FC<PressableProps> = ({ onPress, onPressIn, ...props }) => {
  const handlePressIn = (event: any) => {
    playTapSound();
    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePress = (event: any) => {
    if (onPress) {
      onPress(event);
    }
  };

  return <Pressable {...props} onPressIn={handlePressIn} onPress={handlePress} />;
};

/**
 * Universal TouchableWithoutFeedback - plays sound on press
 */
export const UniversalTouchableWithoutFeedback: React.FC<TouchableWithoutFeedbackProps> = ({
  onPress,
  ...props
}) => {
  const handlePress = (event: any) => {
    playTapSound();
    if (onPress) {
      onPress(event);
    }
  };

  return <TouchableWithoutFeedback {...props} onPress={handlePress} />;
};

// Default export for convenience (TouchableOpacity is most common)
export default UniversalTouchableOpacity;
