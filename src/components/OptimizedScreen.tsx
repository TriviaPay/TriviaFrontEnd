/**
 * Optimized Screen Wrapper
 * Applies all optimizations to screens without breaking existing code
 * Drop-in wrapper for any screen component
 */

import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimationWrapper } from './AnimationWrapper';
import { useKeyboardAnimation } from '../utils/keyboardAnimation';
import { usePerformanceMonitoring } from '../utils/performanceMonitoring';

interface OptimizedScreenProps {
  children: ReactNode;
  screenName: string;
  enableAnimations?: boolean;
  enableKeyboardHandling?: boolean;
  enablePerformanceMonitoring?: boolean;
  style?: any;
}

/**
 * Optimized screen wrapper
 * Applies all optimizations automatically
 */
export const OptimizedScreen: React.FC<OptimizedScreenProps> = ({
  children,
  screenName,
  enableAnimations = true,
  enableKeyboardHandling = true,
  enablePerformanceMonitoring = true,
  style,
}) => {
  const { keyboardHeight } = useKeyboardAnimation({
    animated: enableKeyboardHandling,
  });
  const { measureRender } = usePerformanceMonitoring(screenName);

  useEffect(() => {
    if (enablePerformanceMonitoring) {
      measureRender(() => {
        // Screen rendered
      });
    }
  }, [enablePerformanceMonitoring, measureRender]);

  return (
    <AnimationWrapper enableEnterAnimation={enableAnimations}>
      <View
        style={[
          styles.container,
          enableKeyboardHandling && {
            paddingBottom: keyboardHeight,
          },
          style,
        ]}
      >
        {children}
      </View>
    </AnimationWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OptimizedScreen;
