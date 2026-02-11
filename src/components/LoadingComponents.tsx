/**
 * Standardized Loading Components
 * Consistent loading indicators across the entire app
 * Replaces all inconsistent loading implementations
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../hooks/useReduxHooks';
import { scaleSize } from '../utils/scaleSize';
import { SPACING } from '../constants/uiConstants';

interface LoadingIndicatorProps {
  size?: number;
  color?: string;
  message?: string;
}

/**
 * Standard Loading Indicator
 * Use for inline loading states
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 60,
  message,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.indicatorContainer}>
      <LottieView
        source={require('../../assets/animations/LoadingBar.json')}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
      {message && (
        <Text style={[styles.message, { color: theme?.colors?.textSecondary || '#9CA3AF' }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

interface FullScreenLoaderProps {
  message?: string;
  showSkeleton?: boolean;
}

/**
 * Full Screen Loader
 * Use for screen-level loading states
 */
export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  message = 'Loading...',
  showSkeleton = false,
}) => {
  const theme = useTheme();
  const colors = theme?.colors || {
    background: '#FFFFFF',
    text: '#1F2937',
    primary: '#8B5CF6',
  };

  if (showSkeleton) {
    try {
      const SkeletonLoader = require('../core/components/SkeletonLoader').default;
      return (
        <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
          <SkeletonLoader width="80%" height={scaleSize(20)} style={{ marginBottom: SPACING.MD }} />
          <SkeletonLoader width="60%" height={scaleSize(16)} />
        </View>
      );
    } catch (e) {
      return (
        <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
          <LottieView
            source={require('../../assets/animations/LoadingBar.json')}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
          <Text style={[styles.fullScreenText, { color: colors.text }]}>{message}</Text>
        </View>
      );
    }
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <LottieView
        source={require('../../assets/animations/LoadingBar.json')}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
      <Text style={[styles.fullScreenText, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

interface InlineLoaderProps {
  message?: string;
  size?: number;
}

/**
 * Inline Loader
 * Use for component-level loading states
 */
export const InlineLoader: React.FC<InlineLoaderProps> = ({ message, size = 50 }) => {
  const theme = useTheme();

  return (
    <View style={styles.inlineContainer}>
      <LottieView
        source={require('../../assets/animations/LoadingBar.json')}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
      {message && (
        <Text style={[styles.inlineText, { color: theme?.colors?.textSecondary || '#9CA3AF' }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.LG,
  },
  fullScreenText: {
    fontSize: scaleSize(16),
    marginTop: SPACING.MD,
    textAlign: 'center',
  },
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.SM,
  },
  inlineContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: SPACING.SM,
  },
  inlineText: {
    fontSize: scaleSize(14),
    marginLeft: SPACING.SM,
  },
  message: {
    fontSize: scaleSize(14),
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
});

export default {
  LoadingIndicator,
  FullScreenLoader,
  InlineLoader,
};
