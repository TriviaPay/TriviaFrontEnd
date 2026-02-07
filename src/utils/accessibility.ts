/**
 * Accessibility Utilities
 * Provides consistent accessibility labels and helpers
 * Improves screen reader support and touch target sizes
 */

import { Platform } from 'react-native';

/**
 * Minimum touch target size (44x44 points for iOS, 48x48 dp for Android)
 */
export const MIN_TOUCH_TARGET_SIZE = Platform.OS === 'ios' ? 44 : 48;

/**
 * Create accessibility label for screen reader
 *
 * @example
 * ```tsx
 * <TouchableOpacity
 *   accessibilityLabel={createAccessibilityLabel('Submit', 'button', 'Submits the form')}
 *   onPress={handleSubmit}
 * >
 *   <Text>Submit</Text>
 * </TouchableOpacity>
 * ```
 */
export const createAccessibilityLabel = (
  name: string,
  role: string = 'button',
  hint?: string
): string => {
  if (hint) {
    return `${name}, ${role}, ${hint}`;
  }
  return `${name}, ${role}`;
};

/**
 * Get accessibility role for common UI elements
 */
export const getAccessibilityRole = (
  elementType: 'button' | 'link' | 'image' | 'text' | 'header' | 'input'
): string => {
  const roleMap: Record<string, string> = {
    button: 'button',
    link: 'link',
    image: 'image',
    text: 'text',
    header: 'header',
    input: 'textbox',
  };
  return roleMap[elementType] || 'none';
};

/**
 * Create accessibility props for common elements
 *
 * @example
 * ```tsx
 * <TouchableOpacity
 *   {...getAccessibilityProps('Submit Button', 'button', 'Submits the form')}
 *   onPress={handleSubmit}
 * >
 *   <Text>Submit</Text>
 * </TouchableOpacity>
 * ```
 */
export const getAccessibilityProps = (
  label: string,
  role: 'button' | 'link' | 'image' | 'text' | 'header' | 'input' = 'button',
  hint?: string
) => {
  return {
    accessible: true,
    accessibilityLabel: createAccessibilityLabel(label, getAccessibilityRole(role), hint),
    accessibilityRole: getAccessibilityRole(role),
    accessibilityHint: hint,
  };
};

/**
 * Ensure touch target meets minimum size requirements
 * Returns style object with minimum dimensions
 *
 * @example
 * ```tsx
 * <TouchableOpacity
 *   style={[styles.button, ensureMinimumTouchTarget(styles.button)]}
 *   onPress={handlePress}
 * >
 *   <Text>Press Me</Text>
 * </TouchableOpacity>
 * ```
 */
export const ensureMinimumTouchTarget = (existingStyle?: {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
}) => {
  const minSize = MIN_TOUCH_TARGET_SIZE;
  return {
    minWidth: existingStyle?.width || existingStyle?.minWidth || minSize,
    minHeight: existingStyle?.height || existingStyle?.minHeight || minSize,
  };
};

/**
 * Create accessibility state for interactive elements
 *
 * @example
 * ```tsx
 * <TouchableOpacity
 *   {...getAccessibilityState(isPressed, isDisabled)}
 *   onPress={handlePress}
 * >
 *   <Text>Button</Text>
 * </TouchableOpacity>
 * ```
 */
export const getAccessibilityState = (
  selected?: boolean,
  disabled?: boolean,
  checked?: boolean
) => {
  return {
    accessibilityState: {
      ...(selected !== undefined && { selected }),
      ...(disabled !== undefined && { disabled }),
      ...(checked !== undefined && { checked }),
    },
  };
};

export default {
  MIN_TOUCH_TARGET_SIZE,
  createAccessibilityLabel,
  getAccessibilityRole,
  getAccessibilityProps,
  ensureMinimumTouchTarget,
  getAccessibilityState,
};
