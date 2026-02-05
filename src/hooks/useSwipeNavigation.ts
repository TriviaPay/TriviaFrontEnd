/**
 * Swipe Navigation Hook
 * Manages swipe navigation logic for tab navigation
 */

import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import AudioManager from '../lib/audio/sound-manager';

interface TabConfig {
  name: string;
  index: number;
  enabled: boolean;
}

interface UseSwipeNavigationProps {
  tabs: TabConfig[];
  currentTabIndex: number;
  excludeScreens?: string[];
  onTabChange?: (tabName: string) => void;
}

export const useSwipeNavigation = ({
  tabs,
  currentTabIndex,
  excludeScreens = ['Chats'],
  onTabChange,
}: UseSwipeNavigationProps) => {
  const navigation = useNavigation();
  const isNavigating = useRef(false);

  // Get current tab name
  const currentTab = tabs.find(tab => tab.index === currentTabIndex);
  const currentTabName = currentTab?.name || '';

  // Check if current screen should allow swipe navigation
  const isSwipeEnabled = useCallback(() => {
    if (!currentTabName) return false;

    // Check if current tab is in excluded screens
    if (excludeScreens.includes(currentTabName)) return false;

    // Check if current tab is enabled
    const currentTabConfig = tabs.find(tab => tab.name === currentTabName);
    return currentTabConfig?.enabled !== false;
  }, [currentTabName, excludeScreens, tabs]);

  // Custom navigation logic based on current tab
  const getNavigationTarget = (direction: 'left' | 'right'): string | null => {
    const currentTab = tabs.find(tab => tab.index === currentTabIndex);
    if (!currentTab) return null;

    switch (currentTab.name) {
      case 'Home':
        return direction === 'left' ? 'Leaderboard' : 'Shop';
      case 'Leaderboard':
        return direction === 'left' ? 'Trivia' : 'Home';
      case 'Trivia':
        return direction === 'left' ? 'Chats' : 'Leaderboard';
      case 'Chats':
        return null; // No swipe navigation for Chats
      case 'Wallet':
        return direction === 'left' ? 'Profile' : 'Profile'; // Both directions go to Profile
      case 'Profile':
        return 'Home'; // Both left and right go to Home
      case 'Shop':
        return 'Home'; // Both left and right go to Home
      case 'WinnersScreen':
        return 'Home'; // Both left and right go to Home
      default:
        return null;
    }
  };

  // Navigate to next tab (swipe left)
  const navigateToNextTab = useCallback(() => {
    if (isNavigating.current || !isSwipeEnabled()) return;

    isNavigating.current = true;

    const targetTab = getNavigationTarget('left');
    if (targetTab) {
      // Stop vibration if navigating away from Trivia
      if (currentTabName === 'Trivia') {
        AudioManager.stopContinuousBackgroundMusic();
      }

      // Update state before navigation
      onTabChange?.(targetTab);

      // Navigate using requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        navigation.navigate(targetTab as never);
      });
    }

    // Reset navigation lock after a shorter delay for better responsiveness
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [currentTabIndex, tabs, navigation, isSwipeEnabled, currentTabName, onTabChange]);

  // Navigate to previous tab (swipe right)
  const navigateToPreviousTab = useCallback(() => {
    if (isNavigating.current || !isSwipeEnabled()) return;

    isNavigating.current = true;

    const targetTab = getNavigationTarget('right');
    if (targetTab) {
      // Stop vibration if navigating away from Trivia
      if (currentTabName === 'Trivia') {
        AudioManager.stopContinuousBackgroundMusic();
      }

      // Update state before navigation
      onTabChange?.(targetTab);

      // Navigate using requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        navigation.navigate(targetTab as never);
      });
    }

    // Reset navigation lock after a shorter delay for better responsiveness
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [currentTabIndex, tabs, navigation, isSwipeEnabled, currentTabName, onTabChange]);

  return {
    isSwipeEnabled: isSwipeEnabled(),
    navigateToNextTab,
    navigateToPreviousTab,
  };
};
