/**
 * Safe Area Provider - Enterprise Level
 * Comprehensive safe area handling for iOS and Android
 *
 * @description Professional safe area implementation with platform optimization
 * @author TriviaPay Team
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StatusBar,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  SafeAreaProvider as RNSafeAreaProvider,
  SafeAreaView as RNSafeAreaView,
  useSafeAreaInsets,
  EdgeInsets,
} from 'react-native-safe-area-context';
import { Keyboard } from 'react-native';

interface SafeAreaProviderProps {
  children: React.ReactNode;
}

interface SafeAreaConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  keyboardHeight: number;
  statusBarHeight: number;
  navigationBarHeight: number;
}

/**
 * Enhanced Safe Area Provider with platform-specific optimizations
 */
export const SafeAreaProvider: React.FC<SafeAreaProviderProps> = ({ children }) => {
  const [safeAreaConfig, setSafeAreaConfig] = useState<SafeAreaConfig>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    keyboardHeight: 0,
    statusBarHeight: 0,
    navigationBarHeight: 0,
  });

  useEffect(() => {
    const updateSafeAreaConfig = () => {
      const { width, height } = Dimensions.get('window');
      const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

      // Calculate status bar height
      const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

      // Calculate navigation bar height (Android)
      const navigationBarHeight =
        Platform.OS === 'android' ? screenHeight - height - statusBarHeight : 0;

      setSafeAreaConfig(prev => ({
        ...prev,
        top: statusBarHeight,
        bottom: navigationBarHeight,
        left: 0,
        right: 0,
        statusBarHeight,
        navigationBarHeight,
      }));
    };

    updateSafeAreaConfig();

    const subscription = Dimensions.addEventListener('change', updateSafeAreaConfig);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setSafeAreaConfig(prev => ({
        ...prev,
        keyboardHeight: event.endCoordinates.height,
      }));
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setSafeAreaConfig(prev => ({
        ...prev,
        keyboardHeight: 0,
      }));
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <RNSafeAreaProvider>
      <SafeAreaContext.Provider value={safeAreaConfig}>{children}</SafeAreaContext.Provider>
    </RNSafeAreaProvider>
  );
};

/**
 * Safe Area Context
 */
const SafeAreaContext = React.createContext<SafeAreaConfig>({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  keyboardHeight: 0,
  statusBarHeight: 0,
  navigationBarHeight: 0,
});

/**
 * Enhanced Safe Area View with platform optimizations
 */
interface SafeAreaViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  style?: any;
  keyboardAvoidingView?: boolean;
  scrollable?: boolean;
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = 'transparent',
  style,
  keyboardAvoidingView = true,
  scrollable = false,
}) => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const safeAreaStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
    backgroundColor,
    flex: 1,
  };

  const content = <RNSafeAreaView style={[safeAreaStyle, style]}>{children}</RNSafeAreaView>;

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (keyboardAvoidingView) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

/**
 * Safe Area Hook
 */
export const useSafeArea = () => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return {
    insets,
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 0,
    safeAreaInsets: {
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    },
  };
};

/**
 * Platform-specific safe area utilities
 */
export const SafeAreaUtils = {
  /**
   * Get safe area insets for specific platform
   */
  getPlatformInsets: (platform: 'ios' | 'android' = Platform.OS as 'ios' | 'android') => {
    if (platform === 'ios') {
      return {
        top: 44, // Status bar height
        bottom: 34, // Home indicator height
        left: 0,
        right: 0,
      };
    } else {
      return {
        top: StatusBar.currentHeight || 24,
        bottom: 0,
        left: 0,
        right: 0,
      };
    }
  },

  /**
   * Get keyboard avoiding view props
   */
  getKeyboardAvoidingProps: () => ({
    behavior: Platform.OS === 'ios' ? 'padding' : 'height',
    keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 20,
  }),

  /**
   * Calculate content height with safe areas
   */
  getContentHeight: (screenHeight: number, insets: EdgeInsets) => {
    return screenHeight - insets.top - insets.bottom;
  },

  /**
   * Calculate content width with safe areas
   */
  getContentWidth: (screenWidth: number, insets: EdgeInsets) => {
    return screenWidth - insets.left - insets.right;
  },
};

export default SafeAreaProvider;
