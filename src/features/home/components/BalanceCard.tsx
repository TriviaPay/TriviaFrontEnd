/**
 * Balance Card Component
 * Displays user's coins and gems balance
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text } from '@ui/components';
import { colors, spacing, borderRadius } from '@ui/tokens';
import type { UserBalance } from '../types';

interface BalanceCardProps {
  balance: UserBalance | null;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  if (!balance) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.balanceItem}>
          <Image
            source={require('@assets/icons/Tpcoin.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text variant="h3" style={styles.amount}>
            {balance.coins.toLocaleString()}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Coins
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.balanceItem}>
          <Image
            source={require('@assets/icons/diamond.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text variant="h3" style={styles.amount}>
            {balance.gems.toLocaleString()}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Gems
          </Text>
        </View>
      </View>

      <View style={styles.levelContainer}>
        <Text variant="body" color={colors.textSecondary}>
          Level {balance.level} • {balance.experience} XP
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  amount: {
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  balanceItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.md,
  },
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  divider: {
    backgroundColor: colors.border,
    height: 60,
    width: 1,
  },
  icon: {
    height: 40,
    marginBottom: spacing.xs,
    width: 40,
  },
  levelContainer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
