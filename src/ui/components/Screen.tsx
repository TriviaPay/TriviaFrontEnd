/**
 * Screen Component
 * Base screen wrapper with safe area
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../tokens/colors';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safe?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  safe = true,
  edges = ['top', 'bottom'],
}) => {
  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={[styles.screen, style]} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
