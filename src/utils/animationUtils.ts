/**
 * Unified Animation System
 * Provides consistent, performant animations across the app
 * Ensures 60fps animations with proper optimization
 */

import { Animated, Easing, Platform, InteractionManager } from 'react-native';
import { useRef, useCallback, useEffect } from 'react';

/**
 * Animation configuration for consistent timing
 */
export const ANIMATION_CONFIG = {
  // Standard durations (ms)
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,

  // Easing functions
  EASE_OUT: Easing.bezier(0.0, 0, 0.2, 1),
  EASE_IN: Easing.bezier(0.4, 0, 1, 1),
  EASE_IN_OUT: Easing.bezier(0.4, 0, 0.2, 1),
  SPRING: Easing.elastic(1),

  // Performance settings
  USE_NATIVE_DRIVER: true, // Always use native driver for better performance
} as const;

/**
 * Create optimized animated value
 */
export const createAnimatedValue = (initialValue: number = 0): Animated.Value => {
  return new Animated.Value(initialValue);
};

/**
 * Fade in animation - optimized for 60fps
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = ANIMATION_CONFIG.NORMAL,
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: ANIMATION_CONFIG.EASE_OUT,
    useNativeDriver: ANIMATION_CONFIG.USE_NATIVE_DRIVER,
  }).start(callback);
};

/**
 * Fade out animation - optimized for 60fps
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = ANIMATION_CONFIG.NORMAL,
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: ANIMATION_CONFIG.EASE_IN,
    useNativeDriver: ANIMATION_CONFIG.USE_NATIVE_DRIVER,
  }).start(callback);
};

/**
 * Slide animation - optimized for 60fps
 */
export const slideIn = (
  animatedValue: Animated.Value,
  fromValue: number,
  toValue: number = 0,
  duration: number = ANIMATION_CONFIG.NORMAL,
  callback?: () => void
): Animated.CompositeAnimation => {
  animatedValue.setValue(fromValue);
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: ANIMATION_CONFIG.EASE_OUT,
    useNativeDriver: ANIMATION_CONFIG.USE_NATIVE_DRIVER,
  }).start(callback);
};

/**
 * Scale animation - optimized for 60fps
 */
export const scaleIn = (
  animatedValue: Animated.Value,
  fromScale: number = 0.8,
  toScale: number = 1,
  duration: number = ANIMATION_CONFIG.NORMAL,
  callback?: () => void
): Animated.CompositeAnimation => {
  animatedValue.setValue(fromScale);
  return Animated.timing(animatedValue, {
    toValue: toScale,
    duration,
    easing: ANIMATION_CONFIG.EASE_OUT,
    useNativeDriver: ANIMATION_CONFIG.USE_NATIVE_DRIVER,
  }).start(callback);
};

/**
 * Spring animation - smooth and natural
 */
export const springAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 40,
  friction: number = 7,
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    useNativeDriver: ANIMATION_CONFIG.USE_NATIVE_DRIVER,
  }).start(callback);
};

/**
 * Parallel animations - run multiple animations simultaneously
 */
export const animateParallel = (
  animations: Animated.CompositeAnimation[],
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.parallel(animations).start(callback);
};

/**
 * Sequence animations - run animations one after another
 */
export const animateSequence = (
  animations: Animated.CompositeAnimation[],
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.sequence(animations).start(callback);
};

/**
 * Stagger animations - run animations with delay between them
 */
export const animateStagger = (
  animations: Animated.CompositeAnimation[],
  delay: number = 100,
  callback?: () => void
): Animated.CompositeAnimation => {
  return Animated.stagger(delay, animations).start(callback);
};

/**
 * Hook for optimized fade animation
 */
export const useFadeAnimation = (initialValue: number = 0) => {
  const opacity = useRef(new Animated.Value(initialValue)).current;

  const fadeIn = useCallback(
    (duration?: number, callback?: () => void) => {
      return fadeIn(opacity, duration, callback);
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (duration?: number, callback?: () => void) => {
      return fadeOut(opacity, duration, callback);
    },
    [opacity]
  );

  return { opacity, fadeIn, fadeOut };
};

/**
 * Hook for optimized slide animation
 */
export const useSlideAnimation = (initialValue: number = 0) => {
  const translateY = useRef(new Animated.Value(initialValue)).current;

  const slideIn = useCallback(
    (fromValue: number, toValue?: number, duration?: number, callback?: () => void) => {
      return slideIn(translateY, fromValue, toValue, duration, callback);
    },
    [translateY]
  );

  const slideOut = useCallback(
    (toValue: number, duration?: number, callback?: () => void) => {
      return slideIn(translateY, translateY._value, toValue, duration, callback);
    },
    [translateY]
  );

  return { translateY, slideIn, slideOut };
};

/**
 * Hook for optimized scale animation
 */
export const useScaleAnimation = (initialValue: number = 1) => {
  const scale = useRef(new Animated.Value(initialValue)).current;

  const scaleIn = useCallback(
    (fromScale?: number, toScale?: number, duration?: number, callback?: () => void) => {
      return scaleIn(scale, fromScale, toScale, duration, callback);
    },
    [scale]
  );

  const scaleOut = useCallback(
    (toScale: number, duration?: number, callback?: () => void) => {
      return scaleIn(scale, scale._value, toScale, duration, callback);
    },
    [scale]
  );

  return { scale, scaleIn, scaleOut };
};

/**
 * Wait for interactions to complete before animating
 * Prevents jank during scroll/gesture interactions
 */
export const waitForInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(() => {
    // Small delay to ensure smooth transition
    setTimeout(callback, 16); // One frame delay for 60fps
  });
};

/**
 * Optimized animation that waits for interactions
 */
export const smoothAnimation = (
  animation: Animated.CompositeAnimation,
  callback?: () => void
): void => {
  waitForInteractions(() => {
    animation.start(callback);
  });
};

/**
 * Check if device can handle 60fps animations
 * Reduces animation complexity on lower-end devices
 */
export const shouldReduceMotion = (): boolean => {
  // Check for low-end device indicators
  // You can enhance this with actual device detection
  return Platform.OS === 'android' && Platform.Version < 26; // Android < 8.0
};

/**
 * Get optimized animation duration based on device capability
 */
export const getOptimizedDuration = (baseDuration: number): number => {
  if (shouldReduceMotion()) {
    return baseDuration * 0.7; // Faster animations on low-end devices
  }
  return baseDuration;
};

/**
 * Create animated style with optimized transforms
 */
export const createAnimatedStyle = (animatedValues: {
  opacity?: Animated.Value;
  translateX?: Animated.Value;
  translateY?: Animated.Value;
  scale?: Animated.Value;
  rotate?: Animated.Value;
}): any => {
  const style: any = {};

  if (animatedValues.opacity !== undefined) {
    style.opacity = animatedValues.opacity;
  }

  const transform: any[] = [];
  if (animatedValues.translateX !== undefined) {
    transform.push({ translateX: animatedValues.translateX });
  }
  if (animatedValues.translateY !== undefined) {
    transform.push({ translateY: animatedValues.translateY });
  }
  if (animatedValues.scale !== undefined) {
    transform.push({ scale: animatedValues.scale });
  }
  if (animatedValues.rotate !== undefined) {
    transform.push({ rotate: animatedValues.rotate });
  }

  if (transform.length > 0) {
    style.transform = transform;
  }

  return style;
};

export default {
  ANIMATION_CONFIG,
  createAnimatedValue,
  fadeIn,
  fadeOut,
  slideIn,
  scaleIn,
  springAnimation,
  animateParallel,
  animateSequence,
  animateStagger,
  useFadeAnimation,
  useSlideAnimation,
  useScaleAnimation,
  waitForInteractions,
  smoothAnimation,
  shouldReduceMotion,
  getOptimizedDuration,
  createAnimatedStyle,
};
