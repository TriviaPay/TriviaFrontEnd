/**
 * Platform Optimization Hook
 * Provides platform-specific optimizations and utilities
 */

import { useEffect, useCallback } from 'react';
import { Platform, BackHandler, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Haptic feedback - use React Native's built-in or expo-haptics if available
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // expo-haptics not available, will use fallback
}

// iOS Haptic Feedback
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
      if (Platform.OS === 'ios' && Haptics) {
        try {
          switch (type) {
            case 'light':
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              break;
            case 'medium':
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case 'heavy':
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              break;
            case 'success':
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              break;
            case 'warning':
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              break;
            case 'error':
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              break;
          }
        } catch (error) {
          // Haptics not available, silently fail
        }
      }
    },
    []
  );

  return { triggerHaptic };
};

// Android Back Button Handler
export const useAndroidBackButton = (onBackPress?: () => boolean) => {
  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBackPress) {
        return onBackPress();
      }

      // Default: navigate back if possible
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      return false;
    });

    return () => backHandler.remove();
  }, [navigation, onBackPress]);
};

// Platform-specific performance optimization
export const usePlatformPerformance = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Android-specific optimizations
      // Enable hardware acceleration hints
      InteractionManager.setDeadline(100);
    } else if (Platform.OS === 'ios') {
      // iOS-specific optimizations
      InteractionManager.setDeadline(100);
    }
  }, []);
};

// Combined platform optimization hook (alias for convenience)
export const usePlatformOptimization = usePlatformPerformance;

// iOS Gesture Handler
export const useIOSGestures = () => {
  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // iOS-specific gesture optimizations
      // Navigation gestures are handled by React Navigation by default
      // This hook can be extended for custom gesture handling
    }
  }, [navigation]);
};
