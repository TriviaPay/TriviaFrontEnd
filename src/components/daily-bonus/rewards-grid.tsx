import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import RewardCard from './reward-card';
import BigRewardCard from './big-reward-card';
import { scaleSize } from '../../utils/scaleSize';

interface Reward {
  day: number;
  type: string;
  value: number;
  color: string;
  claimed: boolean;
  enabled: boolean;
}

interface RewardsGridProps {
  rewards: Reward[];
  currentDay: number;
  isDarkMode: boolean;
  scaleAnims: Animated.Value[];
  shineAnim: Animated.Value;
  cardRefs: React.MutableRefObject<{ [day: string]: any }>;
  onCardLayout: (day: string) => void;
  onClaim?: (day: number) => void;
  disabled?: boolean;
}

const RewardsGrid: React.FC<RewardsGridProps> = ({
  rewards,
  currentDay,
  isDarkMode,
  scaleAnims,
  shineAnim,
  cardRefs,
  onCardLayout,
  onClaim,
  disabled = false,
}) => {
  return (
    <View style={styles.rewardsContainer}>
      {/* First row of rewards */}
      <View style={styles.rewardsRow}>
        {rewards.slice(0, 3).map((reward, index) => (
          <RewardCard
            key={reward.day}
            reward={reward}
            index={index}
            currentDay={currentDay}
            isDarkMode={isDarkMode}
            scaleAnim={scaleAnims[index]}
            shineAnim={shineAnim}
            cardRef={ref => (cardRefs.current[reward.day.toString()] = ref)}
            onLayout={onCardLayout}
            onClaim={onClaim}
            disabled={disabled}
          />
        ))}
      </View>

      {/* Second row of rewards */}
      <View style={styles.rewardsRow}>
        {rewards.slice(3, 6).map((reward, index) => (
          <RewardCard
            key={reward.day}
            reward={reward}
            index={index + 3}
            currentDay={currentDay}
            isDarkMode={isDarkMode}
            scaleAnim={scaleAnims[index + 3]}
            shineAnim={shineAnim}
            cardRef={ref => (cardRefs.current[reward.day.toString()] = ref)}
            onLayout={onCardLayout}
            onClaim={onClaim}
            disabled={disabled}
          />
        ))}
      </View>

      {/* Big reward (day 7) */}
      <BigRewardCard
        reward={rewards[6]}
        currentDay={currentDay}
        isDarkMode={isDarkMode}
        scaleAnim={scaleAnims[6]}
        shineAnim={shineAnim}
        cardRef={ref => (cardRefs.current['7'] = ref)}
        onLayout={onCardLayout}
        onClaim={onClaim}
        disabled={disabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rewardsContainer: {
    marginBottom: scaleSize(8),
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSize(4),
  },
});

export default RewardsGrid;
