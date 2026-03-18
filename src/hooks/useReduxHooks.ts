/**
 * Redux Hooks - TypeScript Implementation
 * Custom hooks to replace Context API usage with Redux Toolkit
 */

import { useMemo } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import * as Keychain from 'react-native-keychain';
import { RootState, AppDispatch } from '../store/store';
import {
  initializeAudio,
  toggleSound,
  toggleMusic,
  toggleNotifications,
  startScreenBackgroundMusic,
  stopScreenBackgroundMusic,
  setCurrentScreen,
  setUniversalTapEnabled,
  playSound,
  playNotification,
  playUniversalTapSound,
  clearError as clearSoundError,
} from '../store/slices/soundSlice';
import {
  purchaseItem,
  addGems,
  setUserBalance,
  updateShopItems,
  fetchUserGems,
  clearError as clearShopError,
} from '../store/slices/shopSlice';
import {
  fetchWeeklyStatus,
  claimDailyReward,
  doubleUpReward,
  setShowPopup,
  resetMessage,
  resetRewardsState,
  selectClaimAction,
  selectDoubleUpAction,
  resetActionSelection,
  handleClosePopup,
  updateRewards,
} from '../store/dailyRewardsSlice';
// Use Safe Audio Manager (react-native-sound based)
import audioManager from '../lib/audio/AudioManagerSafe';

// Sound Hook - Replaces SoundContext
export const useSound = () => {
  const dispatch = useDispatch<AppDispatch>();
  const soundState = useSelector((state: RootState) => state.sound);

  const initializeAudioContext = () => {
    dispatch(initializeAudio());
  };

  const toggleSoundSetting = async () => {
    try {
      console.log('🔄 useSound: Dispatching toggleSound, current state:', soundState.soundEnabled);
      const result = await dispatch(toggleSound()).unwrap();
      console.log('🔄 useSound: toggleSound result:', result);
      return result;
    } catch (error) {
      console.error('🔄 useSound: toggleSound error:', error);
      // Return current state if toggle fails
      return soundState.soundEnabled;
    }
  };

  const toggleMusicSetting = async () => {
    try {
      const result = await dispatch(toggleMusic()).unwrap();
      return result;
    } catch (error) {
      // Return current state if toggle fails
      return soundState.musicEnabled;
    }
  };

  const toggleNotificationsSetting = async () => {
    try {
      console.log(
        '🔄 useSound: Dispatching toggleNotifications, current state:',
        soundState.notificationsEnabled
      );
      const result = await dispatch(toggleNotifications()).unwrap();
      console.log('🔄 useSound: toggleNotifications result:', result);
      return result;
    } catch (error) {
      console.error('🔄 useSound: toggleNotifications error:', error);
      // Return current state if toggle fails
      return soundState.notificationsEnabled;
    }
  };

  const startScreenMusic = (screenName: string) => {
    dispatch(startScreenBackgroundMusic(screenName));
  };

  const stopScreenMusic = () => {
    dispatch(stopScreenBackgroundMusic());
  };

  const setScreen = (screen: string | null) => {
    dispatch(setCurrentScreen(screen));
  };

  const setTapEnabled = (enabled: boolean) => {
    dispatch(setUniversalTapEnabled(enabled));
  };

  const playSoundEffect = (name: string) => {
    // CRITICAL: Use safe audio manager that NEVER crashes
    try {
      if (soundManager && typeof soundManager.playSound === 'function') {
        soundManager.playSound(name).catch((error: any) => {
          // Silent fail - audio is optional
        });
      }
      dispatch(playSound(name));
    } catch (error) {
      // Silent fail - audio is optional, don't block UI
    }
  };

  const playNotificationSound = (name: string) => {
    // CRITICAL: Use safe audio manager that NEVER crashes
    try {
      if (audioManager && typeof audioManager.playSound === 'function') {
        audioManager.playSound(name).catch((error: any) => {
          // Silent fail - audio is optional
        });
      }
      dispatch(playNotification(name));
    } catch (error) {
      // Silent fail - audio is optional, don't block UI
    }
  };

  const playTapSound = () => {
    // CRITICAL: Use safe audio manager that NEVER crashes
    if (soundState.universalTapEnabled) {
      try {
        if (audioManager && typeof audioManager.playSound === 'function') {
          audioManager.playSound('button').catch((error: any) => {
            // Silent fail - audio is optional
          });
        }
        dispatch(playUniversalTapSound());
      } catch (error) {
        // Silent fail - audio is optional, don't block UI
      }
    }
  };

  const clearError = () => {
    dispatch(clearSoundError());
  };

  return {
    ...soundState,
    initializeAudio: initializeAudioContext,
    toggleSound: toggleSoundSetting,
    toggleMusic: toggleMusicSetting,
    toggleNotifications: toggleNotificationsSetting,
    startScreenBackgroundMusic: startScreenMusic,
    stopScreenBackgroundMusic: stopScreenMusic,
    setCurrentScreen: setScreen,
    setUniversalTapEnabled: setTapEnabled,
    playSound: playSoundEffect,
    playNotification: playNotificationSound,
    playUniversalTapSound: playTapSound,
    clearError,
  };
};

// Shop Hook - Replaces ShopContext
export const useShop = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Safely access shop state with fallback
  const shopState = useSelector((state: RootState) => {
    try {
      return (
        state?.shop || {
          userBalance: { gems: 0 },
          shopItems: {},
          loading: false,
          error: null,
          purchaseHistory: [],
        }
      );
    } catch (error) {
      logger.error('Error accessing shop state:', 'HOOK', error);
      return {
        userBalance: { gems: 0 },
        shopItems: {},
        loading: false,
        error: null,
        purchaseHistory: [],
      };
    }
  });

  const purchaseItemAction = async (params: { itemId: string; itemType: string }) => {
    try {
      const result = await dispatch(purchaseItem(params)).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const addGemsAction = (amount: number) => {
    try {
      dispatch(addGems(amount));
    } catch (error) {
      logger.error('Error adding gems:', 'HOOK', error);
    }
  };

  const setBalance = (balance: { gems: number }) => {
    try {
      dispatch(setUserBalance(balance));
    } catch (error) {
      logger.error('Error setting balance:', 'HOOK', error);
    }
  };

  const updateItems = (items: any[]) => {
    try {
      dispatch(updateShopItems(items));
    } catch (error) {
      logger.error('Error updating items:', 'HOOK', error);
    }
  };

  const fetchGems = () => {
    try {
      dispatch(fetchUserGems());
    } catch (error) {
      logger.error('Error fetching gems:', 'HOOK', error);
    }
  };

  const clearError = () => {
    try {
      dispatch(clearShopError());
    } catch (error) {
      logger.error('Error clearing shop error:', 'HOOK', error);
    }
  };

  // Ensure we always return a valid object with all required properties
  return {
    userBalance: shopState?.userBalance || { gems: 0 },
    shopItems: shopState?.shopItems || {},
    loading: shopState?.loading || false,
    error: shopState?.error || null,
    purchaseHistory: Array.isArray(shopState?.purchaseHistory) ? shopState.purchaseHistory : [],
    purchaseItem: purchaseItemAction,
    addGems: addGemsAction,
    setUserBalance: setBalance,
    updateShopItems: updateItems,
    fetchUserGems: fetchGems,
    clearError,
  };
};

// Daily Rewards Hook - Replaces DailyRewardsContext
export const useDailyRewards = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dailyRewardsState = useSelector(
    (state: RootState) =>
      state.dailyRewards || {
        rewards: [],
        currentDay: 1,
        showPopupOnAppOpen: false,
        isLoadingPopup: true,
        loading: false,
      }
  );

  const fetchWeeklyStatusAction = async () => {
    return dispatch(fetchWeeklyStatus());
  };

  const claimReward = () => {
    dispatch(claimDailyReward());
  };

  const doubleUpRewardAction = () => {
    dispatch(doubleUpReward());
  };

  const setShowPopupAction = (show: boolean) => {
    dispatch(setShowPopup(show));
  };

  const resetMessageAction = () => {
    dispatch(resetMessage());
  };

  const selectClaim = () => {
    dispatch(selectClaimAction());
  };

  const selectDoubleUp = () => {
    dispatch(selectDoubleUpAction());
  };

  const resetSelection = () => {
    dispatch(resetActionSelection());
  };



  const handleClosePopupAction = async () => {
    dispatch(handleClosePopup());
  };

  const updateRewardsAction = (day: number) => {
    dispatch(updateRewards(day));
  };

  const resetRewardsStateAction = () => {
    dispatch(resetRewardsState());
  };

  const setShowPopupOnAppOpenAction = (show: boolean) => {
    dispatch(setShowPopupOnAppOpen(show));
  };

  return {
    ...dailyRewardsState,
    fetchWeeklyStatus: fetchWeeklyStatusAction,
    claimDailyReward: claimReward,
    doubleUpReward: doubleUpRewardAction,
    setShowPopup: setShowPopupAction,
    setShowPopupOnAppOpen: setShowPopupOnAppOpenAction,
    resetMessage: resetMessageAction,
    resetRewardsState: resetRewardsStateAction,
    selectClaimAction: selectClaim,
    selectDoubleUpAction: selectDoubleUp,
    resetActionSelection: resetSelection,

    handleClosePopup: handleClosePopupAction,
    updateRewards: updateRewardsAction,
  };
};

// Theme Hook - Simplified without dark mode
export const useTheme = () => {
  // Safely access theme state with fallback
  const theme = useSelector((state: RootState) => state?.app?.theme, shallowEqual);

  const colors = useMemo(() => {
    return (
      theme || {
        primaryColor: '#2563EB',
        secondaryColor: '#03DAC6',
      }
    );
  }, [theme]);

  const defaultColors = {
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    tabActive: '#2563EB',
    tabInactive: '#757575',
    accent: '#2563EB',
    error: '#B00020',
    success: '#018786',
    highlight: '#E0E0E0',
    inputBackground: '#FFFFFF',
    primaryButton: '#2563EB',
  };

  const isDarkMode = useMemo(() => colors.primaryColor === '#000000', [colors]);

  const toggleDarkMode = () => {
    // Placeholder function - dark mode functionality can be implemented later
  };

  // Safely extract theme properties with fallbacks
  return {
    colors: { ...defaultColors, ...colors },
    isDarkMode,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    toggleDarkMode,
  };
};
