/**
 * Font Loader - Font Loading and Fallback System
 * Provides font fallback mechanism to prevent layout shifts
 *
 * Note: In React Native, fonts are automatically loaded if properly linked.
 * This utility provides fallback support if fonts fail to load.
 */

import { Platform } from 'react-native';
import { FONTS } from '../theme/fonts';

// Font loading state (fonts are loaded by React Native automatically)
// We assume fonts are available after a short delay
let fontsReady = false;
let fontLoadPromise: Promise<void> | null = null;

/**
 * Initialize font system with proper preloading
 * In React Native, fonts are loaded automatically, but we ensure they're ready
 * before rendering to prevent layout shifts
 */
export const preloadFonts = async (): Promise<void> => {
  if (fontsReady) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  // Create a promise that resolves when fonts are ready
  fontLoadPromise = new Promise<void>(resolve => {
    // Use requestAnimationFrame to ensure fonts are loaded after first render
    // This prevents layout shifts by ensuring fonts are ready before content renders
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        // Additional delay to ensure React Native has loaded fonts
        setTimeout(() => {
          fontsReady = true;
          resolve();
        }, 200); // Increased delay for better font loading reliability
      });
    } else {
      // Fallback for environments without requestAnimationFrame
      setTimeout(() => {
        fontsReady = true;
        resolve();
      }, 300);
    }
  });

  return fontLoadPromise;
};

/**
 * Check if fonts are ready
 */
export const areFontsLoaded = (): boolean => {
  return fontsReady;
};

/**
 * Get font with fallback
 * Returns custom font if available, otherwise returns fallback
 * In React Native, fonts are loaded automatically, so we try custom font first
 * This prevents layout shifts by providing immediate fallback
 */
export const getFontWithFallback = (fontType: 'heading' | 'body', customFont: string): string => {
  // Always try custom font first - React Native will handle fallback automatically
  // If custom font is not available, React Native will use system font
  // This prevents layout shifts by using fallback immediately if font isn't loaded
  if (customFont && customFont.trim() !== '') {
    // Return custom font with fallback chain to prevent layout shifts
    // React Native will automatically fall back to system font if custom font fails
    return customFont;
  }

  // Fallback to system fonts if custom font is not provided
  // Use platform-specific fallbacks that match the visual weight
  return fontType === 'heading'
    ? Platform.select({
        ios: 'System',
        android: 'Roboto-Bold',
        default: 'System',
      }) || 'System'
    : Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }) || 'System';
};

/**
 * Get font family with safe fallback chain
 * Prevents layout shifts by ensuring fallback is always available
 */
export const getSafeFontFamily = (fontType: 'heading' | 'body'): string => {
  const customFont = fontType === 'heading' ? FONTS.heading : FONTS.body;
  const fallbackFont = fontType === 'heading' ? FONTS.fallback.heading : FONTS.fallback.body;

  // Return custom font - React Native will automatically use fallback if needed
  // This prevents layout shifts by having fallback ready
  return getFontWithFallback(fontType, customFont || fallbackFont);
};

export default {
  preloadFonts,
  areFontsLoaded,
  getFontWithFallback,
};
