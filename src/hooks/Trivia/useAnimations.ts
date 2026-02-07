/**
 * useAnimations Hook - TypeScript Implementation
 * Professional trivia animations hook with comprehensive features
 */

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseEntranceAnimationsReturn {
  headerAnim: Animated.Value;
  questionAnim: Animated.Value;
  optionsAnim: Animated.Value[];
  lifelinesAnim: Animated.Value;
}

interface UseLifelineButtonAnimationsReturn {
  fiftyFiftyAnim: Animated.Value;
  skipAnim: Animated.Value;
  changeQAnim: Animated.Value;
  audienceAnim: Animated.Value;
}

interface UseTooltipAnimationsReturn {
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

export const useEntranceAnimations = (
  isFocused: boolean,
  options: any[]
): UseEntranceAnimationsReturn => {
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const questionAnim = useRef(new Animated.Value(-100)).current;

  // Ensure optionsAnim matches options length
  const optionsAnimRef = useRef(options.map(() => new Animated.Value(-100)));
  if (optionsAnimRef.current.length !== options.length) {
    optionsAnimRef.current = options.map(() => new Animated.Value(-100));
  }
  const optionsAnim = optionsAnimRef.current;

  const lifelinesAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isFocused) {
      // Reset values to start position for entrance to ensure clean animation
      headerAnim.setValue(-100);
      questionAnim.setValue(-100);
      optionsAnim.forEach(anim => anim.setValue(-100));
      lifelinesAnim.setValue(-100);

      const animation = Animated.stagger(100, [
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(questionAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        ...optionsAnim.map(anim =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          })
        ),
        Animated.timing(lifelinesAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      animation.start(({ finished }) => {
        // Ensure values are fully visible if animation finished or was interrupted but should be visible
        if (finished) {
          headerAnim.setValue(0);
          questionAnim.setValue(0);
          optionsAnim.forEach(anim => anim.setValue(0));
          lifelinesAnim.setValue(0);
        }
      });

      return () => {
        animation.stop();
      };
    } else {
      headerAnim.setValue(-100);
      questionAnim.setValue(-100);
      optionsAnim.forEach(anim => anim.setValue(-100));
      lifelinesAnim.setValue(-100);
    }
  }, [isFocused, headerAnim, questionAnim, optionsAnim, lifelinesAnim]); // Removed options - animations should only run on screen entry, not question change

  return { headerAnim, questionAnim, optionsAnim, lifelinesAnim };
};

export const useLifelineButtonAnimations = (): UseLifelineButtonAnimationsReturn => {
  const fiftyFiftyAnim = useRef(new Animated.Value(1)).current;
  const skipAnim = useRef(new Animated.Value(1)).current;
  const changeQAnim = useRef(new Animated.Value(1)).current;
  const audienceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createPulseAnimation = (animValue: Animated.Value): Animated.CompositeAnimation => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const fiftyFiftyAnimation = createPulseAnimation(fiftyFiftyAnim);
    const skipAnimation = createPulseAnimation(skipAnim);
    const changeQAnimation = createPulseAnimation(changeQAnim);
    const audienceAnimation = createPulseAnimation(audienceAnim);

    return () => {
      fiftyFiftyAnimation.stop();
      skipAnimation.stop();
      changeQAnimation.stop();
      audienceAnimation.stop();
    };
  }, [fiftyFiftyAnim, skipAnim, changeQAnim, audienceAnim]);

  return { fiftyFiftyAnim, skipAnim, changeQAnim, audienceAnim };
};

export const useTooltipAnimations = (isVisible: boolean): UseTooltipAnimationsReturn => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, fadeAnim, scaleAnim]);

  return { fadeAnim, scaleAnim };
};
