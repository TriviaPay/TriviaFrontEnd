/**
 * Centralized logout actions
 * Import all reset/clear actions from all slices for comprehensive logout
 */

// Auth
import { resetAuth } from './authSlice';

// Profile
import { clearProfile } from './profileSlice';

// Trivia
import { resetTrivia } from './triviaSlice';

// Live Chat
// import { resetLiveChat } from './liveChatSlice'; // Removed

// Leaderboard
import { clearLeaderboardData } from './leaderboardSlice';

// Winners
// import { resetWinners, clearCache } from './winnersSlice'; // Removed

// Daily Rewards
import { resetRewardsState } from './dailyRewardsSlice';

// Shop
import { resetShop } from './slices/shopSlice';

// Cosmetics
import { resetCosmeticsState } from './cosmeticsSlice';

// App
import { resetApp } from './slices/appSlice';

// RTK Query API
import { apiUtil } from './api/baseApi';
import { logger } from '../lib/utils/logger';

/**
 * Clear all Redux states - dispatch all reset actions
 * Call this in logoutUser thunk
 */
export const clearAllReduxStates = (dispatch: any) => {
  try {
    // CRITICAL: Clear RTK Query cache first - this clears all API cached data
    // This ensures questions answered state, leaderboards, etc. are cleared
    try {
      dispatch(apiUtil.resetApiState());
      logger.info('✅ RTK Query cache cleared', 'STORE');
    } catch (rtkError) {
      logger.warn('⚠️ Error clearing RTK Query cache:', 'STORE', rtkError);
    }

    // Clear all slices
    dispatch(resetAuth());

    dispatch(clearProfile());

    dispatch(resetTrivia());

    // dispatch(resetLiveChat()); // Removed - live chat no longer used

    dispatch(clearLeaderboardData());

    // dispatch(resetWinners()); // Removed - winners no longer used

    dispatch(resetRewardsState());

    dispatch(resetShop());

    dispatch(resetCosmeticsState());

    dispatch(resetApp());

    // Clear winners cache
    // clearCache(); // Removed - winners no longer used

    logger.info('✅ All Redux states cleared', 'STORE');
  } catch (error) {
    logger.error('❌ Error clearing Redux states:', 'STORE', error);
    // Continue even if some fail
  }
};
