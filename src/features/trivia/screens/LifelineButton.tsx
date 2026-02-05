/**
 * LifelineButton - TypeScript Implementation
 * Professional lifeline button component with comprehensive features
 * Updated to use new trivia assets - cache busting
 */

import React from 'react';
import { View, Text, Animated, Platform, Image } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';

const getLifelineImage = (title: string): any => {
  switch (title.toLowerCase()) {
    case '50-50':
      return require('../../../../assets/trivia/fiftyFifty.png');
    case 'auto':
      return require('../../../../assets/trivia/auto.png');
    case 'change':
      return require('../../../../assets/trivia/changeQuestion.png');
    case 'hint':
      return require('../../../../assets/trivia/hint.png');
    default:
      return require('../../../../assets/trivia/fiftyFifty.png');
  }
};

const getLifelineIconImage = (title: string): any => {
  switch (title.toLowerCase()) {
    case '50-50':
      return require('../../../../assets/trivia/FFIcon.png');
    case 'auto':
      return require('../../../../assets/trivia/autoIcon.png');
    case 'change':
      return require('../../../../assets/trivia/CQIcon.png');
    case 'hint':
      return require('../../../../assets/trivia/hintIcon.png');
    default:
      return require('../../../../assets/trivia/FFIcon.png');
  }
};

interface LifelineButtonProps {
  title: string;
  gemCost: number;
  isActive: boolean;
  onPress: () => void;
  isDisabled: boolean;
  animationScale: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
}

const LifelineButton: React.FC<LifelineButtonProps> = ({
  title,
  gemCost,
  isActive,
  onPress,
  isDisabled,
  animationScale,
  onPressIn,
  onPressOut,
}) => {
  const { isDarkMode, colors } = useTheme();

  const iconAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive && !isDisabled) {
      iconAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconAnim, { toValue: 1.18, duration: 800, useNativeDriver: true }),
          Animated.timing(iconAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      iconAnim.stopAnimation();
      iconAnim.setValue(1);
    }
  }, [isActive, isDisabled]);

  const iconOpacity = 1;

  return (
    <Animated.View
      style={{
        transform: isActive && !isDisabled ? [{ scale: animationScale }] : [{ scale: 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(4) },
        shadowOpacity: 0.3,
        shadowRadius: scaleSize(8),
        elevation: 8, // Android shadow
      }}
    >
      <SoundTouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={{
          borderRadius: scaleSize(16),
          width: scaleSize(85),
          height: scaleSize(110),
          overflow: 'hidden',
          position: 'relative',
          // Remove opacity from container - apply it only to content, not background image
        }}
        activeOpacity={0.8}
      >
        <Image
          source={getLifelineImage(title)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: scaleSize(85),
            height: scaleSize(110),
            borderRadius: scaleSize(16),
            opacity: 1, // Background image should always be fully visible
            zIndex: 0, // Ensure background is behind content
          }}
          resizeMode="cover"
        />
        <View
          style={{
            padding: scaleSize(8),
            top: scaleSize(12),
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            paddingBottom: scaleSize(8),
            zIndex: 1, // Ensure content is above background image
            position: 'relative', // Ensure z-index works
            opacity: isActive ? 1 : 0.6, // Apply opacity only to content (icon, gem cost), not background image
          }}
        >
          <Animated.Image
            source={getLifelineIconImage(title)}
            style={{
              width: scaleSize(32),
              height: scaleSize(32),
              marginBottom: scaleSize(4),
              marginTop: scaleSize(2),
              transform: [{ scale: iconAnim }, { translateY: scaleSize(6) }],
              opacity: iconOpacity,
              alignSelf: 'center',
            }}
            resizeMode="contain"
          />

          <View
            style={{
              marginTop: scaleSize(4),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: scaleSize(12),
              paddingHorizontal: 6,
            }}
          >
            <Image
              source={require('../../../../assets/home/gem.png')}
              style={{
                width: scaleSize(14),
                height: scaleSize(14),
                marginRight: scaleSize(4),
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                typography.buttonSmall,
                {
                  color: '#FFFFFF',
                  fontSize: scaleSize(10),
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                },
              ]}
            >
              {gemCost}
            </Text>
          </View>
        </View>
      </SoundTouchableOpacity>
    </Animated.View>
  );
};

export default LifelineButton;
