/**
 * Header - TypeScript Implementation
 * Professional header component with comprehensive features
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../navigation/types';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useThemeColors } from '../../../utils/themeColors';
import { useDailyRewards } from '../../../hooks/useReduxHooks';
import LottieView from 'lottie-react-native';
import NotificationPopup from './NotificationPopup';
import DailyBonusPopup from '../../../components/daily-bonus/daily-bonus-popup';
import { sampleNotifications } from '../../data/notificationData';
import {
  getNotifications,
  subscribe,
  markAsRead,
  markAllAsRead,
  fetchNotificationsFromAPI,
  getUnreadCount,
  removeNotification,
  clearAll,
} from '../../../services/notificationService';
import { DAILY_REWARDS_CONFIG } from '../../../config/config';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import OptimizedImage from '../../../components/OptimizedImage';
// Profile Redux
import { fetchProfileSummary } from '../../../store/profileSlice';
import type { RootState } from '../../../store/store';
import { useProfileData } from '../../../hooks/profile/useProfileData';
import { isLottieFile } from '../../../utils/safeValues';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: string;
}

// RootState is now imported from store

const getInitials = (emailOrUsername: string): string => {
  if (!emailOrUsername) return 'U';
  const name = emailOrUsername.split('@')[0];
  const words = name.split(/[._\s]/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

// getInitials and isLottieFile moved to top level or imported
// const isLottieFile removed as we now use the one from safeValues.ts

const headerBg = require('../../../../assets/headerbg.png');

const Header: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();
  const themeColors = useThemeColors();
  const {
    hasUnclaimedReward,
    updateRewards,
    currentDay,
    rewards,
    resetDailyRewards,
    claimDailyReward,
  } = useDailyRewards();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Subscribe to notification service changes
  useEffect(() => {
    // Load initial notifications
    const initialNotifications = getNotifications();
    setNotifications(
      initialNotifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        read: n.read,
        type: n.type,
      }))
    );

    // Subscribe to changes
    const unsubscribe = subscribe((updatedNotifications: any[]) => {
      setNotifications(
        updatedNotifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
          type: n.type,
        }))
      );
    });

    return unsubscribe;
  }, []);

  // Initial fetch of unread count on mount
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        // Fallback to local count
        const initialNotifications = getNotifications();
        const localCount = initialNotifications.filter(n => !n.read).length;
        setUnreadCount(localCount);
      }
    };
    fetchInitialUnreadCount();
  }, []);

  // Fetch notifications from API instantly when popup opens
  useEffect(() => {
    if (showNotifications) {
      // Fetch from API immediately when popup opens
      fetchNotificationsFromAPI()
        .then((fetchedNotifications: any[]) => {
          const mappedNotifications = fetchedNotifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timestamp: n.timestamp,
            read: n.read,
            type: n.type,
          }));
          setNotifications(mappedNotifications);
          // Update unread count after fetching notifications
          const localCount = mappedNotifications.filter(n => !n.read).length;
          setUnreadCount(localCount);
          // Also fetch from API to get accurate count
          getUnreadCount()
            .then(count => {
              setUnreadCount(count);
            })
            .catch(() => {
              // Keep local count if API fails
            });
        })
        .catch((error: any) => {
          // Error already logged in service
        });
    }
  }, [showNotifications]);
  const [showDailyBonus, setShowDailyBonus] = useState<boolean>(false);

  const profileAnimation = useButtonAnimation();
  const dailyRewardsAnimation = useButtonAnimation();
  const notificationsAnimation = useButtonAnimation();
  const shopAnimation = useButtonAnimation();
  const resetAnimation = useButtonAnimation();
  const {
    width: screenWidth,
    height: screenHeight,
    horizontalPadding,
    verticalPadding,
    getResponsiveFontSize,
    getResponsiveIconSize,
    getResponsiveSpacing,
    isSmallDevice,
    isTablet,
  } = useStandardResponsive();

  // Get auth state from Redux
  const authState = useSelector((state: RootState) => state.auth);
  const { userInfo, user, isAuthenticated, token } = authState || {};

  // Use the standardized profile hook (consistent with ProfileScreen)
  const { profileData } = useProfileData();

  // Use profile data from Redux (same as ProfileScreen) with fallback to auth state - memoized
  // Match ProfileScreen logic: Use profile_pic_url if profile_pic_type is 'custom', otherwise use avatar
  // CRITICAL: Add null checks to prevent crashes
  const avatarUrl = useMemo(() => {
    try {
      if (profileData?.profile_pic_type === 'custom' && profileData?.profile_pic_url) {
        return profileData.profile_pic_url;
      }
      if (profileData?.profile_pic_type === 'avatar' && profileData?.avatar?.url) {
        return profileData.avatar.url;
      }
      return (
        profileData?.profile_pic_url ||
        profileData?.avatar?.url ||
        userInfo?.avatar_url ||
        user?.picture ||
        null
      );
    } catch (error) {
      return userInfo?.avatar_url || user?.picture || null;
    }
  }, [profileData, userInfo, user]);

  const frameUrl = useMemo(() => {
    try {
      return profileData?.frame?.url || userInfo?.frame_url || null;
    } catch (error) {
      return userInfo?.frame_url || null;
    }
  }, [profileData, userInfo]);

  // Get badge from profile data (from API) - use new badge structure or fallback - same as ProfileScreen - memoized
  const badgeImageUrl = useMemo(() => {
    try {
      return (
        profileData?.badge?.image_url ||
        profileData?.badge_image_url ||
        userInfo?.badge_image_url ||
        'https://www.transparentpng.com/thumb/award-ribbon/yellow-award-ribbon-png-0.png'
      );
    } catch (error) {
      return (
        userInfo?.badge_image_url ||
        'https://www.transparentpng.com/thumb/award-ribbon/yellow-award-ribbon-png-0.png'
      );
    }
  }, [profileData, userInfo]);

  // Get gems and coins from profile data
  const totalGems = useMemo(() => profileData?.total_gems || 0, [profileData?.total_gems]);
  const totalTriviaCoins = useMemo(
    () => profileData?.total_trivia_coins || 0,
    [profileData?.total_trivia_coins]
  );
  const subscriptionBadges = useMemo(
    () => profileData?.subscription_badges || [],
    [profileData?.subscription_badges]
  );

  const username = useMemo(() => {
    try {
      return profileData?.username || userInfo?.username || user?.name || 'User';
    } catch (error) {
      return userInfo?.username || user?.name || 'User';
    }
  }, [profileData, userInfo, user]);

  const emailOrUsername = useMemo(() => {
    try {
      return profileData?.email || userInfo?.email || user?.email || 'user';
    } catch (error) {
      return userInfo?.email || user?.email || 'user';
    }
  }, [profileData, userInfo, user]);

  const initials = useMemo(() => {
    try {
      return getInitials(emailOrUsername || username);
    } catch (error) {
      return 'U';
    }
  }, [emailOrUsername, username]);

  const isSubscribed = useMemo(
    () =>
      !!userInfo?.badge_id ||
      profileData?.avatar?.is_premium ||
      profileData?.frame?.is_premium ||
      false,
    [userInfo, profileData]
  );
  const isExistingUser = useMemo(() => userInfo?.is_existing_user || false, [userInfo]);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Calculate unread count from local notifications (for immediate UI update)
  const localUnreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Fetch unread count from API and update when notifications change
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        // Fallback to local count
        setUnreadCount(localUnreadCount);
      }
    };

    // Update from local notifications immediately for instant UI feedback
    setUnreadCount(localUnreadCount);

    // Then fetch from API to sync with server
    fetchUnreadCount();
  }, [notifications, localUnreadCount]);

  // Also fetch unread count when popup opens/closes to ensure it's up to date
  useEffect(() => {
    if (showNotifications) {
      const fetchUnreadCount = async () => {
        try {
          const count = await getUnreadCount();
          setUnreadCount(count);
        } catch (error) {
          // Fallback to local count
          const localCount = notifications.filter(n => !n.read).length;
          setUnreadCount(localCount);
        }
      };
      fetchUnreadCount();
    } else {
      // Also refresh count when popup closes
      const fetchUnreadCount = async () => {
        try {
          const count = await getUnreadCount();
          setUnreadCount(count);
        } catch (error) {
          // Fallback to local count
          const localCount = notifications.filter(n => !n.read).length;
          setUnreadCount(localCount);
        }
      };
      fetchUnreadCount();
    }
  }, [showNotifications, notifications]);

  const capitalizeFirstLetter = useCallback((str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }, []);

  const userName = useMemo(
    () => capitalizeFirstLetter(username),
    [username, capitalizeFirstLetter]
  );

  const navigateToProfile = useCallback((): void => {
    navigation.navigate('Profile');
  }, [navigation]);

  const navigateToNotifications = useCallback((): void => {
    setShowNotifications(true);
  }, []);

  const navigateToShop = useCallback((): void => {
    navigation.navigate('Shop');
  }, [navigation]);

  const handleDailyRewardsPress = useCallback((): void => {
    setShowDailyBonus(true);
  }, []);

  const handleDailyBonusClaim = useCallback(
    async (day: number): Promise<void> => {
      try {
        // Update local state first for immediate UI feedback
        updateRewards(day);
        // Claim the reward via API
        await claimDailyReward();
        // Close popup after successful claim
        setShowDailyBonus(false);
      } catch (error) {
        // Popup will remain open if claim fails
      }
    },
    [updateRewards, claimDailyReward]
  );

  const handleDailyBonusClose = useCallback((): void => {
    setShowDailyBonus(false);
  }, []);

  const markNotificationAsRead = useCallback(async (id: string): Promise<void> => {
    await markAsRead(id);
    // State will update via subscription
  }, []);

  const markAllNotificationsAsRead = useCallback(async (): Promise<void> => {
    await markAllAsRead();
    // State will update via subscription
  }, []);

  const handleDeleteNotification = useCallback(
    async (id: string): Promise<void> => {
      await removeNotification(id);
      // State will update via subscription
      // Also refresh unread count after deletion
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        // Fallback to local count
        const localCount = notifications.filter(n => !n.read).length;
        setUnreadCount(localCount);
      }
    },
    [notifications]
  );

  const handleDeleteAllNotifications = useCallback(async (): Promise<void> => {
    await clearAll();
    // State will update via subscription
    // Also refresh unread count after deletion
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Fallback to local count
      setUnreadCount(0);
    }
  }, []);

  const handleResetDailyRewards = useCallback((): void => {
    resetDailyRewards();
  }, [resetDailyRewards]);

  // Memoize all size calculations
  const headerPadding = useMemo(() => scaleSize(20), []);
  const avatarSize = useMemo(() => scaleSize(42), []); // Reduced for "inside" look
  const containerSize = useMemo(() => scaleSize(64), []); // Large "outside" frame
  const iconSize = useMemo(() => scaleSize(28), []);
  const badgeSize = useMemo(() => scaleSize(18), []);
  const welcomeTextSize = useMemo(
    () => getResponsiveFontSize(scaleSize(14)),
    [getResponsiveFontSize]
  );
  const userNameSize = useMemo(() => getResponsiveFontSize(scaleSize(14)), [getResponsiveFontSize]); // Reduced from 18 to 14
  const initialsSize = useMemo(() => scaleSize(16), []);
  const notificationCountSize = useMemo(() => scaleSize(10), []);
  const resetButtonSize = useMemo(() => scaleSize(10), []);

  // Memoize Lottie file check - use standardized isLottieFile from safeValues.ts
  const isAvatarLottie = useMemo(
    () => isLottieFile(avatarUrl),
    [avatarUrl]
  );
  const isFrameLottie = useMemo(
    () => isLottieFile(frameUrl),
    [frameUrl]
  );
  const isBadgeLottie = useMemo(() => isLottieFile(badgeImageUrl), [badgeImageUrl]);

  // Icon sizes for top bar - gemBg and coinBg are PILL/BAR shaped (wide, not square)
  // Width is larger than height to match the actual pill shape of the images
  const topIconWidth = useMemo(() => scaleSize(105), []); // Reduced for standardization
  const topIconHeight = useMemo(() => scaleSize(45), []); // Short height to remove top/bottom space

  return (
    <>
      <View
        style={{
          zIndex: 100, // Ensure header is above daily rewards card
          paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? scaleSize(20) : 0),
          backgroundColor: 'transparent',
          overflow: 'visible',
        }}
      >
        {/* Top Header Bar - Gem/Coin pills + Notification */}
        <View
          style={{
            paddingVertical: scaleSize(4),
            paddingHorizontal: scaleSize(10),
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left side: Gem and Coin - Pill bars */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scaleSize(6),
            }}
          >
            {/* Gem Background Image with Value */}
            <ImageBackground
              source={require('../../../../assets/common/gemBg.png')}
              style={{
                width: topIconWidth,
                height: topIconHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              resizeMode="contain"
            >
              <Text
                style={{
                  color: '#000000',
                  fontSize: scaleSize(14),
                  fontWeight: 'bold',
                  fontFamily: 'Baloo2',
                }}
              >
                {totalGems.toLocaleString()}
              </Text>
            </ImageBackground>

            {/* Coin Background Image with Value */}
            <ImageBackground
              source={require('../../../../assets/common/coinBg.png')}
              style={{
                width: topIconWidth,
                height: topIconHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              resizeMode="contain"
            >
              <Text
                style={{
                  color: '#000000',
                  fontSize: scaleSize(14),
                  fontWeight: 'bold',
                  fontFamily: 'Baloo2',
                }}
              >
                {totalTriviaCoins.toLocaleString()}
              </Text>
            </ImageBackground>
          </View>

          {/* Profile Icon - Right Side beside Gems/Coins */}
          <Animated.View style={profileAnimation.animatedStyle}>
            <SoundTouchableOpacity
              onPress={navigateToProfile}
              onPressIn={profileAnimation.animatePress}
              onPressOut={profileAnimation.animateRelease}
              activeOpacity={1}
              style={{ paddingRight: scaleSize(10) }}
            >
              <View
                style={{
                  position: 'relative',
                  width: containerSize,
                  height: containerSize,
                  overflow: 'visible',
                }}
              >
                {/* Profile PNG Background */}
                <ImageBackground
                  source={require('../../../../assets/home/profile.png')}
                  style={{
                    width: containerSize,
                    height: containerSize,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                  }}
                  resizeMode="contain"
                >
                  <View style={{ width: containerSize, height: containerSize }} />
                </ImageBackground>

                {/* Profile Image Only - Smaller and Centered inside frame */}
                <View
                  style={{
                    position: 'absolute',
                    top: (containerSize - avatarSize) / 2,
                    left: (containerSize - avatarSize) / 2,
                    width: avatarSize,
                    height: avatarSize,
                    zIndex: 2,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: avatarSize / 2,
                  }}
                >
                  {avatarUrl && isAvatarLottie ? (
                    <LottieView
                      source={{ uri: avatarUrl }}
                      autoPlay
                      loop
                      renderMode="SOFTWARE"
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                      onAnimationFailure={error => {
                        // Fallback handled by error state
                      }}
                    />
                  ) : avatarUrl && !isAvatarLottie ? (
                    <OptimizedImage
                      source={{ uri: avatarUrl }}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: themeColors.gray200,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: initialsSize,
                          color: themeColors.gray600,
                          fontWeight: 'bold',
                        }}
                      >
                        {initials}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Star Icon at Top Right Corner of Frame with Level */}
                {profileData?.level !== undefined && profileData?.level !== null && (
                  <View
                    style={{
                      position: 'absolute',
                      top: scaleSize(-8),
                      right: scaleSize(-8),
                      zIndex: 10,
                    }}
                  >
                    <Image
                      source={require('../../../../assets/home/star.png')}
                      style={{
                        width: scaleSize(30),
                        height: scaleSize(30),
                      }}
                      resizeMode="contain"
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#000000',
                          fontSize: scaleSize(12),
                          fontWeight: 'bold',
                        }}
                      >
                        {profileData.level}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </SoundTouchableOpacity>
          </Animated.View>
        </View>

        {/* Main Content Area */}
        {/* Main Content Area - Logo Row */}
        <View
          style={{
            paddingTop: scaleSize(2),
            paddingHorizontal: horizontalPadding,
            paddingBottom: scaleSize(2),
          }}
        >
          {/* Logo Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: scaleSize(12),
            }}
          >
            {/* Left: Logo - Moved down 20px */}
            <Image
              source={require('../../../../assets/home/logo.png')}
              style={{
                width: getResponsiveIconSize(200),
                height: getResponsiveIconSize(68),
                marginTop: scaleSize(8), // Further reduced from 14 to move up
              }}
              resizeMode="contain"
            />

            {/* Right: Gift and Notifications - Moved down by 10px extra to align with logo */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: scaleSize(12),
                marginTop: scaleSize(20), // Further reduced from 26 (aligns with logo 8 + adjustment)
              }}
            >
              {/* Gift and Notification Icons - Horizontally Aligned */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scaleSize(12),
                }}
              >
                {/* Gift Icon - Left Side */}
                <Animated.View style={dailyRewardsAnimation.animatedStyle}>
                  <SoundTouchableOpacity
                    onPress={handleDailyRewardsPress}
                    onPressIn={dailyRewardsAnimation.animatePress}
                    onPressOut={dailyRewardsAnimation.animateRelease}
                    activeOpacity={1}
                    style={{ position: 'relative' }}
                  >
                    <Image
                      source={require('../../../../assets/home/giftIcon.png')}
                      style={{
                        width: scaleSize(42),
                        height: scaleSize(42),
                      }}
                      resizeMode="contain"
                    />
                    {hasUnclaimedReward && (
                      <View
                        style={{
                          position: 'absolute',
                          top: scaleSize(-2),
                          right: scaleSize(-2),
                          borderRadius: scaleSize(10),
                          backgroundColor: themeColors.success,
                          borderWidth: 1,
                          borderColor: isDarkMode ? colors.cardBackground : 'white',
                          width: scaleSize(12),
                          height: scaleSize(12),
                        }}
                      />
                    )}
                  </SoundTouchableOpacity>
                </Animated.View>

                {/* Notification Icon - Right Side */}
                <Animated.View style={notificationsAnimation.animatedStyle}>
                  <SoundTouchableOpacity
                    onPress={navigateToNotifications}
                    onPressIn={notificationsAnimation.animatePress}
                    onPressOut={notificationsAnimation.animateRelease}
                    activeOpacity={1}
                    style={{ position: 'relative' }}
                  >
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={require('../../../../assets/navigation/notificationIcon.png')}
                        style={{
                          width: scaleSize(36),
                          height: scaleSize(36),
                        }}
                        resizeMode="contain"
                      />
                      {(unreadCount > 0 || localUnreadCount > 0) && (
                        <View
                          style={{
                            position: 'absolute',
                            top: scaleSize(-4),
                            right: scaleSize(-4),
                            borderRadius: scaleSize(10),
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: themeColors.error,
                            borderWidth: 1.5,
                            borderColor: isDarkMode ? colors.cardBackground : 'white',
                            minWidth: scaleSize(18),
                            height: scaleSize(18),
                            paddingHorizontal:
                              unreadCount > 9 || localUnreadCount > 9 ? scaleSize(4) : 0,
                            zIndex: 10,
                          }}
                        >
                          <Text
                            style={[
                              typography.buttonSmall,
                              {
                                color: themeColors.white,
                                fontSize: scaleSize(10),
                                fontWeight: 'bold',
                                lineHeight: scaleSize(12),
                              },
                            ]}
                          >
                            {(unreadCount > 0 ? unreadCount : localUnreadCount) > 9
                              ? '9+'
                              : String(unreadCount > 0 ? unreadCount : localUnreadCount)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </SoundTouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <NotificationPopup
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        markAsRead={markNotificationAsRead}
        markAllAsRead={markAllNotificationsAsRead}
        onDelete={handleDeleteNotification}
        onDeleteAll={handleDeleteAllNotifications}
      />

      {/* Daily Bonus Popup - Shows when gift icon is tapped */}
      <DailyBonusPopup
        visible={showDailyBonus}
        onClose={handleDailyBonusClose}
        onClaim={handleDailyBonusClaim}
      />
    </>
  );
};

export default Header;
