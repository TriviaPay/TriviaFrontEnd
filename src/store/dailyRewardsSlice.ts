import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as Keychain from 'react-native-keychain';
import { authService } from '../services/authService';
import { apiClient } from '../services/api/apiclient';
import { logger } from '../lib/utils/logger';
import { storage } from '../core/services/Storage';

interface Reward {
  day: number;
  type: string;
  value: number;
  color: string;
  claimed: boolean;
  enabled: boolean;
  doubled: boolean;
  isToday: boolean;
  specialReward: boolean;
  status: string;
}

interface DailyRewardsState {
  rewards: Reward[];
  currentDay: number;
  weekStartDate: string;
  streakCount: number;
  currentGems: number;
  loading: boolean;
  claimInProgress: boolean;
  doubleUpInProgress: boolean;
  error: string | null;
  message: string | null;
  claimButtonDisabled: boolean;
  doubleUpButtonDisabled: boolean;
  actionSelected: string | null;
  showPopup: boolean;
  showPopupOnAppOpen: boolean;
  isLoadingPopup: boolean;
  lastStatusFetch: number | null; // Timestamp of last status fetch
}
const API_BASE_URL = 'https://trivia-back-end.vercel.app';
const LAST_CLAIM_DATE_KEY = 'daily_rewards_last_claim_date';

// Cache duration for daily status fetch (60 seconds)
const DAILY_STATUS_CACHE_DURATION = 60000;


// Helper functions for date handling
const getTodayString = (): string => {
  return new Date().toDateString();
};

const isNewDay = (lastDate: string | null): boolean => {
  if (!lastDate) return true;
  return getTodayString() !== lastDate;
};

const getDaysDifference = (date1: string, date2: string): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
};

// Helper function to get headers with current token
const getHeaders = async (): Promise<Record<string, string>> => {
  try {
    const token = await authService.getAccessToken();
    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    // Always add Authorization header for real authentication
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  } catch (error) {
    logger.error('Error getting token for headers:', 'STORE', error);
    return {
      accept: 'application/json',
    };
  }
};
// Async thunks for API calls

export const fetchWeeklyStatus = createAsyncThunk(
  'dailyRewards/fetchWeeklyStatus',
  async (forceRefresh: boolean = false, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { dailyRewards?: DailyRewardsState };
      const dailyRewardsState = state.dailyRewards;

      // Check cache - if recent fetch exists and not forcing refresh, skip API call
      if (
        !forceRefresh &&
        dailyRewardsState?.lastStatusFetch &&
        Date.now() - dailyRewardsState.lastStatusFetch < DAILY_STATUS_CACHE_DURATION
      ) {
        // Return cached data from state in exactly the same format as the API
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayStatus: Record<string, boolean> = {};
        dailyRewardsState.rewards.forEach(r => {
          dayStatus[dayNames[r.day - 1]] = r.claimed;
        });

        return {
          current_day: dailyRewardsState.currentDay,
          days_claimed: dailyRewardsState.rewards.filter(r => r.claimed).map(r => r.day),
          day_status: dayStatus,
          fromCache: true,
        };
      }

      // Use the authenticated API client
      const data = await apiClient.get('/daily-login');

      logger.log('✅ Daily login status received:', 'STORE', JSON.stringify(data, null, 2));
      return { ...data, fromCache: false };
    } catch (error: any) {
      // Suppress "No authentication token available" errors - expected when not logged in
      const errorMessage = error?.message || String(error);
      if (
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token')
      ) {
        // Silent - expected when user is not authenticated
        return rejectWithValue({
          message: errorMessage,
          isNetworkError: true,
        });
      }
      logger.error('❌ Error fetching daily login status:', 'STORE', error);
      return rejectWithValue({
        message: errorMessage || 'Failed to fetch daily login status',
        isNetworkError: true,
      });
    }
  }
);

export const claimDailyReward = createAsyncThunk(
  'dailyRewards/claimDailyReward',
  async (_, { rejectWithValue }) => {
    try {
      // Use the authenticated API client which handles tokens properly
      const data = await apiClient.post('/trivia/daily-login', {});

      logger.log('✅ Claim reward response:', 'STORE', JSON.stringify(data, null, 2));
      return data;
    } catch (error: any) {
      logger.error('❌ Error claiming reward:', 'STORE', error);
      logger.error('❌ Error details:', 'STORE', {
        message: error.message,
        stack: error.stack,
      });

      // Handle specific error cases
      const errorMsg = error.message || '';
      const errorLower = errorMsg.toLowerCase();

      if (
        errorLower.includes('already claimed') ||
        errorLower.includes('daily reward already claimed')
      ) {
        // If already claimed, treat as success - user already got the reward

        // Return a success-like response to update UI
        // We need to return this as fulfilled, not rejected
        return {
          gems_earned: 0,
          total_gems: 0, // Will be updated from current state
          current_streak: 0, // Will be updated from current state
          days_until_weekly_bonus: 0,
          alreadyClaimed: true,
        };
      } else if (errorMsg.includes('HTTP 400')) {
        return rejectWithValue('Invalid request. Please try again.');
      } else if (errorMsg.includes('HTTP 401')) {
        return rejectWithValue('Authentication failed. Please log in again.');
      } else if (errorMsg.includes('HTTP 403')) {
        return rejectWithValue('You are not authorized to claim this reward.');
      }

      return rejectWithValue(errorMsg || 'Failed to claim daily reward');
    }
  }
);

export const doubleUpReward = createAsyncThunk(
  'dailyRewards/doubleUpReward',
  async (_, { rejectWithValue }) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE_URL}/daily-rewards/double-up${API_PARAMS}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Network response was not ok');
      }

      const data = await response.json();
      logger.log('Double up response:', 'STORE', JSON.stringify(data, null, 2));
      return data;
    } catch (error: any) {
      logger.error('Error doubling reward:', 'STORE', error);
      return rejectWithValue(error.message);
    }
  }
);

// Thunk to check and initialize popup state on app open removed - logic moved to fetchWeeklyStatus.fulfilled


// Helper function to transform new API data to our app format
const transformDailyLoginToRewards = (apiData: any): Reward[] => {
  logger.log('API Data:', 'STORE', JSON.stringify(apiData, null, 2));

  const { current_day, days_claimed, day_status } = apiData;

  // Default reward values for each day
  const rewardValues = [10, 10, 15, 15, 20, 20, 30];

  // Day names mapping (1 = Monday, 2 = Tuesday, etc.)
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const rewards: Reward[] = [];

  for (let i = 1; i <= 7; i++) {
    const dayName = dayNames[i - 1];
    const isClaimed = days_claimed?.includes(i) || day_status?.[dayName] === true;
    const isToday = i === current_day;
    const isEnabled = isToday || isClaimed || i < current_day;

    const rewardObj: Reward = {
      day: i,
      type: i === 7 ? 'diamonds' : 'diamond', // Day 7 is special
      value: rewardValues[i - 1],
      color: i === 7 ? '#CC0066' : i % 2 === 0 ? '#0066CC' : '#CC0066',
      claimed: isClaimed,
      enabled: isEnabled,
      doubled: false, // Not available in new API
      isToday,
      specialReward: i === 7, // Day 7 is special
      status: isClaimed ? 'claimed' : isToday ? 'available' : i < current_day ? 'missed' : 'locked',
    };

    rewards.push(rewardObj);
  }

  logger.log('✅ Final transformed rewards:', 'STORE', JSON.stringify(rewards, null, 2));
  return rewards;
};

// Initial state
const initialState: DailyRewardsState = {
  rewards: [],
  currentDay: 1,
  weekStartDate: '',
  streakCount: 0,
  currentGems: 0,
  loading: false,
  claimInProgress: false,
  doubleUpInProgress: false,
  error: null,
  message: null,
  claimButtonDisabled: false,
  doubleUpButtonDisabled: false,
  actionSelected: null,
  showPopup: false,
  showPopupOnAppOpen: false,
  isLoadingPopup: true,
  lastStatusFetch: null,
};

// Create the slice
const dailyRewardsSlice = createSlice({
  name: 'dailyRewards',
  initialState,
  reducers: {
    resetMessage: state => {
      state.message = null;
    },
    resetRewardsState: () => initialState,
    selectClaimAction: state => {
      state.actionSelected = 'claim';
      state.doubleUpButtonDisabled = true;
      state.claimButtonDisabled = false;
    },
    selectDoubleUpAction: state => {
      state.actionSelected = 'doubleUp';
      state.claimButtonDisabled = true;
      state.doubleUpButtonDisabled = false;
    },
    resetActionSelection: state => {
      state.actionSelected = null;
      state.claimButtonDisabled = false;
      state.doubleUpButtonDisabled = false;
    },
    setShowPopup: (state, action: PayloadAction<boolean>) => {
      state.showPopup = action.payload;
    },
    setShowPopupOnAppOpen: (state, action: PayloadAction<boolean>) => {
      state.showPopupOnAppOpen = action.payload;
    },
    handleClosePopup: state => {
      state.showPopupOnAppOpen = false;
    },
    updateRewards: (state, action: PayloadAction<number>) => {
      // Update rewards when a day is claimed - DO NOT close popup
      const day = action.payload;
      state.rewards = state.rewards.map(reward => {
        if (reward.day === day) {
          return { ...reward, claimed: true };
        }
        if (reward.day === day + 1) {
          return { ...reward, enabled: true };
        }
        return reward;
      });
      state.currentDay = Math.min(day + 1, 7);

      // Store claim date in MMKV for persistence
      const today = getTodayString();
      try {
        storage.set(LAST_CLAIM_DATE_KEY, today);
      } catch (err) {
        logger.error('Error storing claim date:', 'STORE', err);
      }

      // Keep popup open - user must close manually
    },
  },
  extraReducers: builder => {
    builder
      // Handle fetchWeeklyStatus
      .addCase(fetchWeeklyStatus.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeeklyStatus.fulfilled, (state, action) => {
        state.loading = false;
        // Only update timestamp if not from cache
        if (!action.payload.fromCache) {
          state.lastStatusFetch = Date.now();
        }
        state.currentDay = action.payload.current_day || 1;
        state.weekStartDate = action.payload.week_start_date || '';
        state.rewards = transformDailyLoginToRewards(action.payload);

        // Calculate streak count from days_claimed array
        state.streakCount = action.payload.days_claimed?.length || 0;

        // Update current gems from API if available
        if (action.payload.total_gems_earned_this_week !== undefined) {
          state.currentGems = action.payload.total_gems_earned_this_week;
        }

        // Find today's reward and determine if popup should show
        const todayReward = state.rewards.find(r => r.isToday);
        state.showPopup = todayReward ? !todayReward.claimed && todayReward.enabled : false;

        // Auto-show popup on app open if rewards are available and not claimed
        // This is triggered by MainNavigator.tsx once per session
        state.showPopupOnAppOpen = !!(todayReward && todayReward.enabled && !todayReward.claimed);
        state.isLoadingPopup = false;

        // Update button states
        if (todayReward && todayReward.claimed) {
          state.claimButtonDisabled = true;
          state.doubleUpButtonDisabled = true;
          state.actionSelected = 'claim';
        } else if (todayReward && todayReward.enabled) {
          state.claimButtonDisabled = false;
          state.doubleUpButtonDisabled = false;
          state.actionSelected = null;
        } else {
          state.claimButtonDisabled = true;
          state.doubleUpButtonDisabled = true;
          state.actionSelected = null;
        }
      })
      .addCase(fetchWeeklyStatus.rejected, (state, action) => {
        state.loading = false;
        // Handle error payload - it might be a string or an object
        const errorPayload = action.payload as any;
        if (typeof errorPayload === 'string') {
          state.error = errorPayload;
        } else if (errorPayload?.message) {
          state.error = errorPayload.message;
        } else {
          state.error = 'Failed to fetch weekly status';
        }
        state.showPopup = false;
        state.isLoadingPopup = false;
        // Don't prevent popup check on network error - use local state if available
        // The popup check will handle empty rewards gracefully
      })

      // Handle claimDailyReward
      .addCase(claimDailyReward.pending, state => {
        state.claimInProgress = true;
        state.error = null;
        state.claimButtonDisabled = true;
        state.doubleUpButtonDisabled = true;
      })
      .addCase(claimDailyReward.fulfilled, (state, action) => {
        state.claimInProgress = false;
        state.error = null; // Clear any previous errors

        // Handle "already claimed" case
        if (action.payload?.alreadyClaimed) {
          state.message = 'Reward already claimed today!';
          state.claimButtonDisabled = true;
          state.doubleUpButtonDisabled = true;
          state.actionSelected = 'claim';

          // Mark current day as claimed in rewards
          state.rewards = state.rewards.map(reward => {
            if (reward.day === state.currentDay) {
              return { ...reward, claimed: true };
            }
            return reward;
          });
        } else {
          // Normal claim success - update from API response
          const gemsEarned = action.payload?.gems_earned || 0;
          const totalGems = action.payload?.total_gems || state.currentGems;
          const currentStreak = action.payload?.current_streak || state.streakCount;

          state.message = gemsEarned > 0 ? `Earned ${gemsEarned} gems!` : 'Reward claimed!';
          state.currentGems = totalGems;
          state.streakCount = currentStreak;
          state.claimButtonDisabled = true;
          state.doubleUpButtonDisabled = true;
          state.actionSelected = 'claim';

          // Mark current day as claimed in rewards
          state.rewards = state.rewards.map(reward => {
            if (reward.day === state.currentDay) {
              return { ...reward, claimed: true };
            }
            return reward;
          });
        }

        // DO NOT close popup - user must close manually
        // state.showPopup = false;
        // state.showPopupOnAppOpen = false;

        // Store claim date in MMKV for persistence
        const today = getTodayString();
        try {
          storage.set(LAST_CLAIM_DATE_KEY, today);
        } catch (err) {
          logger.error('Error storing claim date:', 'STORE', err);
        }

        // Clear cache timestamp to force fresh fetch on next fetchWeeklyStatus call
        state.lastStatusFetch = null;

        // Refresh the daily login status to get updated days_claimed
        // This will be handled by the component calling fetchWeeklyStatus after claim
      })
      .addCase(claimDailyReward.rejected, (state, action) => {
        state.claimInProgress = false;
        state.error = action.payload as string;
        state.claimButtonDisabled = false;
        state.doubleUpButtonDisabled = false;
        state.actionSelected = null;
      })

      // Handle doubleUpReward
      .addCase(doubleUpReward.pending, state => {
        state.doubleUpInProgress = true;
        state.error = null;
        state.claimButtonDisabled = true;
        state.doubleUpButtonDisabled = true;
      })
      .addCase(doubleUpReward.fulfilled, (state, action) => {
        state.doubleUpInProgress = false;
        state.message = action.payload.message;
        state.currentGems = action.payload.current_gems;
        state.claimButtonDisabled = true;
        state.doubleUpButtonDisabled = true;
        state.actionSelected = 'doubleUp';
        state.showPopup = false; // Hide popup after successful double-up

        if (action.payload.daily_reward_status) {
          state.currentDay = action.payload.daily_reward_status.current_day;
          state.weekStartDate = action.payload.daily_reward_status.week_start_date;
          state.rewards = transformDaysToRewards(
            action.payload.daily_reward_status.days,
            action.payload.daily_reward_status.current_day
          );
        }
      })
      .addCase(doubleUpReward.rejected, (state, action) => {
        state.doubleUpInProgress = false;
        state.error = action.payload as string;
        state.claimButtonDisabled = false;
        state.doubleUpButtonDisabled = false;
        state.actionSelected = null;
      })

    // Handle checkPopupOnAppOpen - Removed logic moved to fetchWeeklyStatus.fulfilled

  },
});

export const {
  resetMessage,
  resetRewardsState,
  selectClaimAction,
  selectDoubleUpAction,
  resetActionSelection,
  setShowPopup,
  setShowPopupOnAppOpen,
  handleClosePopup,
  updateRewards,
} = dailyRewardsSlice.actions;

export default dailyRewardsSlice.reducer;
