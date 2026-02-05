import React, { memo, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getRewardIcon } from './constants';
import { scaleSize } from '../../utils/scaleSize';

interface Reward {
  day: number;
  type: string;
  value: number;
  color: string;
  claimed: boolean;
  enabled: boolean;
}

interface RewardCardProps {
  reward: Reward;
  index: number;
  currentDay: number;
  isDarkMode: boolean;
  scaleAnim: Animated.Value;
  shineAnim: Animated.Value;
  cardRef: (ref: any) => void;
  onLayout: (day: string) => void;
  onClaim?: (day: number) => void;
  disabled?: boolean;
}

const RewardCard = memo<RewardCardProps>(
  ({
    reward,
    index,
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
        // Add a quick scale animation on press
        Animated.sequence([
          Animated.timing(pressAnim, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(pressAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClaim(reward.day);
        });
      }
    };

    const rewardIconSource = getRewardIcon(reward.type);

    return (
      <TouchableOpacity
        style={styles.rewardItem}
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
            styles.rewardBox,
            reward.claimed ? styles.rewardBoxClaimed : {},
            !reward.enabled ? styles.rewardBoxLocked : {},
            isActive && scaleAnim && pressAnim
              ? {
                transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
                borderColor: '#00ff00',
                borderWidth: 4,
              }
              : pressAnim
                ? {
                  transform: [{ scale: pressAnim }],
                  borderColor: isDarkMode ? '#BB86FC' : '#f59e0b',
                }
                : {
                  borderColor: isDarkMode ? '#BB86FC' : '#f59e0b',
                },
          ]}
        >
          <LinearGradient
            colors={reward.color === '#CC0066' ? ['#FFD700', '#8e44ad'] : ['#FFD700', '#8e44ad']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {isActive && shineAnim && (
              <Animated.View
                style={[
                  styles.shineEffect,
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

            <View style={styles.dayLabel}>
              <Image
                source={require('../../../assets/icons/day_label.png')}
                style={styles.dayLabelBackground}
              />
              <Text style={styles.dayLabelText}>Day {reward.day}</Text>
            </View>

            {!reward.enabled && (
              <Image source={require('../../../assets/icons/lock.png')} style={styles.lockIcon} />
            )}

            <View style={styles.rewardContent}>
              {rewardIconSource && (
                <View style={styles.iconWrapper}>
                  <Image source={rewardIconSource} style={styles.rewardIcon} />
                  {reward.claimed && reward.enabled && reward.day === 7 ? (
                    <View style={styles.claimedTextContainer}>
                      <Text style={styles.claimedTextInline}>CLAIMED</Text>
                    </View>
                  ) : null}
                </View>
              )}
              <View
                style={[
                  styles.rewardValueContainer,
                  {
                    backgroundColor: 'rgba(108, 92, 231, 0.3)',
                  },
                ]}
              >
                <Text style={styles.rewardValue}>{reward.value}</Text>
              </View>
            </View>

            {reward.claimed && reward.enabled ? (
              <View style={styles.claimedOverlay}>
                <Text style={styles.claimedText}>CLAIMED</Text>
              </View>
            ) : reward.enabled && !reward.claimed && reward.day < currentDay ? (
              <View style={styles.claimedOverlay}>
                <Text style={styles.unclaimedText}>NOT CLAIMED</Text>
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

RewardCard.displayName = 'RewardCard';

const styles = StyleSheet.create({
  checkIcon: {
    color: '#ffffff',
    fontSize: scaleSize(45),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  claimedOverlay: {
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
  claimedText: {
    fontSize: scaleSize(12),
    color: '#00FF00', // Green color
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  claimedTextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: scaleSize(3),
    bottom: scaleSize(-15),
    paddingHorizontal: scaleSize(4),
    paddingVertical: scaleSize(2),
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  claimedTextInline: {
    fontSize: scaleSize(9),
    color: '#00FF00', // Green color
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  dayLabel: {
    alignItems: 'center',
    height: scaleSize(36),
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
  gradient: {
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
    padding: 0,
  },
  iconWrapper: {
    marginBottom: scaleSize(4),
    position: 'relative',
  },
  lockIcon: {
    height: scaleSize(18),
    position: 'absolute',
    right: scaleSize(5),
    top: scaleSize(5),
    width: scaleSize(18),
    zIndex: 2,
  },
  rewardBox: {
    borderRadius: scaleSize(10),
    borderWidth: scaleSize(3),
    height: scaleSize(110),
    overflow: 'hidden',
  },
  rewardBoxClaimed: {
    opacity: 0.7,
  },
  rewardBoxLocked: {
    opacity: 0.5,
  },
  rewardContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: scaleSize(20),
  },
  rewardIcon: {
    height: scaleSize(50),
    width: scaleSize(50),
  },
  rewardItem: {
    width: '31%',
  },
  rewardValue: {
    color: 'white',
    fontSize: scaleSize(16),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rewardValueContainer: {
    borderRadius: scaleSize(5),
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(4),
  },
  shineEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: '100%',
    position: 'absolute',
    transform: [{ rotate: '25deg' }],
    width: scaleSize(50),
    zIndex: 2,
  },
  unclaimedOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  unclaimedText: {
    fontSize: scaleSize(12),
    color: '#FF0000', // Red color
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default RewardCard;
