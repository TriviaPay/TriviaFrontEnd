/**
 * Sound Slice - Redux Toolkit Implementation
 * Professional sound state management with comprehensive features
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
// Use Safe Audio Manager (react-native-sound based)
import audioManager from '../../lib/audio/AudioManagerSafe';

export interface SoundState {
  isInitialized: boolean;
  isLoading: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  currentScreen: string | null;
  isScreenMusicPlaying: boolean;
  universalTapEnabled: boolean;
  error: string | null;
}

const initialState: SoundState = {
  isInitialized: false,
  isLoading: true,
  soundEnabled: true,
  musicEnabled: true,
  notificationsEnabled: true,
  currentScreen: null,
  isScreenMusicPlaying: false,
  universalTapEnabled: true,
  error: null,
};

// Async thunks
export const initializeAudio = createAsyncThunk(
  'sound/initializeAudio',
  async (_, { rejectWithValue }) => {
    try {
      // CRITICAL: Wait for initialization to complete to get actual settings from Keychain
      if (audioManager && typeof audioManager.initialize === 'function') {
        try {
          // Wait for initialization to complete so we get actual saved settings
          await audioManager.initialize();
        } catch (initError) {
          // If initialization fails, try to get settings anyway
          // Silent fail - audio initialization is optional, don't crash the app
        }
      }

      // Get actual settings from AudioManager (which loads from Keychain)
      const settings = audioManager.getSettings();
      return {
        sound: settings.sound !== undefined ? settings.sound : true,
        music: settings.music !== undefined ? settings.music : true,
        notifications: settings.notifications !== undefined ? settings.notifications : true,
      };
    } catch (error) {
      // CRITICAL: Never reject with error - always return default settings to prevent crashes
      return {
        sound: true,
        music: true,
        notifications: true,
      };
    }
  }
);

export const toggleSound = createAsyncThunk(
  'sound/toggleSound',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get current state before toggling
      const currentState = (getState() as any).sound?.soundEnabled ?? true;
      const newState = await audioManager.toggleSound();

      // Ensure we got a boolean value
      if (typeof newState !== 'boolean') {
        // If AudioManager didn't return proper value, use opposite of current
        return !currentState;
      }

      return newState;
    } catch (error) {
      // On error, return opposite of current state
      const currentState = (getState() as any).sound?.soundEnabled ?? true;
      return !currentState;
    }
  }
);

export const toggleMusic = createAsyncThunk('sound/toggleMusic', async (_, { rejectWithValue }) => {
  try {
    const newState = await audioManager.toggleMusic();
    return newState;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to toggle music');
  }
});

export const toggleNotifications = createAsyncThunk(
  'sound/toggleNotifications',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get current state before toggling
      const currentState = (getState() as any).sound?.notificationsEnabled ?? true;
      const newState = await audioManager.toggleNotifications();

      // Ensure we got a boolean value
      if (typeof newState !== 'boolean') {
        // If AudioManager didn't return proper value, use opposite of current
        return !currentState;
      }

      return newState;
    } catch (error) {
      // On error, return opposite of current state
      const currentState = (getState() as any).sound?.notificationsEnabled ?? true;
      return !currentState;
    }
  }
);

export const startScreenBackgroundMusic = createAsyncThunk(
  'sound/startScreenBackgroundMusic',
  async (screenName: string, { rejectWithValue }) => {
    try {
      await audioManager.startScreenBackgroundMusic(screenName);
      return screenName;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to start screen music'
      );
    }
  }
);

export const stopScreenBackgroundMusic = createAsyncThunk(
  'sound/stopScreenBackgroundMusic',
  async (_, { rejectWithValue }) => {
    try {
      await audioManager.stopScreenBackgroundMusic();
      return null;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to stop screen music'
      );
    }
  }
);

const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    setCurrentScreen: (state, action: PayloadAction<string | null>) => {
      state.currentScreen = action.payload;
    },
    setUniversalTapEnabled: (state, action: PayloadAction<boolean>) => {
      state.universalTapEnabled = action.payload;
    },
    playSound: (_state, _action: PayloadAction<string>) => {
      // This is handled by the audioManager directly
      // No state change needed for playing sounds
    },
    playNotification: (_state, _action: PayloadAction<string>) => {
      // This is handled by the audioManager directly
      // No state change needed for playing notifications
    },
    playUniversalTapSound: _state => {
      // This is handled by the audioManager directly
      // No state change needed for playing tap sounds
    },
    clearError: state => {
      state.error = null;
    },
    resetSound: _state => {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      // Initialize audio
      .addCase(initializeAudio.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAudio.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.soundEnabled = action.payload.sound;
        state.musicEnabled = action.payload.music;
        state.notificationsEnabled = action.payload.notifications;
      })
      .addCase(initializeAudio.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      })
      // Toggle sound
      .addCase(toggleSound.pending, state => {
        // Optimistically update UI immediately
        state.soundEnabled = !state.soundEnabled;
      })
      .addCase(toggleSound.fulfilled, (state, action) => {
        // Update with actual value from AudioManager
        if (typeof action.payload === 'boolean') {
          state.soundEnabled = action.payload;
        }
        // If payload is not boolean, keep the optimistic update
      })
      .addCase(toggleSound.rejected, state => {
        // Revert optimistic update on error
        state.soundEnabled = !state.soundEnabled;
        state.error = 'Failed to toggle sound';
      })
      // Toggle music
      .addCase(toggleMusic.fulfilled, (state, action) => {
        state.musicEnabled = action.payload;
      })
      .addCase(toggleMusic.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Toggle notifications
      .addCase(toggleNotifications.pending, state => {
        // Optimistically update UI immediately
        state.notificationsEnabled = !state.notificationsEnabled;
      })
      .addCase(toggleNotifications.fulfilled, (state, action) => {
        // Update with actual value from AudioManager
        if (typeof action.payload === 'boolean') {
          state.notificationsEnabled = action.payload;
        }
        // If payload is not boolean, keep the optimistic update
      })
      .addCase(toggleNotifications.rejected, state => {
        // Revert optimistic update on error
        state.notificationsEnabled = !state.notificationsEnabled;
        state.error = 'Failed to toggle notifications';
      })
      // Start screen background music
      .addCase(startScreenBackgroundMusic.fulfilled, (state, action) => {
        state.currentScreen = action.payload;
        state.isScreenMusicPlaying = true;
      })
      .addCase(startScreenBackgroundMusic.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Stop screen background music
      .addCase(stopScreenBackgroundMusic.fulfilled, state => {
        state.currentScreen = null;
        state.isScreenMusicPlaying = false;
      })
      .addCase(stopScreenBackgroundMusic.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentScreen,
  setUniversalTapEnabled,
  playSound,
  playNotification,
  playUniversalTapSound,
  clearError,
  resetSound,
} = soundSlice.actions;

export default soundSlice.reducer;
