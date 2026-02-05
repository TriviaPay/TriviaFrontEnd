import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setUser } from './authSlice';
import { apiService } from '../services/apiService';

interface Avatar {
  id: string;
  name: string;
  image_url: string;
}

interface Frame {
  id: string;
  name: string;
  image_url: string;
}

interface UserInfo {
  avatar_url: string;
  frame_url: string;
  badge_id: string;
  badge_image_url: string;
  username: string;
}

interface CosmeticsState {
  avatars: Avatar[];
  frames: Frame[];
  selectedAvatar: Avatar | null;
  selectedFrame: Frame | null;
  error: string | null;
  loading: boolean;
  status: string;
  selectionStatus: string;
}

const API_URL = 'https://trivia-back-end.vercel.app/cosmetics';
const BACKEND_API_URL = 'https://trivia-back-end.vercel.app/login/token';

// Mock data removed - cosmetics now come from API or profile data
// If API endpoints are not available, these will return empty arrays
export const fetchOwnedAvatars = createAsyncThunk(
  'cosmetics/fetchOwnedAvatars',
  async (_, { rejectWithValue }) => {
    try {
      // Note: Placeholder implementation - replace with real API call when endpoint is available
      // For now, return empty array - cosmetics come from profile data

      return [];
    } catch (error) {
      logger.error('Error fetching avatars: ', 'STORE', error);
      return rejectWithValue('Failed to fetch avatars');
    }
  }
);

export const fetchOwnedFrames = createAsyncThunk(
  'cosmetics/fetchOwnedFrames',
  async (_, { rejectWithValue }) => {
    try {
      // Note: Placeholder implementation - replace with real API call when endpoint is available
      // For now, return empty array - cosmetics come from profile data

      return [];
    } catch (error) {
      logger.error('Error fetching frames: ', 'STORE', error);
      return rejectWithValue('Failed to fetch frames');
    }
  }
);

export const fetchUserInfo = createAsyncThunk(
  'cosmetics/fetchUserInfo',
  async (_, { rejectWithValue }) => {
    try {
      // User info comes from profile API, not cosmetics
      // This thunk is kept for compatibility but should not be used
      logger.warn('⚠️ [Cosmetics] fetchUserInfo is deprecated, use profile API instead', 'STORE');
      return rejectWithValue('Use profile API instead');
    } catch (error) {
      logger.error('Error fetching user info: ', 'STORE', error);
      return rejectWithValue('Failed to fetch user info');
    }
  }
);

export const selectAvatar = createAsyncThunk(
  'cosmetics/selectAvatar',
  async (avatarId: string, { rejectWithValue }) => {
    try {
      // Note: Placeholder implementation - replace with real API call when endpoint is available
      logger.warn('⚠️ [Cosmetics] selectAvatar API not yet implemented', 'STORE');
      return rejectWithValue('Avatar selection API not yet implemented');
    } catch (error) {
      logger.error('Error selecting avatar: ', 'STORE', error);
      return rejectWithValue('Failed to select avatar');
    }
  }
);

export const selectFrame = createAsyncThunk(
  'cosmetics/selectFrame',
  async (frameId: string, { rejectWithValue }) => {
    try {
      // Note: Placeholder implementation - replace with real API call when endpoint is available
      logger.warn('⚠️ [Cosmetics] selectFrame API not yet implemented', 'STORE');
      return rejectWithValue('Frame selection API not yet implemented');
    } catch (error) {
      logger.error('Error selecting frame: ', 'STORE', error);
      return rejectWithValue('Failed to select frame');
    }
  }
);

const cosmeticsSlice = createSlice({
  name: 'cosmetics',
  initialState: {
    avatars: [],
    frames: [],
    selectedAvatar: null,
    selectedFrame: null,
    error: null,
    loading: false,
    status: 'idle',
    selectionStatus: 'idle',
  } as CosmeticsState,
  reducers: {
    resetCosmeticsState: state => {
      state.avatars = [];
      state.frames = [];
      state.selectedAvatar = null;
      state.selectedFrame = null;
      state.error = null;
      state.loading = false;
      state.status = 'idle';
      state.selectionStatus = 'idle';
    },
  },
  extraReducers: builder => {
    builder
      // Fetch avatars
      .addCase(fetchOwnedAvatars.pending, state => {
        state.loading = true;
      })
      .addCase(fetchOwnedAvatars.fulfilled, (state, action) => {
        state.avatars = action.payload;
        state.loading = false;
      })
      .addCase(fetchOwnedAvatars.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })

      // Fetch frames
      .addCase(fetchOwnedFrames.pending, state => {
        state.loading = true;
      })
      .addCase(fetchOwnedFrames.fulfilled, (state, action) => {
        state.frames = action.payload;
        state.loading = false;
      })
      .addCase(fetchOwnedFrames.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })

      // User info
      .addCase(fetchUserInfo.pending, state => {
        state.loading = true;
      })
      .addCase(fetchUserInfo.fulfilled, state => {
        state.loading = false;
      })
      .addCase(fetchUserInfo.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })

      // Select avatar
      .addCase(selectAvatar.pending, state => {
        state.selectionStatus = 'loading';
      })
      .addCase(selectAvatar.fulfilled, state => {
        state.selectionStatus = 'succeeded';
      })
      .addCase(selectAvatar.rejected, (state, action) => {
        state.selectionStatus = 'failed';
        state.error = action.payload as string;
      })

      // Select frame
      .addCase(selectFrame.pending, state => {
        state.selectionStatus = 'loading';
      })
      .addCase(selectFrame.fulfilled, state => {
        state.selectionStatus = 'succeeded';
      })
      .addCase(selectFrame.rejected, (state, action) => {
        state.selectionStatus = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetCosmeticsState } = cosmeticsSlice.actions;
export default cosmeticsSlice.reducer;
