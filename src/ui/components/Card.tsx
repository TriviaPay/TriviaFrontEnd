/**
 * Card Component
 * Container with elevation and padding
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { borderRadius } from '../tokens/borderRadius';
import { shadows } from '../tokens/shadows';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = 'md', elevated = true }) => {
  return (
    <View style={[styles.card, { padding: spacing[padding] }, elevated && shadows.md, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
});
