/**
 * Leaderboard Hook
 * Custom hook for managing leaderboard data and actions
 * OPTIMIZED: Uses memoized selectors to prevent unnecessary re-renders
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchFreeLeaderboard,
  fetchBronzeLeaderboard,
  fetchSilverLeaderboard,
  fetchDailyLeaderboard,
  fetchWeeklyLeaderboard,
  fetchMonthlyLeaderboard,
  fetchAllTimeLeaderboard,
  clearLeaderboardError,
  LeaderboardEntry,
} from '../store/leaderboardSlice';
import {
  selectFreeLeaderboard,
  selectBronzeLeaderboard,
  selectSilverLeaderboard,
  selectDailyLeaderboard,
} from '../utils/selectors';

// Stable empty array reference to prevent re-renders
const EMPTY_ARRAY: any[] = [];

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
  frame?: string;
  badgeImage?: any;
  // User ID fields for chat navigation
  userid?: number;
  user_id?: number;
  account_id?: number;
  peer_user_id?: number;
  // Additional user profile fields
  level?: number;
  level_progress?: string;
  subscription_badges?: any[];
}

export const useLeaderboard = () => {
  const dispatch = useDispatch();

  // OPTIMIZED: Use memoized selectors with shallowEqual to prevent re-renders
  // Each tab has its own selector so updates to one tab don't re-render others
  const freeState = useSelector(selectFreeLeaderboard, shallowEqual);
  const bronzeState = useSelector(selectBronzeLeaderboard, shallowEqual);
  const silverState = useSelector(selectSilverLeaderboard, shallowEqual);
  const dailyState = useSelector(selectDailyLeaderboard, shallowEqual);

  // For remaining tabs, use direct selectors with shallowEqual
  const weeklyState = useSelector(
    (state: RootState) => ({
      data: state.leaderboard.weekly?.data ?? EMPTY_ARRAY,
      loading: state.leaderboard.weekly?.loading ?? false,
      error: state.leaderboard.weekly?.error ?? null,
      lastFetched: state.leaderboard.weekly?.lastFetched ?? null,
    }),
    shallowEqual
  );

  const monthlyState = useSelector(
    (state: RootState) => ({
      data: state.leaderboard.monthly?.data ?? EMPTY_ARRAY,
      loading: state.leaderboard.monthly?.loading ?? false,
      error: state.leaderboard.monthly?.error ?? null,
      lastFetched: state.leaderboard.monthly?.lastFetched ?? null,
    }),
    shallowEqual
  );

  const allTimeState = useSelector(
    (state: RootState) => ({
      data: state.leaderboard.allTime?.data ?? EMPTY_ARRAY,
      loading: state.leaderboard.allTime?.loading ?? false,
      error: state.leaderboard.allTime?.error ?? null,
      lastFetched: state.leaderboard.allTime?.lastFetched ?? null,
    }),
    shallowEqual
  );

  const currentUsername = useSelector(
    (state: RootState) => state.auth.user?.username,
    shallowEqual
  );

  // Ref to track fetch status and prevent excessive API calls
  const lastFetchTimeRef = useRef<Record<string, number>>({});

  // Helper function to get image source (same as use-winners-data)
  const getImageSource = useCallback((imageUrl: any): any => {
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('{') || imageUrl.startsWith('[')) {
        try {
          const parsed = JSON.parse(imageUrl);
          const uri = parsed.uri || parsed.url || parsed.image || parsed.avatar || imageUrl;
          return { uri };
        } catch (e) {
          return { uri: imageUrl };
        }
      }
      return { uri: imageUrl };
    } else if (typeof imageUrl === 'number') {
      return imageUrl;
    } else if (imageUrl.uri) {
      return imageUrl;
    }
    return null;
  }, []);

  // Transform API data to UI format - MEMOIZED to prevent recalculation
  const transformLeaderboardData = useCallback(
    (
      data: LeaderboardEntry[],
      type: 'daily' | 'weekly' | 'monthly' | 'allTime'
    ): TransformedLeaderboardEntry[] => {
      // If no data, return stable empty array reference
      if (!data || data.length === 0) {
        return EMPTY_ARRAY;
      }

      return data.map((entry, index) => {
        const badgeImageSource = entry.badge_image_url
          ? getImageSource(entry.badge_image_url)
          : null;
        // Extract frame - support both object and string formats (match WinnersScreen)
        const frameUrl =
          entry.frame?.url ||
          entry.frame_url ||
          (typeof entry.frame === 'string' ? entry.frame : null);

        // Use profile_pic_url if profile_pic_type is 'custom', otherwise use avatar_url
        // Match ProfileScreen logic: Use profile_pic_url if profile_pic_type is 'custom', otherwise use avatar
        const profileImage =
          entry.profile_pic_type === 'custom' && entry.profile_pic_url
            ? entry.profile_pic_url
            : entry.profile_pic_type === 'avatar' && entry.avatar_url
              ? entry.avatar_url
              : entry.profile_pic_url ||
                entry.avatar_url ||
                'https://randomuser.me/api/portraits/lego/1.jpg';

        // Extract user ID from entry - API returns 'userid' (lowercase), prioritize this
        let extractedUserId: number | undefined;
        // Try userid FIRST (this is what the API actually returns)
        if (entry.userid) {
          extractedUserId =
            typeof entry.userid === 'number' ? entry.userid : parseInt(String(entry.userid), 10);
        } else if (entry.peer_user_id) {
          extractedUserId =
            typeof entry.peer_user_id === 'number'
              ? entry.peer_user_id
              : parseInt(String(entry.peer_user_id), 10);
        } else if (entry.user_id) {
          extractedUserId =
            typeof entry.user_id === 'number' ? entry.user_id : parseInt(String(entry.user_id), 10);
        } else if (entry.account_id) {
          extractedUserId =
            typeof entry.account_id === 'number'
              ? entry.account_id
              : parseInt(String(entry.account_id), 10);
        }

        // Validate extracted ID
        if (extractedUserId !== undefined && (isNaN(extractedUserId) || extractedUserId <= 0)) {
          extractedUserId = undefined;
        }

        return {
          id: index + 1, // Keep position ID for display
          rank: entry.position || index + 1,
          name: entry.username || 'Anonymous',
          image: profileImage,
          amount: formatLeaderboardAmount(entry.amount_won),
          color: getRandomColor(index),
          lastOnline: getRandomLastOnline(),
          isOnline: Math.random() > 0.5,
          badges: generateRandomBadges(),
          isCurrentUser: entry.username === currentUsername,
          frame: frameUrl,
          badgeImage: badgeImageSource,
          // Preserve user ID fields for chat navigation
          peer_user_id: entry.peer_user_id
            ? typeof entry.peer_user_id === 'number'
              ? entry.peer_user_id
              : parseInt(String(entry.peer_user_id), 10)
            : undefined,
          userid: extractedUserId,
          user_id: extractedUserId,
          account_id: extractedUserId,
          // Preserve additional user profile fields
          level: entry.level,
          level_progress: entry.level_progress,
          subscription_badges: entry.subscription_badges,
        };
      });
    },
    [currentUsername, getImageSource]
  );

  // Fetch leaderboard data with debouncing to prevent rapid API calls
  // OPTIMIZED: Uses refs to track state without causing re-renders
  const fetchData = useCallback(
    (type: 'free' | 'bronze' | 'silver' | 'daily' | 'weekly' | 'monthly' | 'allTime') => {
      // Get current state based on type - use the memoized selectors
      const getStateForType = () => {
        switch (type) {
          case 'free':
            return freeState;
          case 'bronze':
            return bronzeState;
          case 'silver':
            return silverState;
          case 'daily':
            return dailyState;
          case 'weekly':
            return weeklyState;
          case 'monthly':
            return monthlyState;
          case 'allTime':
            return allTimeState;
          default:
            return { loading: false, data: EMPTY_ARRAY, error: null, lastFetched: null };
        }
      };

      const currentState = getStateForType();

      // Check if already loading to prevent duplicate calls
      if (currentState.loading) {
        return;
      }

      // Use ref to prevent multiple rapid API calls
      const now = Date.now();
      const lastFetch = lastFetchTimeRef.current[type] || 0;
      const twoMinutes = 2 * 60 * 1000;

      // Skip if we fetched recently (either via ref or state)
      if (now - lastFetch < twoMinutes) {
        return;
      }
      if (
        currentState.lastFetched &&
        now - currentState.lastFetched < twoMinutes &&
        currentState.data.length > 0
      ) {
        return;
      }

      // Track fetch time in ref
      lastFetchTimeRef.current[type] = now;

      // Dispatch the appropriate action
      switch (type) {
        case 'free':
          dispatch(fetchFreeLeaderboard());
          break;
        case 'bronze':
          dispatch(fetchBronzeLeaderboard());
          break;
        case 'silver':
          dispatch(fetchSilverLeaderboard());
          break;
        case 'daily':
          dispatch(fetchDailyLeaderboard());
          break;
        case 'weekly':
          dispatch(fetchWeeklyLeaderboard());
          break;
        case 'monthly':
          dispatch(fetchMonthlyLeaderboard());
          break;
        case 'allTime':
          dispatch(fetchAllTimeLeaderboard());
          break;
      }
    },
    [
      dispatch,
      freeState,
      bronzeState,
      silverState,
      dailyState,
      weeklyState,
      monthlyState,
      allTimeState,
    ]
  );

  // Clear error for specific leaderboard type
  const clearError = useCallback(
    (type: 'free' | 'bronze' | 'silver' | 'daily' | 'weekly' | 'monthly' | 'allTime') => {
      dispatch(clearLeaderboardError(type));
    },
    [dispatch]
  );

  // Memoized transformed data for each type - prevents recalculation on every render
  const freeTransformed = useMemo(
    () =>
      freeState.data.length > 0 ? transformLeaderboardData(freeState.data, 'daily') : EMPTY_ARRAY,
    [freeState.data, transformLeaderboardData]
  );

  const bronzeTransformed = useMemo(
    () =>
      bronzeState.data.length > 0
        ? transformLeaderboardData(bronzeState.data, 'daily')
        : EMPTY_ARRAY,
    [bronzeState.data, transformLeaderboardData]
  );

  const silverTransformed = useMemo(
    () =>
      silverState.data.length > 0
        ? transformLeaderboardData(silverState.data, 'daily')
        : EMPTY_ARRAY,
    [silverState.data, transformLeaderboardData]
  );

  const dailyTransformed = useMemo(
    () =>
      dailyState.data.length > 0 ? transformLeaderboardData(dailyState.data, 'daily') : EMPTY_ARRAY,
    [dailyState.data, transformLeaderboardData]
  );

  const weeklyTransformed = useMemo(
    () =>
      weeklyState.data.length > 0
        ? transformLeaderboardData(weeklyState.data, 'weekly')
        : EMPTY_ARRAY,
    [weeklyState.data, transformLeaderboardData]
  );

  const monthlyTransformed = useMemo(
    () =>
      monthlyState.data.length > 0
        ? transformLeaderboardData(monthlyState.data, 'monthly')
        : EMPTY_ARRAY,
    [monthlyState.data, transformLeaderboardData]
  );

  const allTimeTransformed = useMemo(
    () =>
      allTimeState.data.length > 0
        ? transformLeaderboardData(allTimeState.data, 'allTime')
        : EMPTY_ARRAY,
    [allTimeState.data, transformLeaderboardData]
  );

  // Auto-fetch data only once on mount for daily leaderboard
  // Note: This is optional since MembersScreen now preloads all tabs
  useEffect(() => {
    // Only fetch daily data on mount if no data exists and not loading
    // Skip if data was recently fetched (within 2 minutes)
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    const isDataFresh = dailyState.lastFetched && now - dailyState.lastFetched < twoMinutes;

    if (dailyState.data.length === 0 && !dailyState.loading && !dailyState.error && !isDataFresh) {
      fetchData('daily');
    }
  }, []); // Empty dependency array to run only once on mount

  // Return memoized state objects - prevents re-renders when individual tabs update
  return useMemo(
    () => ({
      // State - use pre-computed transformed data
      free: {
        data: freeTransformed,
        loading: freeState.loading,
        error: freeState.error,
      },
      bronze: {
        data: bronzeTransformed,
        loading: bronzeState.loading,
        error: bronzeState.error,
      },
      silver: {
        data: silverTransformed,
        loading: silverState.loading,
        error: silverState.error,
      },
      daily: {
        data: dailyTransformed,
        loading: dailyState.loading,
        error: dailyState.error,
      },
      weekly: {
        data: weeklyTransformed,
        loading: weeklyState.loading,
        error: weeklyState.error,
      },
      monthly: {
        data: monthlyTransformed,
        loading: monthlyState.loading,
        error: monthlyState.error,
      },
      allTime: {
        data: allTimeTransformed,
        loading: allTimeState.loading,
        error: allTimeState.error,
      },
      // Actions
      fetchData,
      clearError,
    }),
    [
      freeTransformed,
      freeState.loading,
      freeState.error,
      bronzeTransformed,
      bronzeState.loading,
      bronzeState.error,
      silverTransformed,
      silverState.loading,
      silverState.error,
      dailyTransformed,
      dailyState.loading,
      dailyState.error,
      weeklyTransformed,
      weeklyState.loading,
      weeklyState.error,
      monthlyTransformed,
      monthlyState.loading,
      monthlyState.error,
      allTimeTransformed,
      allTimeState.loading,
      allTimeState.error,
      fetchData,
      clearError,
    ]
  );
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

const formatLeaderboardAmount = (amount: number | string | null | undefined): string => {
  if (typeof amount === 'number' && isFinite(amount)) {
    // Remove decimal places - show whole numbers only
    return Math.round(amount).toString();
  }

  if (typeof amount === 'string') {
    const numeric = parseFloat(amount);
    if (!isNaN(numeric) && isFinite(numeric)) {
      // Remove decimal places - show whole numbers only
      return Math.round(numeric).toString();
    }
  }

  return '0';
};
