/**
 * DailyRewards - TypeScript Implementation
 * Professional daily rewards component with comprehensive features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { useDollarAnimation } from '../../../hooks/Home/useDollarAnimation';
import { useTimerHook } from '../../../hooks/Home/useTimerHook';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../navigation/types';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { usePlatformOptimization, useHapticFeedback } from '../../../hooks/usePlatformOptimization';
import { useSafeArea } from '../../../hooks/useSafeArea';
import { useStatusBar } from '../../../hooks/useStatusBar';

interface DailyRewardsProps {
  isSubscribed?: boolean;
  onSubscribePrompt?: () => void;
}

const DailyRewards: React.FC<DailyRewardsProps> = ({ isSubscribed = true, onSubscribePrompt }) => {
  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  const safeArea = useSafeArea();
  useStatusBar({ style: 'light-content', backgroundColor: '#000000' });
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

  // Map to old function names for compatibility
  const getResponsiveFontSize = (size: number) => scaleFont(size);
  const getResponsiveImageSize = (size: number) => scaleSizeFunc(size);
  const getResponsiveIconSize = (size: number) => scaleSizeFunc(size);
  const getResponsiveButtonHeight = (size: number) => scaleSizeFunc(size);
  const getResponsiveButtonWidth = (size: number) => scaleSizeFunc(size);
  const getResponsiveSpacing = (size: number) => getVerticalSpacing(size / 8);

  const navigation = useNavigation<RootNavigationProp>();
  const { isDarkMode, colors } = useTheme();
  const {
    hours,
    minutes,
    seconds,
    timerCompleted,
    prizePool,
    isLoading,
    estTimeString,
    getTimerGradientColors,
  } = useTimerHook();

  const { animatedStyle, animatePress, animateRelease } = useButtonAnimation();

  const getThemeAwareGradientColors = (): string[] => {
    const baseColors = getTimerGradientColors();
    if (isDarkMode) {
      return baseColors.map(color => {
        return color.replace(/rgb\((\d+), (\d+), (\d+)\)/, (match, r, g, b) => {
          return `rgb(${Math.max(0, parseInt(r) - 40)}, ${Math.max(0, parseInt(g) - 40)}, ${Math.max(0, parseInt(b) - 40)})`;
        });
      });
    }
    return baseColors;
  };

  const handleWinnersPress = (): void => {
    if (!isSubscribed) {
      Alert.alert(
        'Subscription Required',
        "Please subscribe to access today's winners and participate in daily rewards!",
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Subscribe Now',
            onPress: onSubscribePrompt,
          },
        ]
      );
      return;
    }
    if (timerCompleted) {
      // WinnersScreen removed - navigate to Leaderboard instead
      navigation.navigate('Leaderboard' as never);
    }
  };

  // Determine timer box gradient colors - Purple gradient with conditional colors
  const getTimerBoxGradient = (): string[] => {
    const hoursNum = parseInt(hours) || 0;
    const minutesNum = parseInt(minutes) || 0;
    const secondsNum = parseInt(seconds) || 0;
    const totalSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;

    // Green to Purple gradient if less than 5 seconds remaining
    if (totalSeconds < 5) {
      return ['#4CAF50', '#9C27B0']; // Green to Purple gradient
    }

    // Orange to Purple gradient if less than 30 minutes remaining
    if (totalSeconds < 1800) {
      // 30 minutes = 1800 seconds
      return ['#FF9800', '#9C27B0']; // Orange to Purple gradient
    }

    // Purple gradient for default
    return ['#9C27B0', '#BA68C8']; // Purple to Light Purple gradient
  };

  const cardWidth = scaleSize(350);
  const cardHeight = cardWidth / 1.3;
  const prizeTextSize = scaleSize(24);
  const timerBoxSize = scaleSize(50);
  const timerTextSize = scaleSize(24);
  const buttonPaddingVertical = scaleSize(12);
  const buttonPaddingHorizontal = scaleSize(40);
  const buttonTextSize = scaleSize(12);
  const buttonWidth = scaleSize(280);
  const buttonHeight = scaleSize(60);

  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        marginTop: 0, // Centered alignment as per image 1
        marginBottom: 0,
        alignSelf: 'center',
        borderRadius: scaleSize(16),
        overflow: 'visible',
      }}
    >
      <ImageBackground
        source={require('../../../../assets/home/dailyReward.png')}
        resizeMode="contain"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        {/* Only show rewards program text when NOT subscribed */}
        {!isSubscribed && (
          <>
            {/* Trophy Icon */}
            <View
              style={{
                position: 'absolute',
                top: '25%',
                left: '80%',
                transform: [{ translateX: -50 }],
                alignItems: 'center',
              }}
            >
              <Image
                source={require('../../../../assets/home/trophy.png')}
                style={{ width: scaleSize(80), height: scaleSize(80) }}
                resizeMode="contain"
              />
            </View>

            {/* Join our Rewards Program Text - Two Lines */}
            <View
              style={{
                position: 'absolute',
                top: '27%',
                right: '4%',
                transform: [{ translateX: -50 }],
                alignItems: 'center',
                width: '85%',
              }}
            >
              <Text
                style={[
                  typography.h3,
                  {
                    color: '#FFFFFF',
                    fontSize: getResponsiveFontSize(scaleSize(24)),
                    textAlign: 'center',
                    letterSpacing: scaleSize(0.5),
                    lineHeight: getResponsiveFontSize(scaleSize(28)),
                  },
                ]}
              >
                Join the{'\n'}Rewards Program
              </Text>
            </View>

            {/* Daily chances text - Two Lines */}
            <View
              style={{
                position: 'absolute',
                top: '58%',
                left: '20%',
                transform: [{ translateX: -50 }],
                alignItems: 'center',
                width: '85%',
              }}
            >
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: '#FFFFFF',
                    fontSize: getResponsiveFontSize(scaleSize(14)),
                    textAlign: 'center',
                    lineHeight: scaleSize(20),
                    letterSpacing: scaleSize(0.3),
                    opacity: 0.95,
                  },
                ]}
              >
                Answer daily questions and earn real rewards
              </Text>
            </View>
          </>
        )}

        {/* Next Prize Revealing Text */}
        {isSubscribed && (
          <View
            style={{
              position: 'absolute',
              top: '39%',
              left: '36%',
              transform: [{ translateX: -50 }],
              alignItems: 'center',
              marginLeft: scaleSize(14),
            }}
          >
            <Text
              style={[
                typography.h5,
                {
                  color: '#FFFFFF',
                  fontSize: getResponsiveFontSize(scaleSize(20)),
                  textAlign: 'center',
                },
              ]}
            >
              Next prize reveal in:
            </Text>
          </View>
        )}

        {/* Prize Pool Display */}
        {isSubscribed && (
          <View
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: [{ translateX: -50 }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: scaleSize(4),
              }}
            >
              <Image
                source={require('../../../../assets/icons/Tpcoin.png')}
                style={{ width: scaleSize(30), height: scaleSize(30), borderRadius: scaleSize(10) }}
              />
              <Text
                style={{
                  color: '#FFD700',
                  fontWeight: 'bold',
                  fontSize: getResponsiveFontSize(scaleSize(30)),
                  marginLeft: scaleSize(8),
                  textAlign: 'center',
                }}
              >
                {prizePool ? prizePool.toLocaleString() : '0'}
              </Text>
            </View>
          </View>
        )}

        {/* Timer Labels */}
        {isSubscribed && !timerCompleted && (
          <View
            style={{
              position: 'absolute',
              top: '52%',
              left: '40%',
              transform: [{ translateX: -50 }],
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: scaleSize(4), // Increased from 2 to 4 for 2px additional gap
              }}
            >
              <View style={{ width: timerBoxSize, alignItems: 'center' }}>
                <Text
                  style={[
                    typography.caption,
                    { color: '#FFFFFF', fontSize: getResponsiveFontSize(scaleSize(10)) },
                  ]}
                >
                  HR
                </Text>
              </View>
              <View style={{ width: timerBoxSize, marginLeft: scaleSize(4), alignItems: 'center' }}>
                <Text
                  style={[
                    typography.caption,
                    { color: '#FFFFFF', fontSize: getResponsiveFontSize(scaleSize(10)) },
                  ]}
                >
                  MIN
                </Text>
              </View>
              <View
                style={{ width: timerBoxSize, marginLeft: scaleSize(-24), alignItems: 'center' }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: '#FFFFFF', fontSize: getResponsiveFontSize(scaleSize(10)) },
                  ]}
                >
                  SEC
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timer Display */}
        {isSubscribed && !timerCompleted && (
          <View
            style={{
              position: 'absolute',
              top: '68%',
              left: '38%',
              transform: [{ translateX: -50 }],
              alignItems: 'center',
              marginLeft: scaleSize(10),
              marginTop: scaleSize(-10),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {/* Hours Box */}
              <LinearGradient
                colors={getTimerBoxGradient()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: timerBoxSize,
                  height: timerBoxSize,
                  borderRadius: scaleSize(8),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: scaleSize(2),
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: scaleSize(6) },
                  shadowOpacity: 0.5,
                  shadowRadius: scaleSize(10),
                  elevation: 12,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: timerTextSize,
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: scaleSize(1) },
                    textShadowRadius: scaleSize(2),
                  }}
                >
                  {String(Number(hours) % 100).padStart(2, '0')}
                </Text>
              </LinearGradient>

              {/* Minutes Box */}
              <LinearGradient
                colors={getTimerBoxGradient()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: timerBoxSize,
                  height: timerBoxSize,
                  borderRadius: scaleSize(8),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: scaleSize(4),
                  borderWidth: scaleSize(2),
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: scaleSize(6) },
                  shadowOpacity: 0.5,
                  shadowRadius: scaleSize(10),
                  elevation: 12,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: timerTextSize,
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: scaleSize(1) },
                    textShadowRadius: scaleSize(2),
                  }}
                >
                  {String(Number(minutes) % 100).padStart(2, '0')}
                </Text>
              </LinearGradient>

              {/* Seconds Box */}
              <LinearGradient
                colors={getTimerBoxGradient()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: timerBoxSize,
                  height: timerBoxSize,
                  borderRadius: scaleSize(8),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: scaleSize(4),
                  borderWidth: scaleSize(2),
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: scaleSize(6) },
                  shadowOpacity: 0.5,
                  shadowRadius: scaleSize(10),
                  elevation: 12,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: timerTextSize,
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: scaleSize(1) },
                    textShadowRadius: scaleSize(2),
                  }}
                >
                  {String(Number(seconds) % 100).padStart(2, '0')}
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}

        <View
          style={{
            position: 'absolute',
            top: '82%',
            bottom: '10%',
            right: '-6.5%',
            transform: [{ translateX: -50 }, { translateX: 10 }],
            alignItems: 'center',
            overflow: 'visible',
            pointerEvents: 'box-none',
          }}
        >
          <Animated.View style={animatedStyle}>
            <SoundTouchableOpacity
              onPress={() => navigation.navigate('TriviaSelectionScreen' as never)}
              soundType="button"
              onPressIn={animatePress}
              onPressOut={animateRelease}
              activeOpacity={1}
              style={{
                width: scaleSize(320),
                height: scaleSize(70),
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: scaleSize(4) },
                shadowOpacity: 0.2,
                shadowRadius: scaleSize(8),
                elevation: 8,
                overflow: 'visible',
              }}
            >
              <Image
                source={require('../../../../assets/home/button.png')}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                }}
                resizeMode="contain"
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: scaleSize(6),
                  paddingHorizontal: scaleSize(8),
                  paddingVertical: scaleSize(4),
                }}
              >
                <Image
                  source={require('../../../../assets/home/play.png')}
                  style={{
                    width: scaleSize(88),
                    height: scaleSize(38),
                  }}
                  resizeMode="contain"
                />
              </View>
            </SoundTouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default DailyRewards;
