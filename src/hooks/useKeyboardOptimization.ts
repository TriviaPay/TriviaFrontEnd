/**
 * Enhanced Keyboard Optimization Hook
 * Professional keyboard handling with layout shift prevention
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

interface KeyboardOptimizationReturn {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  keyboardAnimationDuration: number;
  isKeyboardAnimating: boolean;
}

export const useKeyboardOptimization = (): KeyboardOptimizationReturn => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardAnimationDuration, setKeyboardAnimationDuration] = useState(250);
  const [isKeyboardAnimating, setIsKeyboardAnimating] = useState(false);

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    const height = event.endCoordinates.height;
    const duration = event.duration || 250;

    setKeyboardAnimationDuration(duration);
    setIsKeyboardAnimating(true);
    setKeyboardHeight(height);
    setIsKeyboardVisible(true);

    // Clear existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Set animation complete timeout
    animationTimeoutRef.current = setTimeout(() => {
      setIsKeyboardAnimating(false);
    }, duration + 50);
  }, []);

  const handleKeyboardHide = useCallback((event: KeyboardEvent) => {
    const duration = event.duration || 250;

    setKeyboardAnimationDuration(duration);
    setIsKeyboardAnimating(true);
    setIsKeyboardVisible(false);

    // Clear existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Set animation complete timeout
    animationTimeoutRef.current = setTimeout(() => {
      setKeyboardHeight(0);
      setIsKeyboardAnimating(false);
    }, duration + 50);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [handleKeyboardShow, handleKeyboardHide]);

  return {
    keyboardHeight,
    isKeyboardVisible,
    keyboardAnimationDuration,
    isKeyboardAnimating,
  };
};
