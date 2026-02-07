/**
 * useAnimations Hook - TypeScript Implementation
 * Professional daily bonus animations hook with comprehensive features
 */

import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { logger } from '../../lib/utils/logger';

interface Position {
  x: number;
  y: number;
}

interface Reward {
  day: number;
  value: number;
  [key: string]: any;
}

interface UseAnimationsReturn {
  ribbonAnim: Animated.Value;
  scaleAnims: Animated.Value[];
  shineAnim: Animated.Value;
  gemPositions: Animated.ValueXY[];
  gemOpacities: Animated.Value[];
  gemScales: Animated.Value[];
  startPulseAnimations: () => void;
  startShineAnimation: () => void;
  animateGemsCollection: (
    day: number,
    sourcePosition: Position,
    targetPosition: Position,
    currentTotal: number,
    rewards: Reward[],
    animateCounterFn: (start: number, end: number, duration: number) => void,
    onComplete?: () => void
  ) => void;
  animateCounter: (startValue: number, endValue: number, duration: number) => void;
  resetAnimations: () => void;
  countAnimationRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export const useAnimations = (
  setAnimatingGems: (animating: boolean) => void,
  setDisplayedGems: (gems: number) => void
): UseAnimationsReturn => {
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-100)).current;
  const countAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const activeAnimations = useRef(new Set<Animated.CompositeAnimation>());

  const scaleAnims = useRef(
    Array(7)
      .fill(null)
      .map(() => new Animated.Value(1))
  ).current;

  const gemPositions = useRef([
    new Animated.ValueXY({ x: 0, y: 0 }),
    new Animated.ValueXY({ x: 0, y: 0 }),
    new Animated.ValueXY({ x: 0, y: 0 }),
    new Animated.ValueXY({ x: 0, y: 0 }),
  ]).current;

  const gemOpacities = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const gemScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const resetAnimations = useCallback((): void => {
    activeAnimations.current.forEach(anim => {
      try {
        anim.stop();
      } catch (error) {}
    });
    activeAnimations.current.clear();

    gemPositions.forEach(pos => {
      pos.setValue({ x: 0, y: 0 });
      pos.setOffset({ x: 0, y: 0 });
    });
    gemOpacities.forEach(op => op.setValue(0));
    gemScales.forEach(scale => scale.setValue(1));

    if (countAnimationRef.current) {
      clearInterval(countAnimationRef.current);
      countAnimationRef.current = null;
    }
  }, []);

  const startPulseAnimations = useCallback((): void => {
    scaleAnims.forEach(anim => {
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      activeAnimations.current.add(pulseAnim);
      pulseAnim.start();
    });
  }, [scaleAnims]);

  const startShineAnimation = useCallback((): void => {
    const shineAnimation = Animated.loop(
      Animated.timing(shineAnim, {
        toValue: 100,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    activeAnimations.current.add(shineAnimation);
    shineAnimation.start();
  }, [shineAnim]);

  const animateCounter = useCallback(
    (startValue: number, endValue: number, duration: number): void => {
      if (countAnimationRef.current) {
        clearInterval(countAnimationRef.current);
      }

      const startTime = Date.now();
      const changeInValue = endValue - startValue;
      const counterDuration = Math.max(duration - 300, duration * 0.7);

      countAnimationRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / counterDuration, 1);

        const easedProgress = 1 - Math.pow(1 - progress, 2);
        const currentValue = Math.floor(startValue + changeInValue * easedProgress);

        setDisplayedGems(currentValue);

        if (progress >= 1) {
          setDisplayedGems(endValue);
          clearInterval(countAnimationRef.current!);
          countAnimationRef.current = null;
        }
      }, 16);
    },
    [setDisplayedGems]
  );

  const animateGemsCollection = useCallback(
    (
      day: number,
      sourcePosition: Position,
      targetPosition: Position,
      currentTotal: number,
      rewards: Reward[],
      animateCounterFn: (start: number, end: number, duration: number) => void,
      onComplete?: () => void
    ): void => {
      setAnimatingGems(true);

      gemPositions.forEach((pos, index) => {
        pos.setValue({ x: 0, y: 0 });
        pos.setOffset({ x: 0, y: 0 });
      });

      gemOpacities.forEach((op, index) => {
        op.setValue(0);
      });

      gemScales.forEach((scale, index) => {
        scale.setValue(1);
      });

      const deltaX = targetPosition.x - sourcePosition.x;
      const deltaY = targetPosition.y - sourcePosition.y;

      const currentReward = rewards.find(reward => reward.day === day);
      const rewardValue = currentReward ? currentReward.value : 0;
      const newTotal = currentTotal + rewardValue;

      const animations: Animated.CompositeAnimation[] = [];

      gemOpacities.forEach((opacity, index) => {
        const showGem = Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
        ]);
        animations.push(showGem);
      });

      gemPositions.forEach((position, index) => {
        const randomOffsetX = (Math.random() - 0.5) * 40;
        const randomOffsetY = (Math.random() - 0.5) * 40;

        const moveGem = Animated.sequence([
          Animated.delay(index * 150 + 200),
          Animated.parallel([
            Animated.timing(position, {
              toValue: {
                x: deltaX + randomOffsetX,
                y: deltaY + randomOffsetY,
              },
              duration: 1800,
              useNativeDriver: true,
              easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            }),
          ]),
        ]);
        animations.push(moveGem);
      });

      gemScales.forEach((scale, index) => {
        const scaleGem = Animated.sequence([
          Animated.delay(index * 150 + 200),
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.2)),
          }),
          Animated.timing(scale, {
            toValue: 0.2,
            duration: 1100,
            useNativeDriver: true,
            easing: Easing.in(Easing.back(1.2)),
          }),
        ]);
        animations.push(scaleGem);
      });

      gemOpacities.forEach((opacity, index) => {
        const hideGem = Animated.sequence([
          Animated.delay(index * 150 + 1400),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
        ]);
        animations.push(hideGem);
      });

      const totalAnimationTime = 2200;
      setTimeout(() => {
        animateCounterFn(currentTotal, newTotal, totalAnimationTime - 600);
      }, 600);

      const compositeAnimation = Animated.parallel(animations);
      activeAnimations.current.add(compositeAnimation);

      compositeAnimation.start(({ finished }) => {
        activeAnimations.current.delete(compositeAnimation);

        setTimeout(() => {
          setAnimatingGems(false);
          setDisplayedGems(newTotal);

          gemPositions.forEach(pos => {
            pos.setValue({ x: 0, y: 0 });
            pos.setOffset({ x: 0, y: 0 });
          });
          gemOpacities.forEach(op => op.setValue(0));
          gemScales.forEach(scale => scale.setValue(1));

          if (onComplete && typeof onComplete === 'function') {
            try {
              onComplete();
            } catch (error) {
              logger.error('❌ Error in onComplete callback:', 'HOOK', error);
            }
          }
        }, 300);
      });
    },
    [gemPositions, gemOpacities, gemScales, setAnimatingGems, setDisplayedGems]
  );

  return {
    ribbonAnim,
    scaleAnims,
    shineAnim,
    gemPositions,
    gemOpacities,
    gemScales,
    startPulseAnimations,
    startShineAnimation,
    animateGemsCollection,
    animateCounter,
    resetAnimations,
    countAnimationRef,
  };
};
