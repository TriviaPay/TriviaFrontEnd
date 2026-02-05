/**
 * SafeAreaHeader Component
 * A reusable header component that properly handles safe area insets
 * to prevent overlapping with the status bar on mobile devices
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useReduxHooks';

interface SafeAreaHeaderProps {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  showStatusBar?: boolean;
  statusBarStyle?: 'light-content' | 'dark-content';
  children?: React.ReactNode;
  style?: any;
}

const SafeAreaHeader: React.FC<SafeAreaHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = '#6c5ce7',
  textColor = 'white',
  showStatusBar = true,
  statusBarStyle = 'light-content',
  children,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();

  return (
    <>
      {showStatusBar && (
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={backgroundColor}
          translucent={false}
        />
      )}
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 20 : 0),
            backgroundColor,
          },
          style,
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>}
          {children}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    elevation: 5,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SafeAreaHeader;
