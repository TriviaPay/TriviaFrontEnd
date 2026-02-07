/**
 * App Slice - Enterprise TypeScript Implementation
 * Global application state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GlobalLoaderState {
  isVisible: boolean;
  message: string;
  operations: string[]; // Stack of operations requiring loader
  startTime: number | null; // Track when loader was shown
  minDisplayTime: number; // Minimum time to show loader (prevent flicker)
}

export interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  currentScreen: string;
  lastActiveTime: number;
  appVersion: string;
  buildNumber: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo: {
    model: string;
    osVersion: string;
    screenWidth: number;
    screenHeight: number;
  };
  performance: {
    memoryUsage: number;
    renderTime: number;
    frameRate: number;
  };
  notifications: {
    enabled: boolean;
    permissionGranted: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  globalLoader: GlobalLoaderState;
}

const initialState: AppState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  isOnline: true,
  currentScreen: 'Welcome',
  lastActiveTime: Date.now(),
  appVersion: '1.0.0',
  buildNumber: '1',
  platform: 'ios',
  deviceInfo: {
    model: '',
    osVersion: '',
    screenWidth: 0,
    screenHeight: 0,
  },
  performance: {
    memoryUsage: 0,
    renderTime: 0,
    frameRate: 60,
  },
  notifications: {
    enabled: true,
    permissionGranted: false,
  },
  theme: {
    primaryColor: '#6C5CE7',
    secondaryColor: '#4ECDC4',
  },
  globalLoader: {
    isVisible: false,
    message: '',
    operations: [],
    startTime: null,
    minDisplayTime: 300, // 300ms minimum to prevent flicker
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
      state.isLoading = !action.payload;
    },
    setCurrentScreen: (state, action: PayloadAction<string>) => {
      state.currentScreen = action.payload;
    },
    updateLastActiveTime: state => {
      state.lastActiveTime = Date.now();
    },
    setDeviceInfo: (state, action: PayloadAction<AppState['deviceInfo']>) => {
      state.deviceInfo = action.payload;
    },
    updatePerformance: (state, action: PayloadAction<Partial<AppState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
    setNotificationSettings: (state, action: PayloadAction<Partial<AppState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setTheme: (state, action: PayloadAction<Partial<AppState['theme']>>) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    resetApp: state => {
      return { ...initialState, deviceInfo: state.deviceInfo };
    },
    // Global Loader Actions
    showGlobalLoader: (state, action: PayloadAction<{ message?: string; operation?: string }>) => {
      const { message = 'Loading...', operation = 'default' } = action.payload || {};

      // Add operation to stack
      if (!state.globalLoader.operations.includes(operation)) {
        state.globalLoader.operations.push(operation);
      }

      // Show loader if not already visible
      if (!state.globalLoader.isVisible) {
        state.globalLoader.isVisible = true;
        state.globalLoader.startTime = Date.now();
      }

      // Update message (use latest message)
      state.globalLoader.message = message;
    },
    hideGlobalLoader: (state, action: PayloadAction<string | undefined>) => {
      const operation = action.payload || 'default';

      // Remove operation from stack
      state.globalLoader.operations = state.globalLoader.operations.filter(op => op !== operation);

      // Only hide if no operations remaining
      if (state.globalLoader.operations.length === 0) {
        const elapsed = state.globalLoader.startTime
          ? Date.now() - state.globalLoader.startTime
          : 0;
        const remaining = Math.max(0, state.globalLoader.minDisplayTime - elapsed);

        // If minimum display time not met, we should delay hiding
        // For now, just hide immediately - the component will handle delay
        if (remaining === 0 || elapsed >= state.globalLoader.minDisplayTime) {
          state.globalLoader.isVisible = false;
          state.globalLoader.message = '';
          state.globalLoader.startTime = null;
        }
        // Note: For proper minimum display time, use setTimeout in component
      }
    },
    forceHideGlobalLoader: state => {
      // Emergency hide - clear all operations
      state.globalLoader.isVisible = false;
      state.globalLoader.message = '';
      state.globalLoader.operations = [];
      state.globalLoader.startTime = null;
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setOnlineStatus,
  setConnected,
  setInitialized,
  setCurrentScreen,
  updateLastActiveTime,
  setDeviceInfo,
  updatePerformance,
  setNotificationSettings,
  setTheme,
  resetApp,
  showGlobalLoader,
  hideGlobalLoader,
  forceHideGlobalLoader,
} = appSlice.actions;

export default appSlice.reducer;
