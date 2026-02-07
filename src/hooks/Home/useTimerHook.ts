/**
 * useTimerHook - TypeScript Implementation
 * Professional timer hook with comprehensive features
 */

import { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchNextDraw } from '../../store/timerSlice';

interface UseTimerHookReturn {
  hours: string;
  minutes: string;
  seconds: string;
  timerColor: string;
  timerCompleted: boolean;
  prizePool: number;
  bronzePrizePool: number;
  silverPrizePool: number;
  isLoading: boolean;
  estTimeString: string;
  getTimerGradientColors: () => string[];
}

export const useTimerHook = (): UseTimerHookReturn => {
  const dispatch = useDispatch<AppDispatch>();
  const timerState = useSelector((state: RootState) => state.timer);
  const { nextDrawTime, prizePool, bronzePrizePool, silverPrizePool, isLoading } = timerState;

  const [hours, setHours] = useState<string>('--');
  const [minutes, setMinutes] = useState<string>('--');
  const [seconds, setSeconds] = useState<string>('--');
  const [timerColor, setTimerColor] = useState<string>('#F59E0B');
  const [timerCompleted, setTimerCompleted] = useState<boolean>(false);
  const [estTimeString, setEstTimeString] = useState<string>('--:-- PM EST');

  const getTimerGradientColors = (): string[] => {
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);

    if (totalSeconds <= 60) {
      return ['#10B981', '#059669'];
    } else if (totalSeconds <= 1800) {
      return ['#F59E0B', '#D97706'];
    } else {
      return ['#FBBF24', '#F59E0B'];
    }
  };

  // Fetch draw time data from API if not already fetched or stale
  useEffect(() => {
    if (!nextDrawTime || !timerState.lastFetched || Date.now() - timerState.lastFetched > 60000) {
      dispatch(fetchNextDraw());
    }
  }, [dispatch, nextDrawTime, timerState.lastFetched]);

  // Update countdown values based on Redux state
  useEffect(() => {
    if (nextDrawTime) {
      const updateCountdown = () => {
        const now = dayjs().tz('America/New_York');

        // Parse the nextDrawTime - dayjs handles the offset in the string if present
        // but we want to ensure we treat it as New York time for the display
        const targetTime = dayjs(nextDrawTime).tz('America/New_York');

        // Format EST reveal time
        if (targetTime.isValid()) {
          setEstTimeString(targetTime.format('h:mm A EST'));
        }

        const timeDiff = targetTime.diff(now);

        // LOGGING FOR DEBUGGING
        if (Math.abs(timeDiff % 60000) < 1000) {
          // Log once per minute to avoid spam
          console.log('⏰ [Timer Debug]', {
            rawInput: nextDrawTime,
            targetParsed: targetTime.toISOString(),
            targetNewYork: targetTime.format('YYYY-MM-DD HH:mm:ss') + ' EST',
            nowNewYork: now.format('YYYY-MM-DD HH:mm:ss') + ' EST',
            diffMs: timeDiff,
            diffMin: Math.floor(timeDiff / 60000),
          });
        }

        if (timeDiff <= 0) {
          setTimerCompleted(true);
          setHours('00');
          setMinutes('00');
          setSeconds('00');
        } else {
          // Calculate hours, minutes, seconds (no days)
          const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

          setHours(hoursLeft.toString().padStart(2, '0'));
          setMinutes(minutesLeft.toString().padStart(2, '0'));
          setSeconds(secondsLeft.toString().padStart(2, '0'));
          setTimerCompleted(false);

          const totalSeconds = hoursLeft * 3600 + minutesLeft * 60 + secondsLeft;
          if (totalSeconds <= 60) {
            setTimerColor('#10B981');
          } else if (totalSeconds <= 1800) {
            setTimerColor('#F59E0B');
          } else {
            setTimerColor('#FBBF24');
          }
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [nextDrawTime]);

  return {
    hours,
    minutes,
    seconds,
    timerColor,
    timerCompleted,
    prizePool,
    bronzePrizePool,
    silverPrizePool,
    isLoading,
    estTimeString,
    getTimerGradientColors,
  };
};
