/**
 * Question Card Component
 * Displays the current trivia question
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from '@ui/components';
import { colors, spacing } from '@ui/tokens';
import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
}) => {
  return (
    <Card style={styles.card} elevated>
      <View style={styles.header}>
        <Text variant="caption" color={colors.primary[500]}>
          Question {questionNumber} of {totalQuestions}
        </Text>
        <View style={styles.difficultyBadge}>
          <Text variant="caption" color={colors.white}>
            {question.difficulty.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text variant="h3" style={styles.questionText}>
        {question.question}
      </Text>

      {question.category && (
        <Text variant="caption" color={colors.textSecondary} style={styles.category}>
          📚 {question.category}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  category: {
    marginTop: spacing.sm,
  },
  difficultyBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  questionText: {
    color: colors.text,
    lineHeight: 28,
  },
});
