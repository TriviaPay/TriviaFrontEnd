/**
 * useHomeAnimations - Performance-optimized animation hook for home screen
 * Provides smooth animations with native driver support and memory management
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Platform } from 'react-native';

interface AnimationConfig {
  duration?: number;
  delay?: number;
  useNativeDriver?: boolean;
  tension?: number;
  friction?: number;
}

interface HomeAnimations {
  fadeIn: (config?: AnimationConfig) => void;
  slideIn: (direction: 'up' | 'down' | 'left' | 'right', config?: AnimationConfig) => void;
  scaleIn: (config?: AnimationConfig) => void;
  pulse: (config?: AnimationConfig) => void;
  reset: () => void;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  scaleAnim: Animated.Value;
  pulseAnim: Animated.Value;
}

export const useHomeAnimations = (): HomeAnimations => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fadeIn = useCallback(
    (config: AnimationConfig = {}) => {
      const { duration = 800, delay = 0, useNativeDriver = true } = config;

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver,
      }).start();
    },
    [fadeAnim]
  );

  const slideIn = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right', config: AnimationConfig = {}) => {
      const { duration = 600, delay = 0, useNativeDriver = true } = config;

      let initialValue = 0;
      switch (direction) {
        case 'up':
          initialValue = 50;
          break;
        case 'down':
          initialValue = -50;
          break;
        case 'left':
          initialValue = 50;
          break;
        case 'right':
          initialValue = -50;
          break;
      }

      slideAnim.setValue(initialValue);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver,
      }).start();
    },
    [slideAnim]
  );

  const scaleIn = useCallback(
    (config: AnimationConfig = {}) => {
      const {
        duration = 600,
        delay = 0,
        useNativeDriver = true,
        tension = 50,
        friction = 8,
      } = config;

      scaleAnim.setValue(0.9);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension,
        friction,
        useNativeDriver,
      }).start();
    },
    [scaleAnim]
  );

  const pulse = useCallback(
    (config: AnimationConfig = {}) => {
      const { duration = 1000, useNativeDriver = true } = config;

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: duration / 2,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver,
          }),
        ])
      ).start();
    },
    [pulseAnim]
  );

  const reset = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(0);
    scaleAnim.setValue(1);
    pulseAnim.setValue(1);
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  return {
    fadeIn,
    slideIn,
    scaleIn,
    pulse,
    reset,
    fadeAnim,
    slideAnim,
    scaleAnim,
    pulseAnim,
  };
};

export default useHomeAnimations;
