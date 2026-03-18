import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useTheme, useDailyRewards, useShop } from '../../../hooks/useReduxHooks';
import { setUserBalance } from '../../../store/slices/shopSlice';
import { scaleSize } from '../../../utils/scaleSize';
import soundManager from '../../../lib/audio/sound-manager';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { usePlatformOptimization, useHapticFeedback } from '../../../hooks/usePlatformOptimization';
import {
  useGetDailyLoginStatusQuery,
  useClaimDailyLoginMutation,
} from '../../../store/api/dailyLoginApi';

import AnimatedGems from '../../../components/daily-bonus/animated-gems';
import PopupHeader from '../../../components/daily-bonus/popup-header';
import StreakSection from '../../../components/daily-bonus/streak-section';
import RewardsGrid from '../../../components/daily-bonus/rewards-grid';
import PopupFooter from '../../../components/daily-bonus/popup-footer';

import { useAnimations } from '../../../hooks/DailyBonus/use-animations';
import { useMeasurements } from '../../../hooks/DailyBonus/use-measurements';
import { logger } from '../../../lib/utils/logger';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useNavigation } from '@react-navigation/native';

export const DailyBonusScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  // Responsive design hooks - single source of truth
  const {
    isDarkMode,
  } = useStandardResponsive();

  const {
    rewards,
    currentDay,
    streakCount,
    currentGems,
    updateRewards,
    resetRewardsState,
  } = useDailyRewards();
  const { userBalance, fetchUserGems } = useShop();

  // RTK Query hooks for daily login
  const { data: dailyLoginStatus, refetch: refetchDailyLoginStatus } = useGetDailyLoginStatusQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const [claimDailyLogin, { isLoading: isClaimingDailyLogin }] = useClaimDailyLoginMutation();

  // Map day numbers to day names for day_status lookup
  const dayNumberToName: { [key: number]: string } = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  const [claimInProgress, setClaimInProgress] = useState(false);
  const [displayedGems, setDisplayedGems] = useState(0);
  const [animatingGems, setAnimatingGems] = useState(false);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [dailyClaimCompleted, setDailyClaimCompleted] = useState(false);

  // CRITICAL: Use API data (dailyLoginStatus) to determine enabled/claimed status
  const displayRewards = useMemo(() => {
    // Default reward values (gems per day)
    const defaultRewards = [
      { day: 1, type: 'diamond', value: 10, color: '#0066CC' },
      { day: 2, type: 'diamond', value: 10, color: '#0066CC' },
      { day: 3, type: 'diamond', value: 15, color: '#CC0066' },
      { day: 4, type: 'diamond', value: 15, color: '#0066CC' },
      { day: 5, type: 'diamond', value: 20, color: '#CC0066' },
      { day: 6, type: 'diamond', value: 20, color: '#0066CC' },
      { day: 7, type: 'diamonds', value: 30, color: '#CC0066' },
    ];

    // If we have API data, use it to determine enabled/claimed status
    if (dailyLoginStatus) {
      const apiCurrentDay = dailyLoginStatus.current_day || 1;
      const apiDaysClaimed = dailyLoginStatus.days_claimed || [];
      const apiDayStatus = dailyLoginStatus.day_status || {};

      return defaultRewards.map(reward => {
        const dayName = dayNumberToName[reward.day];
        const isClaimedByArray = apiDaysClaimed.includes(reward.day);
        const isClaimedByStatus = apiDayStatus[dayName] === true;
        const isClaimed = isClaimedByArray || isClaimedByStatus;

        // All days up to current day (or already claimed) are enabled (unlocked)
        const isEnabled = isClaimed || reward.day <= apiCurrentDay;

        return {
          ...reward,
          claimed: isClaimed,
          enabled: isEnabled,
        };
      });
    }

    // Fallback: Use Redux rewards if API data not available
    if (Array.isArray(rewards) && rewards.length === 7) {
      return [...rewards].sort((a, b) => a.day - b.day);
    }

    // Final fallback: Return default rewards
    return defaultRewards.map(reward => ({
      ...reward,
      claimed: false,
      enabled: reward.day === 1,
    }));
  }, [rewards, dailyLoginStatus]);

  // Memoize current total gems
  const currentTotalGems = useMemo(() => {
    return displayRewards
      .filter(reward => reward.claimed)
      .reduce((sum, reward) => sum + reward.value, 0);
  }, [displayRewards]);

  // Get current day from API response, fallback to Redux currentDay
  const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;

  // Check if user can claim today's reward
  const canClaimToday = useMemo(() => {
    const todayReward = displayRewards.find(r => r.day === apiCurrentDay);
    return !!(
      todayReward &&
      todayReward.enabled &&
      !todayReward.claimed &&
      !hasClaimedToday &&
      !dailyClaimCompleted &&
      !isClaimingDailyLogin
    );
  }, [displayRewards, apiCurrentDay, hasClaimedToday, dailyClaimCompleted, isClaimingDailyLogin]);

  // Animation hooks
  const {
    ribbonAnim,
    scaleAnims,
    shineAnim,
    gemPositions,
    gemOpacities,
    gemScales,
    startPulseAnimations,
    startShineAnimation,
    animateGemsCollection,
    animateCounter,
    resetAnimations,
  } = useAnimations(setAnimatingGems, setDisplayedGems);

  // Measurement hooks
  const {
    cardRefs,
    gemsCountRef,
    gemIconRef,
    cardPositions,
    gemsCountPosition,
    measureAllCards,
    measureGemsCount,
    measureGemIcon,
    onCardLayout,
    cleanup,
  } = useMeasurements();

  // Fetch gems immediately on mount - ensures correct count before UI renders
  useEffect(() => {
    if (fetchUserGems) fetchUserGems();
  }, [fetchUserGems]);

  // Initialize when screen is mounted
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      // Reset states
      ribbonAnim.setValue(0);
      const gemsToDisplay = userBalance?.gems ?? currentGems ?? currentTotalGems;
      setDisplayedGems(gemsToDisplay);
      setAnimatingGems(false);
      setClaimInProgress(false);

      const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;
      const apiDaysClaimed = dailyLoginStatus?.days_claimed || [];
      const isApiClaimed = apiDaysClaimed.includes(apiCurrentDay);
      setHasClaimedToday(isApiClaimed);
      setDailyClaimCompleted(isApiClaimed);

      // Start animations
      startPulseAnimations();
      startShineAnimation();

      // Animate ribbon in
      setTimeout(() => {
        Animated.timing(ribbonAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }).start();
      }, 100);

      // Measure positions
      setTimeout(() => {
        measureAllCards();
        measureGemsCount();
        measureGemIcon();
        setIsReady(true);
      }, 500);
    });

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resetAnimations();
      cleanup();
    };
  }, [
    userBalance?.gems,
    currentGems,
    currentTotalGems,
    dailyLoginStatus,
    ribbonAnim,
    startPulseAnimations,
    startShineAnimation,
    measureAllCards,
    measureGemsCount,
    measureGemIcon,
    resetAnimations,
    cleanup,
  ]);

  // Update displayed gems when API data loads - ensures correct count shows instantly
  useEffect(() => {
    if (!animatingGems) {
      const gemsToDisplay = userBalance?.gems ?? currentGems ?? currentTotalGems;
      setDisplayedGems(gemsToDisplay);
    }
  }, [userBalance?.gems, currentGems, currentTotalGems, animatingGems]);

  const createSafeCompletionCallback = useCallback(() => {
    return async () => {
      try {
        const result = await claimDailyLogin().unwrap();
        if (typeof result?.total_gems === 'number') {
          dispatch(setUserBalance({ gems: result.total_gems }));
        }
        if (fetchUserGems) fetchUserGems();
        refetchDailyLoginStatus();
        setClaimInProgress(false);
      } catch (error: any) {
        logger.error('❌ Error in claim completion:', 'APP', error);
        refetchDailyLoginStatus();
        if (fetchUserGems) fetchUserGems();
        setClaimInProgress(false);
      }
    };
  }, [claimDailyLogin, refetchDailyLoginStatus, fetchUserGems, dispatch]);

  const handleClaim = useCallback(
    (day: number) => {
      if (
        claimInProgress ||
        animatingGems ||
        hasClaimedToday ||
        dailyClaimCompleted ||
        !isReady ||
        !canClaimToday ||
        isClaimingDailyLogin
      ) {
        return;
      }

      const reward = displayRewards.find(r => r.day === day);
      if (!reward || !reward.enabled || reward.claimed) return;

      const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;
      if (day !== apiCurrentDay) return;

      if (soundManager.isSoundEnabled) {
        soundManager.playSound('daily bonus').catch(() => { });
      }

      setClaimInProgress(true);
      setHasClaimedToday(true);
      setDailyClaimCompleted(true);

      const sourcePosition = cardPositions[day.toString()] || { x: 200, y: 400 };
      const targetPosition =
        gemsCountPosition.x > 0 ? gemsCountPosition : { x: Dimensions.get('window').width / 2, y: 200 };

      const safeCallback = createSafeCompletionCallback();

      const actualTotal = userBalance?.gems ?? currentGems ?? currentTotalGems;
      animateGemsCollection(
        day,
        sourcePosition,
        targetPosition,
        actualTotal,
        displayRewards,
        animateCounter,
        safeCallback
      );
    },
    [
      claimInProgress,
      animatingGems,
      hasClaimedToday,
      dailyClaimCompleted,
      isReady,
      canClaimToday,
      isClaimingDailyLogin,
      displayRewards,
      currentDay,
      cardPositions,
      gemsCountPosition,
      userBalance?.gems,
      currentGems,
      currentTotalGems,
      animateGemsCollection,
      animateCounter,
      createSafeCompletionCallback,
      dailyLoginStatus,
    ]
  );

  const handleClose = useCallback(() => {
    if (claimInProgress || animatingGems) return;
    navigation.goBack();
  }, [claimInProgress, animatingGems, navigation]);

  return (
    <SafeScreenWrapper
      statusBarStyle="light-content"
      backgroundColor="#1a237e"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.modalContainer}>
        <AnimatedGems
          animatingGems={animatingGems}
          gemPositions={gemPositions}
          gemOpacities={gemOpacities}
          gemScales={gemScales}
          cardPositions={cardPositions}
          currentDay={apiCurrentDay}
        />

        <View style={[styles.mainContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#1a237e' }]}>
          <PopupHeader
            ribbonAnim={ribbonAnim}
            isDarkMode={isDarkMode}
            onClose={handleClose}
            disabled={claimInProgress || animatingGems}
          />

          <View style={styles.contentContainer}>
            <StreakSection
              isDarkMode={isDarkMode}
              streakCount={streakCount}
              displayedGems={displayedGems}
              totalGemsEarnedThisWeek={dailyLoginStatus?.total_gems_earned_this_week}
              gemsCountRef={gemsCountRef}
              gemIconRef={gemIconRef}
              onGemsCountLayout={measureGemsCount}
              onGemIconLayout={measureGemIcon}
            />

            <RewardsGrid
              rewards={displayRewards}
              currentDay={dailyLoginStatus?.current_day || currentDay}
              isDarkMode={isDarkMode}
              scaleAnims={scaleAnims}
              shineAnim={shineAnim}
              cardRefs={cardRefs}
              onCardLayout={onCardLayout}
              onClaim={handleClaim}
              disabled={
                claimInProgress ||
                animatingGems ||
                hasClaimedToday ||
                dailyClaimCompleted ||
                !isReady ||
                isClaimingDailyLogin
              }
            />

            <PopupFooter
              isDarkMode={isDarkMode}
              rewards={displayRewards}
              currentDay={dailyLoginStatus?.current_day || currentDay}
              claimInProgress={claimInProgress}
              hasClaimedToday={hasClaimedToday || dailyClaimCompleted}
              animatingGems={animatingGems}
              canClaimToday={canClaimToday}
            />
          </View>
        </View>
      </View>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: scaleSize(10),
    paddingTop: scaleSize(14),
  },
  mainContainer: {
    borderRadius: scaleSize(12),
    borderWidth: scaleSize(4),
    borderColor: '#6c5ce7',
    elevation: 10,
    marginTop: scaleSize(20),
    maxWidth: scaleSize(380),
    width: '95%',
    alignSelf: 'center',
  },
  modalContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

export default DailyBonusScreen;
