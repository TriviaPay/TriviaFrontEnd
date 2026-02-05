/**
 * useDailyBonus Hook - TypeScript Implementation
 * Professional daily bonus hook with comprehensive features
 */

import { useState, useEffect } from 'react';
import * as Keychain from 'react-native-keychain';

const LAST_OPEN_DATE_KEY = 'daily_bonus_last_open';
const POPUP_SHOWN_KEY = 'daily_bonus_popup_shown';

interface Reward {
  day: number;
  value: number;
  type: string;
  [key: string]: any;
}

interface UseDailyBonusReturn {
  showDailyBonus: boolean;
  isLoading: boolean;
  handleCloseDailyBonus: () => Promise<void>;
  handleClaimDailyBonus: (reward: Reward) => Promise<void>;
}

export const useDailyBonus = (): UseDailyBonusReturn => {
  const [showDailyBonus, setShowDailyBonus] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const checkDailyBonusEligibility = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const today = new Date().toDateString();

      const lastOpenCredentials = await Keychain.getGenericPassword({
        service: LAST_OPEN_DATE_KEY,
      });
      const popupShownCredentials = await Keychain.getGenericPassword({ service: POPUP_SHOWN_KEY });

      const lastOpenDate = lastOpenCredentials ? lastOpenCredentials.password : null;
      const popupShown = popupShownCredentials ? popupShownCredentials.password : null;

      await Keychain.setGenericPassword(LAST_OPEN_DATE_KEY, today, { service: LAST_OPEN_DATE_KEY });

      setShowDailyBonus(true);
    } catch (error) {
      logger.error('Error checking daily bonus eligibility:', 'HOOK', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDailyBonus = async (): Promise<void> => {
    try {
      const today = new Date().toDateString();
      await Keychain.setGenericPassword(POPUP_SHOWN_KEY, today, { service: POPUP_SHOWN_KEY });
      setShowDailyBonus(false);
    } catch (error) {
      logger.error('Error marking daily bonus as shown:', 'HOOK', error);
    }
  };

  const handleClaimDailyBonus = async (reward: Reward): Promise<void> => {
    try {
      const today = new Date().toDateString();
      await Keychain.setGenericPassword(POPUP_SHOWN_KEY, today, { service: POPUP_SHOWN_KEY });
      setShowDailyBonus(false);
    } catch (error) {
      logger.error('Error processing daily bonus claim:', 'HOOK', error);
    }
  };

  return {
    showDailyBonus,
    isLoading,
    handleCloseDailyBonus,
    handleClaimDailyBonus,
  };
};
