import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import { keychainStorageAdapter } from './keychainStorageAdapter';
import authReducer from './authSlice';
import appReducer from './slices/appSlice';
import chatReducer from './chatSlice';
import liveChatReducer from './liveChatSlice';
import leaderboardReducer from './leaderboardSlice';
import triviaReducer from './triviaSlice';
import profileReducer from './profileSlice';
import cosmeticsReducer from './shopCosmeticsSlice';
import gemPackagesReducer from './shopGemPackagesSlice';
import shopReducer from './slices/shopSlice';
import soundReducer from './slices/soundSlice';
import faqReducer from './slices/faqSlice';
// winnersReducer removed - winners screen no longer used
import dailyRewardsReducer from './dailyRewardsSlice';
import timerReducer from './timerSlice';
// E2EE Chat slices removed - APIs no longer available
// import e2eeReducer from './slices/e2eeSlice';
// import conversationReducer from './slices/conversationSlice';
// import messageReducer from './slices/messageSlice';
// import privacyReducer from './slices/privacySlice';
// import groupReducer from './slices/groupSlice';
// import groupMessageReducer from './slices/groupMessageSlice';
// import groupInviteReducer from './slices/groupInviteSlice';
// import statusReducer from './slices/statusSlice';
// import presenceReducer from './slices/presenceSlice';
import chatStoreReducer from './slices/chatStoreSlice';

// Combine all reducers
const rootReducer = {
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
  app: appReducer,
  chat: chatReducer,
  // liveChat: liveChatReducer, // Removed - live chat no longer used
  leaderboard: leaderboardReducer,
  trivia: triviaReducer,
  profile: profileReducer,
  cosmetics: cosmeticsReducer,
  gemPackages: gemPackagesReducer,
  shop: shopReducer,
  sound: soundReducer,
  // winners: winnersReducer, // Removed - winners screen no longer used
  dailyRewards: dailyRewardsReducer,
  faq: faqReducer,
  // E2EE Chat - removed (APIs no longer available)
  // e2ee: e2eeReducer,
  // conversations: conversationReducer,
  // messages: messageReducer,
  // privacy: privacyReducer,
  // groups: groupReducer,
  // groupMessages: groupMessageReducer,
  // groupInvites: groupInviteReducer,
  // status: statusReducer,
  // presence: presenceReducer,
  chatStore: chatStoreReducer,
  timer: timerReducer,
};

// Persist config - using keychain storage
// Persist important state to prevent data loss on app restart
// CRITICAL: DO NOT persist trivia state - it causes freezing when state updates
// because keychain storage is synchronous and blocks the UI thread
const persistConfig = {
  key: 'root',
  storage: keychainStorageAdapter,
  whitelist: [
    'auth', // Authentication state (user, token)
    'profile', // User profile data (lightweight)
    'cosmetics', // User cosmetics/purchases (lightweight)
    'sound', // Sound and notification settings (lightweight)
    'timer', // Global timer state (lightweight)
  ],
  // Blacklist heavy/frequently-changing slices to prevent UI freezing
  // Also blacklist RTK Query cache to let it handle its own persistence/caching
  blacklist: [
    baseApi.reducerPath, // Don't persist API cache (let RTK Query handle it or configure separately)
    'trivia', // Changes too frequently, causes keychain blocking
    'chat', // Real-time data, no need to persist
    'chatStore', // Real-time data, no need to persist
    'leaderboard', // API data, refetch on startup
    'dailyRewards', // API data, refetch on startup
  ],
};

// Create persisted root reducer using combineReducers pattern
import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
const combinedReducer = combineReducers(rootReducer);
const persistedReducer = persistReducer(persistConfig, combinedReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // Disable expensive immutability checks in dev to avoid UI locking / slow screens.
      // These checks are already disabled in production builds by Redux Toolkit.
      immutableCheck: false,
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER', 'persist/PURGE'],
        // Ignore paths that might have non-serializable values (shouldn't happen but for safety)
        ignoredPaths: [], // Live chat removed
        // Warn only (don't throw) to prevent crashes from serialization issues
        warnAfter: 128,
      },
      // CRITICAL: Use smaller thunk timeout to prevent blocking main thread
      thunk: {
        extraArgument: undefined,
      },
    }).concat(baseApi.middleware),
  // Enable dev tools only in DEV mode to reduce overhead
  devTools: __DEV__,
});

// Enable setupListeners to support automated refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
