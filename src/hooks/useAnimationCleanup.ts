/**
 * Enhanced Animation Cleanup Hook
 * Professional animation cleanup with memory leak prevention
 */

import { useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';

interface AnimationCleanupReturn {
  activeAnimations: React.MutableRefObject<Set<Animated.CompositeAnimation>>;
  addAnimation: (animation: Animated.CompositeAnimation) => void;
  removeAnimation: (animation: Animated.CompositeAnimation) => void;
  cleanup: () => void;
  cleanupAll: () => void;
}

export const useAnimationCleanup = (): AnimationCleanupReturn => {
  const activeAnimations = useRef<Set<Animated.CompositeAnimation>>(new Set());
  const animationTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const animationIntervals = useRef<Set<NodeJS.Timeout>>(new Set());

  const addAnimation = useCallback((animation: Animated.CompositeAnimation) => {
    activeAnimations.current.add(animation);
  }, []);

  const removeAnimation = useCallback((animation: Animated.CompositeAnimation) => {
    activeAnimations.current.delete(animation);
  }, []);

  const cleanup = useCallback(() => {
    // Stop all active animations
    activeAnimations.current.forEach(animation => {
      try {
        animation.stop();
      } catch (error) {}
    });
    activeAnimations.current.clear();

    // Clear all timeouts
    animationTimeouts.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    animationTimeouts.current.clear();

    // Clear all intervals
    animationIntervals.current.forEach(interval => {
      clearInterval(interval);
    });
    animationIntervals.current.clear();
  }, []);

  const cleanupAll = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    activeAnimations,
    addAnimation,
    removeAnimation,
    cleanup,
    cleanupAll,
  };
};
