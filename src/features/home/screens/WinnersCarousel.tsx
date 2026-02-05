/**
 * WinnersCarousel - TypeScript Implementation
 * Professional winners carousel component with comprehensive features
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ImageBackground, Animated } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import Keychain from 'react-native-keychain';
import { useSelector } from 'react-redux';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { apiService } from '../../../services/apiService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import { scaleSize } from '../../../utils/scaleSize';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import ProfileFrame from '../../../components/ProfileFrame';

interface Winner {
  id: string;
  name: string;
  username?: string; // For chat navigation
  image: string;
  avatar?: string; // Alias for image
  prize: string;
  timestamp: number;
  badgeImage?: string;
  // User ID fields for chat navigation
  peer_user_id?: number;
  userid?: number;
  user_id?: number;
  account_id?: number;
}

interface ApiWinner {
  id: string;
  username: string;
  amount: number;
  date: string;
  country: string;
}

interface WinnersCarouselProps {
  onViewAll?: () => void;
  onWinnerClick?: (winner: Winner) => void;
  isFocused?: boolean; // Whether parent screen is focused
}

// Stable empty array reference to prevent unnecessary rerenders
const EMPTY_WINNERS_ARRAY: any[] = [];

const WinnersCarousel: React.FC<WinnersCarouselProps> = React.memo(({ onViewAll, onWinnerClick, isFocused = true }) => {
  // CRITICAL: Manage slide state internally to prevent parent re-renders
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollInterval = 4000;

  const viewAllAnimation = useButtonAnimation();
  const {
    getResponsiveFontSize,
    getResponsiveImageSize,
    getResponsiveIconSize,
    getResponsiveButtonHeight,
    getResponsiveButtonWidth,
    getResponsiveSpacing,
    isSmallDevice,
    isTablet
  } = useStandardResponsive();

  // Get daily winners from Redux store (professional approach - use existing data)
  // Use stable empty array reference to prevent unnecessary rerenders
  const dailyWinnersData = useSelector((state: any) => {
    const winners = state?.winners?.daily;
    return winners && Array.isArray(winners) && winners.length > 0 ? winners : EMPTY_WINNERS_ARRAY;
  }, (left, right) => {
    // Custom equality check - compare array lengths and first item to avoid rerenders
    if (left.length !== right.length) return false;
    if (left.length === 0 && right.length === 0) return true; // Both empty, same reference
    // If arrays have same length and first item is same, consider equal
    return left.length === 0 || (left[0]?.id === right[0]?.id && left.length === right.length);
  });
  const winnersStatus = useSelector((state: any) => state?.winners?.status || 'idle');

  const [formattedWinners, setFormattedWinners] = useState<Winner[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);

  // Responsive styles
  const carouselWidth = scaleSize(312); // max width
  const carouselHeight = scaleSize(200);
  const viewAllButtonWidth = scaleSize(80);
  const viewAllButtonHeight = scaleSize(50);
  const viewAllTextSize = scaleSize(12);
  const winnerNameSize = getResponsiveFontSize(scaleSize(16));
  const timestampSize = getResponsiveFontSize(scaleSize(10));
  const prizeTextSize = getResponsiveFontSize(scaleSize(11));
  const avatarInitialsSize = scaleSize(16);
  const emptyTextSize = scaleSize(14);

  // Professional caching system for instant data fetching
  const cacheKey = 'recent_winners_cache';
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes cache

  const getCachedData = async (): Promise<Winner[] | null> => {
    try {
      const credentials = await Keychain.getInternetCredentials(cacheKey);
      if (credentials && credentials.password) {
        const { data, timestamp } = JSON.parse(credentials.password);
        if (Date.now() - timestamp < cacheExpiry) {
          return data;
        }
      }
    } catch (error) {

    }
    return null;
  };

  const setCachedData = async (data: Winner[]): Promise<void> => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await Keychain.setInternetCredentials(cacheKey, cacheKey, JSON.stringify(cacheData));
    } catch (error) {

    }
  };

  // Helper function to get image source (same as other components)
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

  // Use ref to prevent infinite loops
  const processedDataRef = useRef<string>('');

  // Transform Redux data to Winner format - always use latest Redux data (instant display)
  useEffect(() => {
    // Prevent infinite loops by checking if data has actually changed
    const dataKey = JSON.stringify(dailyWinnersData);
    if (processedDataRef.current === dataKey) {
      return; // Data hasn't changed, skip processing
    }
    processedDataRef.current = dataKey;

    // Always process Redux data when it changes (instant updates)
    if (dailyWinnersData && Array.isArray(dailyWinnersData)) {
      if (dailyWinnersData.length > 0) {

        // Normalize data first (same as leaderboard) to ensure profile_pic_url and profile_pic_type are included
        const normalizedData = dailyWinnersData.map((entry: any) => ({
          ...entry,
          profile_pic_url: entry.profile_pic_url || entry.profile_pic || null,
          profile_pic_type: entry.profile_pic_type || (entry.profile_pic || entry.profile_pic_url ? 'custom' : entry.avatar_url ? 'avatar' : null),
        }));

        // Transform Redux data to match our Winner interface
        const transformedWinners: Winner[] = normalizedData.map((apiWinner: any, index: number) => {
          const username = apiWinner.username || apiWinner.name || 'Unknown';
          const amount = apiWinner.amount_won || apiWinner.money_awarded || apiWinner.amount || apiWinner.prize || 0;
          const winnerId = apiWinner.id || apiWinner.user_id || String(index + 1);
          const dateStr = apiWinner.date || apiWinner.timestamp || apiWinner.submitted_at || apiWinner.draw_date || apiWinner.created_at || new Date().toISOString();

          // Extract user ID - API returns 'userid' (lowercase), prioritize this
          let extractedUserId: number | undefined;
          // Try userid FIRST (this is what the API actually returns)
          if (apiWinner.userid) {
            extractedUserId = typeof apiWinner.userid === 'number' ? apiWinner.userid : parseInt(String(apiWinner.userid), 10);
          } else if (apiWinner.peer_user_id) {
            extractedUserId = typeof apiWinner.peer_user_id === 'number' ? apiWinner.peer_user_id : parseInt(String(apiWinner.peer_user_id), 10);
          } else if (apiWinner.user_id) {
            extractedUserId = typeof apiWinner.user_id === 'number' ? apiWinner.user_id : parseInt(String(apiWinner.user_id), 10);
          } else if (apiWinner.account_id) {
            extractedUserId = typeof apiWinner.account_id === 'number' ? apiWinner.account_id : parseInt(String(apiWinner.account_id), 10);
          } else if (apiWinner.id) {
            // Try to parse ID - only use if it's a valid number and looks like an account ID (large number)
            const parsedId = typeof apiWinner.id === 'number' ? apiWinner.id : parseInt(String(apiWinner.id), 10);
            if (!isNaN(parsedId) && parsedId > 1000) {
              extractedUserId = parsedId;
            }
          }

          // FIXED: Use profile_pic_url if profile_pic_type is 'custom', otherwise use avatar_url
          // Also check for profile_pic field as fallback.
          // For the final fallback (no image from backend), include winnerId in the name so each avatar is unique.
          const profileImage = (apiWinner.profile_pic_type === 'custom' && apiWinner.profile_pic_url)
            ? apiWinner.profile_pic_url
            : (apiWinner.profile_pic_type === 'avatar' && apiWinner.avatar_url)
              ? apiWinner.avatar_url
              : apiWinner.profile_pic_url || apiWinner.profile_pic || apiWinner.avatar_url || apiWinner.image || apiWinner.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(`${username} ${winnerId}`)}&background=random&color=fff&size=128`;

          // Transform badge image URL using getImageSource
          const badgeUrl = apiWinner.badge_image_url || apiWinner.badgeImage ||
            (Array.isArray(apiWinner.subscription_badges) && apiWinner.subscription_badges.length
              ? apiWinner.subscription_badges[0]?.image_url
              : null);
          const badgeImageSource = badgeUrl ? getImageSource(badgeUrl) : undefined;

          return {
            id: String(winnerId),
            name: username,
            username: username, // Add username for chat navigation
            image: profileImage,
            avatar: profileImage, // Add avatar alias
            prize: typeof amount === 'number' ? amount.toFixed(2) : String(amount),
            timestamp: new Date(dateStr).getTime(),
            badgeImage: badgeImageSource,
            // Preserve user ID fields for chat navigation - preserve all possible fields
            peer_user_id: apiWinner.peer_user_id ? (typeof apiWinner.peer_user_id === 'number' ? apiWinner.peer_user_id : parseInt(apiWinner.peer_user_id, 10)) : undefined,
            userid: extractedUserId,
            user_id: extractedUserId,
            account_id: extractedUserId,
          };
        });

        setFormattedWinners(transformedWinners);
        setHasError(false);
        // Cache the transformed data (async, don't await to prevent blocking)
        setCachedData(transformedWinners).catch(() => {
          // Silent fail for caching
        });
      } else {
        // Empty array - clear winners
        setFormattedWinners([]);
      }
    }

    // Fallback: Fetch if Redux data is not available
    const fetchRecentWinners = async () => {
      // First, try to get cached data for instant display
      let cachedWinners: Winner[] | null = null;
      try {
        cachedWinners = await getCachedData();
        if (cachedWinners && cachedWinners.length > 0) {
          setFormattedWinners(cachedWinners);
        }
      } catch (cacheError) {

      }

      try {
        setHasError(false);

        const response = await apiService.getRecentWinners();

        let winners: any[] = [];
        if (response.success && response.data) {
          const responseData: any = response.data;
          if (Array.isArray(responseData)) {
            winners = responseData;
          } else if (responseData?.winners && Array.isArray(responseData.winners)) {
            winners = responseData.winners;
          }
        }

        if (Array.isArray(winners) && winners.length > 0) {
          // Normalize data first
          const normalizedData = winners.map((entry: any) => ({
            ...entry,
            profile_pic_url: entry.profile_pic_url || entry.profile_pic || null,
            profile_pic_type: entry.profile_pic_type || (entry.profile_pic || entry.profile_pic_url ? 'custom' : entry.avatar_url ? 'avatar' : null),
          }));

          // Transform API data to match our Winner interface
          const transformedWinners: Winner[] = normalizedData.map((apiWinner: any, index: number) => {
            const username = apiWinner.username || apiWinner.name || 'Unknown';
            const amount = apiWinner.amount_won || apiWinner.money_awarded || apiWinner.amount || apiWinner.prize || 0;
            const winnerId = apiWinner.id || apiWinner.user_id || String(index + 1);
            const dateStr = apiWinner.date || apiWinner.timestamp || apiWinner.submitted_at || apiWinner.draw_date || apiWinner.created_at || new Date().toISOString();

            // Extract user ID
            let extractedUserId: number | undefined;
            if (apiWinner.userid) {
              extractedUserId = typeof apiWinner.userid === 'number' ? apiWinner.userid : parseInt(String(apiWinner.userid), 10);
            } else if (apiWinner.peer_user_id) {
              extractedUserId = typeof apiWinner.peer_user_id === 'number' ? apiWinner.peer_user_id : parseInt(String(apiWinner.peer_user_id), 10);
            } else if (apiWinner.user_id) {
              extractedUserId = typeof apiWinner.user_id === 'number' ? apiWinner.user_id : parseInt(String(apiWinner.user_id), 10);
            } else if (apiWinner.account_id) {
              extractedUserId = typeof apiWinner.account_id === 'number' ? apiWinner.account_id : parseInt(String(apiWinner.account_id), 10);
            }

            const profileImage = (apiWinner.profile_pic_type === 'custom' && apiWinner.profile_pic_url)
              ? apiWinner.profile_pic_url
              : (apiWinner.profile_pic_type === 'avatar' && apiWinner.avatar_url)
                ? apiWinner.avatar_url
                : apiWinner.profile_pic_url || apiWinner.profile_pic || apiWinner.avatar_url || apiWinner.image || apiWinner.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=128`;

            const badgeUrl = apiWinner.badge_image_url || apiWinner.badgeImage ||
              (Array.isArray(apiWinner.subscription_badges) && apiWinner.subscription_badges.length
                ? apiWinner.subscription_badges[0]?.image_url
                : null);
            const badgeImageSource = badgeUrl ? getImageSource(badgeUrl) : undefined;

            return {
              id: String(winnerId),
              name: username,
              username: username,
              image: profileImage,
              avatar: profileImage,
              prize: typeof amount === 'number' ? amount.toFixed(2) : String(amount),
              timestamp: new Date(dateStr).getTime(),
              badgeImage: badgeImageSource,
              peer_user_id: apiWinner.peer_user_id ? (typeof apiWinner.peer_user_id === 'number' ? apiWinner.peer_user_id : parseInt(apiWinner.peer_user_id, 10)) : undefined,
              userid: extractedUserId,
              user_id: extractedUserId,
              account_id: extractedUserId,
            };
          });

          // Update state and cache
          setFormattedWinners(transformedWinners);
          await setCachedData(transformedWinners);
        } else {
          setFormattedWinners([]);
          await setCachedData([]);
        }
      } catch (error) {
        setHasError(true);
        if (!cachedWinners || cachedWinners.length === 0) {
          setFormattedWinners([]);
        }
      }
    };

    fetchRecentWinners();
  }, [dailyWinnersData]); // Re-run when Redux data changes

  const formatRelativeDate = (timestamp: number): string => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  useEffect(() => {
    // Clear any existing interval
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    // Only set up auto-scroll if we have more than 1 winner AND screen is focused
    if (formattedWinners.length > 1 && isFocused) {
      autoScrollRef.current = setInterval(() => {
        setCurrentSlide((prevSlide) => {
          const nextSlide = prevSlide === formattedWinners.length - 1 ? 0 : prevSlide + 1;
          return nextSlide;
        });
      }, autoScrollInterval);
    }

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [formattedWinners.length, setCurrentSlide, isFocused]);

  const handlePrev = (): void => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    setCurrentSlide(currentSlide === 0 ? formattedWinners.length - 1 : currentSlide - 1);
  };

  const handleNext = (): void => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    setCurrentSlide(currentSlide === formattedWinners.length - 1 ? 0 : currentSlide + 1);
  };

  const handleViewAll = (): void => {
    if (typeof onViewAll === 'function') {
      onViewAll();
    }
  };

  const formatPrize = (prize: string): React.ReactElement => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image
        source={require('../../../../assets/icons/Tpcoin.png')}
        style={{
          width: scaleSize(16),
          height: scaleSize(16),
          borderRadius: scaleSize(8),
          marginRight: scaleSize(4)
        }}
      />
      <Text
        style={{
          fontSize: prizeTextSize,
          color: '#FFFFFF',
          fontWeight: 'bold'
        }}
      >
        {prize}
      </Text>
    </View>
  );

  const isLottieAnimation = (source: any): boolean => {
    if (!source) return false;
    if (typeof source === 'number') return false;

    const uri = typeof source === 'string' ? source : source.uri || '';
    const cleanUri = uri.split('?')[0].toLowerCase();

    return cleanUri.endsWith('.json');
  };

  const renderAvatar = (winner: Winner): React.ReactElement => {
    const avatarSource = winner.image;
    const isLottie = isLottieAnimation(avatarSource);

    const avatarSize = scaleSize(110); // Match TriviaPay size
    const actualAvatarSize = avatarSize * 0.7;
    const FRAME_PADDING_RATIO = 0.15;
    const containerSize = Math.round(actualAvatarSize / (1 - (FRAME_PADDING_RATIO * 2)));

    return (
      <View style={{
        top: scaleSize(14),
        left: 0,
      }}>
        <ProfileFrame
          size={containerSize}
          imageUrl={avatarSource || null}
          frameUrl={null}
          initials={(winner?.name?.[0] || '?').toUpperCase()}
          backgroundColor="#8B5CF6"
          profileSize={actualAvatarSize}
        />
      </View>
    );
  };

  // Empty state - no winners today
  if (formattedWinners.length === 0) {
    return (
      <View style={{ width: '100%', marginHorizontal: 0, marginTop: 0, marginBottom: scaleSize(60), zIndex: 1, position: 'relative', alignItems: 'center' }}>
        <View style={{
          width: '100%',
          maxWidth: carouselWidth,
          height: carouselHeight,
          alignSelf: 'center',
          position: 'relative'
        }}>
          <Image
            source={require('../../../../assets/home/recentWinners.png')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: scaleSize(20),
              overflow: 'hidden',
            }}
            resizeMode="cover"
          />

          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: scaleSize(20)
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: getResponsiveFontSize(scaleSize(20)),
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: scaleSize(8)
                }}
              >
                No winner yet
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: getResponsiveFontSize(scaleSize(12)),
                  textAlign: 'center',
                  lineHeight: scaleSize(20)
                }}
              >
                Come back tomorrow – it could be you!
              </Text>
            </View>
          </View>
        </View>

        <Animated.View style={[{
          position: 'absolute',
          bottom: scaleSize(0),
          left: '50%',
          zIndex: 1000,
        }, {
          ...viewAllAnimation.animatedStyle,
          transform: [
            ...(viewAllAnimation.animatedStyle.transform || []),
            { translateX: scaleSize(-37) }
          ],
        }]}>
          <TouchableOpacity
            onPress={handleViewAll}
            onPressIn={viewAllAnimation.animatePress}
            onPressOut={viewAllAnimation.animateRelease}
            activeOpacity={1}
          >
            <ImageBackground
              source={require('../../../../assets/home/viewAll.png')}
              style={{
                paddingVertical: scaleSize(3),
                paddingHorizontal: scaleSize(7),
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: scaleSize(12),
                width: scaleSize(70),
                height: scaleSize(30),
              }}
              imageStyle={{ borderRadius: scaleSize(12) }}
            >

            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const currentWinner = formattedWinners[currentSlide] || formattedWinners[0];

  return (
    <View style={{ width: '100%', marginHorizontal: 0, marginTop: 0, marginBottom: scaleSize(60), zIndex: 1, position: 'relative', alignItems: 'center' }}>
      <View style={{
        position: 'relative',
        width: '100%',
        maxWidth: carouselWidth,
        height: carouselHeight,
        alignSelf: 'center'
      }}>
        <Image
          source={require('../../../../assets/home/recentWinners.png')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: scaleSize(12),
            overflow: 'hidden',
          }}
          resizeMode="cover"
        />

        <View style={{
          position: 'absolute',
          top: scaleSize(60),
          left: scaleSize(10),
          right: scaleSize(10),
          bottom: scaleSize(2),
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            paddingHorizontal: scaleSize(10),
            paddingLeft: scaleSize(10)
          }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                top: scaleSize(-40),
                marginRight: scaleSize(10),
                marginLeft: scaleSize(5),
                flex: 1,
                minWidth: 0
              }}
              onPress={() => onWinnerClick && onWinnerClick(currentWinner)}
              activeOpacity={0.7}
            >
              {renderAvatar(currentWinner)}
              <View style={{
                marginLeft: scaleSize(8),
                alignItems: 'flex-start',
                flex: 1,
                minWidth: 0,
                flexShrink: 1,
                marginTop: scaleSize(20),
                left: 0
              }}>
                <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                    style={{
                      color: '#FFFFFF',
                      fontSize: winnerNameSize,
                      fontWeight: '600',
                      textAlign: 'left',
                      fontFamily: 'Baloo2-Bold',
                      flexShrink: 1,
                      marginRight: scaleSize(1),
                    }}
                  >
                    {currentWinner.name}
                  </Text>
                  {currentWinner.badgeImage && (
                    (() => {
                      let badgeUri: string | null = null;
                      let isBadgeLottie = false;

                      if (typeof currentWinner.badgeImage === 'string') {
                        badgeUri = currentWinner.badgeImage;
                        isBadgeLottie = isLottieAnimation({ uri: badgeUri });
                      } else if (currentWinner.badgeImage && typeof currentWinner.badgeImage === 'object' && currentWinner.badgeImage.uri) {
                        badgeUri = currentWinner.badgeImage.uri;
                        isBadgeLottie = isLottieAnimation(currentWinner.badgeImage);
                      }

                      if (!badgeUri) return null;

                      return (
                        <View style={{ marginLeft: scaleSize(1), marginTop: scaleSize(-1), alignItems: 'center', justifyContent: 'center' }}>
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
                    })()
                  )}
                </View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: timestampSize,
                    marginTop: scaleSize(2),
                    textAlign: 'left'
                  }}
                >
                  {formatRelativeDate(currentWinner.timestamp)}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: scaleSize(2),
                  justifyContent: 'flex-start'
                }}>
                  <Image
                    source={require('../../../../assets/icons/Tpcoin.png')}
                    style={{
                      width: scaleSize(16),
                      height: scaleSize(16),
                      marginRight: scaleSize(4)
                    }}
                  />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: prizeTextSize,
                      fontWeight: 'bold'
                    }}
                  >
                    {currentWinner.prize}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {formattedWinners.length > 1 && (
          <View style={{
            position: 'absolute',
            bottom: scaleSize(32),
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            zIndex: 1001,
          }}>
            {(() => {
              const maxDots = 4;
              const totalWinners = formattedWinners.length;
              const numberOfDots = Math.min(totalWinners, maxDots);

              let activeDotIndex: number;
              if (totalWinners <= maxDots) {
                activeDotIndex = currentSlide;
              } else {
                const winnersPerDot = totalWinners / numberOfDots;
                activeDotIndex = Math.floor(currentSlide / winnersPerDot);
                activeDotIndex = Math.min(activeDotIndex, numberOfDots - 1);
              }

              return Array.from({ length: numberOfDots }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: scaleSize(6),
                    height: scaleSize(6),
                    borderRadius: scaleSize(3),
                    marginHorizontal: scaleSize(3),
                    backgroundColor: i === activeDotIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)'
                  }}
                />
              ));
            })()}
          </View>
        )}
      </View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: scaleSize(0),
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 1000,
          },
          viewAllAnimation.animatedStyle,
        ]}
      >
        <SoundTouchableOpacity
          onPress={handleViewAll}
          onPressIn={viewAllAnimation.animatePress}
          onPressOut={viewAllAnimation.animateRelease}
          activeOpacity={1}
        >
          <ImageBackground
            source={require('../../../../assets/home/viewAll.png')}
            style={{
              paddingVertical: scaleSize(3),
              paddingHorizontal: scaleSize(7),
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: scaleSize(12),
              width: scaleSize(70),
              height: scaleSize(30),
            }}
            imageStyle={{ borderRadius: scaleSize(12) }}
          />
        </SoundTouchableOpacity>
      </Animated.View>
    </View>
  );
});

WinnersCarousel.displayName = 'WinnersCarousel';

export default WinnersCarousel;
