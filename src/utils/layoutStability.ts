/**
 * Layout Stability Utilities
 * Prevents UI jumping and layout shifts by stabilizing dimensions
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { LayoutChangeEvent, LayoutRectangle, Dimensions } from 'react-native';
import { InteractionManager } from 'react-native';

/**
 * Hook to stabilize layout dimensions and prevent jumping
 */
export const useStableLayout = (initialDimensions?: LayoutRectangle) => {
  const [dimensions, setDimensions] = useState<LayoutRectangle | null>(initialDimensions || null);
  const isLayoutStableRef = useRef(false);
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, x, y } = event.nativeEvent.layout;

      // Only update if dimensions actually changed significantly (more than 1px)
      if (dimensions) {
        const widthDiff = Math.abs(dimensions.width - width);
        const heightDiff = Math.abs(dimensions.height - height);

        // Ignore tiny changes that cause jumping
        if (widthDiff < 1 && heightDiff < 1) {
          return;
        }
      }

      // Debounce layout updates to prevent rapid changes
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }

      layoutTimeoutRef.current = setTimeout(() => {
        setDimensions({ width, height, x, y });
        isLayoutStableRef.current = true;
      }, 50); // Small delay to batch layout updates
    },
    [dimensions]
  );

  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, []);

  return {
    dimensions: dimensions || { width: 0, height: 0, x: 0, y: 0 },
    handleLayout,
    isStable: isLayoutStableRef.current,
  };
};

/**
 * Hook to prevent layout shifts from images loading
 */
export const useImageLayout = (aspectRatio?: number) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const containerRef = useRef<{ width: number } | null>(null);

  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      containerRef.current = { width };

      if (aspectRatio && width > 0) {
        setImageDimensions({
          width,
          height: width / aspectRatio,
        });
      }
    },
    [aspectRatio]
  );

  const handleImageLoad = useCallback(
    (event: any) => {
      if (!imageDimensions && event?.nativeEvent?.source) {
        const { width, height } = event.nativeEvent.source;
        if (width && height && containerRef.current) {
          const containerWidth = containerRef.current.width;
          const calculatedHeight = (containerWidth / width) * height;
          setImageDimensions({
            width: containerWidth,
            height: calculatedHeight,
          });
        }
      }
    },
    [imageDimensions]
  );

  return {
    imageDimensions,
    handleContainerLayout,
    handleImageLoad,
  };
};

/**
 * Stabilize screen dimensions to prevent jumping
 */
export const useStableScreenDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const dimensionsRef = useRef(dimensions);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      // Only update if change is significant (more than 10px)
      const widthDiff = Math.abs(dimensionsRef.current.width - window.width);
      const heightDiff = Math.abs(dimensionsRef.current.height - window.height);

      if (widthDiff > 10 || heightDiff > 10) {
        dimensionsRef.current = window;
        setDimensions(window);
      }
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

/**
 * Debounce layout calculations to prevent thrashing
 */
export const useDebouncedLayout = (
  callback: (layout: LayoutRectangle) => void,
  delay: number = 100
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLayoutRef = useRef<LayoutRectangle | null>(null);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layout = event.nativeEvent.layout;

      // Cancel previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only update if layout changed significantly
      if (lastLayoutRef.current) {
        const widthDiff = Math.abs(lastLayoutRef.current.width - layout.width);
        const heightDiff = Math.abs(lastLayoutRef.current.height - layout.height);

        if (widthDiff < 1 && heightDiff < 1) {
          return; // Ignore tiny changes
        }
      }

      timeoutRef.current = setTimeout(() => {
        lastLayoutRef.current = layout;
        callback(layout);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return handleLayout;
};

/**
 * Run heavy layout operations after interactions complete
 */
export const runAfterInteractions = (callback: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    // Small additional delay to ensure UI is stable
    setTimeout(callback, 50);
  });
};

/**
 * Prevent rapid state updates that cause layout jumps
 */
export const useStableState = <T>(initialValue: T, equalityFn?: (a: T, b: T) => boolean) => {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  const setStableValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const resolvedValue =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

      // Check if value actually changed
      const isEqual = equalityFn ? equalityFn(value, resolvedValue) : value === resolvedValue;

      if (isEqual) {
        return; // No change, skip update
      }

      pendingValueRef.current = resolvedValue;

      // Debounce rapid updates
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingValueRef.current !== null) {
          setValue(pendingValueRef.current);
          pendingValueRef.current = null;
        }
      }, 16); // One frame delay
    },
    [value, equalityFn]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setStableValue] as const;
};
