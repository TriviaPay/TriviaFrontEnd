/**
 * Skeleton Loader Component
 * Provides shimmer effect for loading states
 * Replaces blank screens with animated placeholders
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';
import { getHorizontalSpacing, getVerticalSpacing } from '../../theme/spacing';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = scaleSize(20),
  borderRadius = scaleSize(4),
  style,
  animated = true,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
      return () => shimmer.stop();
    }
  }, [animated, shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35], // Transparent for gaming - very subtle
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: animated ? opacity : 0.15, // Transparent by default
        },
        style,
      ]}
    />
  );
};

export default SkeletonLoader;

/**
 * Skeleton Text Component
 */
export const SkeletonText: React.FC<{
  lines?: number;
  width?: number | string;
  lineHeight?: number;
  spacing?: number;
}> = ({
  lines = 1,
  width = '100%',
  lineHeight = scaleSize(16),
  spacing = getVerticalSpacing(8),
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === lines - 1 ? '80%' : width}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton Card Component
 */
export const SkeletonCard: React.FC<{
  width?: number | string;
  height?: number;
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
}> = ({
  width = '100%',
  height = scaleSize(120),
  showAvatar = true,
  showTitle = true,
  showDescription = true,
}) => {
  return (
    <View style={[styles.card, { width, height }]}>
      {showAvatar && (
        <SkeletonLoader
          width={scaleSize(50)}
          height={scaleSize(50)}
          borderRadius={scaleSize(25)}
          style={styles.avatar}
        />
      )}
      <View style={styles.cardContent}>
        {showTitle && <SkeletonText lines={1} width="70%" lineHeight={scaleSize(18)} />}
        {showDescription && (
          <SkeletonText
            lines={2}
            width="100%"
            lineHeight={scaleSize(14)}
            spacing={getVerticalSpacing(6)}
          />
        )}
      </View>
    </View>
  );
};

// Shared styles for all skeleton components
const styles = StyleSheet.create({
  avatar: {
    marginRight: getHorizontalSpacing(12),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(12),
    flexDirection: 'row',
    marginBottom: getVerticalSpacing(12),
    padding: getHorizontalSpacing(16),
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  skeleton: {
    backgroundColor: 'rgba(229, 231, 235, 0.3)', // Transparent for gaming
    overflow: 'hidden',
  },
});
