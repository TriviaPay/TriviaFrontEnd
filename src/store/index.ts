/**
 * Store Index - Redux Store Exports
 * Central export point for store configuration
 */

export { store, persistor } from './store';
export type { RootState, AppDispatch } from './store';

// Re-export all slices for convenience
export { default as authReducer } from './authSlice';
export { default as appReducer } from './slices/appSlice';
export { default as triviaReducer } from './triviaSlice';
export { default as shopReducer } from './shopCosmeticsSlice';
export { default as cosmeticsReducer } from './cosmeticsSlice';
export { default as countryReducer } from './countrySlice';
export { default as dailyRewardsReducer } from './dailyRewardsSlice';
// export { default as winnersReducer } from './winnersSlice'; // Removed - winners no longer used
export { default as chatReducer } from './chatSlice';
// export { default as liveChatReducer } from './liveChatSlice'; // Removed
export { default as leaderboardReducer } from './leaderboardSlice';
