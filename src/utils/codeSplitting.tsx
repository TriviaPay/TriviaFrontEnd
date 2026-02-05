/**
 * Code Splitting Utilities
 * Lazy loading for screens and components
 */

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { View, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { logger } from '../lib/utils/logger';

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <LottieView
      source={require('../../assets/signup/DogParachute.json')}
      autoPlay
      loop
      style={{ width: 100, height: 100 }}
    />
  </View>
);

/**
 * Error fallback component
 */
const ErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ color: '#ef4444', textAlign: 'center' }}>
      {error?.message || 'Failed to load component'}
    </Text>
  </View>
);

/**
 * Lazy load a component with Suspense wrapper
 */
export const lazyLoad = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
  return React.lazy(importFn);
};

/**
 * Lazy load with error boundary
 */
export const lazyLoadWithErrorBoundary = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType<{ error?: Error }>
): React.FC<any> => {
  const LazyComponent = React.lazy(importFn);
  const ErrorComponent = fallback || ErrorFallback;

  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary FallbackComponent={ErrorComponent}>
        <LazyComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

/**
 * Simple Error Boundary for lazy loaded components
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; FallbackComponent: React.ComponentType<{ error?: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      logger.error('Lazy load error:', 'APP', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <this.props.FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Preload a lazy component
 */
export const preloadComponent = async <T extends ComponentType<any>>(
  lazyComponent: LazyExoticComponent<T>
): Promise<void> => {
  try {
    // Trigger the import
    await (lazyComponent as any)._payload._result;
  } catch (error) {
    // Component already loaded or error occurred
  }
};

export { LoadingFallback, ErrorFallback };
