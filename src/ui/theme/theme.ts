/**
 * Theme Configuration
 * Combines all design tokens into a theme
 */

import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { borderRadius } from '../tokens/borderRadius';
import { shadows } from '../tokens/shadows';

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
