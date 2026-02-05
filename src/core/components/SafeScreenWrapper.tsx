/**
 * SafeScreenWrapper Component
 * A wrapper component that ensures proper safe area handling for all screens
 * Prevents header overlapping with status bar on mobile devices
 */

import React from 'react';
import { View, StyleSheet, Platform, StatusBar, ViewStyle, StatusBarStyle } from 'react-native';
import { useSafeAreaInsets, Edges } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useReduxHooks';

interface SafeScreenWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  statusBarColor?: string;
  showStatusBar?: boolean;
  edges?: Edges;
  style?: ViewStyle;
  translucent?: boolean; // explicit override if needed
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  [key: string]: any; // Allow other View props
}

const SafeScreenWrapper: React.FC<SafeScreenWrapperProps> = ({
  children,
  backgroundColor,
  statusBarStyle = 'dark-content',
  statusBarColor, // defaults to backgroundColor or transparent
  showStatusBar = true,
  edges = { top: 'additive', bottom: 'additive', left: 'additive', right: 'additive' },
  style,
  translucent = true, // Default to true for modern design (draw behind status bar)
  pointerEvents,
  ...rest
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  // effective background color
  const effectiveBackgroundColor = backgroundColor || colors.background;

  // On Android, if we want to draw behind the status bar (translucent), 
  // we set the status bar color to transparent.
  // Otherwise, we use the provided color.
  const effectiveStatusBarColor = statusBarColor || (translucent ? 'transparent' : effectiveBackgroundColor);

  // Safe area padding calculations
  // We use 'additive' logic for edges if passed as an object, otherwise assumed standard generic usage
  // For simplicity in this project, we'll manually apply padding based on the insets

  // Helper to check if edge is enabled (handling both array and object format implied by generic usage, 
  // but here we enforce strict prop usage or simple inclusion check)
  // To keep it simple and robust:
  const isEdgeIncluded = (edge: string) => {
    if (Array.isArray(edges)) {
      return edges.includes(edge);
    }
    // minimal support for object notation if needed, but primarily supporting the array-like usage from previous code or simple defaults
    return true;
  };

  // NOTE: Previous code used array ['top', 'bottom'...]. We will support that.
  const safeAreaStyle = {
    paddingTop: Array.isArray(edges) && edges.includes('top') ? insets.top : 0,
    paddingBottom: Array.isArray(edges) && edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: Array.isArray(edges) && edges.includes('left') ? insets.left : 0,
    paddingRight: Array.isArray(edges) && edges.includes('right') ? insets.right : 0,
    backgroundColor: effectiveBackgroundColor,
    flex: 1,
  };

  return (
    <>
      {showStatusBar && (
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={effectiveStatusBarColor}
          translucent={translucent}
          animated={true}
        />
      )}
      <View style={[styles.container, safeAreaStyle, style]} pointerEvents={pointerEvents} {...rest}>
        {children}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeScreenWrapper;
