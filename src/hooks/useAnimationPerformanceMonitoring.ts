/**
 * Enhanced Animation Performance Monitoring Hook
 * Professional animation performance monitoring and analytics
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Animated } from 'react-native';

interface PerformanceMetrics {
  frameRate: number;
  animationDuration: number;
  memoryUsage: number;
  animationCount: number;
  averageFrameTime: number;
  droppedFrames: number;
}

interface PerformanceMonitoringConfig {
  enableMonitoring: boolean;
  sampleRate: number;
  memoryThreshold: number;
  frameRateThreshold: number;
}

interface AnimationPerformanceMonitoringReturn {
  metrics: PerformanceMetrics;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordAnimation: (duration: number) => void;
  recordFrameDrop: () => void;
  getPerformanceReport: () => string;
  resetMetrics: () => void;
}

export const useAnimationPerformanceMonitoring = (
  config: Partial<PerformanceMonitoringConfig> = {}
): AnimationPerformanceMonitoringReturn => {
  const defaultConfig: PerformanceMonitoringConfig = {
    enableMonitoring: true,
    sampleRate: 1000, // 1 second
    memoryThreshold: 100, // MB
    frameRateThreshold: 30, // FPS
  };

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameRate: 60,
    animationDuration: 0,
    memoryUsage: 0,
    animationCount: 0,
    averageFrameTime: 16.67,
    droppedFrames: 0,
  });

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const animationDurationsRef = useRef<number[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const isMonitoringRef = useRef<boolean>(false);

  const calculateFrameRate = useCallback(() => {
    const now = Date.now();
    const deltaTime = now - lastFrameTimeRef.current;

    if (deltaTime > 0) {
      const frameRate = 1000 / deltaTime;
      frameTimesRef.current.push(frameRate);

      // Keep only last 60 frames
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const averageFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;

      setMetrics(prev => ({
        ...prev,
        frameRate: Math.round(frameRate),
        averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      }));
    }

    lastFrameTimeRef.current = now;
  }, []);

  const startMonitoring = useCallback(() => {
    if (isMonitoringRef.current || !defaultConfig.enableMonitoring) return;

    isMonitoringRef.current = true;
    lastFrameTimeRef.current = Date.now();

    monitoringIntervalRef.current = setInterval(() => {
      calculateFrameRate();

      // Check for performance issues
      if (metrics.frameRate < defaultConfig.frameRateThreshold) {
        logger.warn('Low frame rate detected:', 'HOOK', metrics.frameRate);
      }

      if (metrics.memoryUsage > defaultConfig.memoryThreshold) {
        logger.warn('High memory usage detected:', 'HOOK', metrics.memoryUsage);
      }
    }, defaultConfig.sampleRate);
  }, [defaultConfig, calculateFrameRate, metrics.frameRate, metrics.memoryUsage]);

  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    isMonitoringRef.current = false;
  }, []);

  const recordAnimation = useCallback((duration: number) => {
    animationDurationsRef.current.push(duration);

    // Keep only last 100 animations
    if (animationDurationsRef.current.length > 100) {
      animationDurationsRef.current.shift();
    }

    const averageDuration =
      animationDurationsRef.current.reduce((a, b) => a + b, 0) /
      animationDurationsRef.current.length;

    setMetrics(prev => ({
      ...prev,
      animationCount: prev.animationCount + 1,
      animationDuration: Math.round(averageDuration),
    }));
  }, []);

  const recordFrameDrop = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      droppedFrames: prev.droppedFrames + 1,
    }));
  }, []);

  const getPerformanceReport = useCallback((): string => {
    const report = `
Animation Performance Report:
- Frame Rate: ${metrics.frameRate} FPS
- Average Frame Time: ${metrics.averageFrameTime}ms
- Animation Count: ${metrics.animationCount}
- Average Animation Duration: ${metrics.animationDuration}ms
- Dropped Frames: ${metrics.droppedFrames}
- Memory Usage: ${metrics.memoryUsage}MB
    `;

    return report.trim();
  }, [metrics]);

  const resetMetrics = useCallback(() => {
    setMetrics({
      frameRate: 60,
      animationDuration: 0,
      memoryUsage: 0,
      animationCount: 0,
      averageFrameTime: 16.67,
      droppedFrames: 0,
    });

    animationDurationsRef.current = [];
    frameTimesRef.current = [];
    frameCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    startMonitoring,
    stopMonitoring,
    recordAnimation,
    recordFrameDrop,
    getPerformanceReport,
    resetMetrics,
  };
};
