import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { logger } from '../lib/utils/logger';

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
}

interface UsernameCheck {
  loading: boolean;
  available: boolean | null;
  message: string;
  error: string | null;
}

interface ReferralCheck {
  loading: boolean;
  valid: boolean | null;
  message: string;
  error: string | null;
}

interface ProfileUpdate {
  loading: boolean;
  success: boolean;
  error: string | null;
  data: any;
}

interface CountryState {
  list: Country[];
  loading: boolean;
  error: string | null;
  usernameCheck: UsernameCheck;
  referralCheck: ReferralCheck;
  profileUpdate: ProfileUpdate;
  username: string;
}

interface RootState {
  auth: {
    accessToken: string;
  };
}

// countries list
export const fetchCountries = createAsyncThunk(
  'countries/fetchCountries',
  async (_, { rejectWithValue }) => {
    try {
      const { apiService } = require('../services/apiService');
      const response = await apiService.getCountries();

      if (response.success && response.data) {
        return response.data.countries;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch countries');
      }
    } catch (error: any) {
      logger.error('[fetchCountries] Error:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch countries');
    }
  }
);

// username availability
export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsername',
  async (username: string, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as RootState;
      logger.log('[checkUsernameAvailability] Checking:', 'STORE', username);
      // Prepare headers with real authentication
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (auth.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      const response = await axios.post(
        'http://192.168.0.116:8000/profile/check-username?check_expiration=true&require_email=true',
        { username },
        { headers }
      );
      logger.log('[checkUsernameAvailability] Result:', 'STORE', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('[checkUsernameAvailability] Error:', 'STORE', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to check username');
    }
  }
);

// validate referral code
export const validateReferralCode = createAsyncThunk(
  'auth/validateReferral',
  async (referralCode: string, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as RootState;
      logger.log('[validateReferralCode] Validating:', 'STORE', referralCode);
      // Prepare headers with real authentication
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (auth.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      const response = await axios.post(
        'http://192.168.0.116:8000/profile/validate-referral?check_expiration=true&require_email=true',
        { referral_code: referralCode },
        { headers }
      );
      logger.log('[validateReferralCode] Response:', 'STORE', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('[validateReferralCode] Error:', 'STORE', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to validate referral code');
    }
  }
);

// update user profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: any, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as RootState;

      // Prepare headers with real authentication
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (auth.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      const response = await axios.post(
        'http://192.168.0.116:8000/profile/perform-update?check_expiration=true&require_email=true',
        profileData,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error('[updateProfile] Error:', 'STORE', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

const countrySlice = createSlice({
  name: 'countries',
  initialState: {
    list: [],
    loading: false,
    error: null,
    usernameCheck: { loading: false, available: null, message: '', error: null },
    referralCheck: { loading: false, valid: null, message: '', error: null },
    profileUpdate: { loading: false, success: false, error: null, data: null },
    username: '',
  } as CountryState,
  reducers: {
    resetUsernameCheck(state) {
      logger.log('[Reducer] resetUsernameCheck', 'STORE');
      state.usernameCheck = { loading: false, available: null, message: '', error: null };
    },
    resetReferralCheck(state) {
      logger.log('[Reducer] resetReferralCheck', 'STORE');
      state.referralCheck = { loading: false, valid: null, message: '', error: null };
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCountries.pending, state => {
        logger.log('[Reducer] fetchCountries.pending', 'STORE');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        logger.log('[Reducer] fetchCountries.fulfilled', 'STORE', action.payload);
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        logger.error('[Reducer] fetchCountries.rejected', 'STORE', action.payload);
        state.loading = false;
        state.error = (action.payload as string) || action.error.message;
      })

      .addCase(checkUsernameAvailability.pending, state => {
        state.usernameCheck.loading = true;
        state.usernameCheck.error = null;
      })
      .addCase(checkUsernameAvailability.fulfilled, (state, action) => {
        logger.log('[Reducer] checkUsernameAvailability.fulfilled', 'STORE', action.payload);
        state.usernameCheck.loading = false;
        state.usernameCheck.available = action.payload.available;
        state.usernameCheck.message = action.payload.message;
      })
      .addCase(checkUsernameAvailability.rejected, (state, action) => {
        logger.error('[Reducer] checkUsernameAvailability.rejected', 'STORE', action.payload);
        state.usernameCheck.loading = false;
        state.usernameCheck.error = (action.payload as string) || action.error.message;
      })

      .addCase(validateReferralCode.pending, state => {
        state.referralCheck.loading = true;
        state.referralCheck.error = null;
      })
      .addCase(validateReferralCode.fulfilled, (state, action) => {
        logger.log('[Reducer] validateReferralCode.fulfilled', 'STORE', action.payload);
        state.referralCheck.loading = false;
        state.referralCheck.valid = action.payload.valid;
        state.referralCheck.message = action.payload.message;
      })
      .addCase(validateReferralCode.rejected, (state, action) => {
        logger.error('[Reducer] validateReferralCode.rejected', 'STORE', action.payload);
        state.referralCheck.loading = false;
        state.referralCheck.error = (action.payload as string) || action.error.message;
      })

      .addCase(updateProfile.pending, state => {
        state.profileUpdate.loading = true;
        state.profileUpdate.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        logger.log('[Reducer] updateProfile.fulfilled', 'STORE', action.payload);
        state.profileUpdate.loading = false;
        state.profileUpdate.success = action.payload.status === 'success';
        state.profileUpdate.data = action.payload.data;
        state.username = action.payload.data.username;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        logger.error('[Reducer] updateProfile.rejected', 'STORE', action.payload);
        state.profileUpdate.loading = false;
        state.profileUpdate.error = (action.payload as string) || action.error.message;
      });
  },
});

export const { resetUsernameCheck, resetReferralCheck } = countrySlice.actions;
export default countrySlice.reducer;
