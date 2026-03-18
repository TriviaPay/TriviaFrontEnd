/**
 * Prefetch Service (RTK Query Version)
 * Aggressively prefetches all critical data using RTK Query initiate actions
 * Ensures data is in cache before screens are rendered
 */

import { store } from '../store/store';
import { profileApi } from '../store/api/profileApi';
import { triviaApi } from '../store/api/triviaApi';
import { walletApi } from '../store/api/walletApi';
import { leaderboardApi } from '../store/api/leaderboardApi';
import { chatApi } from '../store/api/chatApi';
import { shopApi } from '../store/api/shopApi';
import { dailyLoginApi } from '../store/api/dailyLoginApi';
import { fetchUserGems } from '../store/slices/shopSlice';
import {
  fetchProfileSummary,
  fetchOwnedAvatars as fetchSliceAvatars,
  fetchOwnedFrames as fetchSliceFrames,
} from '../store/profileSlice';
import { showGlobalLoader, hideGlobalLoader } from '../store/slices/appSlice';
import { logger } from '../lib/utils/logger';

class PrefetchService {
  private isPrefetching = false;

  /**
   * Prefetch critical data for the app
   * Called in App.tsx during bootstrap or after login
   */
  async prefetchCriticalData() {
    if (this.isPrefetching) return;
    this.isPrefetching = true;

    try {
      logger.debug('Starting critical data prefetch...', 'PREFETCH');

      // Background prefetch should not show blocking loader
      /*
      store.dispatch(
        showGlobalLoader({
          message: 'Checking your progress...',
          operation: 'prefetch_critical',
        })
      );
      */

      // CRITICAL: We must AWAIT these dispatches so the promise resolves ONLY when data is ready
      // We use Promise.allSettled to ensure one failure doesn't block the others
      await Promise.allSettled([
        // 1. Profile Data (Critical for all screens)
        store.dispatch(profileApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true })),
        store.dispatch(fetchProfileSummary() as any),

        // 2. Wallet Data (Critical for header)
        store.dispatch(
          walletApi.endpoints.getWalletBalance.initiate(undefined, { forceRefetch: true })
        ),

        // 3. Country Data (Critical for Signup Step 2)
        // Note: fetchCountries is a thunk in countrySlice
        (async () => {
          try {
            const { fetchCountries } = require('../store/countrySlice');
            await store.dispatch(fetchCountries() as any);
          } catch (e) {
            logger.warn('Failed to prefetch countries', 'PREFETCH', e);
          }
        })(),
      ]);

      // Non-blocking prefetches (Fire and forget)
      // 2b. User gems + daily login (Critical for daily bonus - ensures correct gem count on initial open)
      store.dispatch(fetchUserGems() as any);
      store.dispatch(
        dailyLoginApi.endpoints.getDailyLoginStatus.initiate(undefined, { forceRefetch: true })
      );

      // 3. Trivia Status
      store.dispatch(
        triviaApi.endpoints.getFreeModeStatus.initiate(undefined, { forceRefetch: true })
      );
      store.dispatch(
        triviaApi.endpoints.getBronzeModeStatus.initiate(undefined, { forceRefetch: true })
      );
      store.dispatch(
        triviaApi.endpoints.getSilverModeStatus.initiate(undefined, { forceRefetch: true })
      );

      // 4. Chat Data
      store.dispatch(
        chatApi.endpoints.getConversations.initiate(undefined, { forceRefetch: true })
      );

      // 5. Leaderboard
      store.dispatch(leaderboardApi.endpoints.getFreeLeaderboard.initiate(this.getYesterdayDate()));

      logger.debug('Critical data prefetch completed', 'PREFETCH');
    } catch (error) {
      logger.error('Error during critical data prefetch', 'PREFETCH', error);
    } finally {
      // Always hide loader after prefetch attempts
      store.dispatch(hideGlobalLoader('prefetch_critical'));
      this.isPrefetching = false;
    }
  }

  /**
   * Prefetch profile assets (avatars, frames)
   */
  prefetchProfileAssets() {
    // Prefetch for RTK Query
    store.dispatch(profileApi.endpoints.getOwnedAvatars.initiate());
    store.dispatch(profileApi.endpoints.getOwnedFrames.initiate());

    // Prefetch for profileSlice
    store.dispatch(fetchSliceAvatars() as any);
    store.dispatch(fetchSliceFrames() as any);
  }

  /**
   * Prefetch shop data
   */
  prefetchShop() {
    store.dispatch(shopApi.endpoints.getCosmetics.initiate());
  }

  private getYesterdayDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
}

export const prefetchService = new PrefetchService();

// Export the function used in App.tsx
export const prefetchCriticalData = () => prefetchService.prefetchCriticalData();
