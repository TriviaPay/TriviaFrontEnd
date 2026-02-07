import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useReduxHooks';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

const SettingsHeader: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const responsive = useStandardResponsive();

  // Safely extract functions with fallbacks - ensure they always return numbers
  const getResponsiveSpacing = React.useMemo(() => {
    const fn = responsive?.getResponsiveSpacing;
    if (typeof fn === 'function') {
      return (size: number) => {
        const result = fn(size);
        return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : size;
      };
    }
    return (size: number) => size;
  }, [responsive]);

  const getResponsivePadding = React.useMemo(() => {
    const fn = responsive?.getResponsivePadding;
    if (typeof fn === 'function') {
      return (size: number) => {
        const result = fn(size);
        return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : size;
      };
    }
    return (size: number) => size;
  }, [responsive]);

  // Safely extract colors with fallback
  const colors = theme?.colors || { text: '#000000' };

  const handleGoBack = React.useCallback(() => {
    try {
      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
      }
    } catch (error) { }
  }, [navigation]);

  // Ensure strokeWidth is always a valid number
  const strokeWidth = React.useMemo(() => {
    const spacing = getResponsiveSpacing(2);
    return typeof spacing === 'number' && !isNaN(spacing) && isFinite(spacing) ? spacing : 2;
  }, [getResponsiveSpacing]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <SoundTouchableOpacity 
          onPress={handleGoBack} 
          style={styles.backButton} 
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Image
            source={require('../../../../assets/backIcon.png')}
            style={styles.backIcon}
            resizeMode="contain"
            onError={error => { }}
          />
        </SoundTouchableOpacity>

        {/* Settings Heading - Same style as Profile */}
        <View style={styles.headingContainer}>
          <View style={styles.headingWrapper}>
            {/* Blue border text - rendered 8 times around the white text */}
            {(() => {
              const fontSize = scaleSize(28);
              return [
                { x: -strokeWidth, y: -strokeWidth },
                { x: 0, y: -strokeWidth },
                { x: strokeWidth, y: -strokeWidth },
                { x: -strokeWidth, y: 0 },
                { x: strokeWidth, y: 0 },
                { x: -strokeWidth, y: strokeWidth },
                { x: 0, y: strokeWidth },
                { x: strokeWidth, y: strokeWidth },
              ].map((offset, index) => (
                <Text
                  key={index}
                  style={[
                    typography.h2,
                    {
                      position: 'absolute',
                      color: '#1E3A8A',
                      fontSize,
                      fontWeight: 'normal',
                      fontFamily:
                        Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                      textAlign: 'center',
                      left: offset.x,
                      top: offset.y,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  SETTINGS
                </Text>
              ));
            })()}
            {/* White text on top */}
            <Text
              style={[
                typography.h2,
                {
                  color: '#FFFFFF',
                  fontSize: scaleSize(28),
                  fontWeight: 'normal',
                  fontFamily: Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                  textAlign: 'center',
                  includeFontPadding: false,
                  textShadowColor: '#000000',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                },
              ]}
            >
              SETTINGS
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 4,
  },
  backIcon: {
    height: scaleSize(36),
    width: scaleSize(36),
  },
  container: {
    width: '100%',
  },
  headerBackground: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
    zIndex: 10,
  },
  headingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headingWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  spacer: {
    width: scaleSize(36),
  },
});

export default SettingsHeader;
