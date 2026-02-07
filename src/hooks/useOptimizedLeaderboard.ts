/**
 * Optimized Leaderboard Hook
 * Prevents multiple API calls, loops, and provides efficient leaderboard data fetching
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchDailyLeaderboard,
  fetchWeeklyLeaderboard,
  fetchAllTimeLeaderboard,
  clearLeaderboardError,
  LeaderboardEntry,
} from '../store/leaderboardSlice';
// Removed non-existent optimized data fetch hooks

export interface TransformedLeaderboardEntry {
  id: number;
  rank: number;
  name: string;
  image: string;
  amount: string;
  color?: string;
  streakTotal?: number;
  streakMax?: number;
  highestStreak?: number;
  lastOnline?: string;
  isOnline?: boolean;
  badges?: Array<{ id: number; icon: string }>;
  isCurrentUser?: boolean;
}

export const useOptimizedLeaderboard = () => {
  const dispatch = useDispatch();
  const leaderboardState = useSelector((state: RootState) => state.leaderboard);
  const authState = useSelector((state: RootState) => state.auth);

  // Removed non-existent optimized data fetch hooks

  // Track fetch attempts to prevent loops
  const fetchAttempts = useRef<{ [key: string]: number }>({});
  const isMountedRef = useRef<boolean>(true);
  const fetchTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Transform API data to UI format
  const transformLeaderboardData = useCallback(
    (
      data: LeaderboardEntry[],
      type: 'daily' | 'weekly' | 'allTime'
    ): TransformedLeaderboardEntry[] => {
      if (!data || data.length === 0) {
        return [];
      }

      return data.map((entry, index) => ({
        id: index + 1,
        rank: entry.position || index + 1,
        name: entry.username || 'Anonymous',
        image: entry.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
        amount: entry.amount_won?.toString() || '0',
        color: getRandomColor(index),
        lastOnline: getRandomLastOnline(),
        isOnline: Math.random() > 0.5,
        badges: generateRandomBadges(),
        isCurrentUser: entry.username === authState.user?.username,
      }));
    },
    [authState.user?.username]
  );

  // Optimized fetch function with loop prevention
  const fetchData = useCallback(
    (type: 'daily' | 'weekly' | 'allTime', force = false) => {
      if (!isMountedRef.current) return;

      const state = leaderboardState[type];
      const attemptKey = `${type}_${Date.now()}`;

      // Prevent multiple simultaneous fetches
      if (state.loading && !force) {
        return;
      }

      // Check if we have recent data (within 5 minutes)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (!force && state.lastFetched && now - state.lastFetched < fiveMinutes) {
        return;
      }

      // Prevent too many fetch attempts
      const attemptCount = fetchAttempts.current[type] || 0;
      if (attemptCount >= 3) {
        return;
      }

      // Clear any existing timeout for this type
      if (fetchTimeouts.current[type]) {
        clearTimeout(fetchTimeouts.current[type]);
      }

      // Increment attempt count
      fetchAttempts.current[type] = attemptCount + 1;

      // Debounce the fetch to prevent rapid successive calls
      fetchTimeouts.current[type] = setTimeout(() => {
        if (!isMountedRef.current) return;

        switch (type) {
          case 'daily':
            dispatch(fetchDailyLeaderboard());
            break;
          case 'weekly':
            dispatch(fetchWeeklyLeaderboard());
            break;
          case 'allTime':
            dispatch(fetchAllTimeLeaderboard());
            break;
        }
      }, 100);
    },
    [dispatch, leaderboardState]
  );

  // Clear error for specific leaderboard type
  const clearError = useCallback(
    (type: 'daily' | 'weekly' | 'allTime') => {
      dispatch(clearLeaderboardError(type));
      // Reset attempt count when clearing error
      fetchAttempts.current[type] = 0;
    },
    [dispatch]
  );

  // Get transformed data for specific type
  const getTransformedData = useCallback(
    (type: 'daily' | 'weekly' | 'allTime'): TransformedLeaderboardEntry[] => {
      const state = leaderboardState[type];

      // If we have real data, use it
      if (state.data.length > 0) {
        const transformed = transformLeaderboardData(state.data, type);
        return transformed;
      }

      // No real data - return empty array (will show "No winners" message)
      return [];
    },
    [leaderboardState, transformLeaderboardData]
  );

  // Auto-fetch data with intelligent logic
  useEffect(() => {
    if (!isMountedRef.current) return;

    const types: Array<'daily' | 'weekly' | 'allTime'> = ['daily', 'weekly', 'allTime'];
    let hasFetched = false;

    types.forEach(type => {
      const state = leaderboardState[type];
      const attemptCount = fetchAttempts.current[type] || 0;

      // Only fetch if:
      // 1. No data exists
      // 2. Not currently loading
      // 3. No error (to prevent infinite retries)
      // 4. Haven't exceeded attempt limit
      // 5. Haven't already fetched in this cycle
      if (
        state.data.length === 0 &&
        !state.loading &&
        !state.error &&
        attemptCount < 3 &&
        !hasFetched
      ) {
        hasFetched = true; // Prevent multiple simultaneous fetches
        fetchData(type);
      }
    });
  }, [fetchData, leaderboardState]);

  // Reset attempt counts periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      Object.keys(fetchAttempts.current).forEach(key => {
        fetchAttempts.current[key] = 0;
      });
    }, 30000); // Reset every 30 seconds

    return () => clearInterval(resetInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear all timeouts
      Object.values(fetchTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Handle tab changes with optimization
  const handleTabChange = useCallback(
    (tab: string) => {
      const type = tab as 'daily' | 'weekly' | 'allTime';

      // Only fetch if we don't have data for this tab
      const state = leaderboardState[type];
      if (state.data.length === 0 && !state.loading) {
        fetchData(type);
      }
    },
    [fetchData, leaderboardState]
  );

  return {
    // State
    daily: {
      data: getTransformedData('daily'),
      loading: leaderboardState.daily.loading,
      error: leaderboardState.daily.error,
    },
    weekly: {
      data: getTransformedData('weekly'),
      loading: leaderboardState.weekly.loading,
      error: leaderboardState.weekly.error,
    },
    allTime: {
      data: getTransformedData('allTime'),
      loading: leaderboardState.allTime.loading,
      error: leaderboardState.allTime.error,
    },
    // Actions
    fetchData,
    clearError,
    handleTabChange,
    // Removed non-existent optimized data
  };
};

// Helper functions
const getRandomColor = (index: number): string => {
  const colors = ['#E91E63', '#FFC107', '#4CAF50', '#00BCD4', '#FFEB3B', '#4CAF50', '#00BCD4'];
  return colors[index % colors.length];
};

const getRandomLastOnline = (): string => {
  const times = ['1 hour ago', '2 hours ago', '3 hours ago', '5 hours ago', '1 day ago'];
  return times[Math.floor(Math.random() * times.length)];
};

const generateRandomBadges = (): Array<{ id: number; icon: string }> => {
  const badgeIcons = ['trophy', 'fire', 'star', 'crown', 'medal', 'star-shooting', 'medal-outline'];
  const numBadges = Math.floor(Math.random() * 4); // 0-3 badges
  return Array.from({ length: numBadges }, (_, i) => ({
    id: i + 1,
    icon: badgeIcons[Math.floor(Math.random() * badgeIcons.length)],
  }));
};

export default useOptimizedLeaderboard;
