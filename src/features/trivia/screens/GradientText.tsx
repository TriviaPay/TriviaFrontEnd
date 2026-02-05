import React, { useRef, useEffect } from 'react';
import { Animated, Platform, Text } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';

interface GradientTextProps {
  text: string;
}

const GradientText = ({ text }: GradientTextProps): JSX.Element => {
  const { isDarkMode } = useTheme();
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [colorAnim]);

  const colorInterpolation = colorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isDarkMode ? ['#05ccfa', '#fae705', '#faa505'] : ['#880E4F', '#880E4F', '#0277BD'],
  });

  return (
    <Animated.Text
      style={[
        typography.display4,
        {
          color: colorInterpolation,
          fontSize: scaleSize(30),
          includeFontPadding: false,
          textAlignVertical: 'center',
          textAlign: 'center',
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
};

export default GradientText;
