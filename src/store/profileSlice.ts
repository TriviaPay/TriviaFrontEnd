/**
 * Profile Slice - Redux Toolkit
 * Professional profile state management with API integration
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../services/api/apiclient';
import { authService } from '../services/authService';
import { setUser } from './authSlice';
import { logger } from '../lib/utils/logger';

// Types
export interface ProfileAddress {
  street1: string;
  street2: string;
  aptNumber: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface Avatar {
  id: string;
  name: string;
  description?: string;
  is_premium: boolean;
  purchase_date?: string;
  url: string;
  mime_type: string;
}

export interface Frame {
  id: string;
  name: string;
  description?: string;
  is_premium: boolean;
  purchase_date?: string;
  url: string;
  mime_type: string;
}

export interface Badge {
  id: string;
  name: string;
  image_url: string;
}

export interface SubscriptionBadge {
  id: string;
  name: string;
  image_url: string;
  subscription_type: string;
  price: number;
}

export interface ProfileData {
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  account_id: number;
  account_number?: string;
  email: string;
  email_verified?: boolean;
  date_of_birth: string;
  gender: string;
  country_code?: string;
  mobile?: string;
  mobile_verified?: boolean;
  address?: {
    street_1: string;
    street_2: string;
    suite_or_apt_number: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  // Flat fields kept for backward compatibility if needed by UI
  address1?: string;
  address2?: string;
  apt_number?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  profile_pic_url: string | null;
  profile_pic_type: 'avatar' | 'custom' | null;
  avatar: Avatar | null;
  frame: Frame | null;
  badge?: Badge | null;
  badge_id?: string | null;
  badge_image_url?: string | null;
  subscription_badges?: SubscriptionBadge[];
  total_gems?: number;
  total_trivia_coins?: number;
  level?: number;
  level_progress?: string;
  rank?: number | string;
  recent_draw_earnings?: number;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  mobile?: string;
  country_code?: string;
  // Email is now read-only and NOT updated via this payload
  gender?: string;
  street_1?: string;
  street_2?: string;
  suite_or_apt_number?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  avatar_id?: string; // Avatar selection
  frame_id?: string; // Frame selection
}

interface ProfileState {
  profile: ProfileData | null;
  avatars: Avatar[];
  frames: Frame[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  lastFetched: number | null;
  cacheValid: boolean; // Whether cached data is still valid to show
}

const initialState: ProfileState = {
  profile: null,
  avatars: [],
  frames: [],
  isLoading: false,
  isUpdating: false,
  error: null,
  lastFetched: null,
  cacheValid: false,
};

// Cache TTL: 5 minutes (300000ms)
const CACHE_TTL = 5 * 60 * 1000;

// Request deduplication: Track in-flight requests to prevent duplicate calls
const inFlightRequests = new Map<string, Promise<any>>();

// Async Thunks
export const fetchProfileSummary = createAsyncThunk(
  'profile/fetchSummary',
  async (options?: { forceFresh?: boolean }, { getState, rejectWithValue }) => {
    try {
      // Get current auth state to verify user
      const rootState = getState() as any;
      const authState = rootState?.auth;
      const profileState = rootState?.profile;

      // Check cache validity - if we have valid cache and not forcing fresh, return cached data
      const now = Date.now();
      const hasValidCache =
        profileState?.profile &&
        profileState?.lastFetched &&
        now - profileState.lastFetched < CACHE_TTL;

      // If we have valid cache and not forcing fresh, skip the API call
      if (hasValidCache && !options?.forceFresh) {
        return profileState.profile;
      }

      // Check if there's already an in-flight request for this endpoint
      const requestKey = 'profile/summary';
      const existingRequest = inFlightRequests.get(requestKey);
      if (existingRequest && !options?.forceFresh) {
        // Return the existing promise instead of making a new request
        return existingRequest;
      }

      const currentToken = await authService.getAccessToken();
      const loggedInUserEmail = authState?.user?.email;

      if (!currentToken) {
        return rejectWithValue('No authentication token available');
      }

      // Quick async token validation (non-blocking)
      let tokenEmail: string | null = null;
      try {
        const tokenParts = currentToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          tokenEmail = payload.email || null;

          // Quick validation - only reject if clearly mismatched
          if (
            loggedInUserEmail &&
            tokenEmail &&
            loggedInUserEmail.toLowerCase() !== tokenEmail.toLowerCase()
          ) {
            logger.error('❌ [Profile] Token mismatch detected', 'PROFILE');
            await authService.logout();
            return rejectWithValue(
              `Token mismatch: logged in as ${loggedInUserEmail} but token belongs to ${tokenEmail}`
            );
          }
        }
      } catch (e) {
        // Continue even if token decode fails - let API handle auth
      }

      // Fetch profile data with cache-busting if forceFresh is true
      // Add timestamp query parameter as additional cache-busting mechanism
      const url = options?.forceFresh ? `/profile/complete?_t=${Date.now()}` : '/profile/complete';

      // Create the request promise and store it for deduplication
      const requestPromise = (async () => {
        try {
          const response = await apiClient.get(url, { forceFresh: options?.forceFresh || false });

          // Handle null response (404) gracefully
          if (!response || response === null) {
            // Profile not found (404) - return empty profile data instead of throwing
            logger.debug('Profile summary returned 404 - profile not found', 'PROFILE');
            return null as any; // Return null to indicate profile not found
          }

          // Handle response formats efficiently
          let profileData: ProfileData;
          if (
            response &&
            typeof response === 'object' &&
            'status' in response &&
            response.status === 'success' &&
            response.data
          ) {
            profileData = response.data;
          } else if (
            response &&
            typeof response === 'object' &&
            'username' in response &&
            response.username
          ) {
            profileData = response;
          } else {
            throw new Error('Invalid response format');
          }

          // Quick validation - reject if user mismatch
          const profileEmail = profileData.email;
          if (
            loggedInUserEmail &&
            profileEmail &&
            loggedInUserEmail.toLowerCase() !== profileEmail.toLowerCase()
          ) {
            await authService.logout();
            throw new Error(
              `Profile mismatch: logged in as ${loggedInUserEmail} but profile belongs to ${profileEmail}`
            );
          }

          // Store subscription_type in local storage for quick access
          const subscriptionType = (profileData as any)?.subscription_type;
          if (subscriptionType) {
            const { keychainStorage } = await import('../services/keychainStorage');
            keychainStorage.set('subscription_type', subscriptionType).catch(() => {
              // Ignore storage errors - non-critical
            });
          }

          return profileData;
        } finally {
          // Remove from in-flight requests when done
          inFlightRequests.delete(requestKey);
        }
      })();

      // Store the promise for deduplication (only if not forcing fresh)
      if (!options?.forceFresh) {
        inFlightRequests.set(requestKey, requestPromise);
      }

      return await requestPromise;
    } catch (error: any) {
      // Suppress "No authentication token available" errors - expected when not logged in
      const errorMessage = error?.message || String(error);
      if (
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token')
      ) {
        // Silent - expected when user is not authenticated
        return rejectWithValue(errorMessage);
      }
      // Only log critical errors in production
      if (__DEV__) {
        logger.error('❌ [Profile] Error fetching profile summary:', 'PROFILE', error);
      }
      return rejectWithValue(errorMessage || 'Failed to fetch profile');
    }
  }
);

// Request deduplication for avatars
const avatarsInFlight = new Map<string, Promise<any>>();

export const fetchOwnedAvatars = createAsyncThunk(
  'profile/fetchOwnedAvatars',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if there's already an in-flight request
      const requestKey = 'avatars/owned';
      const existingRequest = avatarsInFlight.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // Create the request promise
      const requestPromise = (async () => {
        try {
          const response = await apiClient.get('/cosmetics/avatars/owned');
          // Handle null response (404) or array response
          if (response === null) {
            return []; // 404 - return empty array
          }
          const avatars = Array.isArray(response) ? response : response?.data || [];
          return avatars as Avatar[];
        } finally {
          // Remove from in-flight requests when done
          avatarsInFlight.delete(requestKey);
        }
      })();

      // Store the promise for deduplication
      avatarsInFlight.set(requestKey, requestPromise);

      return await requestPromise;
    } catch (error: any) {
      // Handle any other errors gracefully - return empty array, don't reject
      // Professional apps don't break user experience on optional endpoints
      if (__DEV__) {
        logger.warn(
          '⚠️ [Profile] Error fetching owned avatars (non-critical):',
          'PROFILE',
          error.message
        );
      }
      avatarsInFlight.delete('avatars/owned');
      return []; // Return empty array for any error - don't break profile loading
    }
  }
);

// Request deduplication for frames
const framesInFlight = new Map<string, Promise<any>>();

export const fetchOwnedFrames = createAsyncThunk(
  'profile/fetchOwnedFrames',
  async (_, { rejectWithValue }) => {
    try {
      // frames/owned endpoint removed - return empty array
      return [];
    } catch (error: any) {
      return []; // Return empty array for any error
    }
  }
);

export const updateProfileExtended = createAsyncThunk(
  'profile/updateExtended',
  async (payload: ProfileUpdatePayload, { rejectWithValue, dispatch, getState }) => {
    try {
      // ========== PAYLOAD BEING SENT TO REDUX THUNK ==========

      logger.log(
        '   - Has address fields:',
        'PROFILE',
        !!(payload.street_1 || payload.city || payload.state)
      );

      // Log payload before API call
      console.log('[PAYLOAD]', JSON.stringify(payload, null, 2));

      const response = await apiClient.post('/profile/extended-update', payload);

      // ========== RESPONSE RECEIVED FROM API ==========

      if (response?.data) {
      }
      logger.log('   - Response Keys:', 'PROFILE', response ? Object.keys(response) : []);

      // Check if response contains frame data (backend might return updated profile)
      const responseFrame = response?.frame || response?.data?.frame;
      const responseFrameId = responseFrame?.id;
      const expectedFrameId = payload.frame_id;

      logger.log(
        '   - Frame Match:',
        'PROFILE',
        expectedFrameId && responseFrameId
          ? expectedFrameId.toLowerCase() === responseFrameId.toLowerCase()
            ? '✅ MATCH'
            : '❌ MISMATCH'
          : 'CANNOT COMPARE'
      );
      if (responseFrame) {
      }
      logger.log('   - Full Response Keys:', 'PROFILE', response ? Object.keys(response) : []);

      // Email update sync removed - email is read-only

      return response;
    } catch (error: any) {
      logger.error('❌ [ProfileSlice] Error updating profile:', 'PROFILE', {
        message: error?.message,
        response: error?.response
          ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data ? JSON.stringify(error.response.data, null, 2) : null,
          }
          : null,
        fullError: error ? JSON.stringify(error, null, 2) : null,
      });
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

// Profile Slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile: state => {
      state.profile = null;
      state.avatars = [];
      state.frames = [];
      state.error = null;
      state.lastFetched = null;
      state.cacheValid = false;
    },
    clearError: state => {
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<ProfileData>) => {
      state.profile = action.payload;
    },
    updateProfileLocal: (state, action: PayloadAction<Partial<ProfileData>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchProfileSummary.pending, state => {
        // Don't set loading to true if we have cached data - allow stale-while-revalidate
        if (!state.profile) {
          state.isLoading = true;
        }
        state.error = null;
        state.cacheValid = true; // Mark cache as valid during fetch
      })
      .addCase(fetchProfileSummary.fulfilled, (state, action) => {
        state.isLoading = false;

        // Check if this is a different user's profile
        if (state.profile && state.profile.email !== action.payload.email) {
          state.profile = null;
          state.avatars = [];
          state.frames = [];
        }

        state.profile = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
        state.cacheValid = true;
      })
      .addCase(fetchProfileSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch profile';

        // If rejected due to user mismatch, clear existing profile
        const errorMessage = (action.payload as string) || '';
        if (errorMessage.includes('mismatch') || errorMessage.includes('different user')) {
          logger.warn('⚠️ [Profile] User mismatch detected - clearing profile state', 'PROFILE');
          state.profile = null;
          state.avatars = [];
          state.frames = [];
        }
      })

      // Fetch Owned Avatars (non-critical - errors won't break profile)
      .addCase(fetchOwnedAvatars.pending, state => {
        // Don't clear error - avatars are optional
      })
      .addCase(fetchOwnedAvatars.fulfilled, (state, action) => {
        state.avatars = action.payload || [];
        // Don't set error on failure - avatars are optional
      })
      .addCase(fetchOwnedAvatars.rejected, state => {
        // Set to empty array if rejected (shouldn't happen now, but handle gracefully)
        state.avatars = [];
        // Don't set state.error - avatars are optional, don't break profile
      })

      // Fetch Owned Frames (non-critical - errors won't break profile)
      .addCase(fetchOwnedFrames.pending, state => {
        // Don't clear error - frames are optional
      })
      .addCase(fetchOwnedFrames.fulfilled, (state, action) => {
        state.frames = action.payload || [];
        // Don't set error on failure - frames are optional
      })
      .addCase(fetchOwnedFrames.rejected, state => {
        // Set to empty array if rejected (shouldn't happen now, but handle gracefully)
        state.frames = [];
        // Don't set state.error - frames are optional, don't break profile
      })

      // Update Profile Extended
      .addCase(updateProfileExtended.pending, state => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateProfileExtended.fulfilled, state => {
        state.isUpdating = false;
        state.error = null;
        // Refetch profile after update
        state.lastFetched = null;
      })
      .addCase(updateProfileExtended.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProfile, clearError, setProfile, updateProfileLocal } = profileSlice.actions;
export default profileSlice.reducer;
