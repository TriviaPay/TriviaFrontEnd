/**
 * Enhanced Animation Throttling Hook
 * Professional animation throttling to prevent frame drops
 */

import { useRef, useCallback, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimationThrottlingConfig {
  maxConcurrentAnimations: number;
  frameRate: number;
  throttleDelay: number;
}

interface AnimationThrottlingReturn {
  queueAnimation: (animation: Animated.CompositeAnimation, priority?: number) => void;
  isAnimating: boolean;
  queueLength: number;
  clearQueue: () => void;
  setFrameRate: (frameRate: number) => void;
}

export const useAnimationThrottling = (
  config: Partial<AnimationThrottlingConfig> = {}
): AnimationThrottlingReturn => {
  const defaultConfig: AnimationThrottlingConfig = {
    maxConcurrentAnimations: 3,
    frameRate: 60,
    throttleDelay: 16, // ~60fps
    ...config,
  };

  const animationQueue = useRef<
    Array<{ animation: Animated.CompositeAnimation; priority: number }>
  >([]);
  const activeAnimations = useRef<Set<Animated.CompositeAnimation>>(new Set());
  const isAnimating = useRef<boolean>(false);
  const frameRateRef = useRef<number>(defaultConfig.frameRate);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processAnimationQueue = useCallback(() => {
    if (isAnimating.current || animationQueue.current.length === 0) return;

    // Sort by priority (higher number = higher priority)
    animationQueue.current.sort((a, b) => b.priority - a.priority);

    const nextAnimation = animationQueue.current.shift();
    if (!nextAnimation) return;

    const { animation } = nextAnimation;

    if (activeAnimations.current.size >= defaultConfig.maxConcurrentAnimations) {
      // Re-queue if too many active animations
      animationQueue.current.unshift(nextAnimation);
      return;
    }

    isAnimating.current = true;
    activeAnimations.current.add(animation);

    animation.start(({ finished }) => {
      activeAnimations.current.delete(animation);
      isAnimating.current = false;

      // Throttle next animation
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      throttleTimeoutRef.current = setTimeout(() => {
        processAnimationQueue();
      }, defaultConfig.throttleDelay);
    });
  }, [defaultConfig.maxConcurrentAnimations, defaultConfig.throttleDelay]);

  const queueAnimation = useCallback(
    (animation: Animated.CompositeAnimation, priority = 0) => {
      animationQueue.current.push({ animation, priority });
      processAnimationQueue();
    },
    [processAnimationQueue]
  );

  const clearQueue = useCallback(() => {
    animationQueue.current.forEach(({ animation }) => {
      try {
        animation.stop();
      } catch (error) {}
    });
    animationQueue.current = [];
    activeAnimations.current.clear();
    isAnimating.current = false;
  }, []);

  const setFrameRate = useCallback((frameRate: number) => {
    frameRateRef.current = frameRate;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearQueue();
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [clearQueue]);

  return {
    queueAnimation,
    isAnimating: isAnimating.current,
    queueLength: animationQueue.current.length,
    clearQueue,
    setFrameRate,
  };
};
