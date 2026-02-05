/**
 * Authentication Thunks - Additional Async Actions
 * Extended authentication operations for Redux Toolkit
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';

export const loginWithPassword = createAsyncThunk(
  'auth/loginWithPassword',
  async ({ identifier, password }: { identifier: string; password: string }) => {
    const result = await authService.loginWithPassword(identifier, password);
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    return result;
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const newToken = await authService.refreshAccessToken();
      if (!newToken) {
        throw new Error('Token refresh failed');
      }
      return { token: newToken, timestamp: Date.now() };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

export const checkSessionValidity = createAsyncThunk(
  'auth/checkSessionValidity',
  async (_, { getState, dispatch }) => {
    try {
      const state: any = getState();
      const { token, lastTokenRefresh } = state.auth;

      if (!token) {
        return { isValid: false, shouldRefresh: false };
      }

      const TOKEN_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour
      const isExpired = lastTokenRefresh && Date.now() - lastTokenRefresh > TOKEN_EXPIRY_TIME;

      if (isExpired) {
        try {
          await dispatch(refreshToken());
          return { isValid: true, shouldRefresh: true };
        } catch (error) {
          return { isValid: false, shouldRefresh: false };
        }
      }

      return { isValid: true, shouldRefresh: false };
    } catch (error) {
      return { isValid: false, shouldRefresh: false };
    }
  }
);

export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsernameAvailability',
  async (username: string) => {
    const response = await fetch(
      `https://trivia-back-end.vercel.app/username-available?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: { accept: 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error('Username check failed');
    }

    return response.json();
  }
);
