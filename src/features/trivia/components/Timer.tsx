/**
 * Timer Component
 * Countdown timer display
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@ui/components';
import { colors, spacing } from '@ui/tokens';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export const Timer: React.FC<TimerProps> = ({ timeRemaining, totalTime }) => {
  const percentage = (timeRemaining / totalTime) * 100;
  const isLow = percentage < 25;

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <View style={[styles.timerFill, { width: `${percentage}%` }, isLow && styles.timerLow]} />
      </View>
      <Text variant="h3" style={[styles.timeText, isLow && styles.timeLow]}>
        {timeRemaining}s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  timeLow: {
    color: colors.error[500],
  },
  timeText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  timerBar: {
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    height: 8,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  timerFill: {
    backgroundColor: colors.success[500],
    borderRadius: 4,
    height: '100%',
  },
  timerLow: {
    backgroundColor: colors.error[500],
  },
});
