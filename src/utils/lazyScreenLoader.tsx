/**
 * Lazy Screen Loader for React Native
 * Provides lazy loading for large screens to improve initial app startup time
 * React Native doesn't support React.lazy() the same way as web, so we use a custom solution
 */

import React, { ComponentType, Suspense } from 'react';
import { View, StyleSheet } from 'react-native';

interface LazyScreenOptions {
  fallback?: React.ReactNode;
  preload?: boolean;
}

/**
 * Creates a lazy-loaded screen component
 * Screens are loaded only when first accessed, not on app startup
 */
export function createLazyScreen<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyScreenOptions = {}
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}

/**
 * Wrapper component with Suspense boundary for lazy-loaded screens
 */
export function withLazyScreen<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: React.ReactNode
): React.FC<P> {
  const defaultFallback = <View style={styles.loadingContainer} />;

  return (props: P) => (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: '#1e90ff',
    flex: 1,
  },
});
