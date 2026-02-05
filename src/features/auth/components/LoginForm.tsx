/**
 * Login Form Component
 * Presentational component for login form
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { Button, Text } from '@ui/components';
import { colors, spacing, borderRadius, typography } from '@ui/tokens';
import { isEmail } from '@core/utils/validation';
import type { LoginCredentials } from '../types';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!isEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await onSubmit({ email, password });
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="h2" align="center" style={styles.title}>
        Welcome Back
      </Text>

      <View style={styles.inputContainer}>
        <Text variant="caption" style={styles.label}>
          Email
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        {errors.email && (
          <Text variant="caption" color={colors.error[500]}>
            {errors.email}
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text variant="caption" style={styles.label}>
          Password
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {errors.password && (
          <Text variant="caption" color={colors.error[500]}>
            {errors.password}
          </Text>
        )}
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handleSubmit}
        loading={loading}
        fullWidth
        style={styles.button}
      >
        Login
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.lg,
  },
  container: {
    padding: spacing.lg,
    width: '100%',
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.primary[500],
    marginBottom: spacing.xl,
  },
});
