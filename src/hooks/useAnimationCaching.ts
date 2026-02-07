/**
 * Enhanced Animation Caching Hook
 * Professional animation caching for repeated animations
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface CachedAnimation {
  id: string;
  animation: Animated.CompositeAnimation;
  duration: number;
  lastUsed: number;
  useCount: number;
  isActive: boolean;
}

interface AnimationCachingConfig {
  maxCachedAnimations: number;
  cacheTimeout: number;
  enableCaching: boolean;
  autoCleanup: boolean;
}

interface AnimationCachingReturn {
  cacheAnimation: (id: string, animation: Animated.CompositeAnimation, duration?: number) => void;
  getCachedAnimation: (id: string) => Animated.CompositeAnimation | null;
  isCached: (id: string) => boolean;
  clearCache: () => void;
  getCacheStats: () => { size: number; hitRate: number; totalUses: number };
  cleanupExpiredAnimations: () => void;
}

export const useAnimationCaching = (
  config: Partial<AnimationCachingConfig> = {}
): AnimationCachingReturn => {
  const defaultConfig: AnimationCachingConfig = {
    maxCachedAnimations: 20,
    cacheTimeout: 30000, // 30 seconds
    enableCaching: true,
    autoCleanup: true,
    ...config,
  };

  const cachedAnimations = useRef<Map<string, CachedAnimation>>(new Map());
  const cacheStats = useRef({ hits: 0, misses: 0, totalUses: 0 });
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cacheAnimation = useCallback(
    (id: string, animation: Animated.CompositeAnimation, duration = 1000) => {
      if (!defaultConfig.enableCaching) return;

      const cachedAnimation: CachedAnimation = {
        id,
        animation,
        duration,
        lastUsed: Date.now(),
        useCount: 0,
        isActive: false,
      };

      cachedAnimations.current.set(id, cachedAnimation);

      // Limit cached animations
      if (cachedAnimations.current.size > defaultConfig.maxCachedAnimations) {
        const oldestAnimation = Array.from(cachedAnimations.current.values()).sort(
          (a, b) => a.lastUsed - b.lastUsed
        )[0];

        if (oldestAnimation) {
          cachedAnimations.current.delete(oldestAnimation.id);
        }
      }
    },
    [defaultConfig]
  );

  const getCachedAnimation = useCallback((id: string): Animated.CompositeAnimation | null => {
    const cachedAnimation = cachedAnimations.current.get(id);

    if (cachedAnimation) {
      cachedAnimation.lastUsed = Date.now();
      cachedAnimation.useCount++;
      cacheStats.current.hits++;
      cacheStats.current.totalUses++;

      return cachedAnimation.animation;
    }

    cacheStats.current.misses++;
    cacheStats.current.totalUses++;
    return null;
  }, []);

  const isCached = useCallback((id: string): boolean => {
    return cachedAnimations.current.has(id);
  }, []);

  const clearCache = useCallback(() => {
    cachedAnimations.current.clear();
    cacheStats.current = { hits: 0, misses: 0, totalUses: 0 };
  }, []);

  const getCacheStats = useCallback(() => {
    const hitRate =
      cacheStats.current.totalUses > 0
        ? (cacheStats.current.hits / cacheStats.current.totalUses) * 100
        : 0;

    return {
      size: cachedAnimations.current.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalUses: cacheStats.current.totalUses,
    };
  }, []);

  const cleanupExpiredAnimations = useCallback(() => {
    const now = Date.now();
    const expiredAnimations: string[] = [];

    cachedAnimations.current.forEach((animation, id) => {
      if (now - animation.lastUsed > defaultConfig.cacheTimeout) {
        expiredAnimations.push(id);
      }
    });

    expiredAnimations.forEach(id => {
      cachedAnimations.current.delete(id);
    });

    if (expiredAnimations.length > 0) {
    }
  }, [defaultConfig.cacheTimeout]);

  // Auto-cleanup setup
  useEffect(() => {
    if (defaultConfig.autoCleanup) {
      cleanupIntervalRef.current = setInterval(() => {
        cleanupExpiredAnimations();
      }, defaultConfig.cacheTimeout / 2);
    }

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [defaultConfig.autoCleanup, defaultConfig.cacheTimeout, cleanupExpiredAnimations]);

  return {
    cacheAnimation,
    getCachedAnimation,
    isCached,
    clearCache,
    getCacheStats,
    cleanupExpiredAnimations,
  };
};
