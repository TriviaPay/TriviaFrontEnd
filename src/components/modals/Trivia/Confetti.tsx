// import { useState, useRef, useEffect } from "react";
// import { View, Animated, Easing, Dimensions } from "react-native";
// import { useSoundEffects } from "../../../hooks/use-sound-effects";

// const { width, height } = Dimensions.get("window");

// const Confetti = ({ isVisible, onAnimationEnd }) => {
// const [particles, setParticles] = useState([]);
// const animatedValues = useRef([]).current;
// const { playWin, canPlaySounds } = useSoundEffects();

// useEffect(() => {
// if (isVisible) {
//

//     // Create confetti particles
//     const newParticles = [];
//     const newAnimatedValues = [];

//     for (let i = 0; i < 100; i++) {
//     const particle = {
//         id: i,
//         x: Math.random() * width,
//         y: -20 - Math.random() * 100,
//         size: 5 + Math.random() * 10,
//         color: ["#8A2BE2", "#FF69B4", "#FFD700", "#00BFFF", "#FF6347"][Math.floor(Math.random() * 5)],
//         rotation: Math.random() * 360,
//         velocity: 1 + Math.random() * 3,
//     };
//     newParticles.push(particle);

//     const animValue = new Animated.Value(0);
//     newAnimatedValues.push(animValue);

//     Animated.timing(animValue, {
//         toValue: 1,
//         duration: 3000 + Math.random() * 2000,
//         easing: Easing.ease,
//         useNativeDriver: true,
//     }).start();
//     }

//     setParticles(newParticles);
//     animatedValues.current = newAnimatedValues;

//     // Play win sound while confetti is actively falling on UI
//     setTimeout(() => {
//       if (canPlaySounds) {
//
//         playWin();
//       }
//     }, 500); // Play after particles start falling

//     // End animation after 4 seconds
//     setTimeout(() => {
//     onAnimationEnd && onAnimationEnd();
//     }, 4000);
// }
// }, [isVisible, onAnimationEnd]);

// if (!isVisible) return null;

// return (
// <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, pointerEvents: "none" }}>
//     {particles.map((particle, index) => {
//     const translateY =
//         animatedValues.current[index]?.interpolate({
//         inputRange: [0, 1],
//         outputRange: [particle.y, height],
//         }) || 0;

//     const opacity =
//         animatedValues.current[index]?.interpolate({
//         inputRange: [0, 0.7, 1],
//         outputRange: [1, 1, 0],
//         }) || 1;

//     return (
//         <Animated.View
//         key={particle.id}
//         style={{
//             position: "absolute",
//             left: particle.x,
//             width: particle.size,
//             height: particle.size,
//             backgroundColor: particle.color,
//             borderRadius: particle.size / 2,
//             transform: [{ translateY }, { rotate: `${particle.rotation}deg` }],
//             opacity,
//         }}
//         />
//     );
//     })}
// </View>
// );
// };

// export default Confetti;

import { useState, useRef, useEffect } from 'react';
import { View, Animated, Easing, Dimensions, Text } from 'react-native';
import { useSoundEffects } from '../../../hooks/use-sound-effects';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  endY: number;
  size: number;
  color: string;
  rotation: number;
  velocity: number;
}

interface ConfettiProps {
  isVisible: boolean;
  onAnimationEnd?: () => void;
}

const Confetti: React.FC<ConfettiProps> = ({ isVisible, onAnimationEnd }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animatedValues = useRef<Animated.Value[]>([]);
  const { playWin, canPlaySounds } = useSoundEffects();
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownRef = useRef<boolean>(false);
  const prevVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    // Clean up when visibility changes from true to false (not on every render when false)
    if (!isVisible && prevVisibleRef.current) {
      // Clear particles
      setParticles([]);
      // Stop all animations
      animatedValues.current.forEach(anim => {
        anim.stopAnimation();
      });
      animatedValues.current = [];
      // Clear timeouts
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }
      // Reset has shown flag
      hasShownRef.current = false;
    }

    // Update previous visible state
    prevVisibleRef.current = isVisible;

    // Return early if not visible
    if (!isVisible) {
      return;
    }

    // Only start animation if not already shown and isVisible is true
    if (isVisible && !hasShownRef.current) {
      hasShownRef.current = true;

      // Create confetti particles that fall from top of screen
      const newParticles: Particle[] = [];
      const newAnimatedValues: Animated.Value[] = [];

      // Get device-appropriate particle count instead of fixed 150
      const getOptimalParticleCount = () => {
        const screenArea = width * height;
        if (screenArea < 1000000) {
          return 30; // Low-end device: 30 particles
        } else if (screenArea >= 1000000 && screenArea < 2000000) {
          return 60; // Mid-range device: 60 particles
        } else {
          return 80; // High-end device: 80 particles (reduced from 150)
        }
      };

      const particleCount = getOptimalParticleCount();

      // Create particles that start from top of screen and fall across entire screen
      // Based on old TriviaPay code - particles fall smoothly from top to bottom
      for (let i = 0; i < particleCount; i++) {
        // X position: spread across entire screen width
        const x = Math.random() * width;

        // Y position: start from very top of screen (negative values for top start)
        // Particles start above screen and fall down smoothly - match old code exactly
        const y = -20 - Math.random() * 100;

        // End Y position: fall to bottom of screen - use height like old code
        const endY = height;

        const particle = {
          id: i,
          x,
          y,
          endY,
          size: 8 + Math.random() * 12, // Bigger particles (8-20px instead of 5-15px)
          color: [
            '#8A2BE2',
            '#FF69B4',
            '#FFD700',
            '#00BFFF',
            '#FF6347',
            '#32CD32',
            '#FF1493',
            '#00FA9A',
          ][Math.floor(Math.random() * 8)], // More colors
          rotation: Math.random() * 360,
          velocity: 1 + Math.random() * 3,
        };
        newParticles.push(particle);

        const animValue = new Animated.Value(0);
        newAnimatedValues.push(animValue);

        Animated.timing(animValue, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000, // Smooth fall: 3-5 seconds per particle
          easing: Easing.linear, // Linear for smooth consistent fall from top to bottom
          useNativeDriver: true,
        }).start();
      }

      setParticles(newParticles);
      animatedValues.current = newAnimatedValues;

      // Play win sound while confetti is actively falling on UI
      soundTimeoutRef.current = setTimeout(() => {
        if (canPlaySounds) {
          playWin();
        }
      }, 300); // Play after particles start falling

      // End animation after confetti particles finish falling completely
      // Use 5 seconds to ensure all particles (even slowest ones) complete their fall
      animationTimeoutRef.current = setTimeout(() => {
        onAnimationEnd && onAnimationEnd();
      }, 5000); // 5 seconds to ensure smooth complete fall
    }

    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
      }
    };
  }, [isVisible, onAnimationEnd, canPlaySounds, playWin]);

  // Don't return null - always render the container, but only show particles when visible

  // Don't return null - render container even if no particles yet (they'll appear when created)
  // This ensures the component is mounted and ready when particles are set
  if (!isVisible) {
    return null;
  }

  // Render container immediately when visible, even if particles aren't ready yet
  // Particles will appear as soon as they're created in useEffect
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999, // Very high z-index to appear on top
        pointerEvents: 'none',
        elevation: 99999, // Very high elevation for Android
        overflow: 'visible', // Ensure particles are visible even if they go outside bounds
      }}
    >
      {particles.length > 0
        ? particles.map((particle, index) => {
            const animValue = animatedValues.current[index];
            if (!animValue) {
              return null;
            }

            // Use the old code approach: interpolate from particle.y to height (bottom of screen)
            // This matches the old working code exactly - particles fall from top to bottom
            const translateY = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [particle.y, height], // Move from start y (negative) to height (bottom of screen)
            });

            const opacity = animValue.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 1, 0],
            });

            return (
              <Animated.View
                key={particle.id}
                style={{
                  position: 'absolute',
                  left: particle.x,
                  top: 0, // Start from top, use translateY to position
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  borderRadius: particle.size / 2,
                  transform: [{ translateY }, { rotate: `${particle.rotation}deg` }],
                  opacity,
                }}
              />
            );
          })
        : null}
    </View>
  );
};

export default Confetti;
