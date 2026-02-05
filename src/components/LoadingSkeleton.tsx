/**
 * Loading Skeleton Component
 * Provides better perceived performance during loading
 * Drop-in replacement for loading indicators
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSkeletonAnimation } from '../utils/loadingStateAnimation';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Skeleton loader component
 * Use this instead of ActivityIndicator for better UX
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { opacity } = useSkeletonAnimation();

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton text line
 */
export const SkeletonText: React.FC<{ lines?: number; width?: number | string }> = ({
  lines = 1,
  width = '100%',
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? width : '90%'}
          height={16}
          style={{ marginBottom: 8 }}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton card
 */
export const SkeletonCard: React.FC<{ height?: number }> = ({ height = 200 }) => {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={height * 0.6} borderRadius={8} />
      <View style={styles.cardContent}>
        <SkeletonText lines={2} width="80%" />
        <Skeleton width="60%" height={24} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardContent: {
    marginTop: 12,
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
});

export default Skeleton;
