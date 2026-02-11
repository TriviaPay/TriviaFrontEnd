/**
 * Redux Selectors with Reselect
 * Memoized selectors for optimal performance
 */

import { createSelector } from 'reselect';
import { RootState } from '../store';

const createSelectorFn = createSelector;

// Base selectors (no memoization needed - they're simple)
const selectAuthState = (state: RootState) => state.auth;
const selectTriviaState = (state: RootState) => state.trivia;
const selectChatState = (state: RootState) => state.chat;
// const selectLiveChatState = (state: RootState) => state.liveChat; // Removed - live chat no longer used
const selectShopState = (state: RootState) => state.shop;
const selectProfileState = (state: RootState) => state.profile;
const selectLeaderboardState = (state: RootState) => state.leaderboard;
// const selectWinnersState = (state: RootState) => state.winners; // Removed - winners no longer used
const selectDailyRewardsState = (state: RootState) => state.dailyRewards;

// Memoized selectors with reselect
export const selectIsAuthenticated = createSelectorFn(
  [selectAuthState],
  auth => auth?.isAuthenticated ?? false
);


export const selectCurrentUser = createSelectorFn([selectAuthState], auth => auth.user);

export const selectAuthToken = createSelectorFn([selectAuthState], auth => auth.token);

export const selectTriviaQuestion = createSelectorFn(
  [selectTriviaState],
  trivia => trivia.currentQuestion
);

export const selectTriviaScore = createSelectorFn(
  [selectTriviaState],
  trivia => (trivia as any).score ?? 0
);

export const selectTriviaGems = createSelectorFn(
  [selectTriviaState],
  trivia => (trivia as any).totalGems ?? 0
);

export const selectChatMessages = createSelectorFn([selectChatState], chat => chat.messages);

// export const selectLiveChatMessages = createSelectorFn(
//   [selectLiveChatState],
//   (liveChat) => liveChat.messages
// ); // Removed - live chat no longer used

export const selectShopBalance = createSelectorFn([selectShopState], shop => shop.userBalance);

export const selectUserGems = createSelectorFn(
  [selectShopState],
  shop => shop.userBalance?.gems ?? 0
);

export const selectProfileData = createSelectorFn([selectProfileState], profile => profile.profile);

export const selectLeaderboardData = createSelectorFn(
  [selectLeaderboardState],
  leaderboard => leaderboard.allTime?.data ?? []
);

// Individual leaderboard tab selectors to prevent re-renders when other tabs update
export const selectFreeLeaderboard = createSelectorFn([selectLeaderboardState], leaderboard => ({
  data: leaderboard.free?.data ?? [],
  loading: leaderboard.free?.loading ?? false,
  error: leaderboard.free?.error ?? null,
  lastFetched: leaderboard.free?.lastFetched ?? null,
}));

export const selectBronzeLeaderboard = createSelectorFn([selectLeaderboardState], leaderboard => ({
  data: leaderboard.bronze?.data ?? [],
  loading: leaderboard.bronze?.loading ?? false,
  error: leaderboard.bronze?.error ?? null,
  lastFetched: leaderboard.bronze?.lastFetched ?? null,
}));

export const selectSilverLeaderboard = createSelectorFn([selectLeaderboardState], leaderboard => ({
  data: leaderboard.silver?.data ?? [],
  loading: leaderboard.silver?.loading ?? false,
  error: leaderboard.silver?.error ?? null,
  lastFetched: leaderboard.silver?.lastFetched ?? null,
}));

export const selectDailyLeaderboard = createSelectorFn([selectLeaderboardState], leaderboard => ({
  data: leaderboard.daily?.data ?? [],
  loading: leaderboard.daily?.loading ?? false,
  error: leaderboard.daily?.error ?? null,
  lastFetched: leaderboard.daily?.lastFetched ?? null,
}));

// export const selectWinnersData = createSelectorFn(
//   [selectWinnersState],
//   (winners) => winners.data
// ); // Removed - winners no longer used

export const selectDailyRewardsData = createSelectorFn(
  [selectDailyRewardsState],
  rewards => rewards.rewards
);

// Complex selectors combining multiple states
export const selectUserWithProfile = createSelectorFn(
  [selectCurrentUser, selectProfileData],
  (user, profile) => ({
    ...user,
    ...profile,
  })
);

export const selectTriviaWithGems = createSelectorFn(
  [selectTriviaState, selectUserGems],
  (trivia, gems) => ({
    ...trivia,
    totalGems: gems,
  })
);
