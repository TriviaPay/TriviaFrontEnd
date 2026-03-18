import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Image, ImageBackground, Animated, StyleSheet, Text, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MainNavigationProp } from '../../../navigation/types';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStandardResponsive from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { useGetProfileQuery } from '../../../store/api/profileApi';
import { logger } from '../../../lib/utils/logger';
import { useAndroidBackButton } from '../../../hooks/usePlatformOptimization';
import {
  useGetFreeModeStatusQuery,
  useGetBronzeModeStatusQuery,
  useGetSilverModeStatusQuery,
  useGetModesStatusQuery,
} from '../../../store/api/triviaApi';
import { useTimerHook } from '../../../hooks/Home/useTimerHook';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type TriviaCardItem = {
  id: string;
  cardSource: any;
  points: string;
};

const BASE_CARDS: TriviaCardItem[] = [
  {
    id: 'card-0',
    cardSource: require('../../../../assets/trivia/card-0.png'),
    points: '100',
  },
  {
    id: 'card-1',
    cardSource: require('../../../../assets/trivia/card-1.png'),
    points: '300',
  },
  {
    id: 'card-2',
    cardSource: require('../../../../assets/trivia/card-2.png'),
    points: '750',
  },
  {
    id: 'card-3',
    cardSource: require('../../../../assets/trivia/card-3.png'),
    points: '1,500',
  },
  {
    id: 'card-4',
    cardSource: require('../../../../assets/trivia/card-4.png'),
    points: '3,000',
  },
];

const AnimatedTouchable = Animated.createAnimatedComponent(SoundTouchableOpacity);

// Play Button Component with Animation
const PlayButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 160,
      friction: 8,
    }).start();
  }, [buttonScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 160,
      friction: 8,
    }).start();
  }, [buttonScale]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: buttonScale }],
      }}
    >
      <ImageBackground
        source={require('../../../../assets/trivia/playButton.png')}
        style={{
          width: scaleSize(160),
          height: scaleSize(64),
          alignItems: 'center',
          justifyContent: 'center',
        }}
        resizeMode="stretch"
      >
        <SoundTouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View />
        </SoundTouchableOpacity>
      </ImageBackground>
    </Animated.View>
  );
});

PlayButton.displayName = 'PlayButton';

// Sliding Upgrade Button Component with real sliding logic
const SlidingUpgradeButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const panX = useRef(new Animated.Value(0)).current;
  const containerWidth = scaleSize(160); // Match PlayButton width
  const handleSize = scaleSize(40);
  const slideDistance = containerWidth - handleSize - 8;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= slideDistance) {
          panX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= slideDistance * 0.8) {
          Animated.spring(panX, {
            toValue: slideDistance,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start(() => {
            onPress();
            setTimeout(() => {
              Animated.spring(panX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }, 1000);
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  const textOpacity = panX.interpolate({
    inputRange: [0, slideDistance * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={{
        width: containerWidth,
        height: scaleSize(64),
        backgroundColor: 'rgba(255, 255, 255, 0.3)', // Transparent white
        borderRadius: scaleSize(32),
        padding: 4,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Animated.Text
        style={{
          position: 'absolute',
          alignSelf: 'center',
          color: '#1E40AF', // Blue color
          fontSize: scaleSize(11),
          fontWeight: '900',
          fontFamily: 'Baloo2',
          opacity: textOpacity,
          paddingLeft: scaleSize(10),
        }}
        numberOfLines={1}
      >
        SLIDE TO UPGRADE
      </Animated.Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          width: handleSize,
          height: handleSize,
          borderRadius: handleSize / 2,
          backgroundColor: '#1E40AF', // Blue handle
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: panX }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <Icon name="home" size={scaleSize(20)} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
});

SlidingUpgradeButton.displayName = 'SlidingUpgradeButton';

// CardTimer removed as per request
// const CardTimer = React.memo(...) removed

const PrizePoolDisplay = React.memo(({ cardId }: { cardId: string }) => {
  const { bronzePrizePool, silverPrizePool } = useTimerHook();

  // Only show for Bronze (card-1) and Silver (card-2)
  if (cardId !== 'card-1' && cardId !== 'card-2') return null;

  const prizeAmount = cardId === 'card-1' ? bronzePrizePool : silverPrizePool;
  // TODO: Check if "Prize Pool" text is what user wants. Yes: "at priesepool amount before coin add prizepool".
  // Assuming: "Prize Pool " + Icon + Amount or "Prize Pool" above? 
  // Code snippet shows it's a row. Let's add text in the row.

  return (
    <View
      style={{
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(20),
        borderWidth: 1.5,
        borderColor: '#FFFFFF', // White border as requested
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        marginTop: scaleSize(8),
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: scaleSize(14),
          fontWeight: '800',
          fontFamily: 'Baloo2',
          marginRight: scaleSize(6),
          textShadowColor: 'rgba(0,0,0,0.2)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
      >
        Prize Pool
      </Text>
      <Image
        source={require('../../../../assets/icons/Tpcoin.png')}
        style={{ width: scaleSize(20), height: scaleSize(20), marginRight: scaleSize(6) }}
        resizeMode="contain"
      />
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: scaleSize(16),
          fontWeight: 'bold',
          fontFamily: 'Baloo2',
        }}
      >
        {prizeAmount ? prizeAmount.toFixed(2) : '0.00'}
      </Text>
    </View>
  );
});

PrizePoolDisplay.displayName = 'PrizePoolDisplay';

const TriviaCard = React.memo(
  ({
    item,
    cardWidth,
    cardHeight,
    spacing,
    scale,
    translateY,
    opacity,
    locked,
    attempted,
    subscribed,
    isComingSoon,
    message,
  }: {
    item: TriviaCardItem;
    cardWidth: number;
    cardHeight: number;
    spacing: number;
    scale: Animated.AnimatedInterpolation<number>;
    translateY: Animated.AnimatedInterpolation<number>;
    opacity: Animated.AnimatedInterpolation<number>;
    locked?: boolean;
    attempted: boolean;
    subscribed?: boolean;
    isComingSoon?: boolean;
    message?: string;
  }) => {
    return (
      <View>
        {/* Card Wrapper */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              width: cardWidth,
              height: cardHeight,
              marginHorizontal: spacing / 2,
              transform: [{ scale }, { translateY }],
              opacity,
            },
          ]}
        >
          {/* Text Section */}
          <View style={styles.textPositioner}>
            {/* Only show text for Bronze/Silver modes, not for Free mode */}
            {!isComingSoon && item.id !== 'card-0' && (
              <View style={styles.statusBadge}>
                {message ? (
                  <Text style={styles.statusText}>{message}</Text>
                ) : (
                  attempted ? (
                    <>
                      <Text style={styles.statusText}>Woohoo! Challenge Complete!</Text>
                      <Text style={styles.statusText}>
                        Rewards reveal at <Text style={styles.statusHighlight}>6:00 PM EST</Text>
                      </Text>
                      <Text style={styles.statusText}>— stay tuned!</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.statusText}>Complete the mode before</Text>
                      <Text style={styles.statusText}>
                        <Text style={styles.statusHighlight}>6PM EST</Text> to earn rewards
                      </Text>
                      <Text style={styles.statusText}>— stay tuned!</Text>
                    </>
                  )
                )}
              </View>
            )}
          </View>


          {/* Yellow-BG Header Section Removed as requested */}
          <View style={styles.prizePoolPositioner}>

            {isComingSoon ? (
              <View
                style={{
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: scaleSize(12),
                  paddingVertical: scaleSize(6),
                  borderRadius: scaleSize(20),
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                  marginTop: scaleSize(8), // Aligned with PrizePoolDisplay
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: scaleSize(14),
                    fontWeight: '800',
                    fontFamily: 'Baloo2',
                    textShadowColor: 'rgba(0,0,0,0.2)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  Coming Soon
                </Text>
              </View>
            ) : (
              <PrizePoolDisplay cardId={item.id} />
            )}
          </View>
          <Image
            source={item.cardSource}
            style={[styles.cardImage, (locked && !subscribed) && { opacity: 0.4 }]}
            resizeMode="contain"
          />

          {/* Badge or Lock Overlay */}
          {!isComingSoon && (item.id === 'card-1' || item.id === 'card-2' || item.id === 'card-3' || item.id === 'card-4') && (
            <View
              style={[
                styles.lockOverlay,
                subscribed ? { left: undefined, right: 0, top: 0 } // Badge position at very corner
                  : { left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' } // Lock position
              ]}
            >
              {subscribed ? (
                <Image
                  source={
                    item.id === 'card-1'
                      ? require('../../../../assets/common/bronze.png')
                      : item.id === 'card-2'
                        ? require('../../../../assets/common/silver.png')
                        : require('../../../../assets/trivia/lock.png')
                  }
                  style={styles.lockIcon}
                  resizeMode="contain"
                />
              ) : (
                locked && (
                  <Image
                    source={require('../../../../assets/trivia/lock.png')}
                    style={styles.lockIcon}
                    resizeMode="contain"
                  />
                )
              )}
            </View>
          )}

          {/* Button placement ON THE CARD - Only show ONE button straight in the same place */}
        </Animated.View>
      </View>
    );
  }
);

// --- Reset Window View Components ---

const ScrollingDigit = React.memo(({ value }: { value: number }) => {
  // Use a looping array to allow continuous "meter" rotation animations
  // [0..9, 0..9, 0..9] lets us scroll smoothly between any digits
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const targetIndex = value + 10; // Center set
  const animatedValue = useRef(new Animated.Value(targetIndex)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: targetIndex,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [value, targetIndex, animatedValue]);

  const translateY = animatedValue.interpolate({
    inputRange: digits.map((_, i) => i),
    outputRange: digits.map((_, i) => i * -scaleSize(64)),
  });

  return (
    <View
      style={{
        height: scaleSize(64),
        overflow: 'hidden',
        width: scaleSize(42),
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: scaleSize(12),
        marginHorizontal: scaleSize(2),
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        {digits.map((digit, i) => (
          <Text
            key={i}
            style={{
              fontSize: scaleSize(42),
              fontWeight: '900',
              color: '#FFFFFF',
              height: scaleSize(64),
              textAlignVertical: 'center',
              fontFamily: 'LuckiestGuy-Regular',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 3,
            }}
          >
            {digit}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
});

ScrollingDigit.displayName = 'ScrollingDigit';

const ResetWindowView = React.memo(({ minutesLeft }: { minutesLeft: number }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // Use actual minutes left from API (converted to seconds)
  const [timeLeft, setTimeLeft] = useState(minutesLeft * 60);

  // Sync state if prop changes (e.g., after a poll)
  useEffect(() => {
    setTimeLeft(minutesLeft * 60);
  }, [minutesLeft]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const m1 = Math.floor(minutes / 10);
  const m2 = minutes % 10;
  const s1 = Math.floor(seconds / 10);
  const s2 = seconds % 10;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <LinearGradient
      colors={['#0f172a', '#1e1b4b', '#312e81']}
      style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Decorative Circles for "Premium" feel */}
      <View
        style={{
          position: 'absolute',
          top: -scaleSize(100),
          right: -scaleSize(50),
          width: scaleSize(300),
          height: scaleSize(300),
          borderRadius: scaleSize(150),
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -scaleSize(50),
          left: -scaleSize(50),
          width: scaleSize(250),
          height: scaleSize(250),
          borderRadius: scaleSize(125),
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
        }}
      />

      <View style={{ position: 'absolute', top: Math.max(scaleSize(160), insets.top + scaleSize(60)), alignItems: 'center', paddingHorizontal: scaleSize(20) }}>
        <View style={{ alignItems: 'center', position: 'relative' }}>
          {/* Stroke labels for "Luckiest Guy" header - MATCHING LEADERBOARD (Blue Stroke) */}
          {(() => {
            const strokeWidth = scaleSize(2.5);
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
              <Animated.Text
                key={index}
                style={{
                  position: 'absolute',
                  fontSize: scaleSize(34),
                  fontWeight: 'normal',
                  color: '#1E3A8A', // Blue stroke color from Leaderboard/Shop
                  textAlign: 'center',
                  fontFamily: 'LuckiestGuy-Regular',
                  left: offset.x,
                  top: offset.y,
                  transform: [{ scale: pulseAnim }],
                  includeFontPadding: false,
                }}
              >
                CHALLENGE RELOADING
              </Animated.Text>
            ));
          })()}
          {/* White top layer text (Leaderboard Style) */}
          <Animated.Text
            style={{
              fontSize: scaleSize(34),
              fontWeight: 'normal',
              color: '#FFFFFF', // White fill correctly matches Leaderboard
              textAlign: 'center',
              fontFamily: 'LuckiestGuy-Regular',
              transform: [{ scale: pulseAnim }],
              includeFontPadding: false,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            CHALLENGE RELOADING
          </Animated.Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: scaleSize(18),
          color: '#cbd5e1',
          marginBottom: scaleSize(15),
          fontFamily: 'Baloo2',
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        Next questions appearing in
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          paddingHorizontal: scaleSize(25),
          paddingVertical: scaleSize(30),
          borderRadius: scaleSize(32),
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <ScrollingDigit value={m1} />
        <ScrollingDigit value={m2} />
        <Text
          style={{
            fontSize: scaleSize(48),
            fontWeight: '900',
            color: 'rgba(255,255,255,0.4)',
            marginHorizontal: scaleSize(8),
            bottom: scaleSize(4),
          }}
        >
          :
        </Text>
        <ScrollingDigit value={s1} />
        <ScrollingDigit value={s2} />
      </View>

      <View style={{ marginTop: scaleSize(40), paddingHorizontal: scaleSize(50) }}>
        <Text
          style={{
            fontSize: scaleSize(15),
            color: '#94a3b8',
            textAlign: 'center',
            fontFamily: 'Baloo2',
            lineHeight: scaleSize(22),
          }}
        >
          We're finalizing results and gearing up for the next round. Get ready!
        </Text>
      </View>

      {/* Close button removed as requested */}

      {/* Home Button Bottom Center - Moved up by 20px extra as requested */}
      <View style={{ position: 'absolute', bottom: Math.max(scaleSize(60), insets.bottom + scaleSize(55)), zIndex: 9999 }}>
        <SoundTouchableOpacity
          onPress={() => (navigation as any).goBack()}
          activeOpacity={0.8}
          style={{
            width: scaleSize(64),
            height: scaleSize(64),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4f46e5',
            borderRadius: scaleSize(32),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 15,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <Image
            source={require('../../../../assets/common/homeIcon.png')}
            style={{ width: scaleSize(32), height: scaleSize(32) }}
            resizeMode="contain"
          />
        </SoundTouchableOpacity>
      </View>
    </LinearGradient>
  );
});

ResetWindowView.displayName = 'ResetWindowView';

const TriviaSelectionScreen: React.FC = React.memo(() => {
  const isFocused = useIsFocused();
  const { top, bottom, left, right } = useSafeAreaInsets();

  const { screenWidth } = useStandardResponsive();
  const navigation = useNavigation<MainNavigationProp>();
  const [showTooltip, setShowTooltip] = useState(false);
  const [shouldShowPlayButton, setShouldShowPlayButton] = useState(true);
  const [isCurrentComingSoon, setIsCurrentComingSoon] = useState(false);

  // Profile data state for gems/coins display
  const [profileGems, setProfileGems] = useState(0);
  const [profileCoins, setProfileCoins] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 🚀 RTK Query for profile - data available instantly from prefetch
  // CRITICAL: Use cached data for instant render - don't refetch on mount
  const { data: profileData } = useGetProfileQuery(undefined, {
    refetchOnMountOrArgChange: false, // Use prefetched cached data
  });

  // Update gems/coins when profile data loads
  useEffect(() => {
    if (profileData) {
      const gems = (profileData as any)?.total_gems || 0;
      const coins = (profileData as any)?.total_trivia_coins || 0;
      const subscribed = profileData?.avatar?.is_premium || profileData?.frame?.is_premium || false;

      requestAnimationFrame(() => {
        setProfileGems(gems);
        setProfileCoins(coins);
        setIsSubscribed(subscribed);
      });
    }
  }, [profileData]);

  // 🚀 NEW: RTK Query hooks - data available instantly from prefetch
  // NO loading states, NO manual API calls, NO cache management
  const { data: freeModeStatus } = useGetFreeModeStatusQuery();
  const { data: bronzeModeStatus } = useGetBronzeModeStatusQuery();
  const { data: silverModeStatus } = useGetSilverModeStatusQuery();
  const { data: modesStatusRaw } = useGetModesStatusQuery();

  // Build modes status from RTK Query data
  const modesStatus = useMemo(() => {
    // If we have unified status data, use it as primary source
    if (modesStatusRaw) {
      return {
        free_mode: {
          has_access: modesStatusRaw.free_mode?.has_access ?? true,
          subscription_status: modesStatusRaw.free_mode?.subscription_status ?? 'not_required',
          message: modesStatusRaw.free_mode?.message,
          task_completed: modesStatusRaw.free_mode?.task_completed,
          in_reset_window: modesStatusRaw.free_mode?.in_reset_window ?? false,
          reset_window_minutes_left: modesStatusRaw.free_mode?.reset_window_minutes_left ?? 0
        },
        bronze_mode: {
          has_access: modesStatusRaw.bronze_mode?.has_access ?? false,
          subscription_status: modesStatusRaw.bronze_mode?.subscription_status ?? 'inactive',
          message: modesStatusRaw.bronze_mode?.message,
          task_completed: modesStatusRaw.bronze_mode?.task_completed,
          in_reset_window: modesStatusRaw.bronze_mode?.in_reset_window ?? false,
          reset_window_minutes_left: modesStatusRaw.bronze_mode?.reset_window_minutes_left ?? 0
        },
        silver_mode: {
          has_access: modesStatusRaw.silver_mode?.has_access ?? false,
          subscription_status: modesStatusRaw.silver_mode?.subscription_status ?? 'inactive',
          message: modesStatusRaw.silver_mode?.message,
          task_completed: modesStatusRaw.silver_mode?.task_completed,
          in_reset_window: modesStatusRaw.silver_mode?.in_reset_window ?? false,
          reset_window_minutes_left: modesStatusRaw.silver_mode?.reset_window_minutes_left ?? 0
        },
        gold_mode: {
          has_access: modesStatusRaw.gold_mode?.has_access ?? false,
          subscription_status: modesStatusRaw.gold_mode?.subscription_status ?? 'inactive',
          message: modesStatusRaw.gold_mode?.message,
          task_completed: modesStatusRaw.gold_mode?.task_completed,
          in_reset_window: modesStatusRaw.gold_mode?.in_reset_window ?? false,
          reset_window_minutes_left: modesStatusRaw.gold_mode?.reset_window_minutes_left ?? 0
        },
        platinum_mode: {
          has_access: modesStatusRaw.platinum_mode?.has_access ?? false,
          subscription_status: modesStatusRaw.platinum_mode?.subscription_status ?? 'inactive',
          message: modesStatusRaw.platinum_mode?.message,
          task_completed: modesStatusRaw.platinum_mode?.task_completed,
          in_reset_window: modesStatusRaw.platinum_mode?.in_reset_window ?? false,
          reset_window_minutes_left: modesStatusRaw.platinum_mode?.reset_window_minutes_left ?? 0
        }
      };
    }

    // Fallback to individual status hooks if unified data isn't available yet
    return {
      free_mode: {
        has_access: true,
        subscription_status: 'not_required',
        message: freeModeStatus?.progress?.message || (freeModeStatus as any)?.message,
        in_reset_window: (freeModeStatus as any)?.in_reset_window ?? false,
        reset_window_minutes_left: (freeModeStatus as any)?.reset_window_minutes_left ?? 0
      },
      bronze_mode: {
        has_access: bronzeModeStatus?.has_access ?? false,
        subscription_status: bronzeModeStatus?.subscription_status ?? 'inactive',
        message: (bronzeModeStatus as any)?.message,
        in_reset_window: (bronzeModeStatus as any)?.in_reset_window ?? false,
        reset_window_minutes_left: (bronzeModeStatus as any)?.reset_window_minutes_left ?? 0
      },
      silver_mode: {
        has_access: (silverModeStatus as any)?.has_access ?? (silverModeStatus as any)?.silver_mode?.has_access ?? false,
        subscription_status: (silverModeStatus as any)?.subscription_status ?? (silverModeStatus as any)?.silver_mode?.subscription_status ?? 'inactive',
        message: (silverModeStatus as any)?.message || (silverModeStatus as any)?.silver_mode?.message,
        in_reset_window: (silverModeStatus as any)?.in_reset_window ?? (silverModeStatus as any)?.silver_mode?.in_reset_window ?? false,
        reset_window_minutes_left: (silverModeStatus as any)?.reset_window_minutes_left ?? (silverModeStatus as any)?.silver_mode?.reset_window_minutes_left ?? 0
      },
      gold_mode: {
        has_access: false,
        subscription_status: 'inactive',
        message: undefined,
        in_reset_window: false,
        reset_window_minutes_left: 0
      },
      platinum_mode: {
        has_access: false,
        subscription_status: 'inactive',
        message: undefined,
        in_reset_window: false,
        reset_window_minutes_left: 0
      }
    };
  }, [freeModeStatus, bronzeModeStatus, silverModeStatus, modesStatusRaw]);

  const isInResetWindow = useMemo(() => {
    return (
      modesStatus?.free_mode?.in_reset_window ||
      modesStatus?.bronze_mode?.in_reset_window ||
      modesStatus?.silver_mode?.in_reset_window
    );
  }, [modesStatus]);

  const resetMinutesLeft = useMemo(() => {
    return (
      modesStatus?.free_mode?.reset_window_minutes_left ||
      modesStatus?.bronze_mode?.reset_window_minutes_left ||
      modesStatus?.silver_mode?.reset_window_minutes_left ||
      0
    );
  }, [modesStatus]);

  // Debug logging for status endpoints
  useEffect(() => {
    console.log('🔍 [TRIVIA SELECTION] Status Update:', {
      unified_raw: modesStatusRaw,
      free_mode_raw: freeModeStatus,
      bronze_mode_raw: bronzeModeStatus,
      silver_mode_raw: silverModeStatus,
      mapped: modesStatus,
    });
  }, [freeModeStatus, bronzeModeStatus, silverModeStatus, modesStatusRaw, modesStatus]);

  // Animation for play button appearance
  const playButtonOpacity = useRef(new Animated.Value(1)).current;
  const playButtonScale = useRef(new Animated.Value(1)).current;

  // Back navigation handler
  const handleBackPress = useCallback(() => {
    try {
      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
        return true;
      }
    } catch (error) {
      // Ignore navigation errors
    }
    return false;
  }, [navigation]);

  useAndroidBackButton(handleBackPress);

  // Calculate dimensions - ALWAYS calculate, don't wait for focus
  // CRITICAL: Must calculate dimensions immediately for instant render
  const usableWidth = useMemo(() => {
    return screenWidth; // SafeScreenWrapper handles padding internally or we use screenWidth directly
  }, [screenWidth]);

  const CARD_SPACING = scaleSize(12);
  const BUTTON_OFFSET = scaleSize(10);
  const ARROW_SIZE = scaleSize(32);
  const BADGE_WIDTH = scaleSize(105);
  const BADGE_HEIGHT = scaleSize(45);

  const CARD_WIDTH = useMemo(() => {
    // CRITICAL: Return a sensible default instead of 0 to prevent blank screen
    if (usableWidth <= 0) return 250; // Default card width for initial render
    return Math.max((usableWidth - CARD_SPACING * 2) / 1.5 - scaleSize(10), 0);
  }, [CARD_SPACING, usableWidth]);
  const CARD_HEIGHT = useMemo(() => CARD_WIDTH * 1.45, [CARD_WIDTH]);
  const CARD_TOTAL_WIDTH = useMemo(() => CARD_WIDTH + CARD_SPACING, [CARD_WIDTH, CARD_SPACING]);
  const SNAP_OFFSET = CARD_TOTAL_WIDTH;

  const CENTER_PADDING = useMemo(() => {
    // CRITICAL: Return a sensible default instead of 0
    if (usableWidth <= 0 || CARD_TOTAL_WIDTH <= 0) return 50; // Default padding for initial render
    return Math.max((usableWidth - CARD_TOTAL_WIDTH) / 2, 0);
  }, [usableWidth, CARD_TOTAL_WIDTH]);
  const scrollX = useRef(new Animated.Value(0)).current;

  const TAB_BAR_HEIGHT = 60;
  const TOTAL_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT + bottom;

  const listRef = useRef<Animated.FlatList<TriviaCardItem>>(null);
  const listIndexRef = useRef(1);

  // Define data
  const data = useMemo(() => {
    if (!BASE_CARDS || !Array.isArray(BASE_CARDS) || BASE_CARDS.length === 0) {
      return [];
    }
    const first = BASE_CARDS[0];
    const last = BASE_CARDS[BASE_CARDS.length - 1];
    return [last, ...BASE_CARDS, first];
  }, []);

  // Helper function to check card access - ALWAYS allow free mode (card-0)
  const checkCardAccess = useCallback(
    (cardId: string | undefined) => {
      if (!cardId) return false;

      // CRITICAL: Free mode (card-0) is ALWAYS accessible - don't wait for API
      if (cardId === 'card-0') {
        return true; // Always true, never blocked
      }

      // For other cards, check modesStatus if available
      if (!modesStatus) {
        return false; // Locked until status loads
      }

      if (cardId === 'card-1') {
        return modesStatus?.bronze_mode?.has_access;
      } else if (cardId === 'card-2') {
        return modesStatus?.silver_mode?.has_access;
      } else if (cardId === 'card-3') {
        return modesStatus?.gold_mode?.has_access;
      } else if (cardId === 'card-4') {
        return modesStatus?.platinum_mode?.has_access;
      }
      return false;
    },
    [modesStatus]
  );

  const checkIsComingSoon = useCallback(
    (cardId: string | undefined) => {
      if (!cardId) return false;
      return cardId === 'card-3' || cardId === 'card-4';
    },
    []
  );

  const syncPlayButtonForIndex = useCallback(
    (index: number) => {
      const currentCardId = data && data[index] ? data[index].id : undefined;
      const hasAccess = checkCardAccess(currentCardId);
      const isSoon = checkIsComingSoon(currentCardId);

      setShouldShowPlayButton(Boolean(hasAccess));
      setIsCurrentComingSoon(isSoon);
      Animated.parallel([
        Animated.timing(playButtonOpacity, {
          toValue: isSoon ? 0 : (hasAccess ? 1 : 1), // Keep visible for slider too
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(playButtonScale, {
          toValue: isSoon ? 0.8 : 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [checkCardAccess, checkIsComingSoon, data, playButtonOpacity, playButtonScale]
  );

  const updatePlayButtonForCurrentCard = useCallback(() => {
    if (!data || data.length === 0) return;
    syncPlayButtonForIndex(listIndexRef.current);
  }, [data, syncPlayButtonForIndex]);

  // Update play button when modesStatus changes
  useEffect(() => {
    if (!isFocused) return;
    if (!data || data.length === 0) return;

    requestAnimationFrame(() => {
      updatePlayButtonForCurrentCard();
    });
  }, [modesStatus, updatePlayButtonForCurrentCard, data?.length, isFocused]);

  // Prefetch images
  useEffect(() => {
    try {
      const images: any[] = [
        ...BASE_CARDS.map(c => c.cardSource),
        ...BASE_CARDS.map(c => c.buttonSource),
        require('../../../../assets/trivia/bg.png'),
        require('../../../../assets/trivia/playButton.png'),
      ];
      images.forEach(img => {
        try {
          const resolved = Image.resolveAssetSource(img);
          if (resolved?.uri) {
            Image.prefetch(resolved.uri).catch(() => { });
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }, []);

  // Initialize scroll position and play button effect removed
  // We rely on initialScrollIndex and default state for instant render

  const jumpWithoutAnimation = useCallback(
    (index: number) => {
      listRef.current?.scrollToOffset({ offset: index * CARD_TOTAL_WIDTH, animated: false });
      listIndexRef.current = index;
      scrollX.setValue(index * CARD_TOTAL_WIDTH);
    },
    [CARD_TOTAL_WIDTH, scrollX]
  );

  const handleScrollEndOffset = useCallback(
    (offsetX: number) => {
      const totalItems = data ? data.length : 0;
      if (totalItems < 3) return;
      if (CARD_TOTAL_WIDTH <= 0) return;

      const minRealIndex = 1;
      const maxRealIndex = totalItems - 2;

      const rawIndex = Math.round(offsetX / CARD_TOTAL_WIDTH);
      let actualIndex = rawIndex;

      if (rawIndex <= 0) {
        jumpWithoutAnimation(maxRealIndex);
        actualIndex = maxRealIndex;
      } else if (rawIndex >= totalItems - 1) {
        jumpWithoutAnimation(minRealIndex);
        actualIndex = minRealIndex;
      }

      listIndexRef.current = actualIndex;
      syncPlayButtonForIndex(actualIndex);
    },
    [CARD_TOTAL_WIDTH, data, jumpWithoutAnimation, syncPlayButtonForIndex]
  );

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      const totalItems = data ? data.length : 0;
      if (totalItems === 0) return;
      const clampedIndex = Math.max(0, Math.min(index, totalItems - 1));
      listRef.current?.scrollToOffset({ offset: clampedIndex * CARD_TOTAL_WIDTH, animated });
      listIndexRef.current = clampedIndex;
    },
    [CARD_TOTAL_WIDTH, data]
  );

  const handleNext = useCallback(() => {
    const totalItems = data ? data.length : 0;
    if (totalItems < 3) return;
    const maxRealIndex = totalItems - 2;
    const targetIndex =
      listIndexRef.current >= maxRealIndex ? maxRealIndex + 1 : listIndexRef.current + 1;
    scrollToIndex(targetIndex);
  }, [data, scrollToIndex]);

  const handlePrev = useCallback(() => {
    const totalItems = data ? data.length : 0;
    if (totalItems < 3) return;
    const minRealIndex = 1;
    const targetIndex = listIndexRef.current <= minRealIndex ? 0 : listIndexRef.current - 1;
    scrollToIndex(targetIndex);
  }, [data, scrollToIndex]);

  const handleInfoToggle = useCallback(() => {
    setShowTooltip(prev => !prev);
  }, []);

  const handleInfoClose = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const navigateToShop = useCallback(() => {
    navigation.navigate('Shop');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item, index }: { item: TriviaCardItem; index: number }) => {
      const safeTotalWidth = Math.max(1, CARD_TOTAL_WIDTH || 0);
      const inputRange = [
        (index - 1) * safeTotalWidth,
        index * safeTotalWidth,
        (index + 1) * safeTotalWidth,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 1.05, 0.9],
        extrapolate: 'clamp',
      });
      const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [0, 0, 0],
        extrapolate: 'clamp',
      });
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.5, 1, 0.5],
        extrapolate: 'clamp',
      });

      const hasAccess = checkCardAccess(item.id);
      const locked = Boolean(modesStatus) && item.id !== 'card-0' && !hasAccess;

      let attempted = false;
      let isSubscribedMode = false;
      let isComingSoon = false;

      if (item.id === 'card-0') {
        const progress = freeModeStatus?.progress;
        attempted = Boolean(
          progress?.completed === true ||
          progress?.all_questions_answered === true ||
          (progress?.answered && progress?.total && progress.answered >= progress.total)
        );
        isSubscribedMode = true; // Free mode is always "active"
      } else if (item.id === 'card-1') {
        attempted = bronzeModeStatus?.has_submitted ?? (modesStatusRaw as any)?.bronze_mode?.has_submitted ?? false;
        isSubscribedMode = modesStatus.bronze_mode?.subscription_status === 'active';
      } else if (item.id === 'card-2') {
        // Robust check for silver completion
        attempted = Boolean(
          silverModeStatus?.has_submitted === true ||
          (silverModeStatus as any)?.silver_mode?.has_submitted === true ||
          (modesStatusRaw as any)?.silver_mode?.has_submitted === true
        );
        isSubscribedMode = modesStatus.silver_mode?.subscription_status === 'active';
      } else if (item.id === 'card-3' || item.id === 'card-4') {
        isComingSoon = true;
      }

      return (
        <TriviaCard
          item={item}
          cardWidth={CARD_WIDTH}
          cardHeight={CARD_HEIGHT}
          spacing={CARD_SPACING}
          scale={scale}
          translateY={translateY}
          opacity={opacity}
          locked={locked}
          attempted={attempted}
          subscribed={isSubscribedMode}
          isComingSoon={isComingSoon}
          message={
            item.id === 'card-0' ? modesStatus.free_mode?.message :
              item.id === 'card-1' ? modesStatus.bronze_mode?.message :
                item.id === 'card-2' ? modesStatus.silver_mode?.message :
                  item.id === 'card-3' ? modesStatus.gold_mode?.message :
                    item.id === 'card-4' ? modesStatus.platinum_mode?.message : undefined
          }
        />
      );
    },
    [
      BUTTON_OFFSET,
      CARD_HEIGHT,
      CARD_SPACING,
      CARD_TOTAL_WIDTH,
      CARD_WIDTH,
      checkCardAccess,
      navigation,
      scrollX,
      modesStatus,
      isSubscribed,
    ]
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const offset = info.index * (info.averageItemLength || CARD_TOTAL_WIDTH);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset, animated: false });
      }, 0);
    },
    [CARD_TOTAL_WIDTH]
  );

  // CRITICAL: Always render - don't block on dimensions or focus
  // Screen should render immediately even if dimensions aren't ready

  return (
    <SafeScreenWrapper
      statusBarStyle="light-content"
      backgroundColor="#0a7aca"
      edges={['top', 'left', 'right']}
      showStatusBar={false}
    >
      <View style={[styles.screen, { overflow: 'visible' }]}>
        {isInResetWindow ? (
          <ResetWindowView minutesLeft={resetMinutesLeft} />
        ) : (
          <>
            <View
              style={[
                styles.topRow,
                {
                  paddingHorizontal: scaleSize(12),
                  marginTop: scaleSize(6),
                  zIndex: 1000,
                  elevation: 1000,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scaleSize(6),
                }}
              >
                {/* Gem Badge */}
                <ImageBackground
                  source={require('../../../../assets/common/gemBg.png')}
                  style={{
                    width: scaleSize(105),
                    height: BADGE_HEIGHT,
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
                    {profileGems.toLocaleString()}
                  </Text>
                </ImageBackground>

                {/* Coin Badge */}
                <ImageBackground
                  source={require('../../../../assets/common/coinBg.png')}
                  style={{
                    width: scaleSize(105),
                    height: BADGE_HEIGHT,
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
                    {profileCoins.toLocaleString()}
                  </Text>
                </ImageBackground>
              </View>

              {/* Info Button */}
              <SoundTouchableOpacity
                onPress={handleInfoToggle}
                activeOpacity={0.9}
                style={{ zIndex: 1001 }} // Ensure it's above the overlay for toggle
              >
                <Image
                  source={require('../../../../assets/trivia/infoIcon.png')}
                  style={{ width: scaleSize(32), height: scaleSize(32) }}
                  resizeMode="contain"
                />
              </SoundTouchableOpacity>
            </View>

            <View style={styles.carouselArea}>
              <View style={[styles.carouselContainer, { height: CARD_HEIGHT + scaleSize(160), overflow: 'visible' }]}>
                <Animated.FlatList
                  ref={listRef}
                  data={data}
                  horizontal
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={renderItem}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: CENTER_PADDING,
                    alignItems: 'center',
                    paddingVertical: scaleSize(80),
                  }}
                  snapToInterval={SNAP_OFFSET}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum={false}
                  pagingEnabled={false}
                  bounces={false}
                  removeClippedSubviews={false}
                  windowSize={data?.length ? data.length + 2 : 7}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  updateCellsBatchingPeriod={50}
                  onScrollEndDrag={e => {
                    handleScrollEndOffset(e.nativeEvent.contentOffset.x);
                  }}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: true,
                    listener: (e: any) => {
                      if (!CARD_TOTAL_WIDTH) return;
                      const rawIndex = Math.round(e.nativeEvent.contentOffset.x / CARD_TOTAL_WIDTH);
                      const totalItems = data?.length || 0;
                      const clamped = Math.max(0, Math.min(rawIndex, Math.max(totalItems - 1, 0)));
                      listIndexRef.current = clamped;
                      syncPlayButtonForIndex(clamped);
                    },
                  })}
                  onMomentumScrollEnd={e => {
                    handleScrollEndOffset(e.nativeEvent.contentOffset.x);
                  }}
                  getItemLayout={(_, index) => ({
                    length: CARD_TOTAL_WIDTH,
                    offset: CARD_TOTAL_WIDTH * index,
                    index,
                  })}
                  initialScrollIndex={1}
                  onScrollToIndexFailed={onScrollToIndexFailed}
                  scrollEventThrottle={16}
                  overScrollMode="never"
                  style={{ width: '100%', overflow: 'visible' }}
                />

                {/* Left Arrow */}
                <View
                  style={[styles.arrowContainer, { left: left + scaleSize(10), height: CARD_HEIGHT }]}
                >
                  <SoundTouchableOpacity
                    activeOpacity={0.9}
                    onPress={handlePrev}
                    style={[styles.arrowButton, { width: ARROW_SIZE, height: ARROW_SIZE }]}
                  >
                    <Image
                      source={require('../../../../assets/trivia/lArrow.png')}
                      style={{ width: ARROW_SIZE, height: ARROW_SIZE }}
                      resizeMode="contain"
                    />
                  </SoundTouchableOpacity>
                </View>

                {/* Right Arrow */}
                <View
                  style={[styles.arrowContainer, { right: right + scaleSize(10), height: CARD_HEIGHT }]}
                >
                  <SoundTouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleNext}
                    style={[styles.arrowButton, { width: ARROW_SIZE, height: ARROW_SIZE }]}
                  >
                    <Image
                      source={require('../../../../assets/trivia/lArrow.png')}
                      style={{ width: ARROW_SIZE, height: ARROW_SIZE, transform: [{ scaleX: -1 }] }}
                      resizeMode="contain"
                    />
                  </SoundTouchableOpacity>
                </View>
              </View>
            </View>

            {/* Play Button / Slider Button */}
            <Animated.View
              style={{
                position: 'absolute',
                bottom: '22%', // Balanced for all screen sizes
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                elevation: 100,
                pointerEvents: !isCurrentComingSoon ? 'box-none' : 'none',
                opacity: playButtonOpacity,
                transform: [{ scale: playButtonScale }, { translateY: scaleSize(40) }],
              }}
            >
              {!isCurrentComingSoon && (
                shouldShowPlayButton ? (
                  <PlayButton
                    onPress={() => {
                      const currentCardId =
                        data && data[listIndexRef.current] ? data[listIndexRef.current].id : undefined;

                      if (!checkCardAccess(currentCardId)) {
                        return;
                      }

                      let mode: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum' | null = null;
                      if (currentCardId === 'card-0') {
                        mode = 'free';
                      } else if (currentCardId === 'card-1') {
                        mode = 'bronze';
                      } else if (currentCardId === 'card-2') {
                        mode = 'silver';
                      } else if (currentCardId === 'card-3') {
                        mode = 'gold';
                      } else if (currentCardId === 'card-4') {
                        mode = 'platinum';
                      }

                      if (!mode) {
                        return;
                      }

                      navigation.navigate('TriviaScreen', { mode });
                    }}
                  />
                ) : (
                  <SoundTouchableOpacity
                    onPress={() => {
                      (navigation as any).navigate('TabNavigator', { screen: 'Wallet' });
                    }}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={require('../../../../assets/trivia/subscribeBtn.png')}
                      style={{
                        width: scaleSize(160),
                        height: scaleSize(64),
                      }}
                      resizeMode="contain"
                    />
                  </SoundTouchableOpacity>
                )
              )}
            </Animated.View>

            {/* Home Button below Play/Upgrade Button - ALWAY VISIBLE */}
            <View
              style={{
                position: 'absolute',
                bottom: '8%', // Constant position relative to screen bottom
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 101,
                elevation: 101,
              }}
            >
              <SoundTouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
                style={{
                  width: scaleSize(54),
                  height: scaleSize(54),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('../../../../assets/common/homeIcon.png')}
                  style={{ width: scaleSize(46), height: scaleSize(46) }}
                  resizeMode="contain"
                />
              </SoundTouchableOpacity>
            </View>

            {/* Scrolling Background */}
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: scaleSize(150),
                zIndex: 0,
                elevation: 0,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  flexDirection: 'row',
                  width: screenWidth * 3,
                  transform: [
                    {
                      translateX: scrollX.interpolate({
                        inputRange: [
                          0,
                          Math.max(1, (CARD_TOTAL_WIDTH || 0) * Math.max(0, (data?.length || 1) - 1)),
                        ],
                        outputRange: [0, -screenWidth],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              >
                {[0, 1, 2].map(index => (
                  <Image
                    key={index}
                    source={require('../../../../assets/trivia/bg.png')}
                    style={{
                      width: screenWidth,
                      height: scaleSize(150),
                      resizeMode: 'stretch',
                    }}
                  />
                ))}
              </Animated.View>
            </Animated.View>

            {/* Professional Tooltip */}
            {showTooltip && (
              <>
                <SoundTouchableOpacity
                  activeOpacity={1}
                  onPress={handleInfoClose}
                  style={styles.tooltipOverlay}
                >
                  <View />
                </SoundTouchableOpacity>
                <View
                  style={[
                    styles.tooltipCard,
                    { top: top + scaleSize(29), right: right + scaleSize(6) },
                  ]}
                >
                  {/* Tooltip Arrow */}
                  <View style={styles.tooltipPointerContainer}>
                    <View style={styles.tooltipPointer} />
                  </View>

                  <View style={styles.tooltipBubble}>
                    {/* Tooltip Header */}
                    <View style={styles.tooltipHeader}>
                      <Text style={styles.tooltipHeaderText}>How It Works</Text>
                      <SoundTouchableOpacity onPress={handleInfoClose} style={styles.tooltipCloseBtn}>
                        <Image
                          source={require('../../../../assets/common/closeIcon.png')}
                          style={{ width: scaleSize(20), height: scaleSize(20) }}
                          resizeMode="contain"
                        />
                      </SoundTouchableOpacity>
                    </View>

                    {/* Tooltip Content */}
                    <View style={styles.tooltipContent}>
                      {[
                        'One trivia question per day per mode',
                        'Correct answers enter you into the prize pool',
                        'Unlock higher tiers for massive Gem rewards',
                        'Watch ads to double your daily bonus gems',
                        'Join tournaments and climb the leaderboard',
                      ].map((item, index) => (
                        <View key={index} style={styles.tooltipItem}>
                          <Text style={styles.tooltipBullet}>•</Text>
                          <Text style={styles.tooltipItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.tooltipFooter}>
                      Unlock higher tiers to win massive Gem prizes!
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </SafeScreenWrapper >
  );
});

TriviaSelectionScreen.displayName = 'TriviaSelectionScreen';

const styles = StyleSheet.create({
  arrowButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: scaleSize(50),
  },
  buttonImage: {
    height: '100%',
    width: '100%',
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 5,
  },
  cardImage: {
    height: '100%',
    width: '100%',
  },
  cardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  carouselArea: {
    alignItems: 'center',
    elevation: 1,
    height: '100%',
    width: '100%',
    zIndex: 1,
    position: 'absolute',
    top: scaleSize(130), // Adjusted top for stable vertical placement
  },
  carouselContainer: {
    alignItems: 'center',
    minHeight: scaleSize(10),
    overflow: 'visible',
    paddingVertical: scaleSize(10),
    width: '100%',
  },
  lockIcon: {
    height: scaleSize(48),
    width: scaleSize(48),
  },
  lockOverlay: {
    overflow: 'visible',
    position: 'absolute',
    zIndex: 4,
  },
  playButton: {
    alignItems: 'center',
    borderColor: '#FF0000',
    borderRadius: scaleSize(8),
    borderWidth: 3,
    justifyContent: 'center',
    padding: scaleSize(4),
  },
  playButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 100,
  },
  playButtonImage: {
    height: scaleSize(80),
    width: scaleSize(200),
  },
  screen: {
    backgroundColor: '#0a7aca',
    flex: 1,
    justifyContent: 'flex-start',
  },
  tooltipBubble: {
    backgroundColor: '#ffffff',
    borderRadius: scaleSize(16),
    elevation: 5,
    padding: scaleSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  tooltipCard: {
    alignItems: 'flex-end',
    maxWidth: '70%',
    position: 'absolute',
    right: scaleSize(16),
    top: scaleSize(60),
    zIndex: 20,
  },
  tooltipOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 15,
  },
  tooltipPointerContainer: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: scaleSize(22), // Adjusted to be exactly below the info icon
  },
  tooltipPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: scaleSize(8),
    borderRightWidth: scaleSize(8),
    borderBottomWidth: scaleSize(10),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFD700',
  },
  tooltipText: {
    color: '#0a2e4d',
    fontSize: scaleSize(14),
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSize(12),
    width: '100%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(8),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: scaleSize(4),
  },
  tooltipHeaderText: {
    fontSize: scaleSize(16),
    fontWeight: 'bold',
    color: '#1a237e',
  },
  tooltipCloseBtn: {
    padding: scaleSize(4),
  },
  tooltipContent: {
    marginTop: scaleSize(4),
  },
  tooltipItem: {
    flexDirection: 'row',
    marginBottom: scaleSize(6),
    alignItems: 'flex-start',
  },
  tooltipBullet: {
    color: '#0a7aca',
    fontSize: scaleSize(14),
    width: scaleSize(12),
    fontWeight: 'bold',
  },
  tooltipItemText: {
    color: '#444',
    fontSize: scaleSize(13),
    flex: 1,
    fontFamily: 'Baloo2',
  },
  tooltipFooter: {
    marginTop: scaleSize(8),
    fontSize: scaleSize(11),
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  timerContainer: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(20),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  clockIcon: {
    width: scaleSize(20),
    height: scaleSize(20),
    marginRight: scaleSize(6),
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: scaleSize(14),
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerAboveText: {
    position: 'absolute',
    top: scaleSize(-90), // Above the text
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: scaleSize(15),
    paddingVertical: scaleSize(6),
    borderRadius: scaleSize(12),
    borderWidth: 1.5,
    borderColor: '#B8860B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  statusText: {
    color: '#000000',
    fontSize: scaleSize(11),
    fontWeight: 'bold',
    fontFamily: 'Baloo2',
    textAlign: 'center',
  },
  statusHighlight: {
    fontWeight: '900',
  },
  textPositioner: {
    position: 'absolute',
    top: scaleSize(-114), // Moved up to prevent overlap with green badge
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9,
    paddingHorizontal: scaleSize(20),
  },
  prizePoolPositioner: {
    position: 'absolute',
    top: scaleSize(-50), // Moved slightly to ensure no overlap and better alignment
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 8,
  },
  timerPositioner: {
    position: 'absolute',
    top: scaleSize(-40), // Increased from -35 to accommodate text
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});

export default TriviaSelectionScreen;
