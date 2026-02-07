/**
 * Home Slice
 * Home screen state (winners, balance, notifications)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RecentWinner, UserBalance, Notification } from '@features/home/types';

interface HomeState {
  recentWinners: RecentWinner[];
  balance: UserBalance | null;
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

const initialState: HomeState = {
  recentWinners: [],
  balance: null,
  notifications: [],
  loading: false,
  error: null,
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setRecentWinners: (state, action: PayloadAction<RecentWinner[]>) => {
      state.recentWinners = action.payload;
    },

    setBalance: (state, action: PayloadAction<UserBalance | null>) => {
      state.balance = action.payload;
    },

    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },

    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
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

export const {
  setRecentWinners,
  setBalance,
  setNotifications,
  markNotificationRead,
  setLoading,
  setError,
} = homeSlice.actions;
export default homeSlice.reducer;
