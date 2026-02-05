/**
 * Leaderboard Redux Slice
 * Manages leaderboard data state and actions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../services/apiService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { logger } from '../lib/utils/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

// Types
export interface LeaderboardEntry {
  username: string;
  amount_won: number;
  total_amount_won: number;
  badge_image_url: string | null;
  avatar_url: string | null;
  profile_pic_url: string | null;
  profile_pic_type: 'avatar' | 'custom' | null;
  frame_url: string | null;
  position: number;
  // User ID fields for chat navigation
  userid?: number;
  user_id?: number;
  account_id?: number;
  peer_user_id?: number;
  // Additional user profile fields
  level?: number;
  level_progress?: string;
  subscription_badges?: any[];
  profile_pic?: string | null;
}

export interface LeaderboardState {
  free: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  bronze: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  silver: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  daily: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  weekly: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  monthly: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
  allTime: {
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
  };
}

/**
 * Calculate the date to use for daily winners based on draw time
 * Logic: If current time is before next draw time, use previous date (yesterday)
 *        If current time is after next draw time, use current date
 * CRITICAL: Added timeout to prevent infinite loading
 */
const getDrawDateForWinners = async (): Promise<string> => {
  // CRITICAL: Create a fallback date first
  const getFallbackDate = (): string => {
    const now = dayjs().tz('America/New_York');
    return now.format('YYYY-MM-DD');
  };

  try {
    // CRITICAL: Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Draw time API timeout')), 3000); // 3 second timeout
    });

    // Race between API call and timeout
    const drawResponse = await Promise.race([apiService.getNextDraw(), timeoutPromise]).catch(
      error => {
        logger.warn('⚠️ [leaderboardSlice] Draw time API failed or timed out:', 'STORE', error);
        return null;
      }
    );

    if (drawResponse && drawResponse.success && drawResponse.data?.next_draw_time) {
      const nextDrawTime = dayjs(drawResponse.data.next_draw_time);
      const now = dayjs().tz('America/New_York');

      // If current time is before next draw time, use previous date (yesterday)
      // If current time is after next draw time, use current date
      if (now.isBefore(nextDrawTime)) {
        // Before draw time - show previous draw date (yesterday)
        const previousDate = now.subtract(1, 'day');
        const dateStr = previousDate.format('YYYY-MM-DD');
        return dateStr;
      } else {
        // After draw time - show current date
        const dateStr = now.format('YYYY-MM-DD');
        return dateStr;
      }
    }
  } catch (error) {
    logger.warn(
      '⚠️ [leaderboardSlice] Failed to get draw time, using fallback date:',
      'STORE',
      error
    );
  }

  // Always return fallback date if anything fails
  return getFallbackDate();
};

const initialState: LeaderboardState = {
  free: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  bronze: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  silver: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  daily: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  weekly: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  monthly: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  allTime: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
};

// Async thunks for API calls with deduplication
export const fetchFreeLeaderboard = createAsyncThunk(
  'leaderboard/fetchFree',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Calculate the date to use based on draw time
      const dateStr = await getDrawDateForWinners();

      const response = await apiService.getFreeModeLeaderboard(dateStr);
      if (response.success && response.data) {
        // Transform the response data - API returns { draw_date, leaderboard: [] }
        const leaderboardData = response.data.leaderboard || [];

        // Normalize data to match LeaderboardEntry format
        const normalized = Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => {
              return {
                ...entry,
                position: entry.position || entry.rank || index + 1,
                profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
                profile_pic_type:
                  entry.profile_pic_type ||
                  (entry.profile_pic || entry.profile_pic_url
                    ? 'custom'
                    : entry.avatar_url
                      ? 'avatar'
                      : null),
                amount_won: entry.amount_won || entry.amount || entry.score || 0,
                username: entry.username || entry.name || 'Unknown',
              };
            })
          : [];
        return normalized;
      }
      throw new Error(response.error || 'Failed to fetch free mode leaderboard');
    } catch (error: any) {
      // Suppress "Not authenticated" errors - expected when not logged in or token expired
      const errorMessage = error?.message || error?.toString() || String(error);
      const isAuthError =
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('401');

      if (isAuthError) {
        // Silent - expected when user is not authenticated
        return rejectWithValue(errorMessage);
      }

      logger.error('❌ Free mode leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.free;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

export const fetchBronzeLeaderboard = createAsyncThunk(
  'leaderboard/fetchBronze',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated || !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }

    try {
      // Calculate the date to use based on draw time
      const dateStr = await getDrawDateForWinners();

      const response = await apiService.getBronzeModeLeaderboard(dateStr);
      if (response.success && response.data) {
        // Transform the response data - API returns { draw_date, leaderboard: [] }
        const leaderboardData = response.data.leaderboard || [];

        // Normalize data to match LeaderboardEntry format
        const normalized = Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => {
              return {
                ...entry,
                position: entry.position || entry.rank || index + 1,
                profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
                profile_pic_type:
                  entry.profile_pic_type ||
                  (entry.profile_pic || entry.profile_pic_url
                    ? 'custom'
                    : entry.avatar_url
                      ? 'avatar'
                      : null),
                amount_won:
                  entry.money_awarded ||
                  entry.gems_awarded ||
                  entry.amount_won ||
                  entry.amount ||
                  entry.score ||
                  0,
                username: entry.username || entry.name || 'Unknown',
                level: entry.level || undefined,
                level_progress: entry.level_progress || undefined,
                subscription_badges: entry.subscription_badges || undefined,
              };
            })
          : [];
        return normalized;
      }
      throw new Error(response.error || 'Failed to fetch bronze mode leaderboard');
    } catch (error) {
      logger.error('❌ Bronze mode leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.bronze;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

export const fetchSilverLeaderboard = createAsyncThunk(
  'leaderboard/fetchSilver',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated || !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }

    try {
      // Calculate the date to use based on draw time
      const dateStr = await getDrawDateForWinners();

      const response = await apiService.getSilverModeLeaderboard(dateStr);
      if (response.success && response.data) {
        // Transform the response data - API returns { draw_date, leaderboard: [] }
        const leaderboardData = response.data.leaderboard || [];

        // Normalize data to match LeaderboardEntry format
        const normalized = Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => {
              return {
                ...entry,
                position: entry.position || entry.rank || index + 1,
                profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
                profile_pic_type:
                  entry.profile_pic_type ||
                  (entry.profile_pic || entry.profile_pic_url
                    ? 'custom'
                    : entry.avatar_url
                      ? 'avatar'
                      : null),
                amount_won:
                  entry.money_awarded || entry.amount_won || entry.amount || entry.score || 0,
                username: entry.username || entry.name || 'Unknown',
                level: entry.level || undefined,
                level_progress: entry.level_progress || undefined,
                subscription_badges: entry.subscription_badges || undefined,
              };
            })
          : [];
        return normalized;
      }
      throw new Error(response.error || 'Failed to fetch silver mode leaderboard');
    } catch (error) {
      logger.error('❌ Silver mode leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.silver;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

export const fetchDailyLeaderboard = createAsyncThunk(
  'leaderboard/fetchDaily',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Calculate the date to use based on draw time
      const dateStr = await getDrawDateForWinners();

      // getDailyWinners removed - endpoint no longer available
      // Return empty array gracefully instead of throwing error
      return [];
    } catch (error: any) {
      // Suppress "Not authenticated" errors - expected when not logged in or token expired
      const errorMessage = error?.message || error?.toString() || String(error);
      const isAuthError =
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('401');

      if (isAuthError) {
        return rejectWithValue(errorMessage);
      }

      logger.error('❌ Daily leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      // Prevent thunk from running if data is fresh (less than 2 minutes old)
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.daily;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        // Skip the thunk entirely - no fulfilled action will be dispatched
        return false;
      }

      // Also check if already loading to prevent duplicate calls
      if (leaderboardState?.loading) {
        return false;
      }

      return true; // Allow thunk to proceed
    },
  }
);

export const fetchWeeklyLeaderboard = createAsyncThunk(
  'leaderboard/fetchWeekly',
  async (_, { rejectWithValue, getState }) => {
    try {
      // getWeeklyWinners removed - endpoint no longer available
      // Return empty array gracefully
      return [];
    } catch (error) {
      logger.error('❌ Weekly leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.weekly;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

export const fetchMonthlyLeaderboard = createAsyncThunk(
  'leaderboard/fetchMonthly',
  async (_, { rejectWithValue, getState }) => {
    try {
      // getMonthlyWinners removed - endpoint no longer available
      // Return empty array gracefully
      return [];
    } catch (error) {
      logger.error('❌ Monthly leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.monthly;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

export const fetchAllTimeLeaderboard = createAsyncThunk(
  'leaderboard/fetchAllTime',
  async (_, { rejectWithValue, getState }) => {
    try {
      // getAllTimeWinners removed - endpoint no longer available
      // Return empty array gracefully
      return [];
    } catch (error) {
      logger.error('❌ All-time leaderboard fetch error:', 'STORE', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as any;
      const leaderboardState = state.leaderboard?.allTime;

      if (leaderboardState?.lastFetched && Date.now() - leaderboardState.lastFetched < 120000) {
        return false;
      }

      if (leaderboardState?.loading) {
        return false;
      }

      return true;
    },
  }
);

// Leaderboard slice
const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    clearLeaderboardData: state => {
      state.free.data = [];
      state.bronze.data = [];
      state.silver.data = [];
      state.daily.data = [];
      state.weekly.data = [];
      state.monthly.data = [];
      state.allTime.data = [];
      state.free.error = null;
      state.bronze.error = null;
      state.silver.error = null;
      state.daily.error = null;
      state.weekly.error = null;
      state.monthly.error = null;
      state.allTime.error = null;
    },
    clearLeaderboardError: (
      state,
      action: PayloadAction<
        'free' | 'bronze' | 'silver' | 'daily' | 'weekly' | 'monthly' | 'allTime'
      >
    ) => {
      state[action.payload].error = null;
    },
  },
  extraReducers: builder => {
    // Free mode leaderboard
    builder
      .addCase(fetchFreeLeaderboard.pending, state => {
        state.free.loading = true;
        state.free.error = null;
      })
      .addCase(fetchFreeLeaderboard.fulfilled, (state, action) => {
        state.free.loading = false;
        const payload = Array.isArray(action.payload) ? action.payload : [];
        state.free.data = payload;
        state.free.error = null;
        state.free.lastFetched = Date.now();
      })
      .addCase(fetchFreeLeaderboard.rejected, (state, action) => {
        state.free.loading = false;
        state.free.error = action.payload as string;
      });

    // Bronze mode leaderboard
    builder
      .addCase(fetchBronzeLeaderboard.pending, state => {
        state.bronze.loading = true;
        state.bronze.error = null;
      })
      .addCase(fetchBronzeLeaderboard.fulfilled, (state, action) => {
        state.bronze.loading = false;
        const payload = Array.isArray(action.payload) ? action.payload : [];
        state.bronze.data = payload;
        state.bronze.error = null;
        state.bronze.lastFetched = Date.now();
      })
      .addCase(fetchBronzeLeaderboard.rejected, (state, action) => {
        state.bronze.loading = false;
        state.bronze.error = action.payload as string;
      });

    // Silver mode leaderboard
    builder
      .addCase(fetchSilverLeaderboard.pending, state => {
        state.silver.loading = true;
        state.silver.error = null;
      })
      .addCase(fetchSilverLeaderboard.fulfilled, (state, action) => {
        state.silver.loading = false;
        const payload = Array.isArray(action.payload) ? action.payload : [];
        state.silver.data = payload;
        state.silver.error = null;
        state.silver.lastFetched = Date.now();
      })
      .addCase(fetchSilverLeaderboard.rejected, (state, action) => {
        state.silver.loading = false;
        state.silver.error = action.payload as string;
      });

    // Daily leaderboard
    builder
      .addCase(fetchDailyLeaderboard.pending, state => {
        state.daily.loading = true;
        state.daily.error = null;
      })
      .addCase(fetchDailyLeaderboard.fulfilled, (state, action) => {
        state.daily.loading = false;
        // Ensure payload is always an array
        const payload = Array.isArray(action.payload) ? action.payload : [];
        state.daily.data = payload;
        state.daily.error = null;
        state.daily.lastFetched = Date.now();
      })
      .addCase(fetchDailyLeaderboard.rejected, (state, action) => {
        state.daily.loading = false;
        state.daily.error = action.payload as string;
      });

    // Weekly leaderboard
    builder
      .addCase(fetchWeeklyLeaderboard.pending, state => {
        state.weekly.loading = true;
        state.weekly.error = null;
      })
      .addCase(fetchWeeklyLeaderboard.fulfilled, (state, action) => {
        state.weekly.loading = false;
        // Ensure payload is always an array
        state.weekly.data = Array.isArray(action.payload) ? action.payload : [];
        state.weekly.error = null;
        state.weekly.lastFetched = Date.now();
      })
      .addCase(fetchWeeklyLeaderboard.rejected, (state, action) => {
        state.weekly.loading = false;
        state.weekly.error = action.payload as string;
      });

    // Monthly leaderboard
    builder
      .addCase(fetchMonthlyLeaderboard.pending, state => {
        state.monthly.loading = true;
        state.monthly.error = null;
      })
      .addCase(fetchMonthlyLeaderboard.fulfilled, (state, action) => {
        state.monthly.loading = false;
        // Ensure payload is always an array
        state.monthly.data = Array.isArray(action.payload) ? action.payload : [];
        state.monthly.error = null;
        state.monthly.lastFetched = Date.now();
      })
      .addCase(fetchMonthlyLeaderboard.rejected, (state, action) => {
        state.monthly.loading = false;
        state.monthly.error = action.payload as string;
      });

    // All-time leaderboard
    builder
      .addCase(fetchAllTimeLeaderboard.pending, state => {
        state.allTime.loading = true;
        state.allTime.error = null;
      })
      .addCase(fetchAllTimeLeaderboard.fulfilled, (state, action) => {
        state.allTime.loading = false;
        // Ensure payload is always an array
        state.allTime.data = Array.isArray(action.payload) ? action.payload : [];
        state.allTime.error = null;
        state.allTime.lastFetched = Date.now();
      })
      .addCase(fetchAllTimeLeaderboard.rejected, (state, action) => {
        state.allTime.loading = false;
        state.allTime.error = action.payload as string;
      });
  },
});

export const { clearLeaderboardData, clearLeaderboardError } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
