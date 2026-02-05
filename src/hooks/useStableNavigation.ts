/**
 * Stable Navigation Hook
 * Prevents UI jumping during navigation transitions
 */

import { useRef, useEffect, useCallback } from 'react';
import { InteractionManager, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(false); // Disable to prevent jumping
  }
}

interface UseStableNavigationOptions {
  enableSmooth?: boolean;
  preventJumping?: boolean;
}

/**
 * Hook to ensure stable navigation without UI jumping
 */
export const useStableNavigation = (options: UseStableNavigationOptions = {}) => {
  const { enableSmooth = true, preventJumping = true } = options;
  const navigation = useNavigation();
  const isNavigatingRef = useRef(false);
  const lastNavigationRef = useRef(0);

  /**
   * Navigate with stability - prevents rapid navigation and UI jumping
   */
  const stableNavigate = useCallback(
    (screen: string, params?: any) => {
      // Prevent rapid navigation
      const now = Date.now();
      if (now - lastNavigationRef.current < 300) {
        return; // Debounce navigation
      }

      lastNavigationRef.current = now;
      isNavigatingRef.current = true;

      // Use InteractionManager to ensure smooth transition
      InteractionManager.runAfterInteractions(() => {
        if (enableSmooth) {
          // Smooth transition without LayoutAnimation (which can cause jumping)
          navigation.navigate(screen as never, params as never);
        } else {
          navigation.navigate(screen as never, params as never);
        }

        // Reset navigation flag
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      });
    },
    [navigation, enableSmooth]
  );

  /**
   * Go back with stability
   */
  const stableGoBack = useCallback(() => {
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    InteractionManager.runAfterInteractions(() => {
      navigation.goBack();
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    });
  }, [navigation]);

  return {
    navigate: stableNavigate,
    goBack: stableGoBack,
    isNavigating: () => isNavigatingRef.current,
  };
};

/**
 * Hook to stabilize tab navigation
 */
export const useStableTabNavigation = () => {
  const lastTabChangeRef = useRef(0);

  const stableTabPress = useCallback((callback: () => void) => {
    const now = Date.now();
    if (now - lastTabChangeRef.current < 300) {
      return; // Debounce tab changes
    }

    lastTabChangeRef.current = now;

    // Use InteractionManager for smooth tab transitions
    InteractionManager.runAfterInteractions(() => {
      callback();
    });
  }, []);

  return { stableTabPress };
};
