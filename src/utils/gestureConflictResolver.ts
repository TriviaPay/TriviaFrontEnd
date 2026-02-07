/**
 * Gesture Conflict Resolver
 * Prevents PanResponder and ScrollView gesture conflicts
 * Ensures smooth interactions without disrupting existing code
 */

import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useRef, useCallback } from 'react';

/**
 * Gesture priority levels
 */
export enum GesturePriority {
  SCROLL = 0,
  PAN = 1,
  BUTTON = 2,
}

/**
 * Create PanResponder that respects scroll gestures
 * Only activates when scroll is not happening
 */
export const createScrollAwarePanResponder = (
  onPanResponderMove: (
    event: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void,
  onPanResponderRelease?: (
    event: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void,
  options: {
    threshold?: number; // Minimum distance before activating (default: 10)
    priority?: GesturePriority;
  } = {}
) => {
  const { threshold = 10, priority = GesturePriority.PAN } = options;
  const isScrolling = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);

  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        startY.current = evt.nativeEvent.pageY;
        startX.current = evt.nativeEvent.pageX;
        isScrolling.current = false;
        return false; // Let scroll handle it first
      },

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate if movement exceeds threshold and not scrolling
        const deltaY = Math.abs(gestureState.dy);
        const deltaX = Math.abs(gestureState.dx);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > threshold && !isScrolling.current) {
          // Check if this is primarily vertical (scroll) or horizontal (pan)
          if (deltaY > deltaX * 1.5) {
            isScrolling.current = true;
            return false; // Let scroll handle vertical movement
          }
          return true; // Handle horizontal/pan movement
        }
        return false;
      },

      onPanResponderGrant: () => {
        isScrolling.current = false;
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isScrolling.current) {
          onPanResponderMove(evt, gestureState);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (!isScrolling.current && onPanResponderRelease) {
          onPanResponderRelease(evt, gestureState);
        }
        isScrolling.current = false;
      },

      onPanResponderTerminate: () => {
        isScrolling.current = false;
      },
    })
  ).current;
};

/**
 * Hook for scroll-aware pan responder
 */
export const useScrollAwarePan = (
  onMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => void,
  onRelease?: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => void,
  options?: { threshold?: number; priority?: GesturePriority }
) => {
  const isScrolling = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const { threshold = 10 } = options || {};

  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        startY.current = evt.nativeEvent.pageY;
        startX.current = evt.nativeEvent.pageX;
        isScrolling.current = false;
        return false;
      },

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const deltaY = Math.abs(gestureState.dy);
        const deltaX = Math.abs(gestureState.dx);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > threshold && !isScrolling.current) {
          if (deltaY > deltaX * 1.5) {
            isScrolling.current = true;
            return false;
          }
          return true;
        }
        return false;
      },

      onPanResponderGrant: () => {
        isScrolling.current = false;
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isScrolling.current) {
          onMove(evt, gestureState);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (!isScrolling.current && onRelease) {
          onRelease(evt, gestureState);
        }
        isScrolling.current = false;
      },

      onPanResponderTerminate: () => {
        isScrolling.current = false;
      },
    })
  ).current;
};

/**
 * Prevent gesture conflicts in ScrollView
 * Add this to ScrollView's panResponderHandlers
 */
export const createScrollViewPanHandlers = () => {
  return {
    onScrollBeginDrag: () => {
      // Mark that scroll is active
    },
    onScrollEndDrag: () => {
      // Mark that scroll ended
    },
  };
};

export default {
  GesturePriority,
  createScrollAwarePanResponder,
  useScrollAwarePan,
  createScrollViewPanHandlers,
};
