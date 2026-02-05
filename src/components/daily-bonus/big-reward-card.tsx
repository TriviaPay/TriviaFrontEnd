import React, { useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { scaleSize } from '../../utils/scaleSize';

interface Reward {
  day: number;
  type: string;
  value: number;
  color: string;
  claimed: boolean;
  enabled: boolean;
}

interface BigRewardCardProps {
  reward: Reward;
  currentDay: number;
  isDarkMode: boolean;
  scaleAnim: Animated.Value;
  shineAnim: Animated.Value;
  cardRef: (ref: any) => void;
  onLayout: (day: string) => void;
  onClaim?: (day: number) => void;
  disabled?: boolean;
}

const BigRewardCard: React.FC<BigRewardCardProps> = ({
  reward,
  currentDay,
  isDarkMode,
  scaleAnim,
  shineAnim,
  cardRef,
  onLayout,
  onClaim,
  disabled = false,
}) => {
  const isActive = reward.day === currentDay && reward.enabled && !reward.claimed;
  const canClaim = isActive && !disabled && !reward.claimed && onClaim;
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handleLayout = () => {
    if (onLayout) {
      onLayout(reward.day.toString());
    }
  };

  const handlePressIn = () => {
    if (canClaim) {
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (canClaim) {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }).start();
    }
  };

  const handlePress = () => {
    if (canClaim && onClaim) {
      onClaim(reward.day);
    }
  };

  return (
    <TouchableOpacity
      style={styles.bigRewardContainer}
      ref={ref => {
        if (cardRef) cardRef(ref);
      }}
      onLayout={handleLayout}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!canClaim}
      activeOpacity={canClaim ? 0.7 : 1}
    >
      <Animated.View
        style={[
          styles.bigRewardBox,
          reward.claimed ? styles.rewardBoxClaimed : {},
          !reward.enabled ? styles.rewardBoxLocked : {},
          isActive && scaleAnim
            ? {
              transform: [{ scale: scaleAnim }],
              borderColor: '#00ff00',
              borderWidth: 4,
            }
            : {
              borderColor: isDarkMode ? '#BB86FC' : '#f59e0b',
              transform: pressAnim ? [{ scale: pressAnim }] : [],
            },
        ]}
      >
        <LinearGradient
          colors={['#FFD700', '#8e44ad']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bigGradient}
        >
          {isActive && shineAnim && (
            <Animated.View
              style={[
                styles.shineEffectBig,
                {
                  transform: [
                    {
                      translateX: shineAnim,
                    },
                  ],
                },
              ]}
            />
          )}

          {!reward.enabled && (
            <Image source={require('../../../assets/icons/lock.png')} style={styles.lockIcon} />
          )}

          <View style={styles.day7Content}>
            <Image source={require('../../../assets/home/gem.png')} style={styles.day7ChestIcon} />
            <View style={styles.countContainer}>
              <View style={styles.dayLabel}>
                <Image
                  source={require('../../../assets/icons/day_label.png')}
                  style={styles.dayLabelBackground}
                />
                <Text style={styles.dayLabelText}>Day 7</Text>
              </View>
              <View
                style={[
                  styles.bronzeContainer,
                  {
                    backgroundColor: 'rgba(108, 92, 231, 0.3)',
                  },
                ]}
              >
                <Text style={styles.bronzeText}>{reward.value}</Text>
              </View>
            </View>
          </View>

          {reward.claimed && reward.enabled ? (
            <View style={styles.claimedOverlayBig}>
              <Text style={styles.claimedTextBig}>CLAIMED</Text>
            </View>
          ) : reward.enabled && !reward.claimed && reward.day < currentDay ? (
            <View style={styles.claimedOverlayBig}>
              <Text style={styles.unclaimedTextBig}>NOT CLAIMED</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bigGradient: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSize(15),
  },
  bigRewardBox: {
    borderRadius: scaleSize(10),
    borderWidth: scaleSize(3),
    height: scaleSize(75),
    overflow: 'hidden',
    width: '95%',
  },
  bigRewardContainer: {
    alignItems: 'center',
    marginTop: scaleSize(4),
  },
  bronzeContainer: {
    alignSelf: 'flex-start',
    borderRadius: scaleSize(8),
    marginLeft: 0,
    marginTop: scaleSize(10),
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(8),
  },
  bronzeText: {
    color: 'white',
    fontSize: scaleSize(20),
    fontWeight: 'bold',
  },
  checkIconBig: {
    color: '#ffffff',
    fontSize: scaleSize(50),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  claimedOverlayBig: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  claimedTextBig: {
    fontSize: scaleSize(12),
    color: '#00FF00', // Green color
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  countContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleSize(30),
    paddingTop: scaleSize(10),
    position: 'relative',
  },
  day7ChestIcon: {
    height: scaleSize(50),
    marginLeft: scaleSize(30),
    width: scaleSize(50),
  },
  day7Content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: scaleSize(12),
    paddingLeft: scaleSize(10),
  },
  dayLabel: {
    alignItems: 'center',
    height: scaleSize(36),
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: scaleSize(-20),
    zIndex: 1,
  },
  dayLabelBackground: {
    height: '100%',
    position: 'absolute',
    resizeMode: 'contain',
    width: '100%',
  },
  dayLabelText: {
    color: '#000',
    fontSize: scaleSize(12),
    fontWeight: 'bold',
    position: 'absolute',
  },
  lockIcon: {
    height: scaleSize(18),
    position: 'absolute',
    right: scaleSize(5),
    top: scaleSize(5),
    width: scaleSize(18),
    zIndex: 2,
  },
  rewardBoxClaimed: {
    opacity: 0.7,
  },
  rewardBoxLocked: {
    opacity: 0.5,
  },
  shineEffectBig: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    height: scaleSize(85),
    position: 'absolute',
    transform: [{ rotate: '25deg' }],
    width: scaleSize(50),
    zIndex: 2,
  },
  unclaimedTextBig: {
    fontSize: scaleSize(12),
    color: '#FF0000', // Red color
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default BigRewardCard;
