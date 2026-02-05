/**
 * Optimized Button Component
 * Provides immediate feedback and smooth animations
 * Drop-in replacement for TouchableOpacity with better performance
 */

import React, { useRef } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Animated, StyleSheet } from 'react-native';
import {
  createButtonPressAnimation,
  triggerHaptic,
  HapticType,
} from '../utils/interactionFeedback';

interface OptimizedButtonProps extends TouchableOpacityProps {
  hapticType?: HapticType;
  scaleOnPress?: number;
  children: React.ReactNode;
}

/**
 * Optimized button with immediate feedback
 * Use this instead of TouchableOpacity for better UX
 */
export const OptimizedButton: React.FC<OptimizedButtonProps> = ({
  hapticType = HapticType.SELECTION,
  scaleOnPress = 0.95,
  onPress,
  children,
  style,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Immediate visual feedback
    createButtonPressAnimation(scale, scaleOnPress).start();
    // Haptic feedback
    triggerHaptic(hapticType);
  };

  const handlePressOut = () => {
    // Smooth return
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (event: any) => {
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1} // We handle opacity with scale animation
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

export default OptimizedButton;
