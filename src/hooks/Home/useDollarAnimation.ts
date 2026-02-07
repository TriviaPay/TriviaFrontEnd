/**
 * useDollarAnimation Hook - TypeScript Implementation
 * Professional dollar animation hook with comprehensive features
 */

import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

interface DollarAnimationReturn {
  leftDollarStyle: {
    transform: Array<{ translateX: Animated.AnimatedInterpolation }>;
    opacity: Animated.AnimatedInterpolation;
  };
  rightDollarStyle: {
    transform: Array<{ translateX: Animated.AnimatedInterpolation }>;
    opacity: Animated.AnimatedInterpolation;
  };
}

export const useDollarAnimation = (): DollarAnimationReturn => {
  const leftDollarAnim = useRef(new Animated.Value(0)).current;
  const rightDollarAnim = useRef(new Animated.Value(0)).current;

  const animateDollarIcons = (): void => {
    leftDollarAnim.setValue(0);
    rightDollarAnim.setValue(0);

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(leftDollarAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(leftDollarAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rightDollarAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(rightDollarAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  useEffect(() => {
    animateDollarIcons();
  }, []);

  const leftDollarStyle = {
    transform: [
      {
        translateX: leftDollarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    opacity: leftDollarAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.7, 1],
    }),
  };

  const rightDollarStyle = {
    transform: [
      {
        translateX: rightDollarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 10],
        }),
      },
    ],
    opacity: rightDollarAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.7, 1],
    }),
  };

  return {
    leftDollarStyle,
    rightDollarStyle,
  };
};
