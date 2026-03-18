/**
 * Keyboard Management Utilities
 * Provides consistent keyboard handling across the app
 */

import { Platform, Keyboard, KeyboardAvoidingView, KeyboardAvoidingViewProps } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardManagerProps extends Omit<KeyboardAvoidingViewProps, 'behavior'> {
  children: React.ReactNode;
  behavior?: 'padding' | 'height' | 'position' | 'off';
  keyboardVerticalOffset?: number;
  enabled?: boolean;
}

/**
 * Keyboard Manager Component
 * Provides consistent keyboard handling with platform-specific optimizations
 */
export const KeyboardManager: React.FC<KeyboardManagerProps> = ({
  children,
  behavior,
  keyboardVerticalOffset,
  enabled = true,
  style,
  ...props
}) => {
  const insets = useSafeAreaInsets();

  // Platform-specific defaults
  // Android: use 'undefined' because adjustResize in AndroidManifest handles keyboard natively
  // iOS: use 'padding' to push content up when keyboard opens
  const defaultBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
  const defaultOffset = Platform.OS === 'ios' ? 0 : 0;

  const finalBehavior = behavior !== undefined ? behavior : defaultBehavior;
  const finalOffset =
    keyboardVerticalOffset !== undefined
      ? keyboardVerticalOffset
      : defaultOffset + (Platform.OS === 'ios' ? insets.bottom : 0);

  if (!enabled || finalBehavior === 'off') {
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView
      behavior={finalBehavior as any}
      keyboardVerticalOffset={finalOffset}
      style={style}
      {...props}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

/**
 * Keyboard Utilities
 */
export const KeyboardUtils = {
  /**
   * Dismiss keyboard
   */
  dismiss: (): void => {
    Keyboard.dismiss();
  },

  /**
   * Add keyboard show listener
   */
  addShowListener: (callback: (event: any) => void) => {
    return Keyboard.addListener('keyboardDidShow', callback);
  },

  /**
   * Add keyboard hide listener
   */
  addHideListener: (callback: (event: any) => void) => {
    return Keyboard.addListener('keyboardDidHide', callback);
  },

  /**
   * Add keyboard will show listener (iOS only)
   */
  addWillShowListener: (callback: (event: any) => void) => {
    if (Platform.OS === 'ios') {
      return Keyboard.addListener('keyboardWillShow', callback);
    }
    return { remove: () => { } };
  },

  /**
   * Add keyboard will hide listener (iOS only)
   */
  addWillHideListener: (callback: (event: any) => void) => {
    if (Platform.OS === 'ios') {
      return Keyboard.addListener('keyboardWillHide', callback);
    }
    return { remove: () => { } };
  },
};

/**
 * Hook for keyboard state management
 */
export const useKeyboard = () => {
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showSubscription = KeyboardUtils.addShowListener(event => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = KeyboardUtils.addHideListener(() => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return {
    keyboardVisible,
    keyboardHeight,
    dismiss: KeyboardUtils.dismiss,
  };
};
