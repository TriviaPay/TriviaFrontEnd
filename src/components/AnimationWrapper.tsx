/**
 * Animation Wrapper Component
 * Enhances existing components with smooth animations
 * Can wrap any component without breaking existing functionality
 */

import React, { ReactNode } from 'react';
import { View, Animated } from 'react-native';
import { useScreenEnter } from '../utils/screenTransitions';
import { useLoadingTransition } from '../utils/loadingStateAnimation';

interface AnimationWrapperProps {
  children: ReactNode;
  enableEnterAnimation?: boolean;
  isLoading?: boolean;
  style?: any;
}

/**
 * Wrapper that adds smooth enter animations to any component
 * Use this to wrap existing components without modifying them
 */
export const AnimationWrapper: React.FC<AnimationWrapperProps> = ({
  children,
  enableEnterAnimation = true,
  isLoading = false,
  style,
}) => {
  const enterAnimation = useScreenEnter(enableEnterAnimation);
  const loadingAnimation = useLoadingTransition(isLoading);

  return (
    <Animated.View
      style={[
        enableEnterAnimation && enterAnimation.style,
        isLoading && loadingAnimation.style,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default AnimationWrapper;
