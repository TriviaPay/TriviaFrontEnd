/**
 * Progressive Loader Component
 * Shows loading progress with percentage and stages
 * Provides better UX than simple ActivityIndicator
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';
import { getHorizontalSpacing, getVerticalSpacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useReduxHooks';
// ActivityIndicator is not needed here

interface ProgressiveLoaderProps {
  progress?: number; // 0-100
  stage?: string;
  message?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  progress = 0,
  stage,
  message,
  showPercentage = true,
  animated = true,
}) => {
  const theme = useTheme();
  const colors = theme?.colors || { text: '#000000', primary: '#6c5ce7' };
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, progressAnim]);

  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {stage && <Text style={[styles.stage, { color: colors.text }]}>{stage}</Text>}
      {message && <Text style={[styles.message, { color: colors.text }]}>{message}</Text>}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width,
                backgroundColor: colors.primary || '#6c5ce7',
              },
            ]}
          />
        </View>
        {showPercentage && (
          <Text style={[styles.percentage, { color: colors.text }]}>{Math.round(progress)}%</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: getHorizontalSpacing(20),
  },
  message: {
    fontSize: scaleSize(14),
    marginBottom: getVerticalSpacing(12),
    textAlign: 'center',
  },
  percentage: {
    fontSize: scaleSize(14),
    fontWeight: '600',
    minWidth: scaleSize(40),
    textAlign: 'right',
  },
  progressBar: {
    borderRadius: scaleSize(4),
    flex: 1,
    height: scaleSize(8),
    overflow: 'hidden',
  },
  progressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: getHorizontalSpacing(12),
    width: '100%',
  },
  progressFill: {
    borderRadius: scaleSize(4),
    height: '100%',
  },
  stage: {
    fontSize: scaleSize(16),
    fontWeight: '600',
    marginBottom: getVerticalSpacing(8),
    textAlign: 'center',
  },
});

export default ProgressiveLoader;

/**
 * Loading State Hook
 * Manages progressive loading states
 */
export const useProgressiveLoading = () => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const updateProgress = (newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  };

  const setLoadingStage = (newStage: string, newMessage?: string) => {
    setStage(newStage);
    setMessage(newMessage);
  };

  const reset = () => {
    setProgress(0);
    setStage(undefined);
    setMessage(undefined);
  };

  return {
    progress,
    stage,
    message,
    updateProgress,
    setLoadingStage,
    reset,
  };
};
