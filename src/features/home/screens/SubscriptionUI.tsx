/**
 * SubscriptionUI - TypeScript Implementation
 * Professional subscription UI component with comprehensive features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Animated,
  InteractionManager,
} from 'react-native';
import { useTimerHook } from '../../../hooks/Home/useTimerHook';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useThemeColors } from '../../../utils/themeColors';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../navigation/types';
import { navigate as globalNavigate } from '../../../services/navigationService';
import { LinearGradient } from 'react-native-linear-gradient';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SubscriptionUIProps {
  handleSubscribe: () => void;
  isSubscribed?: boolean;
}

const SubscriptionUI: React.FC<SubscriptionUIProps> = ({
  handleSubscribe,
  isSubscribed = false,
}) => {
  // Use root navigation so we can push stack screens (TriviaSelectionScreen) from within nested tabs
  const navigation = useNavigation<RootNavigationProp & any>();
  const isFocused = useIsFocused();
  const { isDarkMode, colors } = useTheme();
  const themeColors = useThemeColors();
  const { animatedStyle, animatePress, animateRelease } = useButtonAnimation();
  const {
    getResponsiveFontSize,
    getResponsiveImageSize,
    getResponsiveIconSize,
    getResponsiveButtonHeight,
    getResponsiveButtonWidth,
    getResponsiveSpacing,
    isSmallDevice,
    isTablet,
  } = useStandardResponsive();

  // Use global timer hook for synchronized data across all cards
  const {
    hours,
    minutes,
    seconds,
    timerCompleted,
    prizePool,
    bronzePrizePool,
    silverPrizePool,
    isLoading,
    estTimeString,
    getTimerGradientColors,
  } = useTimerHook();

  // Alternate between bronze and silver every 2 seconds
  const [showBronze, setShowBronze] = useState(true);
  useEffect(() => {
    if (!isFocused) return;
    const interval = setInterval(() => {
      setShowBronze(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [isFocused]);

  // Use actual prize pools from API (no more percentage calculations)

  // Determine timer box gradient colors - Sync with DailyRewards style but can be customized
  const getTimerBoxGradient = (): string[] => {
    const hoursNum = parseInt(hours) || 0;
    const minutesNum = parseInt(minutes) || 0;
    const secondsNum = parseInt(seconds) || 0;
    const totalSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;

    if (totalSeconds < 5) {
      return ['#4CAF50', '#9C27B0'];
    }
    if (totalSeconds < 1800) {
      return ['#FF9800', '#9C27B0'];
    }
    return ['#9C27B0', '#BA68C8'];
  };

  const cardWidth = scaleSize(350);
  const cardHeight = cardWidth / 1.3;
  const timerTextSize = scaleSize(24);
  const timerBoxSize = scaleSize(50);

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
        source={require('../../../../assets/home/subscription.png')}
        resizeMode="contain"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: scaleSize(12),
            backgroundColor: 'transparent',
          }}
        />

        {/* Prize Pool Display - Alternating Bronze and Silver Cards */}
        <View
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: [{ translateX: -scaleSize(75) }],
            alignItems: 'center',
            justifyContent: 'center',
            width: scaleSize(150),
            marginTop: scaleSize(8),
          }}
        >
          {showBronze ? (
            <View
              style={{
                width: scaleSize(150),
                height: scaleSize(48),
                backgroundColor: '#8B4513',
                borderRadius: scaleSize(12),
                borderWidth: scaleSize(2),
                borderColor: '#FFD700',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: scaleSize(10),
                paddingRight: scaleSize(10),
              }}
            >
              <Image
                source={require('../../../../assets/bronze.png')}
                style={{ width: scaleSize(35), height: scaleSize(35), marginRight: scaleSize(10) }}
                resizeMode="contain"
              />
              <View style={{ alignItems: 'flex-start', justifyContent: 'center', flex: 1 }}>
                <Text
                  style={[
                    typography.h2,
                    {
                      fontSize: getResponsiveFontSize(scaleSize(14)),
                      color: '#FFD700',
                      fontWeight: 'bold',
                      marginBottom: scaleSize(0),
                      top: scaleSize(16),
                    },
                  ]}
                >
                  Bronze
                </Text>
                <Text
                  style={[
                    typography.h2,
                    {
                      fontSize: getResponsiveFontSize(scaleSize(14)),
                      color: '#FFD700',
                      top: scaleSize(0),
                    },
                  ]}
                >
                  {bronzePrizePool ? bronzePrizePool.toLocaleString() : '0'} TC
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={{
                width: scaleSize(150),
                height: scaleSize(48),
                backgroundColor: '#1E3A8A',
                borderRadius: scaleSize(12),
                borderWidth: scaleSize(2),
                borderColor: '#C0C0C0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: scaleSize(10),
                paddingRight: scaleSize(10),
              }}
            >
              <Image
                source={require('../../../../assets/silver.png')}
                style={{ width: scaleSize(35), height: scaleSize(35), marginRight: scaleSize(10) }}
                resizeMode="contain"
              />
              <View style={{ alignItems: 'flex-start', justifyContent: 'center', flex: 1 }}>
                <Text
                  style={[
                    typography.h2,
                    {
                      fontSize: getResponsiveFontSize(scaleSize(14)),
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      marginBottom: scaleSize(0),
                      top: scaleSize(16),
                    },
                  ]}
                >
                  Silver
                </Text>
                <Text
                  style={[
                    typography.h2,
                    {
                      fontSize: getResponsiveFontSize(scaleSize(14)),
                      color: '#FFFFFF',
                      top: scaleSize(0),
                    },
                  ]}
                >
                  {silverPrizePool ? silverPrizePool.toLocaleString() : '0'} TC
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text
          style={[
            typography.h5,
            {
              color: '#FFFFFF',
              fontSize: getResponsiveFontSize(scaleSize(20)),
              textAlign: 'center',
              top: scaleSize(4),
            },
          ]}
        >
          Next prize reveal in:
        </Text>

        {/* Timer Labels */}
        <View
          style={{
            position: 'absolute',
            top: '56%',
            left: '40%',
            transform: [{ translateX: -50 }],
            alignItems: 'center',
            marginTop: scaleSize(2),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: scaleSize(10), // Changed from 8 to 10 (added 2px gap)
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: '#FFFFFF',
                  fontSize: getResponsiveFontSize(scaleSize(12)),
                  marginHorizontal: scaleSize(20),
                  marginRight: scaleSize(12),
                },
              ]}
            >
              HR
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  color: '#FFFFFF',
                  fontSize: getResponsiveFontSize(scaleSize(12)),
                  marginHorizontal: scaleSize(20),
                  marginRight: scaleSize(12),
                },
              ]}
            >
              MIN
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  color: '#FFFFFF',
                  fontSize: getResponsiveFontSize(scaleSize(12)),
                  marginLeft: scaleSize(12),
                  marginRight: scaleSize(20),
                },
              ]}
            >
              SEC
            </Text>
          </View>
        </View>

        {/* Timer Display - moved to down side - Adjusted to match text movement */}
        {!timerCompleted && (
          <View
            style={{
              position: 'absolute',
              top: '72%',
              left: '38%',
              transform: [{ translateX: -50 }],
              alignItems: 'center',
              marginLeft: scaleSize(10),
              marginTop: scaleSize(-20),
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
                    color: themeColors.white,
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
                    color: themeColors.white,
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
                    color: themeColors.white,
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

        {/* Bottom Button */}
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
              onPress={() => {
                // Navigate immediately; avoid waiting on InteractionManager to prevent long delays on busy JS threads
                const tryNavigate = (nav: any) => {
                  try {
                    if (nav?.navigate) {
                      nav.navigate('TriviaSelectionScreen' as never);
                      return true;
                    }
                  } catch {
                    // ignore and try next option
                  }
                  return false;
                };

                const parent = (navigation as any).getParent?.();
                const grandParent = parent?.getParent?.();

                if (!tryNavigate(grandParent) && !tryNavigate(parent) && !tryNavigate(navigation)) {
                  globalNavigate('TriviaSelectionScreen');
                }
              }}
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
                  marginLeft: scaleSize(-4),
                  paddingHorizontal: scaleSize(8),
                  paddingVertical: scaleSize(4),
                }}
              >
                <Image
                  source={require('../../../../assets/play.png')}
                  style={{
                    width: scaleSize(88),
                    height: scaleSize(38),
                    marginLeft: scaleSize(4),
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

export default SubscriptionUI;
