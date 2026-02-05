import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Button } from '@ui/components';
import { spacing, colors } from '@ui/tokens';

interface ErrorScreenProps {
  error?: string;
  onRetry?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => {
  return (
    <Screen safe>
      <View style={styles.container}>
        <Text variant="h1" style={styles.emoji}>
          ⚠️
        </Text>
        <Text variant="h2" style={styles.title}>
          Something went wrong
        </Text>
        <Text variant="body" color={colors.textSecondary} align="center">
          {error || 'An unexpected error occurred. Please try again.'}
        </Text>
        {onRetry && (
          <Button variant="primary" onPress={onRetry} style={styles.button}>
            Try Again
          </Button>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  button: { marginTop: spacing.lg },
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 80, marginBottom: spacing.lg },
  title: { marginBottom: spacing.md },
});
