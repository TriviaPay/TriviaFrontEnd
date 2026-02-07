/**
 * Enhanced Animation Preloading Hook
 * Professional animation preloading for better UX
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface PreloadableAnimation {
  id: string;
  animation: Animated.CompositeAnimation;
  priority: number;
  preloadTime: number;
  isPreloaded: boolean;
}

interface AnimationPreloadingConfig {
  maxPreloadedAnimations: number;
  preloadTimeout: number;
  enablePreloading: boolean;
}

interface AnimationPreloadingReturn {
  preloadAnimation: (id: string, animation: Animated.CompositeAnimation, priority?: number) => void;
  getPreloadedAnimation: (id: string) => Animated.CompositeAnimation | null;
  isPreloaded: (id: string) => boolean;
  clearPreloadedAnimations: () => void;
  preloadedCount: number;
  preloadQueue: string[];
}

export const useAnimationPreloading = (
  config: Partial<AnimationPreloadingConfig> = {}
): AnimationPreloadingReturn => {
  const defaultConfig: AnimationPreloadingConfig = {
    maxPreloadedAnimations: 10,
    preloadTimeout: 5000,
    enablePreloading: true,
    ...config,
  };

  const preloadedAnimations = useRef<Map<string, PreloadableAnimation>>(new Map());
  const preloadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [preloadQueue, setPreloadQueue] = useState<string[]>([]);

  const preloadAnimation = useCallback(
    (id: string, animation: Animated.CompositeAnimation, priority = 0) => {
      if (!defaultConfig.enablePreloading) return;

      // Remove existing preload timeout
      const existingTimeout = preloadTimeouts.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Create preloadable animation
      const preloadableAnimation: PreloadableAnimation = {
        id,
        animation,
        priority,
        preloadTime: Date.now(),
        isPreloaded: false,
      };

      // Add to preloaded animations
      preloadedAnimations.current.set(id, preloadableAnimation);

      // Set preload timeout
      const timeout = setTimeout(() => {
        preloadableAnimation.isPreloaded = true;
        setPreloadedCount(prev => prev + 1);

        // Remove from queue
        setPreloadQueue(prev => prev.filter(queueId => queueId !== id));
      }, defaultConfig.preloadTimeout);

      preloadTimeouts.current.set(id, timeout);

      // Add to queue
      setPreloadQueue(prev => [...prev, id]);

      // Limit preloaded animations
      if (preloadedAnimations.current.size > defaultConfig.maxPreloadedAnimations) {
        const oldestAnimation = Array.from(preloadedAnimations.current.values()).sort(
          (a, b) => a.preloadTime - b.preloadTime
        )[0];

        if (oldestAnimation) {
          preloadedAnimations.current.delete(oldestAnimation.id);
          const timeout = preloadTimeouts.current.get(oldestAnimation.id);
          if (timeout) {
            clearTimeout(timeout);
            preloadTimeouts.current.delete(oldestAnimation.id);
          }
        }
      }
    },
    [defaultConfig]
  );

  const getPreloadedAnimation = useCallback((id: string): Animated.CompositeAnimation | null => {
    const preloadableAnimation = preloadedAnimations.current.get(id);
    if (preloadableAnimation && preloadableAnimation.isPreloaded) {
      return preloadableAnimation.animation;
    }
    return null;
  }, []);

  const isPreloaded = useCallback((id: string): boolean => {
    const preloadableAnimation = preloadedAnimations.current.get(id);
    return preloadableAnimation ? preloadableAnimation.isPreloaded : false;
  }, []);

  const clearPreloadedAnimations = useCallback(() => {
    // Clear all timeouts
    preloadTimeouts.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    preloadTimeouts.current.clear();

    // Clear preloaded animations
    preloadedAnimations.current.clear();
    setPreloadedCount(0);
    setPreloadQueue([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreloadedAnimations();
    };
  }, [clearPreloadedAnimations]);

  return {
    preloadAnimation,
    getPreloadedAnimation,
    isPreloaded,
    clearPreloadedAnimations,
    preloadedCount,
    preloadQueue,
  };
};
