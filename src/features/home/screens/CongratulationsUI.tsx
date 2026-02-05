/**
 * CongratulationsUI - TypeScript Implementation
 * Professional congratulations UI component similar to SubscriptionUI and DailyRewards
 */

import React, { useMemo } from 'react';
import { View, Text, Image, ImageBackground, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useThemeColors } from '../../../utils/themeColors';
import { useStableNavigation } from '../../../hooks/useStableNavigation';
import type { RootState } from '../../../store/store';

const CongratulationsUI: React.FC = React.memo(() => {
  const { navigate: stableNavigate } = useStableNavigation();
  const { isDarkMode, colors } = useTheme();
  const themeColors = useThemeColors();
  const { animatedStyle, animatePress, animateRelease } = useButtonAnimation();
  const { getResponsiveFontSize } = useStandardResponsive();

  // Get profile data from Redux
  const profileState = useSelector((state: RootState) => state.profile);
  const profileData = profileState?.profile;

  // Get recent draw earnings from profile data
  const recentDrawEarnings = useMemo(() => {
    return profileData?.recent_draw_earnings ?? 0;
  }, [profileData?.recent_draw_earnings]);

  const cardWidth = scaleSize(350);
  const cardHeight = cardWidth / 1.3;

  // Zoom out animation for congratulations image
  const zoomAnim = React.useRef(new Animated.Value(1.2)).current;

  React.useEffect(() => {
    // Start with zoomed in, then zoom out
    Animated.timing(zoomAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        marginTop: 0,
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

        {/* Fireworks Lottie Background */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <LottieView
            source={require('../../../../assets/animations/firework.json')}
            autoPlay={true}
            loop={true}
            style={{
              width: cardWidth,
              height: cardHeight,
            }}
          />
        </View>

        {/* Congratulations Image - Same dimensions as card, centered with zoom out animation */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: zoomAnim }],
            }}
          >
            <Image
              source={require('../../../../assets/congratulations.png')}
              style={{
                width: cardWidth - scaleSize(100),
                height: cardHeight - scaleSize(100),
              }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Recent Draw Earnings - Display at bottom */}
        {recentDrawEarnings !== undefined && recentDrawEarnings !== null && (
          <View
            style={{
              position: 'absolute',
              bottom: scaleSize(60) + 10,
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveFontSize(scaleSize(14)),
                color: '#FFFFFF',
                fontWeight: '600',
                marginBottom: scaleSize(4),
                opacity: 0.9,
              }}
            >
              You Just Won
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../../../assets/icons/Tpcoin.png')}
                style={{
                  width: scaleSize(24),
                  height: scaleSize(24),
                  margin: scaleSize(4),
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: getResponsiveFontSize(scaleSize(22)),
                  color: themeColors.warning,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {recentDrawEarnings.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Button - Play Button */}
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
              onPress={() => stableNavigate('TriviaSelectionScreen')}
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
});

CongratulationsUI.displayName = 'CongratulationsUI';

export default CongratulationsUI;
