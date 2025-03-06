import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { signupUser, verifyEmailCode, logoutWithAuth0, getUserInfo } from '../services/auth';
import EncryptedStorage from 'react-native-encrypted-storage';

const initialState = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  emailVerificationSent: false,
};

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const { accessToken, idToken } = await verifyEmailCode(email, code);
      const user = await getUserInfo(accessToken);
      await EncryptedStorage.setItem('auth_tokens', JSON.stringify({ accessToken, idToken }));
      return { user, accessToken };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendVerificationEmail = createAsyncThunk(
  'auth/sendVerificationEmail',
  async (email, { rejectWithValue }) => {
    try {
      await signupUser(email);
      return email;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const session = await EncryptedStorage.getItem('auth_tokens');
      if (session) {
        const { accessToken } = JSON.parse(session);
        const user = await getUserInfo(accessToken);
        return { user, accessToken };
      }
      return null;
    } catch (error) {
      await EncryptedStorage.removeItem('auth_tokens');
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await logoutWithAuth0();
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setEmailVerificationSent: (state, action) => {
      state.emailVerificationSent = action.payload;
    },
    resetAuthState: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.emailVerificationSent = false;
      state.error = null;
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendVerificationEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emailVerificationSent = true;
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        }
      })
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.emailVerificationSent = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { setEmailVerificationSent, resetAuthState } = authSlice.actions;
export default authSlice.reducer;