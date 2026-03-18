/**
 * MembersScreen - Updated TypeScript Implementation
 * Professional members screen with comprehensive features
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  Platform,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import UserProfileModal from '../../../core/components/UserProfileModal';
import ReferralModal from '../../../core/components/ReferralModal';
import { useTheme } from '../../../hooks/useReduxHooks';
import LottieView from 'lottie-react-native';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import useResponsive from '../../../core/hooks/useResponsive';
import { useDimensions } from '../../../hooks/useDimensions';
import {
  usePlatformOptimization,
  useHapticFeedback,
  useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { useTrackScreenView, useAnalytics } from '../../../hooks/useAnalytics';
import ProfileFrame from '../../../components/ProfileFrame';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { keychainStorage } from '../../../services/keychainStorage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { apiService } from '../../../services/apiService';
import {
  useGetFreeLeaderboardQuery,
  useGetBronzeLeaderboardQuery,
  useGetSilverLeaderboardQuery,
  LeaderboardEntry as ApiLeaderboardEntry,
} from '../../../store/api/leaderboardApi';
import { profileApi, useGetProfileQuery } from '../../../store/api/profileApi';
import MemberItem from '../components/MemberItem';

dayjs.extend(utc);
dayjs.extend(timezone);

const { width, height } = Dimensions.get('window');

interface Badge {
  id: number;
  icon: string;
}

interface Member {
  id: number;
  rank: number;
  name: string;
  image: string;
  amount: string;
  level?: number;
  level_progress?: string;
  color?: string;
  lastOnline?: string;
  isOnline?: boolean;
  badges?: Badge[];
  subscription_badges?: any[];
  isCurrentUser?: boolean;
  frame?: string;
  badgeImage?: any;
  // User ID fields for chat navigation
  userid?: number;
  user_id?: number;
  account_id?: number;
  peer_user_id?: number;
  countryCode?: string;
}

interface RootState {
  auth: {
    user?: any;
  };
}

// Helper function to check if URL is a Lottie file - improved to match ProfilePicture component
const isLottieFile = (url: string | null | undefined, mimeType?: string): boolean => {
  if (!url) return false;
  // Check mime_type first (most reliable)
  if (mimeType === 'application/json') return true;
  // Fallback to URL check
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.json') ||
    url.includes('.json?') ||
    url.includes('.json&') ||
    url.includes('lottiefiles.com')
  );
};

const LeaderboardScreen: React.FC = () => {
  // CRITICAL: Check focus FIRST to prevent unnecessary work when not focused
  const isFocused = useIsFocused();

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();

  usePlatformOptimization();
  useAndroidBackButton(() => {
    // Allow default navigation back behavior
    return false;
  });

  // Analytics tracking - only when focused
  useTrackScreenView('LeaderboardScreen');
  const { trackEvent } = useAnalytics();

  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<string>('free');
  const flatListRef = useRef<FlatList>(null);
  const { isDarkMode, colors } = useTheme();
  const lottieRef = useRef<LottieView>(null);
  /* REMOVED: const leaderboard = useLeaderboard(); replaced by RTK Query below */
  const joinButtonAnimation = useButtonAnimation();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [drawDate, setDrawDate] = useState<string>(() => dayjs().tz('America/New_York').format('YYYY-MM-DD'));

  const { data: profileData, isLoading: isProfileLoading } =
    profileApi.useGetProfileQuery(undefined); // Replaced useProfileData
  const [storedSubscriptionType, setStoredSubscriptionType] = useState<string | null>(null);

  // RTK Query hooks for Leaderboard
  // Use drawDate (calculated below) as the argument
  const {
    data: freeLeaderboardRaw,
    isLoading: isFreeLoading,
    error: freeError,
    refetch: refetchFree,
  } = useGetFreeLeaderboardQuery(drawDate || '', {
    skip: !drawDate,
    pollingInterval: 60000, // Refresh every minute
  });

  const {
    data: bronzeLeaderboardRaw,
    isLoading: isBronzeLoading,
    error: bronzeError,
    refetch: refetchBronze,
  } = useGetBronzeLeaderboardQuery(drawDate || '', {
    skip: !drawDate,
    pollingInterval: 60000,
  });

  const {
    data: silverLeaderboardRaw,
    isLoading: isSilverLoading,
    error: silverError,
    refetch: refetchSilver,
  } = useGetSilverLeaderboardQuery(drawDate || '', {
    skip: !drawDate,
    pollingInterval: 60000,
  });

  // Current user username for highlighting
  const currentUsername = useSelector((state: RootState) => state.auth.user?.username);

  // Transform helper
  const transformLeaderboardData = useCallback(
    (data: ApiLeaderboardEntry[] | undefined): Member[] => {
      if (!data || !Array.isArray(data)) return [];

      return data.map((entry, index) => {
        // Extract user_id from API response (API returns user_id field)
        // The entry should have user_id preserved from transformResponse in leaderboardApi
        const userId = entry.user_id || (entry as any).user_id || null;
        const entryAny = entry as any; // Type assertion for accessing raw fields

        // Replicate transformation logic from useLeaderboard
        return {
          id: index + 1, // Display rank (1-based index)
          rank: entry.rank || entryAny.position || index + 1,
          name: entry.username,
          image:
            entry.profile_pic_url ||
            entryAny.profile_pic ||
            entry.avatar_url ||
            'https://randomuser.me/api/portraits/lego/1.jpg', // Fallback
          amount: formatLeaderboardAmount(
            entry.score || entryAny.gems_awarded || entryAny.amount_won || 0
          ),
          level: entry.level || entryAny.level,
          level_progress: entry.level_progress || entryAny.level_progress,
          color: getRandomColor(index),
          lastOnline: getRandomLastOnline(),
          isOnline: Math.random() > 0.5,
          badges: generateRandomBadges(),
          subscription_badges: entry.subscription_badges || entryAny.subscription_badges || [],
          isCurrentUser: entry.username === currentUsername,
          frame: undefined, // Frame support if needed
          badgeImage: entry.badge_image_url || entryAny.badge_image_url,
          // CRITICAL: Map user_id from API response to all ID fields for UserProfileModal
          // The API response has user_id field (e.g., user_id: 6030295538)
          user_id: userId, // Map API user_id to user_id field
          userid: userId, // Also map to userid (lowercase) for compatibility
          account_id: userId, // Map to account_id for chat functionality
          peer_user_id: userId, // Map to peer_user_id for chat functionality
        } as Member;
      });
    },
    [currentUsername]
  );

  // Memoize transformed data
  const freeLeaderboard = useMemo(
    () => transformLeaderboardData(freeLeaderboardRaw),
    [freeLeaderboardRaw, transformLeaderboardData]
  );
  const bronzeLeaderboard = useMemo(
    () => transformLeaderboardData(bronzeLeaderboardRaw),
    [bronzeLeaderboardRaw, transformLeaderboardData]
  );
  const silverLeaderboard = useMemo(
    () => transformLeaderboardData(silverLeaderboardRaw),
    [silverLeaderboardRaw, transformLeaderboardData]
  );

  // OPTIMIZED: Load subscription_type in background - don't block render
  useEffect(() => {
    // CRITICAL: Defer to next tick to ensure screen renders instantly
    const rafId = requestAnimationFrame(() => {
      // Use setTimeout(0) to defer to next tick after render
      setTimeout(() => {
        keychainStorage
          .get('subscription_type')
          .then(subscriptionType => {
            setStoredSubscriptionType(subscriptionType);
          })
          .catch(() => {
            // Ignore errors - screen already rendered
          });
      }, 0);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  // OPTIMIZED: Update stored subscription_type when profile data changes - non-blocking
  useEffect(() => {
    if (profileData) {
      // Use requestAnimationFrame to defer update and prevent blocking
      const rafId = requestAnimationFrame(() => {
        const subscriptionType = (profileData as any)?.subscription_type;
        if (subscriptionType) {
          // Fire and forget - don't block render
          keychainStorage.set('subscription_type', subscriptionType).catch(() => { });
          setStoredSubscriptionType(subscriptionType);
        }
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }
  }, [profileData]);

  // Check if user is subscribed based on subscription_badges array from profile data
  const isSubscribed = useMemo(() => {
    // Check subscription_badges array - if it exists and has items, user is subscribed
    if (
      profileData?.subscription_badges &&
      Array.isArray(profileData.subscription_badges) &&
      profileData.subscription_badges.length > 0
    ) {
      return true;
    }

    // Fallback to stored subscription_type from local storage
    if (storedSubscriptionType === 'bronze' || storedSubscriptionType === 'silver') {
      return true;
    }

    // Fallback to direct subscription_type field (from profile summary API)
    if (profileData) {
      const directSubscriptionType = (profileData as any)?.subscription_type;
      if (directSubscriptionType === 'bronze' || directSubscriptionType === 'silver') {
        return true;
      }
    }

    return false;
  }, [profileData?.subscription_badges, storedSubscriptionType, profileData]);
  // Responsive design hooks
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
    height: responsiveHeight,
  } = useResponsive();
  const { width, height } = useDimensions();

  // Use height from useDimensions as screenHeight (more reliable)
  const screenHeight = height || responsiveHeight;

  // Map to old function names for compatibility
  const getResponsiveImageSize = (size: number) => scaleSizeFunc(size);
  const getResponsiveSpacing = (size: number) => getVerticalSpacing(size / 8);
  const getResponsivePadding = (size: number) => getHorizontalSpacing(size / 8);
  const insets = useSafeAreaInsets();

  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isJoinChallengeModalVisible, setIsJoinChallengeModalVisible] = useState<boolean>(false);
  const [isReferralModalVisible, setIsReferralModalVisible] = useState<boolean>(false);
  const scrollAnimation = useRef(new Animated.Value(0)).current;

  // Animation for crown - only run when screen is focused
  const crownAnimation = useRef(new Animated.Value(0)).current;
  const crownAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // CRITICAL: Only run animation when screen is focused to save resources
    if (!isFocused) {
      // Stop animation when not focused
      if (crownAnimationRef.current) {
        crownAnimationRef.current.stop();
        crownAnimationRef.current = null;
      }
      return;
    }

    // Start crown animation only when focused
    crownAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(crownAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(crownAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    crownAnimationRef.current.start();

    // Start lottie animation if available and focused
    if (lottieRef.current) {
      lottieRef.current.play();
    }

    // Cleanup animation on unmount or when losing focus
    return () => {
      if (crownAnimationRef.current) {
        crownAnimationRef.current.stop();
        crownAnimationRef.current = null;
      };
    };
  }, [isFocused, crownAnimation]);

  // Safely access Redux state with fallbacks
  const { user } = useSelector((state: RootState) => state.auth);

  // Cache tracking to avoid repetitive API calls
  const isDataFetchedRef = useRef<{ [key: string]: boolean }>({
    free: false,
    bronze: false,
    silver: false,
  });
  const profile = useSelector((state: any) => state.profile?.profile);

  // Get current leaderboard based on active tab
  // Get current leaderboard based on active tab
  const getCurrentLeaderboard = (): Member[] => {
    switch (activeTab) {
      case 'bronze':
        return bronzeLeaderboard;
      case 'silver':
        return silverLeaderboard;
      default:
        return freeLeaderboard;
    }
  };

  // Get current loading state
  // CRITICAL: Only show loading when actually loading AND raw data hasn't been fetched yet
  // If raw data exists (even if empty array after transformation), don't show loading - show empty state instead
  const getCurrentLoading = (): boolean => {
    switch (activeTab) {
      case 'bronze':
        return isBronzeLoading && bronzeLeaderboardRaw === undefined;
      case 'silver':
        return isSilverLoading && silverLeaderboardRaw === undefined;
      default:
        return isFreeLoading && freeLeaderboardRaw === undefined;
    }
  };

  // Get current error state
  const getCurrentError = (): string | null => {
    switch (activeTab) {
      case 'bronze':
        return bronzeError ? String(bronzeError) : null;
      case 'silver':
        return silverError ? String(silverError) : null;
      default:
        return freeError ? String(freeError) : null;
    }
  };

  // OPTIMIZED: Memoize top winners to prevent recalculation on every render
  const topWinners = useMemo((): (Member | null)[] => {
    const leaderboard = getCurrentLeaderboard();

    // Only show real data, no fake users
    if (leaderboard.length === 0) {
      return [null, null, null];
    }

    if (leaderboard.length === 1) {
      // Show only the 1st place winner in the middle, empty on sides
      return [null, leaderboard[0], null];
    }

    if (leaderboard.length === 2) {
      // Show 2nd place left, 1st place center, empty right
      return [leaderboard[1], leaderboard[0], null];
    }

    // Show top 3 with podium layout (2-1-3)
    const top3 = leaderboard.slice(0, 3);
    return [top3[1], top3[0], top3[2]];
  }, [activeTab, freeLeaderboard, bronzeLeaderboard, silverLeaderboard]);

  // OPTIMIZED: Memoize remaining members to prevent recalculation on every render
  const remainingMembers = useMemo((): Member[] => {
    return getCurrentLeaderboard().slice(3, 9); // Only show 6 items (ranks 4-9)
  }, [activeTab, freeLeaderboard, bronzeLeaderboard, silverLeaderboard]);

  // OPTIMIZED: Memoize current leaderboard to prevent multiple calls in render
  const currentLeaderboard = useMemo(
    () => getCurrentLeaderboard(),
    [activeTab, freeLeaderboard, bronzeLeaderboard, silverLeaderboard]
  );

  // Draw date logic moved to background to avoid blocking initial render
  useEffect(() => {
    // CRITICAL: Only fetch if focused to prevent unnecessary API calls
    if (!isFocused) return;

    // CRITICAL: Defer API call to background - wait for interactions to finish
    // This ensures navigation is never blocked
    const task = InteractionManager.runAfterInteractions(() => {
      const fetchDrawDate = async () => {
        try {
          // CRITICAL: Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Draw date fetch timeout')), 2000); // 2 second timeout
          });

          // Race between API call and timeout
          const drawResponse = (await Promise.race([
            apiService.getNextDraw(),
            timeoutPromise,
          ]).catch(() => {
            // Silent fail - keep fallback date
            return null;
          })) as any; // Cast to avoid TS errors with mixed return types

          if (!isMounted.current || !isFocused) return;

          if (drawResponse && drawResponse.success && drawResponse.data?.next_draw_time) {
            const nextDrawTime = dayjs(drawResponse.data.next_draw_time);
            const now = dayjs().tz('America/New_York');

            // If current time is before next draw time, use previous date (yesterday)
            // If current time is after next draw time, use current date
            let dateToShow: dayjs.Dayjs;
            if (now.isBefore(nextDrawTime)) {
              // Before draw time - show previous draw date (yesterday)
              dateToShow = now.subtract(1, 'day');
            } else {
              // After draw time - show current date
              dateToShow = now;
            }

            if (isMounted.current && isFocused) {
              setDrawDate(dateToShow.format('YYYY-MM-DD'));
            }
          }
        } catch (error) {
          // Keep fallback date on error - already set above
        }
      };

      fetchDrawDate();
    });

    return () => {
      task.cancel();
    };
  }, [isFocused]); // Re-fetch when screen becomes focused

  // Continuous scrolling animation for banner
  useEffect(() => {
    if (drawDate) {
      const startAnimation = () => {
        scrollAnimation.setValue(0);
        Animated.loop(
          Animated.timing(scrollAnimation, {
            toValue: 1,
            duration: 15000, // 15 seconds for full scroll
            useNativeDriver: true,
          })
        ).start();
      };
      startAnimation();
    }
  }, [drawDate, scrollAnimation]);


  // Tab fetching is handled automatically by RTK Query via the drawDate and skip: !drawDate logic.
  // We no longer need manual refetch on focus unless we specifically want to force it.

  // REMOVED: Manual fetching logic (preloading/refs) logic as RTK Query handles it.
  /*
  // Preload bronze tab on mount - INSTANT RENDER, fetch in background - NON-BLOCKING
  useEffect(() => {
     ...
  }, [isFocused]);
  
  // OPTIMIZED: Store fetchData in ref to prevent re-renders
  const leaderboardFetchRef = useRef(leaderboard.fetchData);
  useEffect(() => {
    leaderboardFetchRef.current = leaderboard.fetchData;
  }, [leaderboard.fetchData]);
  */

  // Handle tab change - INSTANT UI update
  const handleTabChange = useCallback((tab: string): void => {
    // Switch tab IMMEDIATELY
    setActiveTab(tab);
    // RTK Query will automatically component mount/query if data not present
  }, []);

  // Handle join challenge button press
  const handleJoinChallenge = (): void => {
    setIsJoinChallengeModalVisible(true);
  };

  // Handle refer button press
  const handleRefer = (): void => {
    setIsJoinChallengeModalVisible(false); // Close Join Challenge modal
    setIsReferralModalVisible(true); // Open Referral modal
  };

  // Handle user profile click
  const handleUserProfileClick = useCallback((user: Member): void => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setIsProfileModalVisible(true);
  }, []);

  // Render top winner item - now with podium styling and click handler
  const renderTopWinner = (winner: Member | null, index: number): React.ReactElement | null => {
    // If no winner, render empty space to maintain layout
    if (!winner) {
      return (
        <View
          key={`empty-${index}`}
          style={{
            alignItems: 'center',
            marginHorizontal: scaleSize(15),
            width: scaleSize(100),
            height: scaleSize(180),
          }}
        />
      );
    }

    // Calculate styles based on position (2nd, 1st, 3rd) - Reduced size, no frames
    const baseProfileSize = 70; // Reduced from 96
    const profileSize = getResponsiveImageSize(baseProfileSize); // Responsive profile size

    // Calculate responsive container width to fit 3 winners on screen
    const horizontalPadding = getResponsivePadding(16); // Screen padding
    const containerPadding = getResponsivePadding(4); // Reduced padding for top winners container
    const availableWidth = screenWidth - horizontalPadding * 2 - containerPadding * 2;
    const spacingBetween = getResponsiveSpacing(4); // Reduced spacing between winners to fit on screen
    const totalSpacing = spacingBetween * 2; // Space between 3 items
    const maxItemWidth = (availableWidth - totalSpacing) / 3;
    const itemWidth = Math.min(maxItemWidth, getResponsiveImageSize(120)); // Don't exceed base size

    // Calculate consistent marginTop for second and third place to align them
    const secondThirdMarginTop = getResponsiveSpacing(30);

    const podiumStyles = {
      // Second place (left) - aligned with third place
      0: {
        containerStyle: { marginTop: secondThirdMarginTop },
        imageStyle: { width: profileSize, height: profileSize, borderRadius: profileSize / 2 },
        textStyle: { fontSize: getResponsiveSpacing(14) },
        rankBadgeStyle: { bottom: getResponsiveSpacing(-5), left: 0 },
      },
      // First place (middle) - also used for single winner
      1: {
        containerStyle: { marginTop: 0 },
        imageStyle: { width: profileSize, height: profileSize, borderRadius: profileSize / 2 },
        textStyle: { fontSize: getResponsiveSpacing(16), fontWeight: '600' },
        rankBadgeStyle: { bottom: getResponsiveSpacing(-5), left: 0 },
      },
      // Third place (right) - aligned with second place
      2: {
        containerStyle: { marginTop: secondThirdMarginTop },
        imageStyle: { width: profileSize, height: profileSize, borderRadius: profileSize / 2 },
        textStyle: { fontSize: getResponsiveSpacing(14) },
        rankBadgeStyle: { bottom: getResponsiveSpacing(-5), left: 0 },
      },
    };

    const style = podiumStyles[index as keyof typeof podiumStyles];
    const isSelected = selectedUserId === winner.id;

    return (
      <SoundTouchableOpacity
        key={winner.id}
        style={{
          alignItems: 'center',
          width: itemWidth,
          flex: 1,
          maxWidth: itemWidth,
          paddingHorizontal: getResponsivePadding(2), // Reduced padding for more name space
          ...style.containerStyle,
        }}
        onPress={() => handleUserProfileClick(winner)}
      >
        <View
          style={{
            position: 'relative',
            zIndex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Crown for first place (middle position, index 1) - positioned above profile */}
          {index === 1 && (
            <Animated.Image
              source={require('../../../../assets/icons/crown.png')}
              style={{
                width: getResponsiveImageSize(40),
                height: getResponsiveImageSize(40),
                position: 'absolute',
                top: -getResponsiveSpacing(35), // Position above profile
                left: profileSize / 2 - getResponsiveImageSize(20), // Center crown on profile
                zIndex: 15,
                transform: [
                  {
                    translateY: crownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, getResponsiveSpacing(-5)],
                    }),
                  },
                ],
              }}
            />
          )}

          {/* Profile Picture and Avatar - No frame for top 3 winners, use profile_pic or avatar_url only */}
          <View
            style={{
              width: profileSize,
              height: profileSize,
              borderRadius: profileSize / 2,
              overflow: 'visible',
              borderWidth: 0,
              backgroundColor: 'transparent',
              position: 'relative',
            }}
          >
            <View
              style={{
                width: profileSize,
                height: profileSize,
                borderRadius: profileSize / 2,
                overflow: 'hidden',
              }}
            >
              {winner.image ? (
                isLottieFile(winner.image) ? (
                  <LottieView
                    source={{ uri: winner.image }}
                    autoPlay
                    loop
                    style={{
                      width: profileSize,
                      height: profileSize,
                    }}
                    onAnimationFailure={() => { }}
                  />
                ) : (
                  <Image
                    source={{ uri: winner.image }}
                    style={{
                      width: profileSize,
                      height: profileSize,
                    }}
                    resizeMode="cover"
                  />
                )
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: scaleSize(20),
                      fontWeight: 'bold',
                      color: '#6B7280',
                    }}
                  >
                    {winner.name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>

            {/* Star Icon at Top Right Corner of Profile with Level */}
            {winner.level !== undefined && winner.level !== null && (
              <View
                style={{
                  position: 'absolute',
                  top: -scaleSize(8),
                  right: -scaleSize(8),
                  zIndex: 25,
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
                      fontFamily: 'Baloo2',
                      fontSize: scaleSize(12), // Slightly larger than standard but matches style
                      fontWeight: 'bold',
                    }}
                  >
                    {winner.level}
                  </Text>
                </View>
              </View>
            )}

            {/* Rank badge - positioned at bottom of profile picture, close to it */}

            <View
              style={{
                position: 'absolute',
                bottom: -getResponsiveImageSize(2), // Position closer to bottom of profile
                left: -getResponsiveImageSize(2), // Position closer to left edge of profile
                backgroundColor: index === 1 ? '#FFD700' : index === 0 ? '#C0C0C0' : '#CD7F32',
                width: getResponsiveImageSize(18),
                height: getResponsiveImageSize(18),
                borderRadius: getResponsiveImageSize(9),
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20,
              }}
            >
              <Text
                style={[
                  typography.buttonSmall,
                  {
                    color: 'black',
                    fontSize: getResponsiveSpacing(12),
                    fontWeight: 'bold',
                  },
                ]}
              >
                {index === 0 ? '2' : index === 1 ? '1' : '3'}
              </Text>
            </View>
          </View>
        </View>

        {/* Name - below profile picture */}
        <View
          style={{
            alignItems: 'center',
            marginTop: getResponsiveSpacing(4) + scaleSize(2), // Add 2px gap between username and rank badge
            width: '100%',
            justifyContent: 'center',
            paddingHorizontal: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'nowrap',
              width: '100%',
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.6}
              style={[
                style.textStyle,
                {
                  color: 'white', // White color for top three winners
                  textAlign: 'center',
                  flexShrink: 1,
                  marginRight: getResponsiveSpacing(1), // Match home profile: scaleSize(1)
                },
              ]}
            >
              {winner.name}
            </Text>
            {/* Badge next to username - aligned same as home profile */}
            {winner.badgeImage &&
              (() => {
                let badgeUri: string | null = null;
                let isBadgeLottie = false;

                if (typeof winner.badgeImage === 'string') {
                  badgeUri = winner.badgeImage;
                  isBadgeLottie = isLottieFile(badgeUri);
                } else if (
                  winner.badgeImage &&
                  typeof winner.badgeImage === 'object' &&
                  winner.badgeImage.uri
                ) {
                  badgeUri = winner.badgeImage.uri;
                  isBadgeLottie = isLottieFile(badgeUri);
                } else if (typeof winner.badgeImage === 'number') {
                  return (
                    <LottieView
                      source={winner.badgeImage as any}
                      autoPlay
                      loop
                      style={{
                        marginLeft: getResponsiveSpacing(1),
                        marginTop: getResponsiveSpacing(-2),
                        width: getResponsiveImageSize(18),
                        height: getResponsiveImageSize(18),
                        flexShrink: 0,
                      }}
                    />
                  );
                }

                if (!badgeUri) return null;

                return isBadgeLottie ? (
                  <LottieView
                    source={{ uri: badgeUri }}
                    autoPlay
                    loop
                    style={{
                      marginLeft: getResponsiveSpacing(1),
                      marginTop: getResponsiveSpacing(-2),
                      width: getResponsiveImageSize(18),
                      height: getResponsiveImageSize(18),
                      flexShrink: 0,
                    }}
                    onAnimationFailure={error => {
                      // Handle animation failure silently
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: badgeUri }}
                    style={{
                      marginLeft: getResponsiveSpacing(1),
                      marginTop: getResponsiveSpacing(-2),
                      width: getResponsiveImageSize(18),
                      height: getResponsiveImageSize(18),
                      flexShrink: 0,
                    }}
                    resizeMode="contain"
                    onError={() => {
                      // Handle image load error silently
                    }}
                  />
                );
              })()}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: getResponsiveSpacing(2),
          }}
        >
          <Image
            source={require('../../../../assets/icons/Tpcoin.png')}
            style={{
              width: getResponsiveImageSize(16),
              height: getResponsiveImageSize(16),
              borderRadius: getResponsiveImageSize(8),
              marginRight: getResponsiveSpacing(4),
            }}
          />
          <Text
            style={[
              typography.h6,
              {
                color: '#FFD700',
                fontSize: getResponsiveSpacing(14),
              },
            ]}
          >
            {winner.amount}
          </Text>
        </View>
      </SoundTouchableOpacity>
    );
  };

  // Render error component
  const renderErrorComponent = (): React.ReactElement => (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scaleSize(40),
        paddingHorizontal: scaleSize(20),
      }}
    >
      <Text
        style={[
          typography.h4,
          {
            color: '#EF4444',
            fontSize: scaleSize(18),
            marginBottom: scaleSize(8),
            textAlign: 'center',
          },
        ]}
      >
        Failed to load leaderboard
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            fontSize: scaleSize(14),
            textAlign: 'center',
            marginBottom: scaleSize(16),
          },
        ]}
      >
        {getCurrentError() || 'Unable to connect to server'}
      </Text>
      <SoundTouchableOpacity
        onPress={() => {
          let apiType: 'free' | 'daily' | 'weekly' | 'allTime';
          switch (activeTab) {
            case 'bronze':
              refetchBronze();
              break;
            case 'silver':
              refetchSilver();
              break;
            default:
              refetchFree();
          }
          // leaderboard.fetchData(apiType); // Removed legacy call
        }}
        style={{
          backgroundColor: isDarkMode ? '#13b7e3' : '#603A7C',
          paddingHorizontal: scaleSize(20),
          paddingVertical: scaleSize(10),
          borderRadius: scaleSize(8),
        }}
      >
        <Text
          style={[
            typography.button,
            {
              color: 'white',
            },
          ]}
        >
          Try Again
        </Text>
      </SoundTouchableOpacity>
    </View>
  );

  // Render empty state component
  const renderEmptyComponent = (): React.ReactElement => (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scaleSize(40),
        paddingHorizontal: scaleSize(20),
      }}
    >
      <Text
        style={[
          typography.h4,
          {
            color: isDarkMode ? '#E5E7EB' : '#F3F4F6',
            fontSize: scaleSize(18),
            marginBottom: scaleSize(8),
            textAlign: 'center',
          },
        ]}
      >
        No winners yet
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: isDarkMode ? '#E5E7EB' : '#F3F4F6',
            fontSize: scaleSize(14),
            textAlign: 'center',
            marginBottom: scaleSize(16),
          },
        ]}
      >
        Be the first to join the leaderboard!
      </Text>
    </View>
  );

  // Render remaining member item for FlatList - now with click handler
  // Memoized keyExtractor for FlatList
  const keyExtractor = React.useCallback((item: Member, index: number): string => {
    return item.id ? item.id.toString() : `member-${index}`;
  }, []);

  // OPTIMIZED: Memoized ItemSeparator to prevent re-creation on every render
  const ItemSeparator = React.useCallback(
    () => <View style={{ height: scaleSize(2), backgroundColor: 'transparent' }} />,
    []
  );

  // OPTIMIZED: getItemLayout for faster FlatList scrolling (avoids measuring items)
  const ITEM_HEIGHT = scaleSize(56); // Reduced from 72 to match 8px padding + content
  const SEPARATOR_HEIGHT = scaleSize(2);
  const getItemLayout = React.useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
      index,
    }),
    []
  );

  const renderMemberItem = React.useCallback(
    ({ item }: { item: Member }): React.ReactElement | null => {
      // Ensure item is defined
      if (!item) return null;

      const isSelected = selectedUserId === item.id;
      // Check if this is the current user
      const currentUserId = profile?.account_id || user?.id || user?.userid;
      const isCurrentUser =
        item.isCurrentUser ||
        item.account_id === currentUserId ||
        item.user_id === currentUserId ||
        item.userid === currentUserId;

      return (
        <MemberItem
          item={item}
          onPress={handleUserProfileClick}
          isSelected={isSelected}
          isCurrentUser={!!isCurrentUser}
        />
      );
    },
    [selectedUserId, handleUserProfileClick, profile, user]
  );

  return (
    <ScreenErrorBoundary screenName="LeaderboardScreen">
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'left', 'right']}
      >
        <ScreenBackButtonHandler action="navigate" />
        <LinearGradient
          colors={['#1e90ff', '#0a6fc2', '#1e90ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >

          {/* Calculate responsive scrolling container height */}
          {(() => {
            // Calculate available height for scrolling container - use all available space
            const headingHeight =
              getResponsivePadding(40) + getResponsivePadding(8) + getResponsiveSpacing(28); // Heading section
            const tabsHeight = getResponsivePadding(4) + getResponsiveSpacing(60); // Tabs section
            const bannerHeight = drawDate ? scaleSize(40) + getResponsiveSpacing(16) : 0; // Banner height + margins
            const totalTopHeight = headingHeight + tabsHeight + bannerHeight; // Total top section height
            const topWinnersHeight = getResponsiveSpacing(220); // Top 3 winners section
            const joinButtonHeight = activeTab === 'bronze' ? getResponsiveImageSize(50) : 0; // Button height only for bronze
            const buttonBottomOffset = getResponsiveSpacing(-20); // Scalable bottom offset (-20px)
            const gapBetweenContainerAndButton = 2; // 2px gap between container and button
            const safeAreaBottom = insets?.bottom || 0;
            const containerPadding = getResponsiveSpacing(10); // Reduced padding

            // Calculate available height - use all available space responsively
            // Account for button height + gap + bottom offset + safe area (only for bronze)
            // Note: buttonBottomOffset is negative, so we add it (subtract the absolute value)
            const buttonBottomSpace = activeTab === 'bronze' ? Math.abs(buttonBottomOffset) : 0; // Only for bronze
            const totalBottomSpace =
              joinButtonHeight +
              gapBetweenContainerAndButton +
              buttonBottomSpace +
              (activeTab === 'bronze' ? safeAreaBottom : 0);
            const availableHeight =
              screenHeight -
              totalTopHeight -
              topWinnersHeight -
              totalBottomSpace -
              containerPadding;
            const minHeight = getResponsiveSpacing(150); // Minimum height for small screens
            // Container height should be reduced by marginBottom to prevent overlap
            // Total space = containerHeight + marginBottom = availableHeight
            const scrollingContainerHeight = Math.max(
              minHeight,
              availableHeight - gapBetweenContainerAndButton
            );

            return (
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 0, // No side padding for full width
                  width: '100%',
                }}
              >
                {/* Leaderboard Heading - Match Image Style */}
                <View
                  style={{
                    paddingTop: scaleSize(10),
                    paddingBottom: scaleSize(12),
                    paddingHorizontal: scaleSize(16),
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    backgroundColor: 'transparent',
                    zIndex: 10,
                    width: '100%',
                  }}
                >
                  <View style={{ position: 'relative', alignItems: 'center' }}>
                    {/* Violet border text - rendered 8 times around the white text */}
                    {(() => {
                      const strokeWidth = getResponsiveSpacing(2);
                      return [
                        { x: -strokeWidth, y: -strokeWidth },
                        { x: 0, y: -strokeWidth },
                        { x: strokeWidth, y: -strokeWidth },
                        { x: -strokeWidth, y: 0 },
                        { x: strokeWidth, y: 0 },
                        { x: -strokeWidth, y: strokeWidth },
                        { x: 0, y: strokeWidth },
                        { x: strokeWidth, y: strokeWidth },
                      ].map((offset, index) => (
                        <Text
                          key={index}
                          style={[
                            typography.h2,
                            {
                              position: 'absolute',
                              color: '#1E3A8A',
                              fontSize: getResponsiveSpacing(28),
                              fontWeight: 'normal',
                              fontFamily:
                                Platform.OS === 'ios'
                                  ? 'LuckiestGuy-Regular'
                                  : 'LuckiestGuy-Regular',
                              textAlign: 'center',
                              left: offset.x,
                              top: offset.y,
                              includeFontPadding: false,
                            },
                          ]}
                        >
                          Leaderboard
                        </Text>
                      ));
                    })()}
                    {/* White text on top */}
                    <Text
                      style={[
                        typography.h2,
                        {
                          color: '#FFFFFF',
                          fontSize: getResponsiveSpacing(28),
                          fontWeight: 'normal',
                          fontFamily:
                            Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                          textAlign: 'center',
                          includeFontPadding: false,
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 4,
                        },
                      ]}
                    >
                      LEADERBOARD
                    </Text>
                  </View>
                </View>

                {/* Leaderboard Category Tabs - Full Width No Side Padding */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 0, // No side padding for full width
                    paddingVertical: scaleSize(12),
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    width: '100%', // Full width
                  }}
                >
                  {['free', 'bronze', 'silver'].map(tab => (
                    <SoundTouchableOpacity
                      key={tab}
                      soundType="button"
                      onPress={() => handleTabChange(tab)}
                      style={{
                        flex: 1, // Equal distribution
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: scaleSize(8),
                          paddingHorizontal: scaleSize(12),
                          backgroundColor:
                            activeTab === tab ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                          borderRadius: scaleSize(8),
                          alignSelf: 'center',
                        }}
                      >
                        {tab !== 'free' && (
                          <Image
                            source={
                              tab === 'bronze'
                                ? require('../../../../assets/common/bronze.png')
                                : require('../../../../assets/common/silver.png')
                            }
                            style={{
                              width: scaleSize(24),
                              height: scaleSize(24),
                              marginRight: scaleSize(6),
                            }}
                            resizeMode="contain"
                          />
                        )}
                        <Text
                          style={{
                            fontSize: scaleSize(18),
                            fontWeight: activeTab === tab ? '600' : '400',
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {tab}
                        </Text>
                      </View>
                    </SoundTouchableOpacity>
                  ))}
                </View>

                {/* Scrolling Draw Date Banner - Always visible, below tabs, above top winners */}
                {drawDate && (
                  <View
                    style={{
                      marginTop: getResponsiveSpacing(8),
                      marginBottom: getResponsiveSpacing(8),
                      height: scaleSize(40),
                      backgroundColor: '#FED63B',
                      borderRadius: 0,
                      marginHorizontal: 0,
                      borderWidth: 1,
                      borderColor: '#FDB913',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      width: '100%',
                    }}
                  >
                    <Animated.View
                      style={{
                        flexDirection: 'row',
                        width: screenWidth * 4, // Wide enough for seamless scrolling
                        transform: [
                          {
                            translateX: scrollAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -screenWidth * 2], // Scroll from right to left
                            }),
                          },
                        ],
                      }}
                    >
                      {/* Repeat text multiple times for seamless loop */}
                      {[0, 1, 2, 3, 4, 5].map(index => (
                        <Text
                          key={index}
                          style={{
                            fontSize: scaleSize(14),
                            fontWeight: '600',
                            color: '#000000',
                            paddingHorizontal: scaleSize(30),
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          🏆 Winners for {dayjs(drawDate).format('MMMM DD, YYYY')} • These are the
                          winners revealed for this particular draw date •
                        </Text>
                      ))}
                    </Animated.View>
                  </View>
                )}

                {/* Top 3 Winners Section - Match Image Style */}
                <View
                  style={{
                    marginTop: getResponsiveSpacing(10),
                    marginBottom: 0,
                    position: 'relative',
                    height: getResponsiveSpacing(180), // Reduced by 20px from 220
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 0, // No border radius for full width
                    paddingHorizontal: getResponsivePadding(16),
                    paddingVertical: getResponsivePadding(16),
                    width: '100%', // Full width
                  }}
                >
                  {/* Top Winners - Podium Style */}
                  {getCurrentLoading() ? (
                    <LottieView
                      source={require('../../../../assets/animations/LoadingBar.json')}
                      autoPlay
                      loop
                      style={{ width: scaleSize(100), height: scaleSize(100) }}
                    />
                  ) : getCurrentError() ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: scaleSize(120),
                      }}
                    >
                      <Text
                        style={[
                          typography.body,
                          {
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            fontSize: scaleSize(14),
                            textAlign: 'center',
                          },
                        ]}
                      >
                        Unable to load top winners
                      </Text>
                    </View>
                  ) : currentLeaderboard.length === 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: scaleSize(120),
                      }}
                    >
                      <Text
                        style={{
                          color: isDarkMode ? '#E5E7EB' : '#F3F4F6',
                          fontSize: scaleSize(14),
                          textAlign: 'center',
                        }}
                      >
                        No winners yet
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-evenly',
                        alignItems: 'flex-start', // Align items at the top
                        zIndex: 2,
                        position: 'relative',
                        paddingHorizontal: getResponsivePadding(2), // Further reduced padding for more name space
                      }}
                    >
                      {topWinners.map((winner, index) => {
                        // Index already matches position: 0=left (2nd), 1=center (1st), 2=right (3rd)
                        return renderTopWinner(winner, index);
                      })}
                    </View>
                  )}
                </View>

                {/* Remaining Winners List - Match Image Style */}
                <View
                  style={{
                    flex: 1,
                    paddingHorizontal: 0, // No side padding for full width
                    paddingTop: 0,
                    marginBottom: !isSubscribed ? scaleSize(80) : 0, // Same for both bronze and silver
                    marginTop: scaleSize(10),
                    width: '100%',
                    overflow: 'visible', // Allow elements like rank badges to be visible
                  }}
                >
                  {/* Loading Indicator */}
                  {getCurrentLoading() ? (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        zIndex: 20,
                        borderRadius: scaleSize(12),
                      }}
                    >
                      <LottieView
                        source={require('../../../../assets/animations/LoadingBar.json')}
                        autoPlay
                        loop
                        style={{ width: scaleSize(150), height: scaleSize(150) }}
                      />
                      <Text
                        style={[
                          typography.body,
                          {
                            color: '#6B7280',
                            fontSize: scaleSize(14),
                            marginTop: scaleSize(12),
                            textAlign: 'center',
                          },
                        ]}
                      >
                        Loading leaderboard...
                      </Text>
                    </View>
                  ) : getCurrentError() ? (
                    renderErrorComponent()
                  ) : currentLeaderboard.length === 0 ? (
                    renderEmptyComponent()
                  ) : (
                    <FlatList
                      ref={flatListRef}
                      data={remainingMembers}
                      renderItem={renderMemberItem}
                      keyExtractor={keyExtractor}
                      initialNumToRender={6}
                      maxToRenderPerBatch={5}
                      windowSize={11}
                      removeClippedSubviews={Platform.OS === 'android'}
                      updateCellsBatchingPeriod={100}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingBottom: scaleSize(20),
                        paddingTop: 0,
                        paddingHorizontal: scaleSize(16),
                      }}
                      style={{ flex: 1, zIndex: 1 }}
                      ItemSeparatorComponent={ItemSeparator}
                      getItemLayout={getItemLayout}
                    />
                  )}
                </View>
              </View>
            );
          })()}

          {/* Join Challenge Button - Show for both bronze and silver tabs if user is not subscribed */}
          {!isSubscribed && (
            <View
              style={{
                position: 'absolute',
                bottom: scaleSize(16),
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 10,
                width: '100%',
              }}
            >
              <View style={{ width: '80%', maxWidth: scaleSize(300) }}>
                <Animated.View style={joinButtonAnimation.animatedStyle}>
                  <SoundTouchableOpacity
                    onPress={handleJoinChallenge}
                    soundType="button"
                    onPressIn={joinButtonAnimation.animatePress}
                    onPressOut={joinButtonAnimation.animateRelease}
                    style={{
                      width: '100%',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: scaleSize(4) },
                      shadowOpacity: 0.2,
                      shadowRadius: scaleSize(8),
                      elevation: 8,
                    }}
                    activeOpacity={1}
                  >
                    <Image
                      source={require('../../../../assets/leaderboard/joinChallenge.png')}
                      style={{
                        width: '100%',
                        height: scaleSize(48),
                        resizeMode: 'contain',
                      }}
                    />
                  </SoundTouchableOpacity>
                </Animated.View>
              </View>
            </View>
          )}

          {/* User Profile Modal */}
          {selectedUser && (
            <UserProfileModal
              isVisible={isProfileModalVisible}
              onClose={() => {
                setIsProfileModalVisible(false);
                setSelectedUserId(null);
              }}
              user={selectedUser}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Join Challenge Modal */}
          <Modal
            visible={isJoinChallengeModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsJoinChallengeModalVisible(false)}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setIsJoinChallengeModalVisible(false)}
            >
              <Pressable
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  borderRadius: scaleSize(20),
                  padding: scaleSize(24),
                  width: '85%',
                  maxWidth: scaleSize(400),
                  alignItems: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 10,
                }}
                onPress={e => e.stopPropagation()}
              >
                {/* Close Button */}
                <SoundTouchableOpacity
                  style={{
                    position: 'absolute',
                    top: scaleSize(12),
                    right: scaleSize(12),
                    padding: scaleSize(8),
                  }}
                  onPress={() => setIsJoinChallengeModalVisible(false)}
                >
                  <Image
                    source={require('../../../../assets/common/closeIcon.png')}
                    style={{ width: scaleSize(24), height: scaleSize(24) }}
                  />
                </SoundTouchableOpacity>

                {/* Title */}
                <Text
                  style={{
                    fontSize: scaleSize(26),
                    color: '#007AFF',
                    marginBottom: scaleSize(16),
                    textAlign: 'center',
                    fontFamily: 'LuckiestGuy-Regular',
                  }}
                >
                  Join Challenge
                </Text>

                {/* Description Text */}
                <Text
                  style={{
                    fontSize: scaleSize(16),
                    color: isDarkMode ? '#D1D5DB' : '#4B5563',
                    marginBottom: scaleSize(24),
                    textAlign: 'center',
                    lineHeight: scaleSize(24),
                  }}
                >
                  Invite your friends to join the challenge and earn rewards together! Share the app
                  with others and get amazing in-game benefits.
                </Text>

                {/* Refer Button */}
                <SoundTouchableOpacity
                  onPress={handleRefer}
                  style={{
                    width: '100%',
                    alignItems: 'center',
                    marginTop: scaleSize(8),
                  }}
                >
                  <Image
                    source={require('../../../../assets/leaderboard/refer.png')}
                    style={{
                      width: '100%',
                      height: scaleSize(60),
                      resizeMode: 'contain',
                    }}
                  />
                </SoundTouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Referral Modal */}
          <ReferralModal
            isVisible={isReferralModalVisible}
            onClose={() => setIsReferralModalVisible(false)}
            isDarkMode={isDarkMode}
          />
        </LinearGradient>
      </SafeScreenWrapper>
    </ScreenErrorBoundary>
  );
};

export default LeaderboardScreen;

// Helper functions moved from useLeaderboard hook
const getRandomColor = (index: number): string => {
  const colors = ['#E91E63', '#FFC107', '#4CAF50', '#00BCD4', '#FFEB3B', '#4CAF50', '#00BCD4'];
  return colors[index % colors.length];
};

const getRandomLastOnline = (): string => {
  const times = ['1 hour ago', '2 hours ago', '3 hours ago', '5 hours ago', '1 day ago'];
  return times[Math.floor(Math.random() * times.length)];
};

const generateRandomBadges = (): Array<{ id: number; icon: string }> => {
  const badgeIcons = ['trophy', 'fire', 'star', 'crown', 'medal', 'star-shooting', 'medal-outline'];
  const numBadges = Math.floor(Math.random() * 4); // 0-3 badges
  return Array.from({ length: numBadges }, (_, i) => ({
    id: i + 1,
    icon: badgeIcons[Math.floor(Math.random() * badgeIcons.length)],
  }));
};

const formatLeaderboardAmount = (amount: number | string | null | undefined): string => {
  if (typeof amount === 'number' && isFinite(amount)) {
    // Remove decimal places - show whole numbers only
    return Math.round(amount).toString();
  }

  if (typeof amount === 'string') {
    const numeric = parseFloat(amount);
    if (!isNaN(numeric) && isFinite(numeric)) {
      // Remove decimal places - show whole numbers only
      return Math.round(numeric).toString();
    }
  }

  return '0';
};
