/**
 * Status Bar Manager - Enterprise Level
 * Comprehensive status bar management for iOS and Android
 *
 * @description Professional status bar handling with platform optimization
 * @author TriviaPay Team
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, Dimensions, AppState, AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type StatusBarStyle = 'light-content' | 'dark-content' | 'default';
export type StatusBarBackgroundColor = string;

interface StatusBarConfig {
  style: StatusBarStyle;
  backgroundColor: StatusBarBackgroundColor;
  translucent: boolean;
  hidden: boolean;
  animated: boolean;
}

interface StatusBarManagerProps {
  children: React.ReactNode;
  defaultStyle?: StatusBarStyle;
  defaultBackgroundColor?: StatusBarBackgroundColor;
  autoManage?: boolean;
}

/**
 * Status Bar Manager Component
 */
export const StatusBarManager: React.FC<StatusBarManagerProps> = ({
  children,
  defaultStyle = 'light-content',
  defaultBackgroundColor = '#6c5ce7',
  autoManage = true,
}) => {
  const [statusBarConfig, setStatusBarConfig] = useState<StatusBarConfig>({
    style: defaultStyle,
    backgroundColor: defaultBackgroundColor,
    translucent: Platform.OS === 'android',
    hidden: false,
    animated: true,
  });

  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (autoManage) {
      // Set initial status bar configuration
      StatusBar.setBarStyle(statusBarConfig.style, statusBarConfig.animated);
      StatusBar.setBackgroundColor(statusBarConfig.backgroundColor, statusBarConfig.animated);
      StatusBar.setTranslucent(statusBarConfig.translucent);
      StatusBar.setHidden(statusBarConfig.hidden, 'fade');
    }
  }, [statusBarConfig, autoManage]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Restore status bar when app becomes active
        StatusBar.setBarStyle(statusBarConfig.style, true);
        StatusBar.setBackgroundColor(statusBarConfig.backgroundColor, true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [statusBarConfig]);

  const updateStatusBar = (config: Partial<StatusBarConfig>) => {
    setStatusBarConfig(prev => ({ ...prev, ...config }));
  };

  return (
    <StatusBarContext.Provider value={{ statusBarConfig, updateStatusBar }}>
      {children}
    </StatusBarContext.Provider>
  );
};

/**
 * Status Bar Context
 */
interface StatusBarContextType {
  statusBarConfig: StatusBarConfig;
  updateStatusBar: (config: Partial<StatusBarConfig>) => void;
}

const StatusBarContext = React.createContext<StatusBarContextType | null>(null);

/**
 * Status Bar Hook
 */
export const useStatusBar = () => {
  const context = React.useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBar must be used within StatusBarManager');
  }
  return context;
};

/**
 * Status Bar Component
 */
interface StatusBarComponentProps {
  style?: StatusBarStyle;
  backgroundColor?: StatusBarBackgroundColor;
  translucent?: boolean;
  hidden?: boolean;
  animated?: boolean;
}

export const StatusBarComponent: React.FC<StatusBarComponentProps> = ({
  style = 'light-content',
  backgroundColor = '#6c5ce7',
  translucent = Platform.OS === 'android',
  hidden = false,
  animated = true,
}) => {
  useEffect(() => {
    StatusBar.setBarStyle(style, animated);
    StatusBar.setBackgroundColor(backgroundColor, animated);
    StatusBar.setTranslucent(translucent);
    StatusBar.setHidden(hidden, animated ? 'fade' : 'none');
  }, [style, backgroundColor, translucent, hidden, animated]);

  return null;
};

/**
 * Status Bar Utilities
 */
export const StatusBarUtils = {
  /**
   * Get platform-specific status bar height
   */
  getStatusBarHeight: (): number => {
    if (Platform.OS === 'ios') {
      const { height } = Dimensions.get('window');
      const { height: screenHeight } = Dimensions.get('screen');
      return screenHeight > height ? 44 : 20;
    } else {
      return StatusBar.currentHeight || 24;
    }
  },

  /**
   * Get safe status bar style for background color
   */
  getSafeStatusBarStyle: (backgroundColor: string): StatusBarStyle => {
    // Simple heuristic - you can make this more sophisticated
    const isLight =
      backgroundColor === 'white' ||
      backgroundColor === '#ffffff' ||
      backgroundColor.includes('white');
    return isLight ? 'dark-content' : 'light-content';
  },

  /**
   * Get status bar configuration for theme
   */
  getThemeConfig: (theme: 'light' | 'dark'): StatusBarConfig => {
    if (theme === 'light') {
      return {
        style: 'dark-content',
        backgroundColor: '#ffffff',
        translucent: false,
        hidden: false,
        animated: true,
      };
    } else {
      return {
        style: 'light-content',
        backgroundColor: '#000000',
        translucent: false,
        hidden: false,
        animated: true,
      };
    }
  },

  /**
   * Get status bar configuration for screen type
   */
  getScreenConfig: (screenType: 'auth' | 'main' | 'modal'): StatusBarConfig => {
    switch (screenType) {
      case 'auth':
        return {
          style: 'light-content',
          backgroundColor: '#6c5ce7',
          translucent: Platform.OS === 'android',
          hidden: false,
          animated: true,
        };
      case 'main':
        return {
          style: 'dark-content',
          backgroundColor: '#ffffff',
          translucent: false,
          hidden: false,
          animated: true,
        };
      case 'modal':
        return {
          style: 'light-content',
          backgroundColor: '#000000',
          translucent: true,
          hidden: false,
          animated: true,
        };
      default:
        return {
          style: 'light-content',
          backgroundColor: '#6c5ce7',
          translucent: Platform.OS === 'android',
          hidden: false,
          animated: true,
        };
    }
  },

  /**
   * Animate status bar change
   */
  animateStatusBar: (
    style: StatusBarStyle,
    backgroundColor: StatusBarBackgroundColor,
    duration: number = 300
  ) => {
    StatusBar.setBarStyle(style, true);
    StatusBar.setBackgroundColor(backgroundColor, true);
  },
};

/**
 * Status Bar Presets
 */
export const StatusBarPresets = {
  // Authentication screens
  auth: {
    style: 'light-content' as StatusBarStyle,
    backgroundColor: '#6c5ce7',
    translucent: Platform.OS === 'android',
    hidden: false,
    animated: true,
  },

  // Main app screens
  main: {
    style: 'dark-content' as StatusBarStyle,
    backgroundColor: '#ffffff',
    translucent: false,
    hidden: false,
    animated: true,
  },

  // Modal screens
  modal: {
    style: 'light-content' as StatusBarStyle,
    backgroundColor: '#000000',
    translucent: true,
    hidden: false,
    animated: true,
  },

  // Loading screens
  loading: {
    style: 'light-content' as StatusBarStyle,
    backgroundColor: '#6c5ce7',
    translucent: Platform.OS === 'android',
    hidden: false,
    animated: true,
  },

  // Error screens
  error: {
    style: 'light-content' as StatusBarStyle,
    backgroundColor: '#ef4444',
    translucent: false,
    hidden: false,
    animated: true,
  },
};

export default StatusBarManager;
