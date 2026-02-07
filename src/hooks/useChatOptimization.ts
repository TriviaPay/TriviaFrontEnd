/**
 * Enhanced Chat Optimization Hook
 * Professional chat performance with better scroll management
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform } from 'react-native';

interface ChatOptimizationReturn {
  flatListRef: React.RefObject<FlatList>;
  optimizedScrollToBottom: (animated?: boolean) => void;
  isScrolling: boolean;
  scrollPosition: number;
  isAtBottom: boolean;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToTop: (animated?: boolean) => void;
  scrollToPosition: (position: number, animated?: boolean) => void;
}

export const useChatOptimization = (): ChatOptimizationReturn => {
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const optimizedScrollToBottom = useCallback((animated = true) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToEnd({ animated });
        } catch (error) {}
      }
    }, 100);
  }, []);

  const scrollToTop = useCallback((animated = true) => {
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToOffset({ offset: 0, animated });
      } catch (error) {}
    }
  }, []);

  const scrollToPosition = useCallback((position: number, animated = true) => {
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToOffset({ offset: position, animated });
      } catch (error) {}
    }
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentPosition = contentOffset.y;
    const maxScroll = contentSize.height - layoutMeasurement.height;

    setScrollPosition(currentPosition);
    setIsAtBottom(currentPosition >= maxScroll - 10);

    // Throttle scroll state updates
    if (scrollThrottleRef.current) {
      clearTimeout(scrollThrottleRef.current);
    }

    setIsScrolling(true);
    scrollThrottleRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
    };
  }, []);

  return {
    flatListRef,
    optimizedScrollToBottom,
    isScrolling,
    scrollPosition,
    isAtBottom,
    handleScroll,
    scrollToTop,
    scrollToPosition,
  };
};
