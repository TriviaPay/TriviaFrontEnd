/**
 * useButtonAnimation Hook - TypeScript Implementation
 * Professional button animation hook with comprehensive features
 */

import { useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnimatedStyle {
  transform: Array<{ scale: Animated.Value } | { translateY: Animated.Value }>;
  shadowOpacity: Animated.AnimatedInterpolation;
  shadowRadius: Animated.AnimatedInterpolation;
  elevation: Animated.AnimatedInterpolation;
}

interface UseButtonAnimationReturn {
  animatedStyle: AnimatedStyle;
  animatePress: () => void;
  animateRelease: () => void;
  isPressed: boolean;
}

export const useButtonAnimation = (): UseButtonAnimationReturn => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState<boolean>(false);

  const animatePress = (): void => {
    setIsPressed(true);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        friction: 4,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.spring(translateYAnim, {
        toValue: 2,
        friction: 4,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateRelease = (): void => {
    setIsPressed(false);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 4,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animatedStyle: AnimatedStyle = {
    transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
    shadowOpacity: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.1],
    }),
    shadowRadius: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 4],
    }),
    elevation: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 4],
    }),
  };

  return {
    animatedStyle,
    animatePress,
    animateRelease,
    isPressed,
  };
};
