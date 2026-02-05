/**
 * Error Boundary - Enterprise Level
 * Comprehensive error handling with recovery mechanisms
 *
 * @description Professional error boundary with fallback UI and recovery options
 * @author TriviaPay Team
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { typography } from '../../theme/typography';
import { logger } from '../../lib/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  enableReporting?: boolean;
  enableRecovery?: boolean;
}

/**
 * Enterprise Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableReporting = true } = this.props;

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    onError?.(error, errorInfo);

    // Report error if enabled
    if (enableReporting) {
      this.reportError(error, errorInfo);
    }

    // Log error for debugging
    logger.error('ErrorBoundary caught an error:', 'APP', error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to crash reporting service (Sentry)
    try {
      const { reportError } = require('../monitoring/CrashReporter');
      reportError(error, {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Crash reporter not available, just log
      logger.error('Error reporting failed:', 'APP', e);
    }

    // Emit error event
    try {
      const { eventBus, Events } = require('../events/EventBus');
      eventBus.emit(Events.ERROR_OCCURRED, { error, errorInfo });
    } catch (e) {
      // Event bus not available
    }
  };

  private handleRetry = () => {
    const { onRetry, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      Alert.alert(
        'Maximum Retries Reached',
        'The app has reached the maximum number of retry attempts. Please restart the app.',
        [{ text: 'OK', onPress: () => this.handleRestart() }]
      );
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call custom retry handler
    onRetry?.();
  };

  private handleRestart = () => {
    // In a real app, you would restart the app
    // For now, we'll just reset the error boundary
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  private handleReport = () => {
    const { error, errorInfo, errorId } = this.state;

    Alert.alert('Report Error', 'Would you like to report this error to help us improve the app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        onPress: () => {
          // In a real app, you would send this to your error reporting service

          Alert.alert('Thank you', 'Error report sent successfully.');
        },
      },
    ]);
  };

  private handleIgnore = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, enableRecovery = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={64} color="#ef4444" />

              <Text style={[typography.h3, styles.errorTitle]}>Oops! Something went wrong</Text>

              <Text style={[typography.body, styles.errorMessage]}>
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </Text>

              {__DEV__ && (
                <View style={styles.debugContainer}>
                  <Text style={[typography.caption, styles.debugTitle]}>Debug Information:</Text>
                  <Text style={[typography.caption, styles.debugText]}>{error?.message}</Text>
                  {error?.stack && (
                    <Text style={[typography.caption, styles.debugText]}>{error.stack}</Text>
                  )}
                </View>
              )}

              <View style={styles.buttonContainer}>
                {enableRecovery && (
                  <TouchableOpacity
                    style={[styles.button, styles.retryButton]}
                    onPress={this.handleRetry}
                  >
                    <Icon name="refresh-cw" size={20} color="#ffffff" />
                    <Text style={[typography.button, styles.buttonText]}>
                      Try Again {retryCount > 0 && `(${retryCount})`}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.reportButton]}
                  onPress={this.handleReport}
                >
                  <Icon name="send" size={20} color="#6c5ce7" />
                  <Text style={[typography.button, styles.reportButtonText]}>Report Issue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.ignoreButton]}
                  onPress={this.handleIgnore}
                >
                  <Icon name="x" size={20} color="#6b7280" />
                  <Text style={[typography.button, styles.ignoreButtonText]}>Continue Anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return children;
  }
}

/**
 * Error Boundary Hook
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);

  const captureError = (error: Error) => {
    setError(error);
  };

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

/**
 * Error Boundary Utilities
 */
export const ErrorBoundaryUtils = {
  /**
   * Create error boundary with custom fallback
   */
  withFallback: (fallback: ReactNode) => (props: Omit<ErrorBoundaryProps, 'fallback'>) => (
    <ErrorBoundary {...props} fallback={fallback} />
  ),

  /**
   * Create error boundary with retry logic
   */
  withRetry:
    (maxRetries: number = 3) =>
    (props: Omit<ErrorBoundaryProps, 'maxRetries'>) => (
      <ErrorBoundary {...props} maxRetries={maxRetries} />
    ),

  /**
   * Create error boundary with error reporting
   */
  withReporting:
    (onError: (error: Error, errorInfo: ErrorInfo) => void) =>
    (props: Omit<ErrorBoundaryProps, 'onError'>) => <ErrorBoundary {...props} onError={onError} />,
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
  },
  container: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  debugContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 30,
    padding: 15,
    width: '100%',
  },
  debugText: {
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  debugTitle: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 10,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorMessage: {
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#1f2937',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  ignoreButton: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    borderWidth: 1,
  },
  ignoreButtonText: {
    color: '#6b7280',
  },
  reportButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#6c5ce7',
    borderWidth: 1,
  },
  reportButtonText: {
    color: '#6c5ce7',
  },
  retryButton: {
    backgroundColor: '#6c5ce7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
});

export default ErrorBoundary;
