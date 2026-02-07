/**
 * Swipe Navigation Handler
 * Handles swipe gestures for tab navigation
 */

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Dimensions, View } from 'react-native';
import SwipeIndicator from './SwipeIndicator';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeNavigationHandlerProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
  swipeThreshold?: number;
  velocityThreshold?: number;
  showIndicator?: boolean;
  nextTabName?: string;
  prevTabName?: string;
}

const SwipeNavigationHandler = forwardRef<any, SwipeNavigationHandlerProps>(
  (
    {
      children,
      onSwipeLeft,
      onSwipeRight,
      enabled = true,
      swipeThreshold = 50,
      velocityThreshold = 0.3,
      showIndicator = true,
      nextTabName = 'Next',
      prevTabName = 'Previous',
    },
    ref
  ) => {
    const lastGestureTime = useRef<number>(0);
    const gestureStartX = useRef<number>(0);
    const [indicatorVisible, setIndicatorVisible] = useState(false);
    const [indicatorDirection, setIndicatorDirection] = useState<'left' | 'right'>('right');
    const [indicatorTabName, setIndicatorTabName] = useState('');

    useImperativeHandle(ref, () => ({}));

    const handleGestureEvent = (event: any) => {
      if (!enabled) return;

      const { translationX, velocityX, state, absoluteY } = event.nativeEvent;

      // Only capture swipes in the main content area, not on tab bar
      const screenHeight = Dimensions.get('window').height;
      const tabBarHeight = 80; // Approximate tab bar height

      // Skip if touch is in tab bar area
      if (absoluteY > screenHeight - tabBarHeight) {
        return;
      }

      if (state === State.BEGAN) {
        gestureStartX.current = translationX;
        lastGestureTime.current = Date.now();
      }

      if (state === State.END) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastGestureTime.current;

        // Prevent too frequent swipes (minimum 300ms between swipes)
        if (timeDiff < 300) return;

        const absTranslationX = Math.abs(translationX);
        const absVelocityX = Math.abs(velocityX);

        // Check if swipe meets threshold requirements
        if (absTranslationX > swipeThreshold || absVelocityX > velocityThreshold) {
          if (translationX > 0) {
            // Swipe right - go to previous tab
            if (showIndicator) {
              setIndicatorDirection('right');
              setIndicatorTabName(prevTabName);
              setIndicatorVisible(true);
            }
            onSwipeRight();
          } else {
            // Swipe left - go to next tab
            if (showIndicator) {
              setIndicatorDirection('left');
              setIndicatorTabName(nextTabName);
              setIndicatorVisible(true);
            }
            onSwipeLeft();
          }
        }
      }
    };

    if (!enabled) {
      return <View style={{ flex: 1 }}>{children}</View>;
    }

    return (
      <View style={{ flex: 1 }}>
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureEvent}
          minPointers={1}
          maxPointers={1}
          activeOffsetX={[-10, 10]}
          failOffsetY={[-20, 20]}
        >
          <View style={{ flex: 1 }}>{children}</View>
        </PanGestureHandler>
        {showIndicator && (
          <SwipeIndicator
            visible={indicatorVisible}
            direction={indicatorDirection}
            tabName={indicatorTabName}
          />
        )}
      </View>
    );
  }
);

SwipeNavigationHandler.displayName = 'SwipeNavigationHandler';

export default SwipeNavigationHandler;
