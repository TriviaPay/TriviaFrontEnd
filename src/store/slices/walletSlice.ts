/**
 * Wallet Slice
 * Wallet transactions and balance state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Transaction } from '@features/wallet/types';

interface WalletState {
  transactions: Transaction[];
  balance: {
    coins: number;
    gems: number;
    usd: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  transactions: [],
  balance: {
    coins: 0,
    gems: 0,
    usd: 0,
  },
  loading: false,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload;
      state.loading = false;
    },

    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },

    setBalance: (state, action: PayloadAction<{ coins: number; gems: number; usd: number }>) => {
      state.balance = action.payload;
    },

    updateBalance: (
      state,
      action: PayloadAction<{ coins?: number; gems?: number; usd?: number }>
    ) => {
      if (action.payload.coins !== undefined) {
        state.balance.coins += action.payload.coins;
      }
      if (action.payload.gems !== undefined) {
        state.balance.gems += action.payload.gems;
      }
      if (action.payload.usd !== undefined) {
        state.balance.usd += action.payload.usd;
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

export const { setTransactions, addTransaction, setBalance, updateBalance, setLoading, setError } =
  walletSlice.actions;
export default walletSlice.reducer;
