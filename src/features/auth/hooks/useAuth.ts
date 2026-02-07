/**
 * useAuth Hook
 * Authentication logic hook
 */

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setToken, logout, setLoading, setError } from '@store/authSlice';
import { setUser, clearUser } from '@store/slices/userSlice';
import { apiClient, logger, keychainStorage } from '@core/services';
import { errorHandler } from '@core/errors';
import * as authApi from '../api/authApi';
import type { LoginCredentials, SignupData } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Login handler
   */
  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setIsSubmitting(true);
      dispatch(setLoading(true));
      dispatch(setError(null));

      logger.info('Attempting login', 'AUTH');
      const response = await authApi.login(credentials);

      // Set token
      dispatch(setToken(response.token));
      await keychainStorage.storeRefreshToken(response.refreshToken);
      if (__DEV__ && response.refreshToken) {
        const masked = `${response.refreshToken.slice(0, 6)}...${response.refreshToken.slice(-6)}`;
        console.log('🔑 [useAuth] Refresh Token:', masked);
        console.log('🔑 [useAuth] Refresh Token Length:', response.refreshToken.length);
      }

      // Set user
      dispatch(
        setUser({
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          coins: 0,
          gems: 0,
          level: 1,
          experience: 0,
          createdAt: new Date().toISOString(),
        })
      );

      // Configure API client with token
      apiClient.setAuthToken(response.token);

      logger.info('Login successful', 'AUTH');
    } catch (error) {
      const appError = errorHandler.handle(error);
      dispatch(setError(appError.userMessage));
      throw appError;
    } finally {
      setIsSubmitting(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Signup handler
   */
  const handleSignup = async (data: SignupData) => {
    try {
      setIsSubmitting(true);
      dispatch(setLoading(true));
      dispatch(setError(null));

      logger.info('Attempting signup', 'AUTH');
      const response = await authApi.signup(data);

      // Set token
      dispatch(setToken(response.token));
      await keychainStorage.storeRefreshToken(response.refreshToken);
      if (__DEV__ && response.refreshToken) {
        const masked = `${response.refreshToken.slice(0, 6)}...${response.refreshToken.slice(-6)}`;
        console.log('🔑 [useAuth] Refresh Token:', masked);
        console.log('🔑 [useAuth] Refresh Token Length:', response.refreshToken.length);
      }

      // Set user
      dispatch(
        setUser({
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          coins: 0,
          gems: 0,
          level: 1,
          experience: 0,
          createdAt: new Date().toISOString(),
        })
      );

      // Configure API client with token
      apiClient.setAuthToken(response.token);

      logger.info('Signup successful', 'AUTH');
    } catch (error) {
      const appError = errorHandler.handle(error);
      dispatch(setError(appError.userMessage));
      throw appError;
    } finally {
      setIsSubmitting(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Logout handler
   */
  const handleLogout = async () => {
    try {
      logger.info('Logging out', 'AUTH');
      await authApi.logout();
    } catch (error) {
      logger.warn('Logout API call failed', 'AUTH', error);
    } finally {
      // Clear auth state
      dispatch(logout());
      dispatch(clearUser());
      apiClient.setAuthToken(null);
      logger.info('Logout successful', 'AUTH');
    }
  };

  const {
    isAuthenticated,
    loading: authLoading,
    error: authError,
  } = useAppSelector(state => state.auth);
  const { profile: user } = useAppSelector(state => state.user);

  return {
    isAuthenticated,
    user,
    loading: authLoading || isSubmitting,
    error: authError,
    handleLogin,
    handleSignup,
    handleLogout,
  };
};
