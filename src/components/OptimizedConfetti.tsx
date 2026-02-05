/**
 * Optimized Confetti Component
 * Replaces heavy confetti with device-optimized version
 * Drop-in replacement for existing confetti
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { createConfettiParticles, updateParticles, ParticleConfig } from '../utils/particleSystem';

interface OptimizedConfettiProps {
  colors?: string[];
  duration?: number;
  onComplete?: () => void;
}

/**
 * Optimized confetti component
 * Automatically adjusts particle count based on device
 */
export const OptimizedConfetti: React.FC<OptimizedConfettiProps> = ({
  colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
  duration = 3000,
  onComplete,
}) => {
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    // Initialize particles
    const initialParticles = createConfettiParticles(80, colors);
    setParticles(initialParticles);

    // Animation loop
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - startTime.current;
      startTime.current = now;

      setParticles(prev => {
        const updated = updateParticles(prev, deltaTime);

        // Check if animation should complete
        if (updated.length === 0 || deltaTime >= duration) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          onComplete?.();
          return [];
        }

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [colors, duration, onComplete]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    borderRadius: 2,
    position: 'absolute',
  },
});

export default OptimizedConfetti;
