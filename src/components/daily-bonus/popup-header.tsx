import React from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';

interface PopupHeaderProps {
  ribbonAnim: Animated.Value;
  isDarkMode: boolean;
  onClose: () => void;
  disabled: boolean;
}

const PopupHeader: React.FC<PopupHeaderProps> = ({ ribbonAnim, isDarkMode, onClose, disabled }) => {
  return (
    <Animated.View
      style={[
        styles.headerContainer,
        ribbonAnim && {
          transform: [
            {
              translateY: ribbonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Image
        source={require('../../../assets/icons/ribbon.png')}
        style={styles.ribbonImage}
        resizeMode="stretch"
      />
      <View style={styles.ribbonTextContainer}>
        <Text
          style={[
            styles.headerText,
            {
              color: isDarkMode ? '#BB86FC' : '#ffff00',
              textShadowColor: '#000',
              fontFamily: 'LuckiestGuy-Regular',
              fontStyle: 'normal',
            },
          ]}
        >
          DAILY BONUS
        </Text>
      </View>

      {/* Close Button - No background, just icon */}
      <SoundTouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          onClose();
        }}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Image source={require('../../../assets/closeIcon.png')} style={styles.closeIcon} />
      </SoundTouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: scaleSize(5),
    position: 'absolute',
    right: scaleSize(-9), // Moved 4px right from -5
    top: scaleSize(46), // Moved 4px up from 50
    zIndex: 2,
  },
  closeIcon: {
    height: scaleSize(34),
    width: scaleSize(34),
  },
  headerContainer: {
    alignItems: 'center',
    elevation: 10,
    height: scaleSize(80),
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: scaleSize(-60),
    zIndex: 10,
  },
  headerText: {
    fontSize: scaleSize(28),
    fontStyle: 'normal',
    fontWeight: 'normal',
    textAlign: 'center',
    textShadowOffset: { width: scaleSize(2), height: scaleSize(2) },
    textShadowRadius: scaleSize(3),
  },
  ribbonImage: {
    alignSelf: 'center',
    height: '100%',
    position: 'absolute',
    top: scaleSize(20),
    width: '100%',
    zIndex: 1,
  },
  ribbonTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleSize(-42),
    position: 'absolute',
    top: '100%',
    width: '100%',
    zIndex: 2,
  },
});

export default PopupHeader;
