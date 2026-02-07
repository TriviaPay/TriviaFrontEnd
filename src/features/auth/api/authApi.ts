/**
 * Auth API
 * All authentication-related API calls
 * Following Single Responsibility Principle
 */

import { apiClient } from '@core/services';
import { ApiResponse } from '@core/types';
import type { LoginCredentials, SignupData, AuthResponse } from '../types';

/**
 * Login user
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Login failed');
  }

  return response.data;
};

/**
 * Signup user
 */
export const signup = async (data: SignupData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/signup', data);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Signup failed');
  }

  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

/**
 * Refresh token
 */
export const refreshToken = async (token: string): Promise<{ token: string }> => {
  const response = await apiClient.post<{ token: string }>('/auth/refresh', {
    refreshToken: token,
  });

  if (!response.success || !response.data) {
    throw new Error('Token refresh failed');
  }

  return response.data;
};

/**
 * Verify email
 */
export const verifyEmail = async (code: string): Promise<void> => {
  await apiClient.post('/auth/verify-email', { code });
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  await apiClient.post('/auth/forgot-password', { email });
};

/**
 * Reset password
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await apiClient.post('/auth/reset-password', { token, newPassword });
};
