/**
 * Enhanced Animation Quality Settings Hook
 * Professional animation quality settings for different device capabilities
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Platform, Dimensions, PixelRatio } from 'react-native';

interface DeviceCapabilities {
  isLowEndDevice: boolean;
  isMidRangeDevice: boolean;
  isHighEndDevice: boolean;
  screenSize: 'small' | 'medium' | 'large';
  pixelDensity: number;
  memoryClass: 'low' | 'medium' | 'high';
}

interface AnimationQualitySettings {
  enableComplexAnimations: boolean;
  enableParticleEffects: boolean;
  enableLottieAnimations: boolean;
  enableLayoutAnimations: boolean;
  animationDuration: number;
  frameRate: number;
  particleCount: number;
  animationQuality: 'low' | 'medium' | 'high';
}

interface AnimationQualitySettingsReturn {
  settings: AnimationQualitySettings;
  deviceCapabilities: DeviceCapabilities;
  updateSettings: (newSettings: Partial<AnimationQualitySettings>) => void;
  resetToDefault: () => void;
  getOptimizedSettings: () => AnimationQualitySettings;
}

export const useAnimationQualitySettings = (): AnimationQualitySettingsReturn => {
  const { width, height } = Dimensions.get('window');
  const pixelDensity = PixelRatio.get();

  const deviceCapabilities = useMemo((): DeviceCapabilities => {
    const screenArea = width * height;
    const isLowEndDevice = screenArea < 1000000 || pixelDensity < 2;
    const isMidRangeDevice = screenArea >= 1000000 && screenArea < 2000000 && pixelDensity >= 2;
    const isHighEndDevice = screenArea >= 2000000 && pixelDensity >= 3;

    let screenSize: 'small' | 'medium' | 'large' = 'medium';
    if (screenArea < 1000000) screenSize = 'small';
    else if (screenArea > 2000000) screenSize = 'large';

    let memoryClass: 'low' | 'medium' | 'high' = 'medium';
    if (isLowEndDevice) memoryClass = 'low';
    else if (isHighEndDevice) memoryClass = 'high';

    return {
      isLowEndDevice,
      isMidRangeDevice,
      isHighEndDevice,
      screenSize,
      pixelDensity,
      memoryClass,
    };
  }, [width, height, pixelDensity]);

  const [settings, setSettings] = useState<AnimationQualitySettings>(() => {
    const { isLowEndDevice, isMidRangeDevice, isHighEndDevice } = deviceCapabilities;

    if (isLowEndDevice) {
      return {
        enableComplexAnimations: false,
        enableParticleEffects: false,
        enableLottieAnimations: true,
        enableLayoutAnimations: false,
        animationDuration: 200,
        frameRate: 30,
        particleCount: 5,
        animationQuality: 'low',
      };
    } else if (isMidRangeDevice) {
      return {
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 300,
        frameRate: 45,
        particleCount: 15,
        animationQuality: 'medium',
      };
    } else {
      return {
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 400,
        frameRate: 60,
        particleCount: 30,
        animationQuality: 'high',
      };
    }
  });

  const updateSettings = useCallback((newSettings: Partial<AnimationQualitySettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    const { isLowEndDevice, isMidRangeDevice, isHighEndDevice } = deviceCapabilities;

    if (isLowEndDevice) {
      setSettings({
        enableComplexAnimations: false,
        enableParticleEffects: false,
        enableLottieAnimations: true,
        enableLayoutAnimations: false,
        animationDuration: 200,
        frameRate: 30,
        particleCount: 5,
        animationQuality: 'low',
      });
    } else if (isMidRangeDevice) {
      setSettings({
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 300,
        frameRate: 45,
        particleCount: 15,
        animationQuality: 'medium',
      });
    } else {
      setSettings({
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 400,
        frameRate: 60,
        particleCount: 30,
        animationQuality: 'high',
      });
    }
  }, [deviceCapabilities]);

  const getOptimizedSettings = useCallback((): AnimationQualitySettings => {
    const { isLowEndDevice, isMidRangeDevice, isHighEndDevice } = deviceCapabilities;

    if (isLowEndDevice) {
      return {
        enableComplexAnimations: false,
        enableParticleEffects: false,
        enableLottieAnimations: true,
        enableLayoutAnimations: false,
        animationDuration: 200,
        frameRate: 30,
        particleCount: 5,
        animationQuality: 'low',
      };
    } else if (isMidRangeDevice) {
      return {
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 300,
        frameRate: 45,
        particleCount: 15,
        animationQuality: 'medium',
      };
    } else {
      return {
        enableComplexAnimations: true,
        enableParticleEffects: true,
        enableLottieAnimations: true,
        enableLayoutAnimations: true,
        animationDuration: 400,
        frameRate: 60,
        particleCount: 30,
        animationQuality: 'high',
      };
    }
  }, [deviceCapabilities]);

  // Auto-adjust settings based on device capabilities
  useEffect(() => {
    const optimizedSettings = getOptimizedSettings();
    setSettings(optimizedSettings);
  }, [deviceCapabilities, getOptimizedSettings]);

  return {
    settings,
    deviceCapabilities,
    updateSettings,
    resetToDefault,
    getOptimizedSettings,
  };
};
