import React, { useEffect } from 'react';
import { StatusBar, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStandardResponsive } from '../../hooks/useStandardResponsive';

interface ResponsiveStatusBarProps {
  barStyle?: 'default' | 'light-content' | 'dark-content';
  backgroundColor?: string;
  translucent?: boolean;
  hidden?: boolean;
  animated?: boolean;
}

const ResponsiveStatusBar: React.FC<ResponsiveStatusBarProps> = ({
  barStyle = 'light-content',
  backgroundColor = '#6C5CE7',
  translucent = false,
  hidden = false,
  animated = true,
}) => {
  const insets = useSafeAreaInsets();
  const { isSmallDevice, isTablet, deviceType } = useStandardResponsive();
  const { height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    // Configure status bar based on device type and screen size
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(translucent);
      StatusBar.setBackgroundColor(backgroundColor, animated);
      StatusBar.setBarStyle(barStyle, animated);

      if (hidden) {
        StatusBar.setHidden(true, animated ? 'fade' : 'none');
      } else {
        StatusBar.setHidden(false, animated ? 'fade' : 'none');
      }
    } else {
      // iOS configuration
      StatusBar.setBarStyle(barStyle, animated);
      StatusBar.setHidden(hidden, animated ? 'fade' : 'none');
    }
  }, [barStyle, backgroundColor, translucent, hidden, animated, deviceType]);

  // For Android, we need to handle the status bar height manually
  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return insets.top;
    } else {
      // Android status bar height varies by device
      if (isSmallDevice) {
        return 24; // Small devices typically have 24dp status bar
      } else if (isTablet) {
        return 32; // Tablets typically have 32dp status bar
      } else {
        return 28; // Standard phones have 28dp status bar
      }
    }
  };

  // Return the status bar height for manual padding if needed
  const statusBarHeight = getStatusBarHeight();

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={backgroundColor}
      translucent={translucent}
      hidden={hidden}
      animated={animated}
    />
  );
};

// Export utility function to get status bar height
export const getStatusBarHeight = (
  insets: any,
  deviceType: string,
  isSmallDevice: boolean,
  isTablet: boolean
) => {
  if (Platform.OS === 'ios') {
    return insets.top;
  } else {
    // Android status bar height varies by device
    if (isSmallDevice) {
      return 24; // Small devices typically have 24dp status bar
    } else if (isTablet) {
      return 32; // Tablets typically have 32dp status bar
    } else {
      return 28; // Standard phones have 28dp status bar
    }
  }
};

// Export utility function to get safe area padding
export const getSafeAreaPadding = (
  insets: any,
  deviceType: string,
  isSmallDevice: boolean,
  isTablet: boolean
) => {
  const statusBarHeight = getStatusBarHeight(insets, deviceType, isSmallDevice, isTablet);

  return {
    paddingTop: Platform.OS === 'ios' ? insets.top : statusBarHeight,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

export default ResponsiveStatusBar;
