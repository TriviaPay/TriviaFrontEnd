import React, { memo, useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChatBounds {
  width: number;
  height: number;
}

interface FloatingReactionProps {
  position: number;
  onAnimationComplete: () => void;
  startFromButton?: boolean;
  buttonPosition: { x: number; y: number };
  isKeyboardVisible: boolean;
  chatBounds: ChatBounds;
}

export const FloatingReaction = memo(
  ({
    position,
    onAnimationComplete,
    startFromButton = false,
    buttonPosition,
    isKeyboardVisible,
    chatBounds,
  }: FloatingReactionProps) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.3)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const randomRotation = Math.random() * 60 - 30;
      rotate.setValue(randomRotation);

      const maxHorizontalMovement = Math.min(40, chatBounds.width / 4);
      const randomHorizontalMovement =
        Math.random() * maxHorizontalMovement * 2 - maxHorizontalMovement;

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
      ]).start();

      const maxFloatDistance = Math.min(chatBounds.height * 0.6, isKeyboardVisible ? 100 : 120);
      const floatDistance = -maxFloatDistance + Math.random() * 30;

      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: floatDistance,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(translateX, {
            toValue: randomHorizontalMovement,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
            delay: 800 + Math.random() * 400,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]),
      ]).start(onAnimationComplete);
    }, [isKeyboardVisible, chatBounds]);

    const rotateStr = rotate.interpolate({
      inputRange: [0, 360],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          position: 'absolute',
          right: 15,
          bottom: 15,
          transform: [{ translateY }, { translateX }, { scale }, { rotate: rotateStr }],
          opacity,
          zIndex: 100,
        }}
      >
        <Icon name="heart" size={24} color="#FF4081" />
      </Animated.View>
    );
  }
);
