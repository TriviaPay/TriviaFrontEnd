/**
 * Screen Transition Utilities
 * Provides smooth, optimized screen transitions
 * Works with React Navigation without breaking existing transitions
 */

import { Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';

/**
 * Transition configuration
 */
export const TRANSITION_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
  useNativeDriver: true,
} as const;

/**
 * Create fade transition
 */
export const createFadeTransition = (
  opacity: Animated.Value,
  duration: number = TRANSITION_CONFIG.duration
): Animated.CompositeAnimation => {
  return Animated.timing(opacity, {
    toValue: 1,
    duration,
    easing: TRANSITION_CONFIG.easing,
    useNativeDriver: TRANSITION_CONFIG.useNativeDriver,
  });
};

/**
 * Create slide transition
 */
export const createSlideTransition = (
  translateX: Animated.Value,
  fromX: number = -100,
  toX: number = 0,
  duration: number = TRANSITION_CONFIG.duration
): Animated.CompositeAnimation => {
  translateX.setValue(fromX);
  return Animated.timing(translateX, {
    toValue: toX,
    duration,
    easing: TRANSITION_CONFIG.easing,
    useNativeDriver: TRANSITION_CONFIG.useNativeDriver,
  });
};

/**
 * Create scale transition
 */
export const createScaleTransition = (
  scale: Animated.Value,
  fromScale: number = 0.9,
  toScale: number = 1,
  duration: number = TRANSITION_CONFIG.duration
): Animated.CompositeAnimation => {
  scale.setValue(fromScale);
  return Animated.timing(scale, {
    toValue: toScale,
    duration,
    easing: TRANSITION_CONFIG.easing,
    useNativeDriver: TRANSITION_CONFIG.useNativeDriver,
  });
};

/**
 * Hook for screen enter animation
 */
export const useScreenEnter = (enabled: boolean = true) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (enabled) {
      Animated.parallel([
        createFadeTransition(opacity),
        Animated.timing(translateY, {
          toValue: 0,
          duration: TRANSITION_CONFIG.duration,
          easing: TRANSITION_CONFIG.easing,
          useNativeDriver: TRANSITION_CONFIG.useNativeDriver,
        }),
      ]).start();
    }
  }, [enabled, opacity, translateY]);

  return {
    opacity,
    translateY,
    style: {
      opacity,
      transform: [{ translateY }],
    },
  };
};

/**
 * Shared element transition helper
 * For future shared element transitions
 */
export const createSharedElementTransition = (sharedId: string, fromStyle: any, toStyle: any) => {
  // Placeholder for shared element transitions
  // Can be implemented with react-native-shared-element or similar
  return {
    sharedId,
    fromStyle,
    toStyle,
  };
};

export default {
  TRANSITION_CONFIG,
  createFadeTransition,
  createSlideTransition,
  createScaleTransition,
  useScreenEnter,
  createSharedElementTransition,
};
