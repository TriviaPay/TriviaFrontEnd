/**
 * useTimer Hook
 * Question timer logic
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@store/hooks';
import { updateTimer } from '@store/slices/triviaSlice';

export const useTimer = (initialTime: number, isPlaying: boolean, onTimeUp?: () => void) => {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      global.clearInterval(intervalRef.current as any);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        dispatch(
          updateTimer(prev => {
            const newTime = prev - 1;
            if (newTime <= 0) {
              onTimeUp?.();
              return 0;
            }
            return newTime;
          }) as any
        );
      }, 1000);
    } else {
      stopTimer();
    }

    return stopTimer;
  }, [isPlaying, dispatch, onTimeUp, stopTimer]);

  return { stopTimer };
};
