/**
 * Navigation Performance Monitoring Hook
 * Tracks navigation performance and identifies blocking operations
 */

import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

export const useNavigationPerformance = (screenName: string) => {
  const navigation = useNavigation();
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;

    if (timeSinceLastRender > 100) {
      console.warn(
        `⚠️ [PERF] ${screenName} render took ${timeSinceLastRender.toFixed(2)}ms (SLOW!)`
      );
    }

    lastRenderTimeRef.current = now;

    // Warn if too many renders
    if (renderCountRef.current > 20) {
      console.warn(
        `⚠️ [PERF] ${screenName} has rendered ${renderCountRef.current} times (possible loop!)`
      );
    }
  });

  // Monitor navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const focusTime = performance.now();
      console.log(`🟢 [PERF] ${screenName} focused at ${focusTime.toFixed(2)}ms`);
    });

    return unsubscribe;
  }, [navigation, screenName]);

  return {
    renderCount: renderCountRef.current,
  };
};
