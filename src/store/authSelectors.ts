/**
 * Auth Selectors - Redux selectors for authentication state
 * Provides type-safe access to authentication state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';

// Base selector for auth slice
export const selectAuth = (state: RootState) => state.auth;

// Selector for full auth state (matches getGlobalAuthState structure)
export const selectAuthState = (state: RootState) => {
  const auth = state.auth;
  return {
    token: auth.token || null,
    user: auth.user || null,
    isAuthenticated: auth.isAuthenticated || false,
    isLoading: auth.isLoading || false,
    error: auth.error || null,
    lastCheck: auth.lastTokenRefresh || Date.now(), // Use lastTokenRefresh as lastCheck
  };
};

// Selector for current user
export const selectUser = createSelector([selectAuth], auth => auth.user);

// Selector for authentication status
export const selectIsAuthenticated = createSelector(
  [selectAuth],
  auth => auth.isAuthenticated || false
);

// Selector for access token
export const selectToken = createSelector([selectAuth], auth => auth.token || null);

// Selector for loading state
export const selectAuthLoading = createSelector([selectAuth], auth => auth.isLoading || false);

// Selector for error state
export const selectAuthError = createSelector([selectAuth], auth => auth.error || null);
