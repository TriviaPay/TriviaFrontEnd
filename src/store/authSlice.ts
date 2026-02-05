import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { keychainStorage } from '../services/keychainStorage';
import { initPusher } from '../pusherClient';
import { logger } from '../lib/utils/logger';

// Using keychain storage only - no MMKV or AsyncStorage

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  picture?: string;
  country?: string;
  date_of_birth?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  isInitialized: boolean;
  lastTokenRefresh: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  isInitialized: true, // CRITICAL: Start as true to allow immediate navigation
  lastTokenRefresh: null,
};

// Authentication Thunks - Professional Redux Toolkit implementation
// Global authentication state
let globalAuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  lastCheck: null,
};

export const loadStoredAuth = createAsyncThunk('auth/loadStoredAuth', async () => {
  try {
    const storedUser = await keychainStorage.getUserData();
    const storedToken = await keychainStorage.getAccessToken();
    const authState = await keychainStorage.getAuthState();

    // Parse user data to get token if it's stored in user data
    let userToken = null;
    if (storedUser && typeof storedUser === 'string') {
      try {
        const parsedUser = JSON.parse(storedUser);
        userToken = parsedUser.token;
      } catch (e) {}
    } else if (storedUser && storedUser.token) {
      userToken = storedUser.token;
    }

    // Always prefer token from user data (most reliable)
    let finalToken = userToken || storedToken;

    // Validate that we have a proper JWT token (not Redux persist data)
    if (
      finalToken &&
      (finalToken.includes('_persist') || finalToken.includes('version') || finalToken.length < 100)
    ) {
      logger.warn('Invalid token detected (Redux persist data), using user token only', 'AUTH');
      finalToken = userToken;
    }

    // Only consider user authenticated if we have BOTH user data AND a valid token
    // Check token validity without relying on authService (which might not be ready)
    const isTokenValid = finalToken && finalToken.length > 100 && !finalToken.includes('_persist');

    // Basic JWT expiry check without authService dependency
    let isTokenExpired = true;
    if (finalToken && isTokenValid) {
      try {
        const parts = finalToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const exp = payload.exp;
          if (exp && typeof exp === 'number') {
            const now = Math.floor(Date.now() / 1000);
            isTokenExpired = now >= exp;
            if (__DEV__) {
            }
          }
        }
      } catch (error) {
        logger.error('Error checking token expiry', 'AUTH', error);
        isTokenExpired = true;
      }
    }

    if (storedUser && isTokenValid && !isTokenExpired) {
      // Store the token separately in keychain if it's from user data
      if (userToken && !storedToken) {
        try {
          await keychainStorage.storeAccessToken(finalToken);
        } catch (error) {
          logger.warn('Failed to store token separately', 'AUTH', error);
        }
      }

      // Store authentication state for persistence
      try {
        await keychainStorage.storeAuthState({
          isAuthenticated: true,
          user: storedUser,
          token: finalToken,
          lastCheck: Date.now(),
        });
      } catch (error) {
        logger.error('Failed to store auth state', 'AUTH', error);
      }

      globalAuthState = {
        isAuthenticated: true,
        user: storedUser,
        token: finalToken,
        lastCheck: Date.now(),
      };
      return {
        user: storedUser,
        token: finalToken,
        isAuthenticated: true,
      };
    } else {
      // Log the reason for not being authenticated

      globalAuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        lastCheck: Date.now(),
      };
      return { user: null, token: null, isAuthenticated: false };
    }
  } catch (error) {
    logger.error('Error loading stored auth', 'AUTH', error);
    return { user: null, token: null, isAuthenticated: false };
  }
});

export const initializeAuth = createAsyncThunk('auth/initializeAuth', async () => {
  try {
    // Use the enhanced authService initialization
    const authStatus = await authService.initializeAuth();

    if (authStatus.isAuthenticated && authStatus.user) {
      const token = authService.getAccessToken();
      return {
        user: authStatus.user,
        token,
        isAuthenticated: true,
      };
    }

    // If not authenticated, return false
    return { user: null, token: null, isAuthenticated: false };
  } catch (error) {
    logger.error('Auth initialization error', 'AUTH', error);
    // Return false on error to ensure app doesn't get stuck
    return { user: null, token: null, isAuthenticated: false };
  }
});

export const sendOTPVerification = createAsyncThunk(
  'auth/sendOTPVerification',
  async (email: string) => {
    const result = await authService.sendOTP(email);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP');
    }
    return result;
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ email, code }: { email: string; code: string }) => {
    // Uses descope.otp.verify() - React Native SDK method
    // Returns sessionJwt and refreshJwt
    const result = await authService.verifyOTP(email, code);
    if (!result.success) {
      throw new Error(result.error || 'Invalid verification code');
    }
    return result;
  }
);

export const loginWithPassword = createAsyncThunk(
  'auth/loginWithPassword',
  async ({
    identifier,
    password,
    descopeInstance,
  }: {
    identifier: string;
    password: string;
    descopeInstance?: any;
  }) => {
    // Set Descope instance in authService if provided
    if (descopeInstance) {
      authService.setDescopeInstance(descopeInstance);
    }

    // Uses descope.password.signIn() - React Native SDK method
    const result = await authService.loginWithPassword(identifier, password);
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    return result;
  }
);

export const createUserWithPassword = createAsyncThunk(
  'auth/createUserWithPassword',
  async ({ email, password, userData }: { email: string; password: string; userData?: any }) => {
    // Legacy method - keeping for compatibility
    return { success: true };
  }
);

// Async thunks for API calls
export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsernameAvailability',
  async (username: string) => {
    const response = await fetch(
      `https://trivia-back-end.vercel.app/username-available?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Username check failed');
    }

    return response.json();
  }
);

export const bindPassword = createAsyncThunk(
  'auth/bindPassword',
  async (
    userData: {
      email: string;
      password: string;
      username: string;
      country: string;
      date_of_birth: string;
      referral_code?: string | null;
    },
    thunkAPI
  ) => {
    try {
      // Get session token from keychain storage
      const { keychainStorage } = await import('../services/keychainStorage');
      const sessionToken: string | null = await keychainStorage.getAccessToken();

      if (!sessionToken) {
        logger.error('No session token available for bindPassword API call', 'AUTH');
        throw new Error('No session token available. Please verify your email first.');
      }

      logger.log('REDUX THUNK PAYLOAD', 'AUTH', {
        email: userData.email,
        password: userData.password ? '[REDACTED]' : 'MISSING',
        username: userData.username,
        country: userData.country,
        dateOfBirth: userData.date_of_birth,
        referral_code: userData.referral_code || null,
      });

      // Use apiService for consistent error handling
      const { apiService } = await import('../services/apiService');
      const result = await apiService.bindPassword({
        email: userData.email,
        password: userData.password,
        username: userData.username.trim(), // Trim spaces from username
        country: userData.country,
        dateOfBirth: userData.date_of_birth,
        referral_code: userData.referral_code || null,
      });

      logger.log('REDUX THUNK RESPONSE', 'AUTH', result);

      if (!result.success) {
        logger.error('apiService.bindPassword failed', 'AUTH', result.error);
        throw new Error(result.error || 'Password binding failed');
      }

      return result.data;
    } catch (error) {
      logger.error('bindPassword thunk error', 'AUTH', error);
      throw error;
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }) => {
    // Uses descope.password.signIn() - React Native SDK method
    const result = await authService.loginWithPassword(credentials.email, credentials.password);

    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    return result;
  }
);

// Token management thunks
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Allow retry on transient errors - don't logout immediately
      const newToken = await authService.refreshAccessToken(true); // force refresh

      if (!newToken) {
        // Only throw error - don't logout here, let the caller decide
        return rejectWithValue('Token refresh failed - will retry');
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

      // Check if token is expired (assuming 1 hour expiry)
      const TOKEN_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
      const isExpired = lastTokenRefresh && Date.now() - lastTokenRefresh > TOKEN_EXPIRY_TIME;

      if (isExpired) {
        try {
          const refreshResult = await dispatch(refreshToken());
          // Check if refresh was successful
          if (refreshToken.fulfilled.match(refreshResult)) {
            return { isValid: true, shouldRefresh: true };
          } else {
            // Refresh was rejected - check if it's a permanent failure
            const errorMsg = (refreshResult as any).error?.message || '';
            if (
              errorMsg.includes('Refresh token expired') ||
              errorMsg.includes('Invalid refresh token') ||
              errorMsg.includes('Refresh token not found')
            ) {
              return { isValid: false, shouldRefresh: false };
            } else {
              // Transient error - keep user logged in

              return { isValid: true, shouldRefresh: true }; // Allow retry
            }
          }
        } catch (error) {
          // Network or other transient error - don't logout
          logger.warn('Token refresh error (transient) - keeping user logged in', 'AUTH');
          return { isValid: true, shouldRefresh: true }; // Keep valid, will retry
        }
      }

      return { isValid: true, shouldRefresh: false };
    } catch (error) {
      // Session validation error - don't logout on transient errors
      logger.warn('Session validation error (transient) - keeping user logged in', 'AUTH');
      return { isValid: true, shouldRefresh: false }; // Keep valid, might be network issue
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: state => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.error = null;
      state.isInitialized = true;
      state.lastTokenRefresh = null;
      // Clear stored data
      keychainStorage.clearAll();
    },
    clearError: state => {
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      // Don't block on keychain storage - do it async in background
      keychainStorage.storeUserData(action.payload).catch(err => {
        logger.warn('Background user data storage warning', 'AUTH', err);
      });
      // Update global auth state
      globalAuthState = {
        ...globalAuthState,
        user: action.payload,
        isAuthenticated: true,
      };
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.lastTokenRefresh = Date.now();
      // Don't block on keychain storage - do it async in background
      keychainStorage.storeAccessToken(action.payload).catch(err => {
        logger.warn('Background token storage warning', 'AUTH_TOKEN', err);
      });
      // Update global auth state
      globalAuthState = {
        ...globalAuthState,
        token: action.payload,
      };
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    resetAuth: state => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isInitialized = true; // Keep initialized so Welcome screen can show after logout
      state.user = null;
      state.token = null;
      state.error = null;
      state.lastTokenRefresh = null;
      // Clear all stored data
      keychainStorage.clearAll();
    },
    clearStorage: () => {
      // Clear all stored data without changing state
      keychainStorage.clearAll();
    },
  },
  extraReducers: builder => {
    builder
      // Load Stored Auth
      .addCase(loadStoredAuth.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;

        if (action.payload.isAuthenticated) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          state.lastTokenRefresh = Date.now();

          // Update global auth state
          globalAuthState = {
            isAuthenticated: true,
            user: action.payload.user,
            token: action.payload.token,
            lastCheck: Date.now(),
          };

          // Token refresh timer is managed by authService singleton
          // No need to call initializeAuth here - it's already handled in App.tsx
          // This prevents multiple timer instances
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;

          // Reset global auth state
          globalAuthState = {
            isAuthenticated: false,
            user: null,
            token: null,
            lastCheck: Date.now(),
          };
        }
      })
      .addCase(loadStoredAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.error.message || 'Failed to load stored auth';
      })
      // Initialize Auth
      .addCase(initializeAuth.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload.isAuthenticated) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          state.lastTokenRefresh = Date.now();

          // Update global auth state
          globalAuthState = {
            isAuthenticated: true,
            user: action.payload.user,
            token: action.payload.token,
            lastCheck: Date.now(),
          };

          // Token refresh timer is started by authService.initializeAuth()
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;

          // Reset global auth state
          globalAuthState = {
            isAuthenticated: false,
            user: null,
            token: null,
            lastCheck: Date.now(),
          };
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.error.message || 'Failed to initialize authentication';
      })
      // Send OTP Verification
      .addCase(sendOTPVerification.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOTPVerification.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(sendOTPVerification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to send OTP';
      })
      // Verify OTP
      .addCase(verifyOTP.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        // Store token from React Native SDK response but DON'T set as authenticated yet
        if (action.payload.token) {
          state.token = action.payload.token;
          // DO NOT set isAuthenticated = true here - user still needs to set password
          keychainStorage.storeAccessToken(action.payload.token);

          // DO NOT initialize background refresh yet - wait for password setup
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Invalid verification code';
      })
      // Login with Password
      .addCase(loginWithPassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.user && action.payload.token) {
          const newUserEmail = action.payload.user.email || '';
          const oldUserEmail = state.user?.email || '';

          // Check if this is a different user logging in
          if (oldUserEmail && oldUserEmail.toLowerCase() !== newUserEmail.toLowerCase()) {
            // Profile will be cleared via logoutActions when dispatch happens
          }

          state.user = {
            id: action.payload.user.id || '',
            email: action.payload.user.email || '',
            username: action.payload.user.username || '',
            country: action.payload.user.country || '',
            date_of_birth: action.payload.user.date_of_birth || '',
          };
          state.token = action.payload.token || '';
          state.isAuthenticated = true;
          state.lastTokenRefresh = Date.now();

          // Store user data and tokens securely in keychain
          keychainStorage.storeUserData(state.user);
          keychainStorage.storeAccessToken(state.token);

          // Store refresh token if provided
          if (action.payload.refreshToken) {
            keychainStorage.storeRefreshToken(action.payload.refreshToken);
          }

          // Store authentication state for persistence
          keychainStorage.storeAuthState({
            isAuthenticated: true,
            user: state.user,
            token: state.token,
            lastCheck: Date.now(),
          });

          // Update global auth state
          globalAuthState = {
            isAuthenticated: true,
            user: state.user,
            token: state.token,
            lastCheck: Date.now(),
          };

          // Token refresh timer is managed by authService singleton
          // No need to call initializeAuth here - it's already handled in App.tsx
          // This prevents multiple timer instances

          // Initialize Pusher after successful login
          initPusher(state.token).catch(error => {
            logger.error('Failed to initialize Pusher', 'PUSHER', error);
          });
        }
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Create User with Password
      .addCase(createUserWithPassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUserWithPassword.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(createUserWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create user';
      })
      // Check username availability
      .addCase(checkUsernameAvailability.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkUsernameAvailability.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(checkUsernameAvailability.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Username check failed';
      })
      // Bind password
      .addCase(bindPassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bindPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        // Load user data from storage that was set by SignupScreen
        // Note: This will be handled by the async storage wrapper in the actual implementation
        state.isAuthenticated = true;
        // Mark user as fully authenticated in storage
        keychainStorage.storeAuthState({ isAuthenticated: true });
      })
      .addCase(bindPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Password binding failed';
        state.isAuthenticated = false;
        logger.error('Password binding failed', 'AUTH', action.error.message);
      })
      // Login user (legacy)
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.user && action.payload.token) {
          state.user = {
            id: action.payload.user.id || '',
            email: action.payload.user.email || '',
            username: action.payload.user.username || '',
            country: action.payload.user.country || '',
            date_of_birth: action.payload.user.date_of_birth || '',
          };
          state.token = action.payload.token || '';
          state.isAuthenticated = true;
          state.lastTokenRefresh = Date.now();

          // Log tokens during login
          logger.log('[Redux Login] Access Token received', 'AUTH_TOKEN', {
            tokenLength: action.payload.token?.length,
          });
          if (action.payload.refreshToken) {
            logger.log('[Redux Login] Refresh Token received', 'AUTH_TOKEN', {
              tokenLength: action.payload.refreshToken.length,
            });
          }

          // Store user data and tokens securely in keychain
          keychainStorage.storeUserData(state.user);
          keychainStorage.storeAccessToken(state.token);

          // Store refresh token if provided
          if (action.payload.refreshToken) {
            keychainStorage.storeRefreshToken(action.payload.refreshToken);
          }

          // Store authentication state for persistence
          keychainStorage.storeAuthState({
            isAuthenticated: true,
            user: state.user,
            token: state.token,
            lastCheck: Date.now(),
          });

          // Update global auth state
          globalAuthState = {
            isAuthenticated: true,
            user: state.user,
            token: state.token,
            lastCheck: Date.now(),
          };

          // Token refresh timer is managed by authService singleton
          // No need to call initializeAuth here - it's already handled in App.tsx
          // This prevents multiple timer instances

          // Initialize Pusher after successful login
          initPusher(state.token).catch(error => {
            logger.error('Failed to initialize Pusher', 'PUSHER', error);
          });
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Refresh Token
      .addCase(refreshToken.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.lastTokenRefresh = action.payload.timestamp;
        state.isAuthenticated = true;

        // Store token in keychain (async, don't block)
        keychainStorage.storeAccessToken(action.payload.token).catch(err => {
          logger.warn('Background token storage warning', 'AUTH', err);
        });

        // Keep the fully authenticated flag when refreshing (async, don't block)
        keychainStorage
          .storeAuthState({
            isAuthenticated: true,
            user: state.user,
            token: action.payload.token,
            lastCheck: Date.now(),
          })
          .catch(err => {
            logger.warn('Background auth state storage warning', 'AUTH', err);
          });

        // Update global auth state
        globalAuthState = {
          ...globalAuthState,
          token: action.payload.token,
          lastCheck: Date.now(),
        };
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;

        // Don't logout on refresh failure - only logout if refresh token is truly invalid
        // Allow retry attempts - user should stay logged in during transient errors
        // Logout will only happen when refresh token itself expires or is invalid
        const errorMsg = (action.payload as string) || '';

        // Only logout if refresh token is permanently invalid (not transient network error)
        if (
          errorMsg.includes('Refresh token expired') ||
          errorMsg.includes('Invalid refresh token') ||
          errorMsg.includes('Refresh token not found')
        ) {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.lastTokenRefresh = null;
          keychainStorage.clearAll();
        } else {
          // Transient error - keep user logged in, will retry
          // Keep isAuthenticated true, token might still be valid
        }
      })
      // Check Session Validity
      .addCase(checkSessionValidity.pending, state => {
        // Don't set loading for background checks
      })
      .addCase(checkSessionValidity.fulfilled, (state, action) => {
        if (!action.payload.isValid) {
          // Session check indicates invalid - but only logout if refresh token is truly invalid
          // Don't logout on transient errors or network issues
          const shouldRefresh = action.payload.shouldRefresh;

          if (!shouldRefresh) {
            // Refresh token is truly invalid (expired/not found) - safe to logout

            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.lastTokenRefresh = null;
            keychainStorage.clearAll();
          } else {
            // Should refresh - keep user logged in, refresh will happen in background
            // Don't logout - token refresh will happen automatically
          }
        } else {
          // Session is valid - all good
        }
      })
      .addCase(checkSessionValidity.rejected, (state, action) => {
        // On error, don't logout - might be network issue or transient error
        // Keep user logged in, errors will be handled by token refresh mechanism
        logger.warn('Session check failed (transient error) - keeping user logged in', 'AUTH');
        // Don't change authentication state - let token refresh handle it
      })
      // Logout User
      .addCase(logoutUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.isInitialized = true; // Keep initialized so Welcome screen can show
        state.user = null;
        state.token = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.isInitialized = true; // Keep initialized so Welcome screen can show even on error
        state.error = action.error.message || 'Logout failed';
      });
  },
});

/**
 * Get global authentication state
 * @deprecated Use Redux selectors from authSelectors.ts instead
 * This is kept for backward compatibility with authService
 * which needs to access state outside React components
 */
export const getGlobalAuthState = () => globalAuthState;

// Enhanced logout function - clears all Redux states
export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { dispatch }) => {
  try {
    // Stop token refresh timer
    try {
      await authService.logout(); // This also stops the refresh timer
    } catch (error) {
      logger.warn('Error stopping refresh timer', 'AUTH', error);
    }

    // Clear global auth state
    globalAuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      lastCheck: Date.now(),
    };

    // Import and dispatch all reset actions (only once to avoid duplicates)
    try {
      const { clearAllReduxStates } = await import('./logoutActions');
      clearAllReduxStates(dispatch);
    } catch (importError) {
      logger.warn('Could not import logoutActions, clearing individually', 'AUTH');
      // Fallback: clear auth state directly
      dispatch(resetAuth());
    }

    // CRITICAL: Purge Redux persist store to clear all persisted state
    try {
      const { persistor } = await import('./store');
      await persistor.purge();
      logger.info('✅ Redux persist store purged', 'AUTH');
    } catch (purgeError) {
      logger.warn('⚠️ Error purging persist store:', 'AUTH', purgeError);
    }

    // Nuclear clear - remove ALL possible data from keychain
    await keychainStorage.nuclearClear();

    logger.info('✅ Logout completed - all data cleared', 'AUTH');

    return { success: true };
  } catch (error) {
    logger.error('Error during logout', 'AUTH', error);
    // Even if there's an error, try to clear what we can
    try {
      await keychainStorage.nuclearClear();
      dispatch(resetAuth());
    } catch (clearError) {
      logger.error('Error clearing on logout failure', 'AUTH', clearError);
    }
    throw error;
  }
});

export const {
  logout,
  clearError,
  setError,
  setLoading,
  setUser,
  setToken,
  setInitialized,
  setAuthenticated,
  resetAuth,
  clearStorage,
} = authSlice.actions;

// Export thunks
export { loadStoredAuth, refreshToken, checkSessionValidity, logoutUser };
export default authSlice.reducer;
