/**
 * Error Boundary Component
 * Catches and handles React errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@ui/components';
import { colors, spacing } from '@ui/tokens';
import { errorHandler } from '@core/errors';
import { logger } from '@core/services';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error Boundary caught error', 'ERROR_BOUNDARY', {
      error,
      errorInfo,
    });

    // Handle error through error handler
    errorHandler.handle(error);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View style={styles.container}>
          <Text variant="h3" align="center" style={styles.title}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" align="center" style={styles.message}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text variant="body" color={colors.white}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.error[500],
    marginBottom: spacing.md,
  },
});
