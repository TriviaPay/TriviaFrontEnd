/**
 * Animation Error Boundary Component
 * Professional error boundary for animation failures
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AnimationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface AnimationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  resetOnPropsChange?: boolean;
}

export class AnimationErrorBoundary extends Component<
  AnimationErrorBoundaryProps,
  AnimationErrorBoundaryState
> {
  private resetTimeout: NodeJS.Timeout | null = null;

  constructor(props: AnimationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AnimationErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('Animation Error Boundary caught an error:', 'APP', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset after 5 seconds
    this.resetTimeout = setTimeout(() => {
      this.resetError();
    }, 5000);
  }

  componentDidUpdate(prevProps: AnimationErrorBoundaryProps) {
    if (this.props.resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Animation Error</Text>
          <Text style={styles.errorMessage}>
            An animation error occurred. The app will continue to function normally.
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={this.resetError}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorMessage: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resetButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
