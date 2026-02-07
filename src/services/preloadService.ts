/**
 * Preload Service - Preload critical APIs for instant display
 * Prevents delays and loading screens for better UX
 */

import { store } from '../store/store';
import { fetchCurrentFreeQuestion, fetchFreeModeStatus } from '../store/triviaSlice';
import { fetchProfileSummary } from '../store/profileSlice';
import {
  fetchFreeLeaderboard,
  fetchBronzeLeaderboard,
  fetchSilverLeaderboard,
} from '../store/leaderboardSlice';
import { apiService } from './apiService';
import { keychainStorage } from './keychainStorage';
import { logger } from '../lib/utils/logger';
import { Image } from 'react-native';

const TRIVIA_MODES_STATUS_CACHE_KEY = 'trivia_modes_status_cache_v1';
const TRIVIA_MODES_STATUS_CACHE_TS_KEY = 'trivia_modes_status_cache_ts_v1';

interface PreloadOptions {
  /**
   * Whether to force preload even if data is already loaded
   */
  force?: boolean;
  /**
   * Timeout for preload operations (ms)
   */
  timeout?: number;
}

class PreloadService {
  private isPreloading = false;
  private preloadedData: Record<string, boolean> = {};

  /**
   * Preload critical data for the home screen
   */
  async preloadHomeScreen(options: PreloadOptions = {}): Promise<void> {
    if (this.isPreloading && !options.force) {
      logger.debug('Preload already in progress, skipping', 'PRELOAD');
      return;
    }

    this.isPreloading = true;

    // Safety check: Only preload home screen data if authenticated
    if (!store.getState().auth.isAuthenticated) {
      logger.warn('Preload attempted while unauthenticated, skipping', 'PRELOAD');
      this.isPreloading = false;
      return;
    }

    try {
      // CRITICAL: Preload essential data in parallel
      // We use Promise.allSettled to ensure one failure doesn't stop others
      await Promise.allSettled([
        // Profile is critical for UI state (gems, coins, avatar)
        this.preloadProfile(options),
        // Recent winners for home screen content
        this.preloadRecentWinners(options),
        // Trivia modes for Selection Screen (often the first action)
        this.preloadTriviaModes(options),
        // Leaderboard for the tab (often checked early)
        this.preloadLeaderboard(options),
      ]);

      this.preloadedData.homeScreen = true;
      logger.log('Home screen preload complete', 'PRELOAD');
    } catch (error) {
      logger.error('Home screen preload error:', 'PRELOAD', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload trivia modes status for Selection Screen
   */
  async preloadTriviaModes(options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedData.triviaModes && !options.force) {
      return;
    }

    // Auth guard
    if (!store.getState().auth.isAuthenticated) return;

    try {
      // Fire and forget - fetch fresh data and update cache
      apiService
        .makeAuthenticatedRequest('/profile/modes/status', {
          method: 'GET',
          headers: { accept: 'application/json' },
        })
        .then(response => {
          if (response.success && response.data) {
            keychainStorage
              .set(TRIVIA_MODES_STATUS_CACHE_KEY, JSON.stringify(response.data))
              .catch(() => {});
            keychainStorage
              .set(TRIVIA_MODES_STATUS_CACHE_TS_KEY, String(Date.now()))
              .catch(() => {});
          }
        })
        .catch(err => {
          logger.warn('Trivia modes preload failed (non-critical)', 'PRELOAD', err);
        });

      this.preloadedData.triviaModes = true;
    } catch (error) {
      logger.warn('Trivia modes preload error', 'PRELOAD', error);
    }
  }

  /**
   * Preload leaderboard data (Free, Bronze, Silver)
   */
  async preloadLeaderboard(options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedData.leaderboard && !options.force) {
      return;
    }

    // Auth guard
    if (!store.getState().auth.isAuthenticated) return;

    try {
      const { dispatch } = store;

      // Helper to prefetch images from leaderboard results
      const handleLeaderboardResult = (action: any) => {
        if (action?.payload && Array.isArray(action.payload)) {
          const data = action.payload;
          // Prefetch top 10 users' images for instant rendering
          data.slice(0, 10).forEach((item: any) => {
            const imageUrl = item.profile_pic_url || item.avatar_url || item.image;
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
              Image.prefetch(imageUrl).catch(() => {});
            }
          });
        }
      };

      // Trigger fetches for main leaderboards in parallel
      // These actions should handle their own caching/deduplication logic
      Promise.allSettled([
        dispatch(fetchFreeLeaderboard()).then(handleLeaderboardResult),
        dispatch(fetchBronzeLeaderboard()).then(handleLeaderboardResult),
        dispatch(fetchSilverLeaderboard()).then(handleLeaderboardResult),
      ]).catch(err => {
        logger.warn('Leaderboard preload failed (non-critical)', 'PRELOAD', err);
      });

      this.preloadedData.leaderboard = true;
      logger.log('Leaderboard preloaded', 'PRELOAD');
    } catch (error) {
      logger.warn('Leaderboard preload error', 'PRELOAD', error);
    }
  }

  /**
   * Preload trivia data based on mode
   */
  async preloadTrivia(
    mode: 'free' | 'bronze' | 'silver' = 'free',
    options: PreloadOptions = {}
  ): Promise<void> {
    if (this.preloadedData[`trivia_${mode}`] && !options.force) {
      logger.debug(`Trivia ${mode} already preloaded, skipping`, 'PRELOAD');
      return;
    }

    // Auth guard
    if (!store.getState().auth.isAuthenticated) return;

    try {
      const { dispatch } = store;

      if (mode === 'free') {
        // For free mode: preload status first, then current question
        try {
          const statusResult = await dispatch(fetchFreeModeStatus()).unwrap();

          // Only fetch current question if not completed
          if (!statusResult?.progress?.completed) {
            await dispatch(fetchCurrentFreeQuestion()).unwrap();
          }
        } catch {
          // Non-fatal: skip if offline or backend has no question
        }
      }
      // Add bronze/silver preload logic here when needed
      else if (mode === 'bronze' || mode === 'silver') {
        // Placeholder for future implementation
      }

      this.preloadedData[`trivia_${mode}`] = true;
      logger.log(`Trivia ${mode} preloaded`, 'PRELOAD');
    } catch (error) {
      // Non-fatal for startup; warn instead of error to avoid noisy logs
      logger.warn(`Trivia ${mode} preload warning:`, 'PRELOAD', error);
    }
  }

  /**
   * Preload user profile
   */
  async preloadProfile(options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedData.profile && !options.force) {
      return;
    }

    // Auth guard
    if (!store.getState().auth.isAuthenticated) return;

    try {
      const { dispatch } = store;
      // Use the existing summary thunk as the source of truth
      await dispatch(fetchProfileSummary({ forceFresh: options.force })).unwrap();
      this.preloadedData.profile = true;
      logger.log('Profile preloaded', 'PRELOAD');
    } catch (error) {
      logger.error('Profile preload error:', 'PRELOAD', error);
    }
  }

  /**
   * Preload recent winners
   */
  async preloadRecentWinners(options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedData.recentWinners && !options.force) {
      return;
    }

    try {
      await apiService.getRecentWinners();
      this.preloadedData.recentWinners = true;
      logger.log('Recent winners preloaded', 'PRELOAD');
    } catch (error) {
      logger.error('Recent winners preload error:', 'PRELOAD', error);
    }
  }

  /**
   * Clear all preload flags
   */
  clearPreloadFlags(): void {
    this.preloadedData = {};
    logger.log('Preload flags cleared', 'PRELOAD');
  }

  /**
   * Check if a resource is preloaded
   */
  isPreloaded(key: string): boolean {
    return this.preloadedData[key] === true;
  }
}

export const preloadService = new PreloadService();
