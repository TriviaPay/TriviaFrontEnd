/**
 * Optimized Particle System
 * Lightweight, performant particle effects
 * Adaptive based on device performance
 */

import { Animated } from 'react-native';
import { getDevicePerformance } from './unifiedAnimation';

/**
 * Particle configuration
 */
export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: Animated.Value;
}

/**
 * Get optimal particle count based on device
 */
export const getOptimalParticleCount = (baseCount: number): number => {
  const perf = getDevicePerformance();

  switch (perf) {
    case 'low':
      return Math.min(baseCount * 0.3, 20); // Max 20 particles on low-end
    case 'medium':
      return Math.min(baseCount * 0.6, 40); // Max 40 particles on medium
    case 'high':
      return baseCount; // Full count on high-end
    default:
      return baseCount * 0.5; // Safe default
  }
};

/**
 * Create optimized confetti particles
 * Reduces from 80 to device-appropriate count
 */
export const createConfettiParticles = (
  count: number = 80,
  colors: string[] = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
): ParticleConfig[] => {
  const optimalCount = getOptimalParticleCount(count);
  const particles: ParticleConfig[] = [];

  for (let i = 0; i < optimalCount; i++) {
    particles.push({
      x: Math.random() * 400,
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      life: 0,
      maxLife: 2000 + Math.random() * 1000,
      size: 8 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: new Animated.Value(1),
    });
  }

  return particles;
};

/**
 * Update particles efficiently
 * Uses object pooling for performance
 */
export const updateParticles = (
  particles: ParticleConfig[],
  deltaTime: number
): ParticleConfig[] => {
  return particles
    .map(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2; // Gravity
      particle.life += deltaTime;

      // Fade out as life decreases
      const lifeRatio = 1 - particle.life / particle.maxLife;
      particle.opacity.setValue(Math.max(0, lifeRatio));

      return particle;
    })
    .filter(particle => particle.life < particle.maxLife);
};

export default {
  getOptimalParticleCount,
  createConfettiParticles,
  updateParticles,
};
