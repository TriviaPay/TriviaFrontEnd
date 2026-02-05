/**
 * Timer Slice - Redux Toolkit
 * Provides a single source of truth for the countdown timer
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../services/apiService';

interface TimerState {
  nextDrawTime: string | null;
  prizePool: number; // Keep for backward compatibility
  bronzePrizePool: number;
  silverPrizePool: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: TimerState = {
  nextDrawTime: null,
  prizePool: 0,
  bronzePrizePool: 0,
  silverPrizePool: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Async Thunk to fetch next draw info
export const fetchNextDraw = createAsyncThunk(
  'timer/fetchNextDraw',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getNextDraw();
      if (response.success && response.data) {
        // Robust unwrapping: handle both direct DrawInfo and nested {status, data} wrapper
        const rawData = response.data as any;
        if (rawData.status === 'success' && rawData.data) {
          return rawData.data;
        }
        return rawData;
      }
      return rejectWithValue(response.error || 'Failed to fetch draw data');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch draw data');
    }
  }
);

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    clearTimerError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNextDraw.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNextDraw.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nextDrawTime = action.payload.next_draw_time;

        // Parse new API response format with mode_pools
        if (action.payload.mode_pools) {
          state.bronzePrizePool = action.payload.mode_pools.bronze?.total_pool || 0;
          state.silverPrizePool = action.payload.mode_pools.silver?.total_pool || 0;
          // Keep total prizePool for backward compatibility (sum or use total if available)
          state.prizePool = action.payload.prize_pool || (state.bronzePrizePool + state.silverPrizePool);
        } else {
          // Fallback to old format
          state.prizePool = action.payload.prize_pool || 0;
          state.bronzePrizePool = 0;
          state.silverPrizePool = 0;
        }

        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchNextDraw.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTimerError } = timerSlice.actions;
export default timerSlice.reducer;
