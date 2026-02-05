/**
 * Lazy Loading Utility
 * Provides code splitting and lazy loading for React Native components
 */

import React, { ComponentType, lazy, Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface LazyLoaderOptions {
  fallback?: React.ReactNode;
  timeout?: number;
}

/**
 * Create a lazy-loaded component with loading fallback
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoaderOptions = {}
): React.LazyExoticComponent<T> {
  const { fallback, timeout = 10000 } = options;

  const LazyComponent = lazy(() => {
    return Promise.race([
      importFunc(),
      new Promise<{ default: T }>((_, reject) =>
        setTimeout(() => reject(new Error('Component load timeout')), timeout)
      ),
    ]);
  });

  return LazyComponent;
}

/**
 * Lazy loading wrapper with Suspense boundary
 */
export function withLazyLoading<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: React.ReactNode
) {
  const defaultFallback = (
    <View style={styles.loadingContainer}>
      <LottieView
        source={require('../../assets/signup/DogParachute.json')}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
    </View>
  );

  return (props: P) => (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    flex: 1,
    justifyContent: 'center',
  },
});

/**
 * Preload a component for faster subsequent loads
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): Promise<void> {
  return importFunc().then(() => {
    // Component is now cached
  });
}
