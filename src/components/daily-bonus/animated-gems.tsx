import React from 'react';
import { Animated, StyleSheet, Image, View } from 'react-native';

interface AnimatedGemsProps {
  animatingGems: boolean;
  gemPositions: Animated.ValueXY[];
  gemOpacities: Animated.Value[];
  gemScales: Animated.Value[];
  cardPositions: { [day: string]: { x: number; y: number } };
  currentDay: number;
}

const AnimatedGems: React.FC<AnimatedGemsProps> = ({
  animatingGems,
  gemPositions,
  gemOpacities,
  gemScales,
  cardPositions,
  currentDay,
}) => {
  if (!animatingGems) {
    return null;
  }

  const sourcePosition = cardPositions[currentDay.toString()] || { x: 200, y: 400 };

  return (
    <View style={styles.animationContainer} pointerEvents="none">
      {gemPositions.map((position, idx) => {
        return (
          <Animated.View
            key={`gem-${idx}`}
            style={[
              styles.animatedGem,
              {
                left: sourcePosition.x - 25,
                top: sourcePosition.y - 25,
                transform: [
                  position?.x ? { translateX: position.x } : { translateX: 0 },
                  position?.y ? { translateY: position.y } : { translateY: 0 },
                  gemScales[idx] ? { scale: gemScales[idx] } : { scale: 1 },
                ],
                opacity: gemOpacities[idx] || 0,
              },
            ]}
          >
            <View style={styles.gemContainer}>
              <Image
                source={require('../../../assets/home/gem.png')}
                style={styles.flyingGemIcon}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  animatedGem: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    width: 50,
  },
  animationContainer: {
    bottom: 0,
    elevation: 10000,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10000,
  },
  flyingGemIcon: {
    height: 40,
    width: 40,
  },
  gemContainer: {
    alignItems: 'center',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
});

export default AnimatedGems;
