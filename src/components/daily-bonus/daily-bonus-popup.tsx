import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  InteractionManager,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import { useTheme, useDailyRewards, useShop } from '../../hooks/useReduxHooks';
import { setUserBalance } from '../../store/slices/shopSlice';
import { scaleSize } from '../../utils/scaleSize';
import soundManager from '../../lib/audio/sound-manager';
import { useStandardResponsive } from '../../hooks/useStandardResponsive';
import { usePlatformOptimization, useHapticFeedback } from '../../hooks/usePlatformOptimization';
import {
  useGetDailyLoginStatusQuery,
  useClaimDailyLoginMutation,
} from '../../store/api/dailyLoginApi';

import AnimatedGems from './animated-gems';
import PopupHeader from './popup-header';
import StreakSection from './streak-section';
import RewardsGrid from './rewards-grid';
import PopupFooter from './popup-footer';

import { useAnimations } from '../../hooks/DailyBonus/use-animations';
import { useMeasurements } from '../../hooks/DailyBonus/use-measurements';
import { logger } from '../../lib/utils/logger';

interface DailyBonusPopupProps {
  visible: boolean;
  onClose: () => void;
  onClaim?: (day: number) => void; // Optional for backward compatibility
}

const DailyBonusPopup: React.FC<DailyBonusPopupProps> = ({ visible, onClose, onClaim }) => {
  const dispatch = useDispatch();
  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  // Responsive design hooks - single source of truth
  const {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    deviceType,
    width: screenWidth,
    height: screenHeight,
    width,
    height,
  } = useStandardResponsive();

  const { colors, isDarkMode } = useTheme();
  const {
    rewards,
    currentDay,
    streakCount,
    currentGems,
    updateRewards,
    resetRewardsState,
    claimDailyReward,
    fetchWeeklyStatus,
  } = useDailyRewards();
  const { userBalance, fetchUserGems } = useShop();

  // RTK Query hooks for daily login
  const { data: dailyLoginStatus, refetch: refetchDailyLoginStatus } = useGetDailyLoginStatusQuery(
    undefined,
    {
      skip: !visible, // Only fetch when popup is visible
      refetchOnMountOrArgChange: true, // Always refetch when popup opens
    }
  );
  const [claimDailyLogin, { isLoading: isClaimingDailyLogin }] = useClaimDailyLoginMutation();

  // Map day numbers to day names for day_status lookup
  // day_status uses: monday=1, tuesday=2, wednesday=3, thursday=4, friday=5, saturday=6, sunday=7
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

  // Ensure rewards is an array with 7 items (define early for use in other useMemos)
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
        // Check if this day is claimed based on days_claimed array OR day_status
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
      // Create a copy before sorting to avoid mutating Redux state
      return [...rewards].sort((a, b) => a.day - b.day);
    }

    // Final fallback: Return default rewards
    return defaultRewards.map(reward => ({
      ...reward,
      claimed: false,
      enabled: reward.day === 1, // Only enable day 1 by default
    }));
  }, [rewards, dailyLoginStatus]);

  // Memoize current total gems - use displayRewards
  const currentTotalGems = useMemo(() => {
    return displayRewards
      .filter(reward => reward.claimed)
      .reduce((sum, reward) => sum + reward.value, 0);
  }, [displayRewards]);

  // Get current day from API response, fallback to Redux currentDay
  const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;

  // Check if current day reward is already claimed - use displayRewards
  const currentDayReward = useMemo(() => {
    return displayRewards.find(reward => reward.day === apiCurrentDay);
  }, [displayRewards, apiCurrentDay]);

  const isCurrentDayClaimed = useMemo(() => {
    return currentDayReward ? currentDayReward.claimed : false;
  }, [currentDayReward]);

  // Check if user can claim today's reward - use displayRewards and API current day
  const canClaimToday = useMemo(() => {
    const todayReward = displayRewards.find(r => r.day === apiCurrentDay);
    const canClaim = !!(
      todayReward &&
      todayReward.enabled &&
      !todayReward.claimed &&
      !hasClaimedToday &&
      !dailyClaimCompleted &&
      !isClaimingDailyLogin
    );

    return canClaim;
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
    gemIconPosition,
    measureAllCards,
    measureGemsCount,
    measureGemIcon,
    onCardLayout,
    cleanup,
  } = useMeasurements();

  // Fetch gems immediately when popup becomes visible - ensures correct count before UI renders
  useEffect(() => {
    if (visible && fetchUserGems) fetchUserGems();
  }, [visible, fetchUserGems]);

  // Initialize popup when visible
  useEffect(() => {
    if (!visible) {
      setIsReady(false);
      return;
    }

    // OPTIMIZED: Use requestAnimationFrame instead of InteractionManager
    const frameId = requestAnimationFrame(() => {
      // Reset states
      ribbonAnim.setValue(0);
      const gemsToDisplay = userBalance?.gems ?? currentGems ?? currentTotalGems;
      setDisplayedGems(gemsToDisplay);
      setAnimatingGems(false);
      setClaimInProgress(false);
      // Use API data to determine if current day is claimed
      const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;
      const apiDaysClaimed = dailyLoginStatus?.days_claimed || [];
      const isApiClaimed = apiDaysClaimed.includes(apiCurrentDay);
      setHasClaimedToday(isApiClaimed || isCurrentDayClaimed);
      setDailyClaimCompleted(isApiClaimed || isCurrentDayClaimed);

      // CRITICAL: Refetch daily login status when popup opens to get latest state
      if (visible && dailyLoginStatus === undefined) {
        refetchDailyLoginStatus();
      }

      // Start animations
      startPulseAnimations();
      startShineAnimation();

      // Animate ribbon in smoothly
      setTimeout(() => {
        Animated.timing(ribbonAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }).start();
      }, 100);

      // Measure positions after a delay
      setTimeout(() => {
        measureAllCards();
        measureGemsCount(); // This measures the gem count center (target for animation)
        measureGemIcon(); // Keep for backward compatibility
        setIsReady(true);
      }, 500);
    });

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      resetAnimations();
      cleanup();
    };
  }, [
    visible,
    userBalance?.gems,
    currentGems,
    currentTotalGems,
    isCurrentDayClaimed,
    dailyLoginStatus,
    ribbonAnim,
    startPulseAnimations,
    startShineAnimation,
    measureAllCards,
    measureGemsCount,
    measureGemIcon,
    resetAnimations,
    cleanup,
    refetchDailyLoginStatus,
  ]);

  // Update displayed gems when API data loads - ensures correct count shows instantly
  useEffect(() => {
    if (!animatingGems) {
      const gemsToDisplay = userBalance?.gems ?? currentGems ?? currentTotalGems;
      setDisplayedGems(gemsToDisplay);
    }
  }, [userBalance?.gems, currentGems, currentTotalGems, animatingGems]);

  // Create a safe completion callback - DO NOT close popup
  const createSafeCompletionCallback = useCallback(() => {
    return async () => {
      try {
        const result = await claimDailyLogin().unwrap();
        if (typeof result?.total_gems === 'number') {
          dispatch(setUserBalance({ gems: result.total_gems }));
        }
        if (fetchUserGems) fetchUserGems();
        refetchDailyLoginStatus();
        if (result.current_day) updateRewards(result.current_day);
        setClaimInProgress(false);
      } catch (error: any) {
        logger.error('❌ Error in claim completion:', 'APP', error);
        // Even if there's an error, we should still try to update UI
        // Check if it's an "already claimed" error
        const errorMessage = error?.data?.message || error?.message || String(error);
        if (errorMessage.toLowerCase().includes('already claimed')) {
          // Already claimed - treat as success, refresh status
          refetchDailyLoginStatus();
        }
        // Still refresh gems from backend
        if (fetchUserGems) {
          fetchUserGems();
        }
        setClaimInProgress(false);
      }
    };
  }, [updateRewards, claimDailyLogin, refetchDailyLoginStatus, fetchUserGems, dispatch]);

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
      if (!reward || !reward.enabled || reward.claimed) {
        return;
      }

      // Only allow claiming current day (use API current day)
      const apiCurrentDay = dailyLoginStatus?.current_day || currentDay;
      if (day !== apiCurrentDay) {
        return;
      }

      // Play sound effect
      if (soundManager.isSoundEnabled) {
        soundManager.playSound('daily bonus').catch(() => {
          // Silently fail if sound can't play
        });
      }

      setClaimInProgress(true);
      setHasClaimedToday(true);
      setDailyClaimCompleted(true);

      // Trigger gem animation from the source card to the target gem count
      const sourcePosition = cardPositions[day.toString()] || getDefaultCardPosition(day);
      const targetPosition = gemsCountPosition.x > 0 ? gemsCountPosition : getDefaultTargetPosition();

      setAnimatingGems(true);

      // Create safe completion callback
      const safeCallback = createSafeCompletionCallback();

      // Start gem animation from source day's card
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

  const handleReset = useCallback(() => {
    if (claimInProgress || animatingGems) {
      return;
    }

    if (resetRewardsState) {
      resetRewardsState();
    }
    setHasClaimedToday(false);
    setDailyClaimCompleted(false);
  }, [claimInProgress, animatingGems, resetRewardsState]);

  const handleClose = useCallback(() => {
    if (claimInProgress || animatingGems) {
      return;
    }

    onClose();
  }, [claimInProgress, animatingGems, onClose]);

  // Prevent any accidental auto-close
  const preventAutoClose = useCallback(() => { }, []);

  // Default positions as fallbacks
  const getDefaultCardPosition = (day: number) => {
    const positions: { [key: number]: { x: number; y: number } } = {
      1: { x: 95, y: 350 },
      2: { x: 205, y: 350 },
      3: { x: 315, y: 350 },
      4: { x: 95, y: 470 },
      5: { x: 205, y: 470 },
      6: { x: 315, y: 470 },
      7: { x: 205, y: 590 },
    };
    return positions[day] || { x: 200, y: 400 };
  };

  const getDefaultTargetPosition = () => {
    // Default to center of screen (where gem count should be)
    const screenWidth = Dimensions.get('window').width;
    return { x: screenWidth / 2, y: 200 };
  };

  // Debug logs
  useEffect(() => {
    if (visible) {
    }
  }, [
    visible,
    rewards.length,
    displayRewards.length,
    currentDay,
    streakCount,
    isReady,
    canClaimToday,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={preventAutoClose}>
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
        ]}
      >
        <AnimatedGems
          animatingGems={animatingGems}
          gemPositions={gemPositions}
          gemOpacities={gemOpacities}
          gemScales={gemScales}
          cardPositions={cardPositions}
          currentDay={apiCurrentDay}
        />

        <View
          style={[
            styles.mainContainer,
            {
              backgroundColor: isDarkMode ? '#1a1a2e' : '#1a237e',
              borderColor: '#6c5ce7',
            },
          ]}
        >
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    overflow: 'visible',
    padding: scaleSize(8),
    paddingBottom: scaleSize(10),
    paddingTop: scaleSize(8),
  },
  mainContainer: {
    borderRadius: scaleSize(12),
    borderWidth: scaleSize(4),
    elevation: 10,
    marginTop: scaleSize(20),
    maxWidth: scaleSize(380),
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(4) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(8),
    width: '85%',
  },
  modalContainer: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});

export default DailyBonusPopup;
