/**
 * User Slice
 * User profile state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  coins: number;
  gems: number;
  level: number;
  experience: number;
  createdAt: string;
}

interface UserState {
  profile: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.profile = action.payload;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    clearUser: state => {
      state.profile = null;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    updateBalance: (state, action: PayloadAction<{ coins?: number; gems?: number }>) => {
      if (state.profile) {
        if (action.payload.coins !== undefined) {
          state.profile.coins = action.payload.coins;
        }
        if (action.payload.gems !== undefined) {
          state.profile.gems = action.payload.gems;
        }
      }
    },
  },
});

export const { setUser, updateUser, clearUser, setLoading, setError, updateBalance } =
  userSlice.actions;
export default userSlice.reducer;
