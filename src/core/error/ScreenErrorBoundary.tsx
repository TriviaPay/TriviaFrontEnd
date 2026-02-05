/**
 * Screen-level Error Boundary
 * Catches errors in screen components and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logger } from '../../lib/utils/logger';

interface Props {
  children: ReactNode;
  screenName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to structured logger with fallback to console
    try {
      if (logger && typeof logger.error === 'function') {
        logger.error(
          `Screen Error Boundary caught error in ${this.props.screenName || 'unknown screen'}`,
          'ERROR',
          {
            error: error.toString(),
            errorStack: error.stack,
            componentStack: errorInfo.componentStack,
            screenName: this.props.screenName,
            errorInfo,
          }
        );
      } else {
        console.error('Screen Error Boundary caught error:', error, errorInfo);
      }
    } catch (logError) {
      // Fallback if logger itself fails
      console.error('Screen Error Boundary caught error:', error, errorInfo);
      console.error('Logger error:', logError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Icon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: '#6b7280',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  title: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
});

export default ScreenErrorBoundary;
