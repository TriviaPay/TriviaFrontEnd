import React from 'react';
import { View, Text, Image, Alert, StyleSheet, Animated } from 'react-native';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';
import { useButtonAnimation } from '../../hooks/Home/useButtonAnimation';
import { logger } from '../../lib/utils/logger';
import { rewardedAdService } from '../../ads/RewardedAdService';

interface PopupFooterProps {
  isDarkMode: boolean;
  rewards: any[];
  currentDay: number;
  claimInProgress: boolean;
  hasClaimedToday: boolean;
  animatingGems: boolean;
  canClaimToday: boolean;
}

const PopupFooter: React.FC<PopupFooterProps> = ({
  isDarkMode,
  claimInProgress,
  hasClaimedToday,
  animatingGems,
}) => {
  const buttonAnimation = useButtonAnimation();

  // Enable Double Up all the time (before and after claiming) - only disable during claim/animations
  const canDoubleUp = !claimInProgress && !animatingGems;

  const handleDoubleUpPress = () => {
    if (rewardedAdService.isAdLoaded()) {
      rewardedAdService.showRewardedAd(() => {
        logger.debug('User earned reward - doubling gems', 'POPUP');
        Alert.alert('Success', 'Rewards doubled!');
        // Here you would add the actual logic to double gems
      });
    } else {
      Alert.alert('Ad not ready', 'The ad is still loading. Please try again in a few seconds.');
      rewardedAdService.loadRewardedAd();
    }
  };

  return (
    <View style={styles.footerContainer}>
      <Text style={[styles.footerText, { color: isDarkMode ? '#FFFFFF' : '#FFFFFF' }]}>
        {hasClaimedToday
          ? 'Reward claimed! Come back tomorrow'
          : canDoubleUp
            ? 'Double your gems before claiming!'
            : 'Tap on the card to claim your reward'}
      </Text>

      {/* Double Up Button - Always visible */}
      <View style={styles.buttonContainer}>
        <Animated.View style={[buttonAnimation?.animatedStyle, styles.animatedButtonContainer]}>
          <SoundTouchableOpacity
            style={[styles.doubleUpButton, !canDoubleUp && styles.doubleUpButtonDisabled]}
            disabled={!canDoubleUp}
            onPress={handleDoubleUpPress}
            onPressIn={buttonAnimation?.animatePress}
            onPressOut={buttonAnimation?.animateRelease}
            activeOpacity={canDoubleUp ? 0.8 : 1}
          >
            <Image
              source={require('../../../assets/home/doubleUp.png')}
              style={[styles.doubleUpImage, !canDoubleUp && styles.doubleUpImageDisabled]}
              resizeMode="contain"
              onError={error => {
                logger.error('❌ Failed to load doubleUp image:', 'APP', error);
              }}
            />
          </SoundTouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    alignItems: 'center',
    marginTop: scaleSize(4),
    paddingHorizontal: scaleSize(16),
    width: '100%',
    zIndex: 1000,
    elevation: 8,
  },
  footerText: {
    fontWeight: 'bold',
    marginBottom: scaleSize(8),
    fontSize: scaleSize(15),
    textAlign: 'center',
    color: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleSize(2),
    marginBottom: scaleSize(4),
    minHeight: scaleSize(30),
  },
  animatedButtonContainer: {
    width: '100%',
    zIndex: 1000,
    elevation: 10,
  },
  doubleUpButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: scaleSize(2),
    minHeight: scaleSize(48),
  },
  doubleUpButtonDisabled: {
    opacity: 0.6,
  },
  doubleUpImage: {
    width: '100%',
    height: scaleSize(40),
    minHeight: scaleSize(20),
    maxHeight: scaleSize(60),
  },
  doubleUpImageDisabled: {
    opacity: 0.6,
  },
});

export default PopupFooter;
