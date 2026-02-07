/**
 * StatisticsCard Component
 * Reusable card component for displaying statistics with icons and change indicators
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../core/design-system';
import { typography } from '../theme/typography';

interface StatisticsCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: string;
  style?: ViewStyle;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.value}>{value}</Text>

      {change && (
        <View style={styles.changeContainer}>
          <Text
            style={[styles.changeText, isPositive ? styles.positiveChange : styles.negativeChange]}
          >
            {change}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  changeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  changeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  negativeChange: {
    color: COLORS.status.error,
  },
  positiveChange: {
    color: COLORS.status.success,
  },
  title: {
    ...typography.caption,
    color: COLORS.text.inverse,
    fontSize: 12,
    opacity: 0.8,
  },
  value: {
    ...typography.h4,
    color: COLORS.text.inverse,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
});

export default StatisticsCard;
