/**
 * UpdatesScreen - Modern Home Screen Implementation
 * Professional home screen with comprehensive features and performance optimizations
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Platform,
  Animated,
  Alert,
  BackHandler,
  InteractionManager,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../../hooks/useReduxHooks';
// import { fetchDailyWinners } from '../../../store/winnersSlice'; // Removed - winners no longer used
import Header from './Header';
import SubscriptionUI from './SubscriptionUI';
import DailyRewards from './DailyRewards';
import { profileApi } from '../../../store/api/profileApi';
import { showGlobalLoader, hideGlobalLoader } from '../../../store/slices/appSlice';
import GlobalLoader from '../../../components/GlobalLoader';
import CongratulationsUI from './CongratulationsUI';
import WinnersCarousel from './WinnersCarousel';
// import WinnersModal from '../../../core/components/WinnersModal'; // Removed - winners no longer used
import UserProfileModal from '../../../core/components/UserProfileModal';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import PerformanceImage from '../../../core/components/PerformanceImage';
import { apiService } from '../../../services/apiService';
import { useTrackScreenView, useAnalytics } from '../../../hooks/useAnalytics';
import { getUsername } from '../../../utils/userUtils';
import { scaleSize } from '../../../utils/scaleSize';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import ProfileFrame from '../../../components/ProfileFrame';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import LottieView from 'lottie-react-native';
import { logger } from '../../../lib/utils/logger';

const TOTAL_TAB_BAR_HEIGHT = 60 + (Platform.OS === 'ios' ? 34 : 0);

interface RecentWinner {
  mode: string;
  position: number;
  username: string;
  user_id: number;
  money_awarded: number;
  submitted_at: string;
  profile_pic: string | null;
  badge_image_url: string | null;
  avatar_url: string | null;
  subscription_badges: Array<{
    id: string;
    name: string;
    image_url: string;
    subscription_type: string;
    price: number;
  }>;
  level: number;
  level_progress: string;
  draw_date: string;
}

interface RecentWinnersSectionProps {
  onWinnerClick?: (winner: any) => void;
}

interface RecentWinnersDebugInfo {
  success?: boolean;
  status?: number;
  winnersCount?: number;
  error?: string;
}

const RecentWinnersSection: React.FC<RecentWinnersSectionProps> = ({ onWinnerClick }) => {
  const { isDarkMode, colors } = useTheme();
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<RecentWinnersDebugInfo | null>(null);
  const { getResponsiveFontSize, getResponsiveSpacing } = useStandardResponsive();
  const debug = __DEV__;

  useEffect(() => {
    let frameId: number | null = null;
    let isMounted = true;

    const fetchRecentWinners = async () => {
      const fetchStartTime = performance.now();
      if (__DEV__) {
        logger.debug('UpdatesScreen: Starting fetchRecentWinners...', 'PERF');
      }

      try {
        // OPTIMIZED: Use requestAnimationFrame for immediate execution instead of InteractionManager
        // InteractionManager can delay unnecessarily (500ms+), causing perceived freezing
        // requestAnimationFrame ensures operation runs on next frame without blocking
        frameId = requestAnimationFrame(async () => {
          if (!isMounted) return;

          setIsLoading(true);
          try {
            const apiStartTime = performance.now();
            const response = await apiService.getRecentWinners();
            const apiDuration = performance.now() - apiStartTime;

            if (__DEV__) {
              logger.debug(
                `UpdatesScreen: getRecentWinners() took ${apiDuration.toFixed(2)}ms`,
                'PERF'
              );

              if (apiDuration > 1000) {
                logger.warn(
                  `UpdatesScreen: API call took ${apiDuration.toFixed(2)}ms (SLOW!)`,
                  'PERF'
                );
              }
            }
            if (!isMounted) return;

            logger.log('Recent winners API response received:', 'UPDATES_SCREEN', response);

            // Handle various response structures
            let winners: any[] = [];
            if (response.success && response.data) {
              let responseData: any = response.data;

              // Case 1: Check if response is nested (response.data.data)
              if (
                responseData?.data &&
                typeof responseData.data === 'object' &&
                !Array.isArray(responseData.data)
              ) {
                responseData = responseData.data;
              }

              // Case 2: Check if response.data is directly the winners array
              if (Array.isArray(responseData)) {
                winners = responseData;
              }
              // Case 3: Check if winners array exists in response object
              else if (responseData?.winners && Array.isArray(responseData.winners)) {
                winners = responseData.winners;
              }
              // Case 4: Try alternative field names
              else if (responseData?.recent_winners && Array.isArray(responseData.recent_winners)) {
                winners = responseData.recent_winners;
              }
            }

            setRecentWinners(winners);
            if (debug) {
              setDebugInfo({
                success: response.success,
                status: response.status,
                winnersCount: winners.length,
                error: response.error,
              });
            }
          } catch (error) {
            if (!isMounted) return;

            setRecentWinners([]);
            if (debug) {
              setDebugInfo({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        });
      } catch (error) {
        // Handle errors in requestAnimationFrame setup
        logger.error('Error setting up recent winners fetch:', 'UPDATES_SCREEN', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Fetch immediately on mount
    fetchRecentWinners();

    return () => {
      isMounted = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const isLottieAnimation = (source: any): boolean => {
    if (!source) return false;
    if (typeof source === 'number') return false;
    const uri = typeof source === 'string' ? source : source.uri || '';
    const cleanUri = uri.split('?')[0].toLowerCase();
    return cleanUri.endsWith('.json');
  };

  const getImageSource = (imageUrl: any): any => {
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('{') || imageUrl.startsWith('[')) {
        try {
          const parsed = JSON.parse(imageUrl);
          const uri = parsed.uri || parsed.url || parsed.image || parsed.avatar || imageUrl;
          return { uri };
        } catch (e) {
          return { uri: imageUrl };
        }
      }
      return { uri: imageUrl };
    } else if (typeof imageUrl === 'number') {
      return imageUrl;
    } else if (imageUrl.uri) {
      return imageUrl;
    }
    return null;
  };

  // Display top 6 winners (3 per row)
  const displayWinners =
    Array.isArray(recentWinners) && recentWinners.length > 0 ? recentWinners.slice(0, 6) : [];

  if (isLoading) {
    return (
      <View
        style={[
          { paddingVertical: scaleSize(20), alignItems: 'center' },
          debug && {
            borderWidth: 2,
            borderColor: '#ff00ff',
            backgroundColor: 'rgba(255,0,255,0.05)',
            zIndex: 9999,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: getResponsiveFontSize(scaleSize(14)) }}>
          Loading recent winners...
        </Text>
      </View>
    );
  }

  // Responsive styles matching WinnersCarousel
  const carouselWidth = scaleSize(312);
  const carouselHeight = scaleSize(200);

  return (
    <View
      style={[
        {
          width: '100%',
          marginHorizontal: 0,
          marginTop: 0,
          marginBottom: scaleSize(60),
          zIndex: 1,
          position: 'relative',
          alignItems: 'center',
        },
        debug && {
          zIndex: 9999,
          borderWidth: 2,
          borderColor: '#ff00ff',
          backgroundColor: 'rgba(255,0,255,0.05)',
        },
      ]}
    >
      <View
        style={[
          {
            position: 'relative',
            width: '100%',
            maxWidth: carouselWidth,
            height: carouselHeight,
            alignSelf: 'center',
          },
          debug && {
            borderWidth: 2,
            borderColor: '#00ff00',
            backgroundColor: 'rgba(0,255,0,0.05)',
          },
        ]}
      >
        {debug && (
          <View
            style={{
              position: 'absolute',
              top: scaleSize(4),
              left: scaleSize(4),
              right: scaleSize(4),
              zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.75)',
              paddingVertical: scaleSize(3),
              paddingHorizontal: scaleSize(6),
              borderRadius: scaleSize(8),
            }}
          >
            <Text style={{ color: '#fff', fontSize: getResponsiveFontSize(scaleSize(10)) }}>
              RecentWinnersSection | winners={recentWinners.length} | display=
              {displayWinners.length} | success={String(debugInfo?.success)} | status=
              {debugInfo?.status ?? 'n/a'}
            </Text>
            {!!debugInfo?.error && (
              <Text
                style={{ color: '#fff', fontSize: getResponsiveFontSize(scaleSize(10)) }}
                numberOfLines={1}
              >
                error: {debugInfo.error}
              </Text>
            )}
          </View>
        )}
        {/* Background image */}
        <Image
          source={require('../../../../assets/home/recentWinners.png')}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: scaleSize(12),
              overflow: 'hidden',
            },
            debug && { borderWidth: 2, borderColor: '#00ffff' },
          ]}
          resizeMode="cover"
        />

        {/* Winners displayed inside the image section - same horizontal layout as WinnersCarousel */}
        {displayWinners.length > 0 && (
          <View
            style={[
              {
                position: 'absolute',
                top: scaleSize(60),
                left: scaleSize(10),
                right: scaleSize(10),
                bottom: scaleSize(2),
                justifyContent: 'center',
                alignItems: 'center',
              },
              debug && {
                borderWidth: 2,
                borderColor: '#ffff00',
                backgroundColor: 'rgba(255,255,0,0.05)',
              },
            ]}
          >
            {/* Display first winner in horizontal layout (same as WinnersCarousel) */}
            {displayWinners[0] &&
              (() => {
                const winner = displayWinners[0];
                const username = winner.username || 'Unknown';
                const profileImage =
                  winner.profile_pic ||
                  winner.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=128`;
                const badgeImageSource = winner.badge_image_url
                  ? getImageSource(winner.badge_image_url)
                  : undefined;

                // Calculate avatar size same as WinnersCarousel
                const avatarSize = scaleSize(110);
                const isLottie = isLottieAnimation(profileImage);
                const actualAvatarSize = avatarSize * 0.7;
                const FRAME_PADDING_RATIO = 0.15;
                const containerSize = Math.round(actualAvatarSize / (1 - FRAME_PADDING_RATIO * 2));

                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      top: scaleSize(-40),
                      marginRight: scaleSize(10),
                      marginLeft: scaleSize(5),
                      flex: 1,
                      minWidth: 0,
                    }}
                    onPress={() =>
                      onWinnerClick &&
                      onWinnerClick({
                        id: winner.user_id,
                        userid: winner.user_id,
                        user_id: winner.user_id,
                        account_id: winner.user_id,
                        name: username,
                        username,
                        image: profileImage,
                        avatar: profileImage,
                        badgeImage: badgeImageSource,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        top: scaleSize(14),
                        left: 0,
                      }}
                    >
                      <ProfileFrame
                        size={containerSize}
                        imageUrl={profileImage || null}
                        frameUrl={null}
                        initials={(username?.[0] || '?').toUpperCase()}
                        backgroundColor="#8B5CF6"
                        profileSize={actualAvatarSize}
                      />
                    </View>

                    <View
                      style={{
                        marginLeft: scaleSize(8),
                        alignItems: 'flex-start',
                        flex: 1,
                        minWidth: 0,
                        flexShrink: 1,
                        marginTop: scaleSize(20),
                        left: 0,
                      }}
                    >
                      <View
                        style={{
                          position: 'relative',
                          flexDirection: 'row',
                          alignItems: 'center',
                          flexWrap: 'nowrap',
                          width: '100%',
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                          style={{
                            color: '#FFFFFF',
                            fontSize: getResponsiveFontSize(scaleSize(16)),
                            fontWeight: '600',
                            textAlign: 'left',
                            flexShrink: 1,
                            marginRight: scaleSize(1),
                          }}
                        >
                          {username}
                        </Text>
                        {badgeImageSource &&
                          (() => {
                            let badgeUri: string | null = null;
                            let isBadgeLottie = false;

                            if (typeof badgeImageSource === 'string') {
                              badgeUri = badgeImageSource;
                              isBadgeLottie = isLottieAnimation({ uri: badgeUri });
                            } else if (
                              badgeImageSource &&
                              typeof badgeImageSource === 'object' &&
                              badgeImageSource.uri
                            ) {
                              badgeUri = badgeImageSource.uri;
                              isBadgeLottie = isLottieAnimation(badgeImageSource);
                            }

                            if (!badgeUri) return null;

                            return (
                              <View
                                style={{
                                  marginLeft: scaleSize(1),
                                  marginTop: scaleSize(-1),
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isBadgeLottie ? (
                                  <LottieView
                                    source={{ uri: badgeUri }}
                                    autoPlay
                                    loop
                                    style={{
                                      width: scaleSize(18),
                                      height: scaleSize(18),
                                      zIndex: 15,
                                    }}
                                  />
                                ) : (
                                  <Image
                                    source={{ uri: badgeUri }}
                                    style={{
                                      width: scaleSize(18),
                                      height: scaleSize(18),
                                      zIndex: 15,
                                    }}
                                    resizeMode="contain"
                                  />
                                )}
                              </View>
                            );
                          })()}
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: scaleSize(8),
                          justifyContent: 'flex-start',
                        }}
                      >
                        <Image
                          source={require('../../../../assets/icons/Tpcoin.png')}
                          style={{
                            width: scaleSize(16),
                            height: scaleSize(16),
                            marginRight: scaleSize(4),
                          }}
                        />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: getResponsiveFontSize(scaleSize(11)),
                            fontWeight: 'bold',
                          }}
                        >
                          {(winner.money_awarded || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}
          </View>
        )}

        {displayWinners.length === 0 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: scaleSize(20),
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: getResponsiveFontSize(scaleSize(14)),
                textAlign: 'center',
              }}
            >
              {debugInfo?.error ? `No recent winners (${debugInfo.error})` : 'No recent winners'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface AuthState {
  user?: {
    name?: string;
    nickname?: string;
    picture?: string;
  };
}

interface RootState {
  auth: AuthState;
}

// Stable empty array reference to prevent unnecessary rerenders
const EMPTY_WINNERS_ARRAY: any[] = [];

const UpdatesScreen: React.FC = () => {
  // CRITICAL: Check focus FIRST to prevent unnecessary work when not focused
  const isFocused = useIsFocused(); // Track if screen is focused

  // Performance monitoring - use ref to track render count (moved to useEffect to prevent render loop)
  const renderCountRef = useRef(0);
  const firstRenderTimeRef = useRef<number | null>(null);
  const hasLoggedInitialRender = useRef(false);

  // Track render count in useEffect to prevent render loop
  useEffect(() => {
    renderCountRef.current += 1;

    if (firstRenderTimeRef.current === null) {
      firstRenderTimeRef.current = performance.now();
      if (__DEV__) {
        logger.debug('UpdatesScreen initial render started', 'PERF');
      }
    } else if (renderCountRef.current > 5 && __DEV__) {
      logger.warn(
        `UpdatesScreen has rendered ${renderCountRef.current} times (possible loop!)`,
        'PERF'
      );
    }

    // Log render duration after first render completes
    if (firstRenderTimeRef.current !== null && !hasLoggedInitialRender.current) {
      requestAnimationFrame(() => {
        const renderDuration = performance.now() - (firstRenderTimeRef.current || 0);
        if (renderDuration > 100 && __DEV__) {
          logger.warn(
            `UpdatesScreen initial render took ${renderDuration.toFixed(2)}ms (SLOW!)`,
            'PERF'
          );
        }
        hasLoggedInitialRender.current = true;
        firstRenderTimeRef.current = null;
      });
    }
  });

  // Analytics tracking - hooks must be called unconditionally
  useTrackScreenView('UpdatesScreen');
  const { trackEvent, trackAction } = useAnalytics();

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();
  const insets = useSafeAreaInsets();

  // State management
  const [showWinners, setShowWinners] = useState<boolean>(false);

  // Get profile data to determine subscription status
  const { data: profileData, isLoading: isProfileLoading } = profileApi.useGetProfileQuery();
  const isSubscribed = !!profileData?.is_subscribed;


  const [showSubscriptionCard, setShowSubscriptionCard] = useState<boolean>(true);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0); // 0 = Subscription, 1 = DailyRewards, 2 = Congratulations
  // Removed currentSlide - WinnersCarousel manages its own state now
  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isInitialRenderDone, setIsInitialRenderDone] = useState<boolean>(false);

  // Refs for cleanup and preventing infinite loops
  const cardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCardIndexRef = useRef<number>(0); // Track card index in ref to avoid closure issues
  const isFocusedRef = useRef<boolean>(false); // Track focus state in ref for timer callback
  const hasInitialRenderCompleted = useRef(false); // Track if initial render is complete (prevents timer from starting too early)
  const fetchDataTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasFetchedRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Sync refs with state - useEffect is sufficient since these are just tracking refs
  // useLayoutEffect was blocking initial render unnecessarily
  useEffect(() => {
    currentCardIndexRef.current = currentCardIndex;
  }, [currentCardIndex]);

  // Sync focus state to ref for timer callback
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // CRITICAL: Removed animation refs - no longer needed after removing RecentWinnersSection

  // CRITICAL: Removed initial animations - content displays immediately for better UX
  // Professional apps show content immediately, not after 600ms+ delay
  // Animations were causing slow initial render and unprofessional appearance
  // Content is now immediately visible on mount

  // Get daily winners from Redux store
  // Use stable empty array reference to prevent unnecessary rerenders
  const dailyWinnersData = useSelector(
    (state: RootState) => {
      const winners = (state as any).winners?.daily;
      return winners && Array.isArray(winners) && winners.length > 0
        ? winners
        : EMPTY_WINNERS_ARRAY;
    },
    (left, right) => {
      // Custom equality check - compare array lengths and first item to avoid rerenders
      if (left.length !== right.length) return false;
      if (left.length === 0 && right.length === 0) return true; // Both empty, same reference
      // If arrays have same length and first item is same, consider equal
      return left.length === 0 || (left[0]?.id === right[0]?.id && left.length === right.length);
    }
  );

  // Get daily coins from timer state to determine if Congratulations card should be shown
  const dailyTriviaCoins = useSelector((state: any) => state.timer?.dailyTriviaCoins || 0);

  // Responsive layout calculations - use responsive hook instead of hardcoded Dimensions.get()
  const { width: screenWidth, height: screenHeight } = useStandardResponsive();
  // CRITICAL: Use static values instead of useMemo to reduce initial render cost
  const horizontalPadding = scaleSize(20);
  const cardSpacing = scaleSize(16);
  const verticalPadding = scaleSize(20);

  // Performance optimizations - Following old TriviaPay logic
  const handleSubscribe = useCallback(() => {
    // Navigate to WinnersScreen when subscribe button is clicked
    // WinnersScreen removed - navigate to Leaderboard instead
    navigation.navigate('Leaderboard' as never);
  }, [navigation]);

  const handleSubscribePrompt = useCallback(() => {
    handleSubscribe();
  }, [handleSubscribe]);

  // Handle winner click - show profile modal first (like leaderboard)
  const handleWinnerClick = useCallback(
    (winner: any) => {
      // Track analytics
      trackEvent('winner_clicked', {
        winnerId: winner.id || winner.userid,
        winnerName: winner.name || winner.username,
      });
      // Extract user ID from winner data
      // API returns 'userid' (lowercase) - prioritize this since it's what the API provides
      // Priority: userid (API field) > peer_user_id > account_id > user_id > user_account_id > accountId
      let accountId: number | null = null;

      // Try userid FIRST (this is what the API actually returns)
      if (winner.userid) {
        accountId =
          typeof winner.userid === 'number' ? winner.userid : parseInt(String(winner.userid), 10);
      }
      // Try peer_user_id (used in conversations)
      else if (winner.peer_user_id) {
        accountId =
          typeof winner.peer_user_id === 'number'
            ? winner.peer_user_id
            : parseInt(String(winner.peer_user_id), 10);
      }
      // Try account_id
      else if (winner.account_id) {
        accountId =
          typeof winner.account_id === 'number'
            ? winner.account_id
            : parseInt(String(winner.account_id), 10);
      }
      // Try user_id
      else if (winner.user_id) {
        accountId =
          typeof winner.user_id === 'number'
            ? winner.user_id
            : parseInt(String(winner.user_id), 10);
      }
      // Try user_account_id
      else if (winner.user_account_id) {
        accountId =
          typeof winner.user_account_id === 'number'
            ? winner.user_account_id
            : parseInt(String(winner.user_account_id), 10);
      }
      // Try accountId
      else if (winner.accountId) {
        accountId =
          typeof winner.accountId === 'number'
            ? winner.accountId
            : parseInt(String(winner.accountId), 10);
      }
      // Try parsing id if it's a valid number and looks like an account ID
      else if (winner.id) {
        const parsedId =
          typeof winner.id === 'number' ? winner.id : parseInt(String(winner.id), 10);
        if (!isNaN(parsedId) && parsedId > 1000) {
          accountId = parsedId;
        }
      }

      // Validate the extracted ID
      if (accountId !== null && (isNaN(accountId) || accountId <= 0)) {
        accountId = null;
      }

      // Log winner data for debugging

      if (!accountId) {
        Alert.alert(
          'Unable to Start Chat',
          'The user account ID could not be found. This may be a temporary issue. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Prepare user data for modal (like leaderboard)
      const winnerName = winner.name || winner.username || 'Unknown';
      const winnerAvatar =
        winner.image || winner.avatar || 'https://randomuser.me/api/portraits/men/32.jpg';

      // Create user object for UserProfileModal (matching leaderboard format)
      const userForModal = {
        id: accountId,
        name: winnerName,
        username: winner.username || winnerName,
        image: winnerAvatar,
        avatar: winnerAvatar,
        // Include all possible ID fields for UserProfileModal
        userid: accountId,
        peer_user_id: accountId,
        account_id: accountId,
        user_id: accountId,
        user_account_id: accountId,
        accountId,
      };

      // Set selected user and show modal (like leaderboard)
      setSelectedUser(userForModal);
      setIsProfileModalVisible(true);
    },
    [trackEvent]
  );

  // Handle profile modal close
  const handleCloseProfileModal = useCallback(() => {
    setIsProfileModalVisible(false);
    setSelectedUser(null);
  }, []);

  // CRITICAL: Memoize navigation callback to prevent WinnersCarousel re-renders
  const handleViewAllWinners = useCallback(() => {
    navigation.navigate('Leaderboard' as never);
  }, [navigation]);

  // Android back button handler
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showWinners) {
          setShowWinners(false);
          return true;
        }
        if (isProfileModalVisible) {
          setIsProfileModalVisible(false);
          return true;
        }
        return false;
      };

      if (Platform.OS === 'android') {
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
      }
    }, [showWinners, isProfileModalVisible])
  );

  // Prevent layout jumps when screen regains focus - stabilize layout immediately
  useFocusEffect(
    useCallback(() => {
      // Ensure layout is stable when navigating back - no recalculation needed
      // The layout styles are already memoized, just ensure they're applied immediately
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Fetch daily winners on mount - prevent infinite loops
  useEffect(() => {
    // Prevent multiple simultaneous fetches
    if (hasFetchedRef.current || isFetchingRef.current) {
      return;
    }

    // Track analytics
    trackEvent('home_screen_viewed', { timestamp: Date.now() });

    const fetchData = async () => {
      if (!isMountedRef.current || isFetchingRef.current) return;

      isFetchingRef.current = true;
      hasFetchedRef.current = true;

      try {
        // Skip fetching daily winners here - WinnersScreen and WinnersCarousel handle it
        // This prevents duplicate calls to the same endpoint
        // Daily winners are already fetched by WinnersScreen and displayed in WinnersCarousel

        if (isMountedRef.current) {
          setIsInitialLoading(false);
        }

        trackAction('home_data_loaded', { success: true });
      } catch (error) {
        if (isMountedRef.current) {
          setIsInitialLoading(false);
        }
        trackAction('home_data_loaded', { success: false, error: String(error) });
      } finally {
        isFetchingRef.current = false;
      }
    };

    // CRITICAL: Fetch data immediately for faster initial load
    // InteractionManager was causing unnecessary delays (waiting for all interactions)
    // Direct fetch provides better perceived performance
    fetchData();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (fetchDataTimerRef.current) {
        clearTimeout(fetchDataTimerRef.current);
        fetchDataTimerRef.current = null;
      }
    };
  }, [dispatch, trackEvent, trackAction]);

  // Helper function to get image source (same as other components)
  const getImageSource = React.useCallback((imageUrl: any): any => {
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('{') || imageUrl.startsWith('[')) {
        try {
          const parsed = JSON.parse(imageUrl);
          const uri = parsed.uri || parsed.url || parsed.image || parsed.avatar || imageUrl;
          return { uri };
        } catch (e) {
          return { uri: imageUrl };
        }
      }
      return { uri: imageUrl };
    } else if (typeof imageUrl === 'number') {
      return imageUrl;
    } else if (imageUrl.uri) {
      return imageUrl;
    }
    return null;
  }, []);

  // CRITICAL: Simplified computation - no heavy operations to prevent initial render blocking
  // Transform daily winners data to match Winner interface for modal
  const transformedWinners = React.useMemo(() => {
    // Return empty array immediately on first render to prevent blocking
    if (!dailyWinnersData || !Array.isArray(dailyWinnersData) || dailyWinnersData.length === 0) {
      return [];
    }

    // Simple synchronous computation - no blocking operations
    return dailyWinnersData.map((winner: any, index: number) => {
      const username = winner.username || winner.name || 'Unknown';
      const amount = winner.amount_won || winner.amount || winner.prize || 0;
      const avatarUrl =
        winner.profile_pic ||
        winner.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=128`;

      // Transform badge image URLs using getImageSource (same as leaderboard)
      const badgeImageSource = winner.badge_image_url
        ? getImageSource(winner.badge_image_url)
        : undefined;

      return {
        id: winner.id || winner.user_id || index + 1,
        // Preserve original API fields for account_id lookup
        account_id:
          winner.account_id ||
          winner.user_id ||
          (winner.id && typeof winner.id === 'number' ? winner.id : undefined),
        user_id:
          winner.user_id || (winner.id && typeof winner.id === 'number' ? winner.id : undefined),
        userid:
          winner.userid ||
          winner.user_id ||
          (winner.id && typeof winner.id === 'number' ? winner.id : undefined), // Add userid for chat navigation
        name: username,
        username,
        image: avatarUrl,
        avatar: avatarUrl,
        prize: typeof amount === 'number' ? amount.toFixed(2) : (amount ?? 0).toString(),
        amount: typeof amount === 'number' ? amount.toFixed(2) : (amount ?? 0).toString(),
        badgeImage: badgeImageSource,
      };
    });
  }, [dailyWinnersData, getImageSource]);

  // CRITICAL: Only run card rotation timer when screen is focused AND after initial render completes
  // This prevents UpdatesScreen from re-rendering when on other tabs and during initial mount
  useEffect(() => {
    // Mark initial render as complete after a short delay
    const timer = setTimeout(() => {
      setIsInitialRenderDone(true);
    }, 2000); // Wait 2 seconds after mount before starting timer
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Clear existing timer
    if (cardTimerRef.current) {
      clearInterval(cardTimerRef.current);
      cardTimerRef.current = null;
    }

    // CRITICAL: Only start timer if screen is focused AND initial render is complete
    if (!isFocused || !isInitialRenderDone) {
      if (!isFocused) {
        if (__DEV__) {
          logger.debug('UpdatesScreen: Card rotation paused (screen not focused)', 'PERF');
        }
      }
      return;
    }

    if (__DEV__) {
      logger.debug('UpdatesScreen: Card rotation started (screen focused)', 'PERF');
    }
    let isMounted = true;

    // Always cycle through all three cards: 0 = Subscription, 1 = DailyRewards, 2 = Congratulations
    // Increased interval to reduce re-renders and improve performance
    // CRITICAL: Use ref to track index and batch state updates to prevent multiple re-renders
    cardTimerRef.current = setInterval(() => {
      // CRITICAL: Double-check focus AND mounted state before updating (prevents updates when not focused)
      // Use ref to check focus to avoid closure issues
      if (isMounted && isFocusedRef.current) {
        // Update card index - no skipping
        const nextIndex = (currentCardIndexRef.current + 1) % 3;
        currentCardIndexRef.current = nextIndex;
        // Batch both state updates - React 18+ will batch these automatically
        setCurrentCardIndex(nextIndex);
        setShowSubscriptionCard(nextIndex === 0);
      }
    }, 15000);

    return () => {
      isMounted = false;
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
        cardTimerRef.current = null;
      }
      if (__DEV__) {
        logger.debug('UpdatesScreen: Card rotation stopped', 'PERF');
      }
    };
  }, [isFocused, isInitialRenderDone, dailyTriviaCoins]); // Re-run when focus, render status or coins change

  // CRITICAL: Use static style instead of useMemo to reduce initial render cost
  const stableLayoutStyle = {
    flex: 1,
    // Tab bar space is handled by sceneContainerStyle in MainNavigator - no additional padding needed
  };

  // Status bar is handled by MainNavigator - remove duplicate to prevent conflicts
  return (
    <ScreenErrorBoundary screenName="UpdatesScreen">
      <ScreenBackButtonHandler action="navigate" />
      <SafeAreaView
        style={stableLayoutStyle}
        edges={[]} // No edges - Header component handles safe area padding
      >
        {/* CRITICAL: Use static styles instead of useMemo to reduce initial render cost */}
        <View
          style={{
            flex: 1,
            width: screenWidth,
            backgroundColor: '#1e90ff',
          }}
        >
          {/* Stable container - static styles for faster initial render */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              paddingTop: 0,
              marginTop: 0,
            }}
          >
            <View style={{ flex: 1 }}>
              <Header />

              {/* PrizePool Section - Display Subscription, Daily Rewards, and Congratulations (Alternating) */}
              <View
                style={{
                  paddingHorizontal: horizontalPadding,
                  paddingTop: 0,
                  paddingBottom: verticalPadding,
                  marginTop: scaleSize(-20),
                }}
              >
                {/* Conditional rendering - Show one card at a time, cycling through all three */}
                {currentCardIndex === 0 ? (
                  <SubscriptionUI handleSubscribe={handleSubscribe} isSubscribed={isSubscribed} />
                ) : currentCardIndex === 1 ? (
                  <DailyRewards
                    isSubscribed={isSubscribed}
                    onSubscribePrompt={handleSubscribePrompt}
                  />
                ) : (
                  <CongratulationsUI />
                )}
              </View>

              {/* Winners Carousel - ALWAYS DISPLAY */}
              <View
                style={{
                  paddingHorizontal: horizontalPadding,
                  paddingTop: cardSpacing,
                  paddingBottom: verticalPadding,
                }}
              >
                <WinnersCarousel
                  isFocused={isFocused}
                  onViewAll={handleViewAllWinners}
                  onWinnerClick={handleWinnerClick}
                />
              </View>
            </View>

            {/* WinnersModal removed - winners no longer used */}
            {/* <WinnersModal
              visible={showWinners}
              onClose={() => {
                setShowWinners(false);
              }}
              winners={transformedWinners}
              getUsername={getUsername}
              onWinnerClick={handleWinnerClick}
            /> */}

            {/* Show Loading Animation while screen is rendering/data is fetching */}
            {(isInitialLoading || isProfileLoading) && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#1e90ff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10000,
                }}
              >
                <LottieView
                  source={require('../../../../assets/animations/LoadingBar.json')}
                  autoPlay
                  loop
                  style={{ width: scaleSize(200), height: scaleSize(200) }}
                />
              </View>
            )}

            <UserProfileModal
              isVisible={isProfileModalVisible}
              onClose={handleCloseProfileModal}
              user={selectedUser || { id: 0, rank: 0, name: '', image: '', amount: '0' }}
              isDarkMode={isDarkMode}
            />

            {/* GlobalLoader is handled at the Root level (App.tsx) */}
          </View>
        </View>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
};

// CRITICAL: Memoize UpdatesScreen to prevent unnecessary re-renders when not focused
export default UpdatesScreen;
