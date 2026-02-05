/**
 * Interaction Feedback System
 * Provides consistent, responsive feedback for all user interactions
 */

import { Platform, Vibration } from 'react-native';
import { Animated } from 'react-native';

// Try to import Haptics (may not be available on all platforms)
let Haptics: any = null;
try {
  if (Platform.OS === 'ios') {
    Haptics = require('expo-haptics').default;
  }
} catch (e) {
  // Haptics not available - will use Vibration fallback
}

/**
 * Haptic feedback types
 */
export enum HapticType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection',
}

/**
 * Trigger haptic feedback
 * Optimized for both iOS and Android
 */
export const triggerHaptic = (type: HapticType = HapticType.SELECTION): void => {
  try {
    if (Platform.OS === 'ios' && Haptics) {
      // iOS Haptics API (if available)
      try {
        switch (type) {
          case HapticType.LIGHT:
            if (Haptics.impactAsync) Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light || 0);
            break;
          case HapticType.MEDIUM:
            if (Haptics.impactAsync) Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Medium || 1);
            break;
          case HapticType.HEAVY:
            if (Haptics.impactAsync) Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Heavy || 2);
            break;
          case HapticType.SUCCESS:
            if (Haptics.notificationAsync)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Success || 0);
            break;
          case HapticType.WARNING:
            if (Haptics.notificationAsync)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Warning || 1);
            break;
          case HapticType.ERROR:
            if (Haptics.notificationAsync)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Error || 2);
            break;
          case HapticType.SELECTION:
            if (Haptics.selectionAsync) Haptics.selectionAsync();
            break;
        }
      } catch (e) {
        // Fallback to vibration if haptics fail
        Vibration.vibrate(15);
      }
    } else if (Platform.OS === 'android') {
      // Android Vibration API
      switch (type) {
        case HapticType.LIGHT:
          Vibration.vibrate(10);
          break;
        case HapticType.MEDIUM:
          Vibration.vibrate(20);
          break;
        case HapticType.HEAVY:
          Vibration.vibrate(30);
          break;
        case HapticType.SUCCESS:
          Vibration.vibrate([0, 50, 50, 50]);
          break;
        case HapticType.WARNING:
          Vibration.vibrate([0, 100, 50, 100]);
          break;
        case HapticType.ERROR:
          Vibration.vibrate([0, 200, 100, 200]);
          break;
        case HapticType.SELECTION:
          Vibration.vibrate(15);
          break;
      }
    }
  } catch (error) {
    // Silent fail - haptics not critical
  }
};

/**
 * Button press animation - optimized for immediate feedback
 * Uses optimized timing for 60fps
 */
export const createButtonPressAnimation = (
  animatedValue: Animated.Value,
  scale: number = 0.95
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: scale,
      duration: 80, // Faster for immediate feedback
      easing: Animated.Easing.out(Animated.Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 120, // Smooth return
      easing: Animated.Easing.out(Animated.Easing.ease),
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Touch feedback animation
 */
export const createTouchFeedback = (
  animatedValue: Animated.Value,
  feedbackType: 'press' | 'release' = 'press'
): Animated.CompositeAnimation => {
  if (feedbackType === 'press') {
    return Animated.timing(animatedValue, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    });
  } else {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    });
  }
};

/**
 * Optimized press handler with haptic feedback
 */
export const createPressHandler = (
  onPress: () => void,
  options: {
    haptic?: HapticType;
    animatedValue?: Animated.Value;
    scale?: number;
  } = {}
): (() => void) => {
  return () => {
    // Immediate haptic feedback
    if (options.haptic) {
      triggerHaptic(options.haptic);
    }

    // Visual feedback
    if (options.animatedValue) {
      createButtonPressAnimation(options.animatedValue, options.scale).start();
    }

    // Execute callback
    onPress();
  };
};

/**
 * Debounced haptic feedback to prevent excessive vibrations
 */
let lastHapticTime = 0;
const HAPTIC_DEBOUNCE = 50; // 50ms debounce

export const triggerDebouncedHaptic = (type: HapticType = HapticType.SELECTION): void => {
  const now = Date.now();
  if (now - lastHapticTime > HAPTIC_DEBOUNCE) {
    triggerHaptic(type);
    lastHapticTime = now;
  }
};

export default {
  HapticType,
  triggerHaptic,
  triggerDebouncedHaptic,
  createButtonPressAnimation,
  createTouchFeedback,
  createPressHandler,
};
