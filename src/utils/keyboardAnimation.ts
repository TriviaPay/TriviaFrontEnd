/**
 * Keyboard Animation Handler
 * Prevents layout jumps when keyboard appears/disappears
 * Works with existing KeyboardAvoidingView code
 */

import { Keyboard, Animated, Platform, EmitterSubscription } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';

/**
 * Keyboard animation configuration
 */
const KEYBOARD_CONFIG = {
  duration: Platform.OS === 'ios' ? 250 : 150,
  easing: Platform.OS === 'ios' ? Animated.Easing.out(Animated.Easing.ease) : undefined,
} as const;

/**
 * Hook for smooth keyboard animations
 * Prevents layout jumps by animating height changes
 */
export const useKeyboardAnimation = (
  options: {
    onShow?: (height: number) => void;
    onHide?: () => void;
    animated?: boolean;
  } = {}
) => {
  const { onShow, onHide, animated = true } = options;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const subscriptions = useRef<EmitterSubscription[]>([]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        const height = event.endCoordinates.height;

        if (animated) {
          Animated.timing(keyboardHeight, {
            toValue: height,
            duration: KEYBOARD_CONFIG.duration,
            easing: KEYBOARD_CONFIG.easing,
            useNativeDriver: false, // Height animations can't use native driver
          }).start();
        } else {
          keyboardHeight.setValue(height);
        }

        onShow?.(height);
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (animated) {
          Animated.timing(keyboardHeight, {
            toValue: 0,
            duration: KEYBOARD_CONFIG.duration,
            easing: KEYBOARD_CONFIG.easing,
            useNativeDriver: false,
          }).start();
        } else {
          keyboardHeight.setValue(0);
        }

        onHide?.();
      }
    );

    subscriptions.current = [showSubscription, hideSubscription];

    return () => {
      subscriptions.current.forEach(sub => sub.remove());
    };
  }, [keyboardHeight, animated, onShow, onHide]);

  return {
    keyboardHeight,
    dismiss: useCallback(() => {
      Keyboard.dismiss();
    }, []),
  };
};

/**
 * Hook for keyboard-aware padding
 * Automatically adjusts padding when keyboard appears
 */
export const useKeyboardPadding = (
  options: {
    offset?: number;
    animated?: boolean;
  } = {}
) => {
  const { offset = 0, animated = true } = options;
  const { keyboardHeight } = useKeyboardAnimation({ animated });

  const paddingBottom = useRef(
    keyboardHeight.interpolate({
      inputRange: [0, 400],
      outputRange: [0, 400 + offset],
      extrapolate: 'clamp',
    })
  ).current;

  return { paddingBottom };
};

/**
 * Smooth keyboard dismiss with animation
 */
export const dismissKeyboardSmoothly = (): void => {
  Keyboard.dismiss();
};

export default {
  useKeyboardAnimation,
  useKeyboardPadding,
  dismissKeyboardSmoothly,
};
