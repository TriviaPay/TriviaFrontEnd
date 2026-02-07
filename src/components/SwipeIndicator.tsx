/**
 * Swipe Indicator Component
 * Shows visual feedback for swipe navigation
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeIndicatorProps {
  visible: boolean;
  direction: 'left' | 'right';
  tabName: string;
}

const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({ visible, direction, tabName }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: direction === 'left' ? 1 : -1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 1 second
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, direction, fadeAnim, slideAnim]);

  if (!visible) return null;

  const translateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-50, 0, 50],
  });

  const arrowIcon = direction === 'left' ? '←' : '→';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '50%',
        left: direction === 'left' ? 20 : screenWidth - 80,
        transform: [{ translateY: -25 }, { translateX }],
        opacity: fadeAnim,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: 'white', fontSize: 16, marginRight: 4 }}>{arrowIcon}</Text>
      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{tabName}</Text>
    </Animated.View>
  );
};

export default SwipeIndicator;
