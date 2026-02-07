import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@ui/components';
import { spacing, colors } from '@ui/tokens';

export const OfflineScreen: React.FC = () => {
  return (
    <Screen safe>
      <View style={styles.container}>
        <Text variant="h1" style={styles.emoji}>
          📡
        </Text>
        <Text variant="h2" style={styles.title}>
          No Internet Connection
        </Text>
        <Text variant="body" color={colors.textSecondary} align="center">
          Please check your internet connection and try again.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 80, marginBottom: spacing.lg },
  title: { marginBottom: spacing.md },
});
