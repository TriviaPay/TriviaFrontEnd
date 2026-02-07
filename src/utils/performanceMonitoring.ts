/**
 * Performance Monitoring System
 * Tracks performance metrics without impacting app performance
 */

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  animationFPS: number;
  memoryUsage: number;
  bundleSize: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private frameCount = 0;
  private lastFrameTime = Date.now();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Measure render time
   */
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now();
    renderFn();
    const end = performance.now();

    const metrics = this.metrics.get(componentName) || ({} as PerformanceMetrics);
    metrics.renderTime = end - start;
    this.metrics.set(componentName, metrics);
  }

  /**
   * Measure API call time
   */
  async measureAPI<T>(apiName: string, apiCall: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await apiCall();
      const end = performance.now();

      const metrics = this.metrics.get(apiName) || ({} as PerformanceMetrics);
      metrics.apiCallTime = end - start;
      this.metrics.set(apiName, metrics);

      return result;
    } catch (error) {
      const end = performance.now();
      const metrics = this.metrics.get(apiName) || ({} as PerformanceMetrics);
      metrics.apiCallTime = end - start;
      this.metrics.set(apiName, metrics);
      throw error;
    }
  }

  /**
   * Track FPS
   */
  trackFrame(): void {
    this.frameCount++;
    const now = Date.now();
    const delta = now - this.lastFrameTime;

    if (delta >= 1000) {
      const fps = (this.frameCount * 1000) / delta;
      const metrics = this.metrics.get('animation') || ({} as PerformanceMetrics);
      metrics.animationFPS = fps;
      this.metrics.set('animation', metrics);

      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();

  return {
    measureRender: (renderFn: () => void) => {
      monitor.measureRender(componentName, renderFn);
    },
    measureAPI: <T>(apiCall: () => Promise<T>) => {
      return monitor.measureAPI(componentName, apiCall);
    },
  };
};

/**
 * Bundle size analyzer
 */
export const analyzeBundleSize = (): void => {
  if (__DEV__) {
    try {
      // This would typically use a bundle analyzer
      console.log('Bundle size analysis available in development mode');
    } catch (e) {
      // Silent fail
    }
  }
};

export default {
  PerformanceMonitor,
  usePerformanceMonitoring,
  analyzeBundleSize,
};
