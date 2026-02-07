/**
 * Enhanced Animation Analytics Hook
 * Professional animation analytics for performance monitoring
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Animated } from 'react-native';

interface AnimationAnalytics {
  totalAnimations: number;
  successfulAnimations: number;
  failedAnimations: number;
  averageDuration: number;
  totalDuration: number;
  frameDrops: number;
  memoryUsage: number;
  performanceScore: number;
}

interface AnimationAnalyticsConfig {
  enableAnalytics: boolean;
  sampleRate: number;
  performanceThreshold: number;
  autoReport: boolean;
}

interface AnimationAnalyticsReturn {
  analytics: AnimationAnalytics;
  recordAnimation: (duration: number, success: boolean) => void;
  recordFrameDrop: () => void;
  recordMemoryUsage: (usage: number) => void;
  getPerformanceReport: () => string;
  resetAnalytics: () => void;
  exportAnalytics: () => any;
}

export const useAnimationAnalytics = (
  config: Partial<AnimationAnalyticsConfig> = {}
): AnimationAnalyticsReturn => {
  const defaultConfig: AnimationAnalyticsConfig = {
    enableAnalytics: true,
    sampleRate: 1000,
    performanceThreshold: 0.8,
    autoReport: false,
    ...config,
  };

  const [analytics, setAnalytics] = useState<AnimationAnalytics>({
    totalAnimations: 0,
    successfulAnimations: 0,
    failedAnimations: 0,
    averageDuration: 0,
    totalDuration: 0,
    frameDrops: 0,
    memoryUsage: 0,
    performanceScore: 100,
  });

  const animationDurations = useRef<number[]>([]);
  const reportIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const recordAnimation = useCallback(
    (duration: number, success: boolean) => {
      if (!defaultConfig.enableAnalytics) return;

      setAnalytics(prev => {
        const newTotal = prev.totalAnimations + 1;
        const newSuccessful = success ? prev.successfulAnimations + 1 : prev.successfulAnimations;
        const newFailed = !success ? prev.failedAnimations + 1 : prev.failedAnimations;
        const newTotalDuration = prev.totalDuration + duration;

        animationDurations.current.push(duration);

        // Keep only last 100 durations
        if (animationDurations.current.length > 100) {
          animationDurations.current.shift();
        }

        const newAverageDuration =
          animationDurations.current.reduce((a, b) => a + b, 0) / animationDurations.current.length;

        return {
          ...prev,
          totalAnimations: newTotal,
          successfulAnimations: newSuccessful,
          failedAnimations: newFailed,
          averageDuration: Math.round(newAverageDuration),
          totalDuration: newTotalDuration,
        };
      });
    },
    [defaultConfig.enableAnalytics]
  );

  const recordFrameDrop = useCallback(() => {
    if (!defaultConfig.enableAnalytics) return;

    setAnalytics(prev => ({
      ...prev,
      frameDrops: prev.frameDrops + 1,
    }));
  }, [defaultConfig.enableAnalytics]);

  const recordMemoryUsage = useCallback(
    (usage: number) => {
      if (!defaultConfig.enableAnalytics) return;

      setAnalytics(prev => ({
        ...prev,
        memoryUsage: usage,
      }));
    },
    [defaultConfig.enableAnalytics]
  );

  const getPerformanceReport = useCallback((): string => {
    const successRate =
      analytics.totalAnimations > 0
        ? (analytics.successfulAnimations / analytics.totalAnimations) * 100
        : 0;

    const failureRate =
      analytics.totalAnimations > 0
        ? (analytics.failedAnimations / analytics.totalAnimations) * 100
        : 0;

    const report = `
Animation Performance Analytics:
- Total Animations: ${analytics.totalAnimations}
- Success Rate: ${Math.round(successRate * 100) / 100}%
- Failure Rate: ${Math.round(failureRate * 100) / 100}%
- Average Duration: ${analytics.averageDuration}ms
- Total Duration: ${analytics.totalDuration}ms
- Frame Drops: ${analytics.frameDrops}
- Memory Usage: ${analytics.memoryUsage}MB
- Performance Score: ${analytics.performanceScore}/100
    `;

    return report.trim();
  }, [analytics]);

  const resetAnalytics = useCallback(() => {
    setAnalytics({
      totalAnimations: 0,
      successfulAnimations: 0,
      failedAnimations: 0,
      averageDuration: 0,
      totalDuration: 0,
      frameDrops: 0,
      memoryUsage: 0,
      performanceScore: 100,
    });

    animationDurations.current = [];
  }, []);

  const exportAnalytics = useCallback(() => {
    return {
      ...analytics,
      timestamp: new Date().toISOString(),
      deviceInfo: {
        platform: 'react-native',
        version: '1.0.0',
      },
    };
  }, [analytics]);

  // Auto-report setup
  useEffect(() => {
    if (defaultConfig.autoReport) {
      reportIntervalRef.current = setInterval(() => {
        const report = getPerformanceReport();
      }, defaultConfig.sampleRate);
    }

    return () => {
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
    };
  }, [defaultConfig.autoReport, defaultConfig.sampleRate, getPerformanceReport]);

  return {
    analytics,
    recordAnimation,
    recordFrameDrop,
    recordMemoryUsage,
    getPerformanceReport,
    resetAnalytics,
    exportAnalytics,
  };
};
