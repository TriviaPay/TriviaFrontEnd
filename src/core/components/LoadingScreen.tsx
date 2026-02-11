/**
 * Loading Screen Component
 * Provides loading state with ActivityIndicator
 * Can be enhanced with Skeleton/Shimmer loaders
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { scaleSize } from '../../utils/scaleSize';
import { getVerticalSpacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useReduxHooks';

interface LoadingScreenProps {
  message?: string;
  showSkeleton?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  showSkeleton = false,
}) => {
  const theme = useTheme();
  const colors = theme?.colors || { text: '#666', primary: '#6c5ce7', background: '#f8f9fa' };

  if (showSkeleton) {
    // Use SkeletonLoader for better UX
    const SkeletonLoader = require('./SkeletonLoader').default;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonLoader
          width="80%"
          height={scaleSize(20)}
          style={{ marginBottom: getVerticalSpacing(12) }}
        />
        <SkeletonLoader width="60%" height={scaleSize(16)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LottieView
        source={require('../../../assets/animations/LoadingBar.json')}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    fontSize: scaleSize(16),
    marginTop: getVerticalSpacing(20),
  },
});

export default LoadingScreen;
