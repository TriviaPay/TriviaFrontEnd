import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';

interface StreakSectionProps {
  isDarkMode: boolean;
  streakCount: number;
  displayedGems: number;
  totalGemsEarnedThisWeek?: number; // Total gems earned this week from API
  gemsCountRef: React.RefObject<any>;
  gemIconRef: React.RefObject<any>;
  onGemsCountLayout: () => void;
  onGemIconLayout: () => void;
}

const StreakSection: React.FC<StreakSectionProps> = ({
  isDarkMode,
  streakCount,
  displayedGems,
  totalGemsEarnedThisWeek,
  gemsCountRef,
  gemIconRef,
  onGemsCountLayout,
  onGemIconLayout,
}) => {
  return (
    <View
      style={[
        styles.streakSection,
        {
          backgroundColor: isDarkMode ? '#16213e' : '#00135c',
          borderColor: isDarkMode ? '#BB86FC' : '#f59e0b',
        },
      ]}
    >
      <View style={styles.streakContainer}>
        <View style={styles.gemsCenter}>
          <View style={styles.gemsInfo} ref={gemsCountRef} onLayout={onGemsCountLayout}>
            <Image
              source={require('../../../assets/home/diamonds.png')}
              style={styles.gemsIcon}
              ref={gemIconRef}
              onLayout={onGemIconLayout}
            />
            <View style={styles.gemsTextContainer}>
              <Text style={styles.gemsCount}>{displayedGems}</Text>
              {totalGemsEarnedThisWeek !== undefined && totalGemsEarnedThisWeek > 0 && (
                <Text style={styles.totalGemsLabel}>
                  Total this week: {totalGemsEarnedThisWeek}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gemsCenter: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  gemsCount: {
    color: '#ffffff',
    fontSize: scaleSize(18),
    fontWeight: 'bold',
  },
  gemsIcon: {
    height: scaleSize(56),
    marginRight: scaleSize(12),
    width: scaleSize(56),
  },
  gemsInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  gemsLabel: {
    color: '#ffffff',
    fontSize: scaleSize(13),
    opacity: 0.8,
  },
  gemsTextContainer: {
    justifyContent: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  streakSection: {
    borderRadius: scaleSize(12),
    borderWidth: scaleSize(2),
    height: scaleSize(60),
    marginBottom: scaleSize(8),
    padding: scaleSize(12),
  },
  totalGemsLabel: {
    color: '#ffffff',
    fontSize: scaleSize(11),
    marginTop: scaleSize(2),
    opacity: 0.7,
  },
});

export default StreakSection;
