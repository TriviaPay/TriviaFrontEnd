import { useState, useEffect, useRef } from 'react';

/**
 * Hook to prevent loader flicker by ensuring a minimum display time
 *
 * @param isLoading Actual loading state from API or process
 * @param minDisplayTime Minimum time to show loader in ms (default 300ms)
 * @returns boolean State to control loader visibility
 */
export const useMinimumLoadingTime = (
  isLoading: boolean,
  minDisplayTime: number = 300
): boolean => {
  const [showLoader, setShowLoader] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start showing loader
      setShowLoader(true);
      startTimeRef.current = Date.now();

      // Clear any pending hide timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Loading finished - check if we need to keep showing it
      const startTime = startTimeRef.current;

      if (startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayTime - elapsed);

        if (remaining > 0) {
          // Wait for minimum time
          timerRef.current = setTimeout(() => {
            setShowLoader(false);
            startTimeRef.current = null;
            timerRef.current = null;
          }, remaining);
        } else {
          // Already shown long enough
          setShowLoader(false);
          startTimeRef.current = null;
        }
      } else {
        // Was never loading
        setShowLoader(false);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, minDisplayTime]);

  return showLoader;
};
