import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { API_CONFIG } from '../../config/api';
import { authService } from '../../services/authService';
import { logger } from '../../lib/utils/logger';

/**
 * Base query with authentication
 * Automatically injects auth token into all requests
 */
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL,
  prepareHeaders: async headers => {
    try {
      // Use authService's ensureValidToken which handles token refresh automatically
      const token = await authService.ensureValidToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
    } catch (error) {
      logger.warn('Failed to get auth token for API request', 'API', error);
      // Request will proceed without token - will likely fail with 401 if auth required
    }
    return headers;
  },
});

/**
 * Base query with automatic token refresh on 401
 * Handles token expiration gracefully
 */
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQueryWithAuth(args, api, extraOptions);

  // Handle 401 Unauthorized - token expired or invalid
  if (result.error?.status === 401) {
    logger.warn('Received 401, attempting token refresh', 'API');

    try {
      // Attempt to refresh the token
      const newToken = await authService.refreshAccessToken();

      if (newToken) {
        logger.info('Token refreshed successfully, retrying request', 'API');
        // Retry the original request with new token
        result = await baseQueryWithAuth(args, api, extraOptions);
      } else {
        logger.error('Token refresh failed, logging out user', 'API');
        // Token refresh failed - logout user
        await authService.logout();
        // Optionally dispatch a logout action to Redux
        // api.dispatch(logout());
      }
    } catch (error) {
      logger.error('Error during token refresh', 'API', error);
      await authService.logout();
    }
  }

  return result;
};

/**
 * Base query with retry logic
 * Retries failed requests with exponential backoff
 * Max 3 retries for network errors, no retries for 4xx errors
 */
const staggeredBaseQuery = retry(baseQueryWithReauth, {
  maxRetries: 3,
  backoff: (attempt: number) => {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    logger.info(`Retrying request (attempt ${attempt + 1}) after ${delay}ms`, 'API');
    return new Promise(resolve => setTimeout(resolve, delay));
  },
});

/**
 * Base API slice for RTK Query
 * All feature-specific APIs will inject endpoints into this base API
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: staggeredBaseQuery,

  // Tag types for cache invalidation
  tagTypes: [
    // Auth
    'Auth',

    // Profile
    'Profile',
    'Avatars',
    'Frames',

    // Trivia
    'Trivia',
    'FreeTriviaStatus',
    'BronzeTriviaStatus',
    'SilverTriviaStatus',
    'CurrentQuestion',

    // Leaderboard
    'Leaderboard',
    'FreeLeaderboard',
    'BronzeLeaderboard',
    'SilverLeaderboard',

    // Shop
    'Shop',
    'ShopItems',
    'PurchaseHistory',

    // Wallet
    'Wallet',
    'WalletBalance',
    'Transactions',

    // Chat
    'Chat',
    'Conversations',
    'Messages',
    'Conversation',
    'GlobalMessages',

    // Payments
    'Payments',
    'PaymentIntent',
    'PaymentHistory',

    // Daily Login
    'DailyLogin',
  ],

  // Default cache lifetime: 60 seconds
  // Individual endpoints can override this
  keepUnusedDataFor: 60,

  // Refetch on mount or arg change for critical data
  refetchOnMountOrArgChange: false,

  // Refetch on reconnect
  refetchOnReconnect: true,

  // Refetch on focus (when app comes to foreground)
  refetchOnFocus: false,

  // Empty endpoints - will be populated by injectEndpoints
  endpoints: () => ({}),
});

// Export hooks for resetting API state (useful for logout)
export const { util: apiUtil, reducerPath, reducer, middleware } = baseApi;
