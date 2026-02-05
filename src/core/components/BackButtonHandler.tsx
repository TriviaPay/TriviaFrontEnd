/**
 * Back Button Handler - Enterprise Level
 * Comprehensive Android back button handling with navigation support
 *
 * @description Professional back button handling for Android with navigation integration
 * @author TriviaPay Team
 */

import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Alert, ToastAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { logger } from '../../lib/utils/logger';

export type BackButtonAction = 'navigate' | 'exit' | 'custom' | 'prevent';
export type BackButtonBehavior = 'default' | 'confirm' | 'toast' | 'custom';

interface BackButtonConfig {
  action: BackButtonAction;
  behavior: BackButtonBehavior;
  customHandler?: () => boolean;
  confirmMessage?: string;
  toastMessage?: string;
  preventOnScreens?: string[];
  allowOnScreens?: string[];
}

interface BackButtonHandlerProps {
  children: React.ReactNode;
  config?: Partial<BackButtonConfig>;
  globalConfig?: Partial<BackButtonConfig>;
}

/**
 * Back Button Handler Component
 */
export const BackButtonHandler: React.FC<BackButtonHandlerProps> = ({
  children,
  config = {},
  globalConfig = {},
}) => {
  const [currentConfig, setCurrentConfig] = useState<BackButtonConfig>({
    action: 'navigate',
    behavior: 'default',
    ...globalConfig,
    ...config,
  });

  // Safely get navigation with fallback
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    // Navigation not available yet, will be handled in handleBackPress
    logger.warn('Navigation not available in BackButtonHandler:', 'APP', error);
  }

  const backButtonHandlerRef = useRef<(() => boolean) | null>(null);

  const handleBackPress = (): boolean => {
    const { action, behavior, customHandler, confirmMessage, toastMessage } = currentConfig;

    switch (action) {
      case 'navigate':
        if (navigation && navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
          return true;
        } else {
          // Handle root screen back press or when navigation is not available
          return handleRootBackPress(behavior, confirmMessage, toastMessage);
        }

      case 'exit':
        return handleExitApp(behavior, confirmMessage, toastMessage);

      case 'custom':
        if (customHandler) {
          return customHandler();
        }
        return false;

      case 'prevent':
        return true;

      default:
        return false;
    }
  };

  const handleRootBackPress = (
    behavior: BackButtonBehavior,
    confirmMessage?: string,
    toastMessage?: string
  ): boolean => {
    switch (behavior) {
      case 'confirm':
        Alert.alert('Exit App', confirmMessage || 'Are you sure you want to exit the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;

      case 'toast':
        ToastAndroid.show(toastMessage || 'Press back again to exit', ToastAndroid.SHORT);
        return true;

      case 'custom':
        return false;

      default:
        BackHandler.exitApp();
        return true;
    }
  };

  const handleExitApp = (
    behavior: BackButtonBehavior,
    confirmMessage?: string,
    toastMessage?: string
  ): boolean => {
    switch (behavior) {
      case 'confirm':
        Alert.alert('Exit App', confirmMessage || 'Are you sure you want to exit the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;

      case 'toast':
        ToastAndroid.show(toastMessage || 'Press back again to exit', ToastAndroid.SHORT);
        return true;

      case 'custom':
        return false;

      default:
        BackHandler.exitApp();
        return true;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      backButtonHandlerRef.current = handleBackPress;

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return backButtonHandlerRef.current?.() || false;
      });

      return () => {
        backHandler.remove();
      };
    }
  }, [currentConfig]);

  const updateConfig = React.useCallback((newConfig: Partial<BackButtonConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return (
    <BackButtonContext.Provider value={{ config: currentConfig, updateConfig }}>
      {children}
    </BackButtonContext.Provider>
  );
};

/**
 * Back Button Context
 */
interface BackButtonContextType {
  config: BackButtonConfig;
  updateConfig: (config: Partial<BackButtonConfig>) => void;
}

const BackButtonContext = React.createContext<BackButtonContextType | null>(null);

/**
 * Back Button Hook
 */
export const useBackButton = () => {
  const context = React.useContext(BackButtonContext);
  if (!context) {
    throw new Error('useBackButton must be used within BackButtonHandler');
  }
  return context;
};

/**
 * Screen-specific Back Button Handler
 */
interface ScreenBackButtonHandlerProps {
  action?: BackButtonAction;
  behavior?: BackButtonBehavior;
  customHandler?: () => boolean;
  confirmMessage?: string;
  toastMessage?: string;
  preventOnFocus?: boolean;
}

export const ScreenBackButtonHandler: React.FC<ScreenBackButtonHandlerProps> = ({
  action = 'navigate',
  behavior = 'default',
  customHandler,
  confirmMessage,
  toastMessage,
  preventOnFocus = false,
}) => {
  const { updateConfig } = useBackButton();

  useFocusEffect(
    React.useCallback(() => {
      if (preventOnFocus) {
        updateConfig({ action: 'prevent' });
      } else {
        updateConfig({
          action,
          behavior,
          customHandler,
          confirmMessage,
          toastMessage,
        });
      }

      return () => {
        // Reset to default when screen loses focus
        updateConfig({ action: 'navigate', behavior: 'default' });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, behavior, customHandler, confirmMessage, toastMessage, preventOnFocus])
  );

  return null;
};

/**
 * Back Button Utilities
 */
export const BackButtonUtils = {
  /**
   * Get default configuration for screen type
   */
  getScreenConfig: (screenType: 'auth' | 'main' | 'modal' | 'settings'): BackButtonConfig => {
    switch (screenType) {
      case 'auth':
        return {
          action: 'exit',
          behavior: 'confirm',
          confirmMessage: 'Are you sure you want to exit the app?',
        };
      case 'main':
        return {
          action: 'navigate',
          behavior: 'default',
        };
      case 'modal':
        return {
          action: 'navigate',
          behavior: 'default',
        };
      case 'settings':
        return {
          action: 'navigate',
          behavior: 'default',
        };
      default:
        return {
          action: 'navigate',
          behavior: 'default',
        };
    }
  },

  /**
   * Create custom back button handler
   */
  createCustomHandler: (handler: () => boolean): BackButtonConfig => ({
    action: 'custom',
    behavior: 'custom',
    customHandler: handler,
  }),

  /**
   * Create confirmation back button handler
   */
  createConfirmHandler: (message: string): BackButtonConfig => ({
    action: 'exit',
    behavior: 'confirm',
    confirmMessage: message,
  }),

  /**
   * Create toast back button handler
   */
  createToastHandler: (message: string): BackButtonConfig => ({
    action: 'exit',
    behavior: 'toast',
    toastMessage: message,
  }),

  /**
   * Create prevent back button handler
   */
  createPreventHandler: (): BackButtonConfig => ({
    action: 'prevent',
    behavior: 'default',
  }),
};

/**
 * Back Button Presets
 */
export const BackButtonPresets = {
  // Authentication screens
  auth: {
    action: 'exit' as BackButtonAction,
    behavior: 'confirm' as BackButtonBehavior,
    confirmMessage: 'Are you sure you want to exit the app?',
  },

  // Main app screens
  main: {
    action: 'navigate' as BackButtonAction,
    behavior: 'default' as BackButtonBehavior,
  },

  // Modal screens
  modal: {
    action: 'navigate' as BackButtonAction,
    behavior: 'default' as BackButtonBehavior,
  },

  // Settings screens
  settings: {
    action: 'navigate' as BackButtonAction,
    behavior: 'default' as BackButtonBehavior,
  },

  // Form screens
  form: {
    action: 'custom' as BackButtonAction,
    behavior: 'custom' as BackButtonBehavior,
    customHandler: () => {
      // Check if form has unsaved changes
      return false; // Allow back navigation
    },
  },
};

export default BackButtonHandler;
