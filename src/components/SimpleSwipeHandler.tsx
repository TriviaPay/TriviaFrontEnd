/**
 * Simple Swipe Handler
 * Alternative implementation using basic touch events instead of PanGestureHandler
 */

import React, { useState, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { useDimensions } from '../hooks/useDimensions';
import { scaleSize } from '../utils/scaleSize';
import SwipeIndicator from './SwipeIndicator';

interface SimpleSwipeHandlerProps {
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

const SimpleSwipeHandler: React.FC<SimpleSwipeHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  swipeThreshold = scaleSize(60),
  velocityThreshold = 0.3,
  showIndicator = true,
  nextTabName = 'Next',
  prevTabName = 'Previous',
}) => {
  const { width: screenWidth, height: screenHeight } = useDimensions();
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const [indicatorDirection, setIndicatorDirection] = useState<'left' | 'right'>('right');
  const [indicatorTabName, setIndicatorTabName] = useState('');

  const lastGestureTime = useRef<number>(0);
  const startX = useRef<number>(0);
  const startTime = useRef<number>(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Don't capture on start, wait for movement
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      if (!enabled) return false;

      // Only capture swipes in the main content area, not on tab bar
      const { pageY } = evt.nativeEvent;
      const tabBarHeight = scaleSize(80); // Responsive tab bar height

      // Skip if touch is in tab bar area
      if (pageY >= screenHeight - tabBarHeight) {
        return false;
      }

      // STRICT HORIZONTAL SWIPE DETECTION ONLY
      // Only respond to horizontal swipes - horizontal movement must be at least 2x vertical movement
      const absDx = Math.abs(gestureState.dx);
      const absDy = Math.abs(gestureState.dy);

      // Require significant horizontal movement and minimal vertical movement
      // This ensures vertical scrolling doesn't trigger navigation
      return absDx > 10 && absDx > absDy * 2;
    },

    onPanResponderGrant: evt => {
      startX.current = evt.nativeEvent.pageX;
      startTime.current = Date.now();
    },

    onPanResponderMove: () => {
      // We don't need to do anything during move
    },

    onPanResponderRelease: (evt, gestureState) => {
      if (!enabled) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastGestureTime.current;

      // Prevent too frequent swipes (minimum 200ms between swipes)
      if (timeDiff < 200) return;

      const deltaX = gestureState.dx;
      const deltaY = Math.abs(gestureState.dy);
      const absDeltaX = Math.abs(deltaX);
      const deltaTime = currentTime - startTime.current;
      const velocity = absDeltaX / Math.max(deltaTime, 1);

      // STRICT HORIZONTAL SWIPE VALIDATION
      // Only trigger if horizontal movement is significantly greater than vertical
      // This prevents vertical scrolling from triggering navigation
      if (absDeltaX <= deltaY * 1.5) {
        // Vertical movement is too significant, ignore this gesture
        return;
      }

      // Check if swipe meets threshold requirements (only horizontal swipes)
      if (absDeltaX > swipeThreshold || velocity > velocityThreshold) {
        lastGestureTime.current = currentTime;

        if (deltaX > 0) {
          // Swipe right - go to previous tab
          if (showIndicator) {
            setIndicatorDirection('right');
            setIndicatorTabName(prevTabName);
            setIndicatorVisible(true);

            // Auto hide indicator after 1 second
            setTimeout(() => setIndicatorVisible(false), 1000);
          }
          onSwipeRight();
        } else {
          // Swipe left - go to next tab
          if (showIndicator) {
            setIndicatorDirection('left');
            setIndicatorTabName(nextTabName);
            setIndicatorVisible(true);

            // Auto hide indicator after 1 second
            setTimeout(() => setIndicatorVisible(false), 1000);
          }
          onSwipeLeft();
        }
      }
    },

    onPanResponderTerminate: () => {
      // Reset when gesture is terminated
    },
  });

  if (!enabled) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {children}
      </View>
      {showIndicator && (
        <SwipeIndicator
          visible={indicatorVisible}
          direction={indicatorDirection}
          tabName={indicatorTabName}
        />
      )}
    </View>
  );
};

export default SimpleSwipeHandler;
