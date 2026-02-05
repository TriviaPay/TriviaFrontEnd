/**
 * Status Bar Hook
 * Provides consistent status bar management across all screens
 */

import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export type StatusBarStyle = 'light-content' | 'dark-content' | 'auto';
export type StatusBarBackground = 'transparent' | 'opaque' | 'translucent';

interface UseStatusBarOptions {
  style?: StatusBarStyle;
  backgroundColor?: string;
  translucent?: boolean;
  hidden?: boolean;
}

export const useStatusBar = (options: UseStatusBarOptions = {}) => {
  const {
    style = 'light-content',
    backgroundColor = Platform.OS === 'android' ? '#000000' : undefined,
    translucent = Platform.OS === 'android',
    hidden = false,
  } = options;

  useFocusEffect(
    useCallback(() => {
      // CRITICAL: Set status bar immediately and synchronously - no delays
      // Direct updates prevent 30+ second delays on slower devices
      StatusBar.setBarStyle(style, false); // No animation to prevent jump

      if (Platform.OS === 'android') {
        // Android-specific status bar settings
        StatusBar.setBackgroundColor(backgroundColor, false); // No animation
        StatusBar.setTranslucent(translucent);
      }

      // Show/hide status bar - use 'none' animation to prevent jump
      StatusBar.setHidden(hidden, 'none');

      return () => {
        // CRITICAL: Don't reset status bar on blur to prevent conflicts
        // MainNavigator will handle status bar management centrally
        // This prevents tab bar jumping when navigating between screens
      };
    }, [style, backgroundColor, translucent, hidden])
  );
};
