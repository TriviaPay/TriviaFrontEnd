/**
 * Daily Bonus Slice
 * Daily reward state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DailyBonus } from '@features/dailybonus/types';

interface DailyBonusState {
  bonuses: DailyBonus[];
  currentDay: number;
  lastClaimDate: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DailyBonusState = {
  bonuses: [],
  currentDay: 1,
  lastClaimDate: null,
  loading: false,
  error: null,
};

const dailyBonusSlice = createSlice({
  name: 'dailyBonus',
  initialState,
  reducers: {
    setBonuses: (state, action: PayloadAction<DailyBonus[]>) => {
      state.bonuses = action.payload;
      state.loading = false;
    },

    setCurrentDay: (state, action: PayloadAction<number>) => {
      state.currentDay = action.payload;
    },

    claimBonus: (state, action: PayloadAction<number>) => {
      const bonus = state.bonuses.find(b => b.day === action.payload);
      if (bonus) {
        bonus.claimed = true;
        bonus.claimDate = new Date().toISOString();
        state.lastClaimDate = bonus.claimDate;
      }
    },

    setLastClaimDate: (state, action: PayloadAction<string | null>) => {
      state.lastClaimDate = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setBonuses, setCurrentDay, claimBonus, setLastClaimDate, setLoading, setError } =
  dailyBonusSlice.actions;
export default dailyBonusSlice.reducer;
