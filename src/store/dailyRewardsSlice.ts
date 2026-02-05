import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as Keychain from 'react-native-keychain';
import { authService } from '../services/authService';
import { apiClient } from '../services/api/apiclient';
import { logger } from '../lib/utils/logger';

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
// const API_BASE_URL = 'http://192.168.0.116:8000';
const API_PARAMS = '?check_expiration=true&require_email=true';

// Keychain keys for popup tracking
const LAST_CLAIM_DATE_KEY = 'daily_rewards_last_claim_date';
const POPUP_SHOWN_KEY = 'daily_rewards_popup_shown_today';

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

// Cache duration for daily status fetch (60 seconds)
const DAILY_STATUS_CACHE_DURATION = 60000;

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
        // Return cached data from state
        return {
          current_day: dailyRewardsState.currentDay,
          days_claimed: dailyRewardsState.rewards.filter(r => r.claimed).length,
          day_status: dailyRewardsState.rewards.map(r => ({
            day: r.day,
            claimed: r.claimed,
            enabled: r.enabled,
          })),
          fromCache: true,
        };
      }

      // Use the authenticated API client
      const data = await apiClient.get('/trivia/daily-login');

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

// Thunk to check and initialize popup state on app open
export const checkPopupOnAppOpen = createAsyncThunk(
  'dailyRewards/checkPopupOnAppOpen',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { dailyRewards?: DailyRewardsState };

      // Safety check: ensure dailyRewards exists and has required properties
      if (!state.dailyRewards) {
        return { shouldShow: false, todayReward: null };
      }

      const { rewards = [], currentDay = 1 } = state.dailyRewards;

      // Ensure rewards is an array
      const safeRewards = Array.isArray(rewards) ? rewards : [];

      // Get stored data from Keychain
      const lastClaimCredentials = await Keychain.getGenericPassword({
        service: LAST_CLAIM_DATE_KEY,
      });
      const popupShownCredentials = await Keychain.getGenericPassword({ service: POPUP_SHOWN_KEY });

      const lastClaimDate = lastClaimCredentials ? lastClaimCredentials.password : null;
      const popupShownToday = popupShownCredentials ? popupShownCredentials.password : null;

      const today = getTodayString();
      const claimedToday = lastClaimDate === today;
      const popupAlreadyShown = popupShownToday === today;

      // First time user - show popup if rewards are loaded and not claimed
      if (!lastClaimDate && safeRewards.length > 0) {
        const todayReward = safeRewards.find(r => r.day === currentDay && r.enabled && !r.claimed);
        // For first time users, always show if there's an unclaimed reward
        const shouldShow = !!todayReward;

        return {
          shouldShow,
          todayReward: todayReward ? todayReward.day : null,
        };
      }

      // Check if it's a new day and we have rewards loaded
      if (isNewDay(lastClaimDate) && !claimedToday && safeRewards.length > 0) {
        const todayReward = safeRewards.find(r => r.day === currentDay && r.enabled && !r.claimed);
        // New day - always show if there's an unclaimed reward (ignore popupAlreadyShown)
        const shouldShow = !!todayReward;

        return {
          shouldShow,
          todayReward: todayReward ? todayReward.day : null,
        };
      }

      // If same day, check if there's still an unclaimed reward
      // Only check popupAlreadyShown if NOT claimed today
      if (!isNewDay(lastClaimDate) && safeRewards.length > 0) {
        const todayReward = safeRewards.find(r => r.day === currentDay && r.enabled && !r.claimed);
        // Same day - show if unclaimed and not already shown today
        const shouldShow = todayReward && !claimedToday && !popupAlreadyShown;

        return {
          shouldShow,
          todayReward: todayReward ? todayReward.day : null,
        };
      }

      // No rewards loaded yet
      if (safeRewards.length === 0) {
        return { shouldShow: false, todayReward: null };
      }

      return { shouldShow: false, todayReward: null };
    } catch (error: any) {
      logger.error('Error checking popup state:', 'STORE', error);
      return rejectWithValue(error.message || 'Unknown error checking popup state');
    }
  }
);

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

      // Store claim date in Keychain for persistence
      const today = getTodayString();
      Keychain.setGenericPassword(LAST_CLAIM_DATE_KEY, today, {
        service: LAST_CLAIM_DATE_KEY,
      }).catch(err => logger.error('Error storing claim date:', 'STORE', err));

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

        // Trigger popup check after fetching weekly status
        // This will be handled by the hook calling checkPopupOnAppOpen

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

        // Store claim date in Keychain for persistence
        const today = getTodayString();
        Keychain.setGenericPassword(LAST_CLAIM_DATE_KEY, today, {
          service: LAST_CLAIM_DATE_KEY,
        }).catch(err => logger.error('Error storing claim date:', 'STORE', err));

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

      // Handle checkPopupOnAppOpen
      .addCase(checkPopupOnAppOpen.pending, state => {
        state.isLoadingPopup = true;
      })
      .addCase(checkPopupOnAppOpen.fulfilled, (state, action) => {
        state.isLoadingPopup = false;
        state.showPopupOnAppOpen = action.payload.shouldShow ?? false;
      })
      .addCase(checkPopupOnAppOpen.rejected, state => {
        state.isLoadingPopup = false;
        state.showPopupOnAppOpen = false;
      });
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
