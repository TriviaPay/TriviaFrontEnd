/**
 * Loading State Animation
 * Prevents visual jumps when loading states change
 * Smooth transitions between loading/loaded states
 */

import { Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';

/**
 * Smooth loading state transition
 */
export const useLoadingTransition = (isLoading: boolean) => {
  const opacity = useRef(new Animated.Value(isLoading ? 0 : 1)).current;
  const scale = useRef(new Animated.Value(isLoading ? 0.95 : 1)).current;

  useEffect(() => {
    if (isLoading) {
      // Fade in and scale up when loading starts
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and scale down when loading ends
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset after animation completes
        opacity.setValue(0);
        scale.setValue(0.95);
      });
    }
  }, [isLoading, opacity, scale]);

  return {
    opacity,
    scale,
    style: {
      opacity,
      transform: [{ scale }],
    },
  };
};

/**
 * Skeleton loader animation
 * Smooth pulsing animation for skeleton loaders
 */
export const useSkeletonAnimation = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return { opacity };
};

/**
 * Content reveal animation
 * Smoothly reveals content when it loads
 */
export const useContentReveal = (isReady: boolean) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (isReady) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isReady, opacity, translateY]);

  return {
    opacity,
    translateY,
    style: {
      opacity,
      transform: [{ translateY }],
    },
  };
};

export default {
  useLoadingTransition,
  useSkeletonAnimation,
  useContentReveal,
};
