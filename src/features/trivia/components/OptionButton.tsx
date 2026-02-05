/**
 * Option Button Component
 * Answer option button
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@ui/components';
import { colors, spacing, borderRadius } from '@ui/tokens';

interface OptionButtonProps {
  option: string;
  index: number;
  selected: boolean;
  disabled: boolean;
  eliminated: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  showResult?: boolean;
  onPress: () => void;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  option,
  index,
  selected,
  disabled,
  eliminated,
  isCorrect,
  isWrong,
  showResult,
  onPress,
}) => {
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        selected && styles.selected,
        eliminated && styles.eliminated,
        disabled && styles.disabled,
        isCorrect && styles.correct,
        isWrong && styles.wrong,
      ]}
      onPress={onPress}
      disabled={disabled || eliminated}
      activeOpacity={0.7}
    >
      <Text
        variant="h4"
        style={[styles.label, isCorrect && styles.correctLabel, isWrong && styles.wrongLabel]}
      >
        {labels[index]}
      </Text>
      <Text
        variant="body"
        style={[
          styles.optionText,
          eliminated && styles.eliminatedText,
          isCorrect && styles.correctText,
          isWrong && styles.wrongText,
        ]}
      >
        {option}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    marginVertical: spacing.xs,
    padding: spacing.md,
  },
  correct: {
    backgroundColor: '#dcfce7', // green-100
    borderColor: '#22c55e', // green-500
  },
  correctLabel: {
    backgroundColor: '#22c55e',
  },
  correctText: {
    color: '#15803d', // green-700
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.8, // Increased opacity so it's readable
  },
  eliminated: {
    backgroundColor: colors.gray[100],
    opacity: 0.3,
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
  },
  label: {
    backgroundColor: colors.primary[500],
    borderRadius: 20,
    color: colors.white,
    height: 40,
    lineHeight: 40,
    marginRight: spacing.md,
    textAlign: 'center',
    width: 40,
  },
  optionText: {
    color: colors.text,
    flex: 1,
  },
  selected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  wrong: {
    backgroundColor: '#fee2e2', // red-100
    borderColor: '#ef4444', // red-500
  },
  wrongLabel: {
    backgroundColor: '#ef4444',
  },
  wrongText: {
    color: '#b91c1c', // red-700
    fontWeight: 'bold',
  },
});
