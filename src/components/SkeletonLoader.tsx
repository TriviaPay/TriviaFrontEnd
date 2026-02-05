/**
 * Skeleton Loader Component
 * Loading placeholders for better UX
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useThemeColors } from '../utils/themeColors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const colors = useThemeColors();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const styles = SkeletonLoaderStyles(colors);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonLoaderStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    skeleton: {
      backgroundColor: colors.gray200,
    },
  });

/**
 * Skeleton Screen - Full screen loading placeholder
 */
export const SkeletonScreen: React.FC = () => {
  const colors = useThemeColors();

  const screenStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
      padding: 16,
    },
    content: {
      flex: 1,
    },
    item: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 16,
    },
    itemContent: {
      flex: 1,
      marginLeft: 12,
    },
    itemSubtitle: {
      marginTop: 8,
    },
    subtitle: {
      marginBottom: 24,
    },
    title: {
      marginBottom: 8,
    },
  });

  return (
    <View style={screenStyles.container}>
      <SkeletonLoader width="80%" height={24} style={screenStyles.title} />
      <SkeletonLoader width="60%" height={16} style={screenStyles.subtitle} />
      <View style={screenStyles.content}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={screenStyles.item}>
            <SkeletonLoader width={50} height={50} borderRadius={25} />
            <View style={screenStyles.itemContent}>
              <SkeletonLoader width="70%" height={16} />
              <SkeletonLoader width="50%" height={14} style={screenStyles.itemSubtitle} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default SkeletonLoader;
