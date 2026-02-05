/**
 * Lifeline Button Component
 * Lifeline action buttons (50/50, Skip, Hint)
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from '@ui/components';
import { colors, spacing, borderRadius } from '@ui/tokens';
import type { LifelineType } from '../types';

interface LifelineButtonProps {
  type: LifelineType;
  available: boolean;
  onPress: () => void;
}

const lifelineConfig = {
  fiftyFifty: { icon: '50:50', label: '50/50' },
  skip: { icon: '⏭️', label: 'Skip' },
  hint: { icon: '💡', label: 'Hint' },
};

export const LifelineButton: React.FC<LifelineButtonProps> = ({ type, available, onPress }) => {
  const config = lifelineConfig[type];

  return (
    <TouchableOpacity
      style={[styles.button, !available && styles.disabled]}
      onPress={onPress}
      disabled={!available}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text variant="h4" style={styles.icon}>
          {config.icon}
        </Text>
        <Text variant="caption" style={styles.label}>
          {config.label}
        </Text>
      </View>
      {!available && (
        <View style={styles.usedBadge}>
          <Text variant="caption" color={colors.white}>
            USED
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    flex: 1,
    marginHorizontal: spacing.xs,
    padding: spacing.sm,
  },
  content: {
    alignItems: 'center',
  },
  disabled: {
    borderColor: colors.gray[300],
    opacity: 0.4,
  },
  icon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  usedBadge: {
    backgroundColor: colors.error[500],
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    position: 'absolute',
    right: -8,
    top: -8,
  },
});
