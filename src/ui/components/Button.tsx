/**
 * Button Component
 * Reusable button with variants
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { borderRadius } from '../tokens/borderRadius';
import { typography } from '../tokens/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <LottieView
          source={require('../../../assets/signup/DogParachute.json')}
          autoPlay
          loop
          style={{ width: 30, height: 30 }}
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`text_${size}`],
            isDisabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },

  // Variants
  variant_primary: {
    backgroundColor: colors.primary[500],
  },
  variant_secondary: {
    backgroundColor: colors.secondary[500],
  },
  variant_outline: {
    backgroundColor: colors.transparent,
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  variant_ghost: {
    backgroundColor: colors.transparent,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  size_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  size_lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },

  // Text styles
  text: {
    fontWeight: typography.fontWeight.semibold,
  },
  text_primary: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.white,
  },
  text_outline: {
    color: colors.primary[500],
  },
  text_ghost: {
    color: colors.primary[500],
  },
  text_sm: {
    fontSize: typography.fontSize.sm,
  },
  text_md: {
    fontSize: typography.fontSize.base,
  },
  text_lg: {
    fontSize: typography.fontSize.lg,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
