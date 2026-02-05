/**
 * Adaptive Graphics Quality System
 * Automatically adjusts graphics quality based on device performance
 * Works with existing components without breaking them
 */

import { Platform } from 'react-native';
import { getDevicePerformance } from './unifiedAnimation';

/**
 * Graphics quality levels
 */
export enum GraphicsQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Get optimal graphics quality for device
 */
export const getGraphicsQuality = (): GraphicsQuality => {
  const perf = getDevicePerformance();

  switch (perf) {
    case 'low':
      return GraphicsQuality.LOW;
    case 'medium':
      return GraphicsQuality.MEDIUM;
    case 'high':
      return GraphicsQuality.HIGH;
    default:
      return GraphicsQuality.MEDIUM;
  }
};

/**
 * Graphics quality settings
 */
export const GRAPHICS_SETTINGS = {
  [GraphicsQuality.LOW]: {
    particleCount: 20,
    animationFPS: 30,
    imageQuality: 0.5,
    shadows: false,
    blur: false,
    lottieQuality: 'low',
  },
  [GraphicsQuality.MEDIUM]: {
    particleCount: 40,
    animationFPS: 45,
    imageQuality: 0.75,
    shadows: true,
    blur: false,
    lottieQuality: 'medium',
  },
  [GraphicsQuality.HIGH]: {
    particleCount: 80,
    animationFPS: 60,
    imageQuality: 1.0,
    shadows: true,
    blur: true,
    lottieQuality: 'high',
  },
  [GraphicsQuality.ULTRA]: {
    particleCount: 120,
    animationFPS: 60,
    imageQuality: 1.0,
    shadows: true,
    blur: true,
    lottieQuality: 'high',
  },
} as const;

/**
 * Get graphics settings for current device
 */
export const getGraphicsSettings = () => {
  const quality = getGraphicsQuality();
  return GRAPHICS_SETTINGS[quality];
};

/**
 * Should reduce animation complexity
 */
export const shouldReduceAnimations = (): boolean => {
  return getGraphicsQuality() === GraphicsQuality.LOW;
};

/**
 * Get optimal image resize quality
 */
export const getImageQuality = (): number => {
  return getGraphicsSettings().imageQuality;
};

export default {
  GraphicsQuality,
  getGraphicsQuality,
  getGraphicsSettings,
  shouldReduceAnimations,
  getImageQuality,
  GRAPHICS_SETTINGS,
};
