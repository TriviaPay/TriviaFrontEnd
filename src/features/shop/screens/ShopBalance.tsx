import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useShop } from '../../../hooks/useReduxHooks';
import { useGetUserGemsQuery } from '../../../store/api/shopApi';
import { useTheme } from '../../../hooks/useReduxHooks';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

const ShopBalance: React.FC = () => {
  const shop = useShop(); // Kept for other properties if needed, but gems come from RTK Query
  const theme = useTheme();
  const responsive = useStandardResponsive();

  // Use RTK Query for live gems balance
  const { data: gemsBalance } = useGetUserGemsQuery(undefined, {
    pollingInterval: 30000, // Refresh every 30s
    refetchOnFocus: true,
  });

  // Safely extract values with fallbacks
  // Prefer RTK Query data, fallback to Redux state
  const isDarkMode = theme?.isDarkMode || false;

  // Safely extract functions with fallbacks
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

  // Ensure strokeWidth is always a valid number
  const strokeWidth = React.useMemo(() => {
    const spacing = getResponsiveSpacing(2);
    return typeof spacing === 'number' && !isNaN(spacing) && isFinite(spacing) ? spacing : 2;
  }, [getResponsiveSpacing]);

  // Removed API fetching - ShopScreen handles fetching when screen is focused
  // This component only displays the balance, no API calls needed

  // Use different gradient colors based on theme - more blue for better visibility
  const gradientColors = isDarkMode ? ['#121212', '#1E1E1E'] : ['#1E40AF', '#1E90FF'];

  // Safely extract gems value and ensure it's a number, then convert to string for display
  const gems = typeof gemsBalance === 'number' ? gemsBalance : shop?.userBalance?.gems || 0;
  const gemsDisplay = String(gems || 0).trim();
  // Ensure gemsDisplay is never empty - convert empty string to "0"
  const safeGemsDisplay = gemsDisplay === '' ? '0' : gemsDisplay;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradientContainer}
    >
      <View style={styles.contentRow}>
        {/* SHOP Heading - Centered */}
        <View style={styles.headingContainer}>
          <Text
            style={[
              typography.h2,
              {
                color: '#FFFFFF',
                fontSize: (() => {
                  const size = getResponsiveSpacing(28);
                  return typeof size === 'number' && !isNaN(size) && isFinite(size) ? size : 28;
                })(),
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
            SHOP
          </Text>
        </View>

        {/* Gem Count - Right end - Match HomeScreen Header style */}
        <View style={styles.balanceContent}>
          <ImageBackground
            source={require('../../../../assets/gemBg.png')}
            style={{
              width: scaleSize(105),
              height: scaleSize(40),
              justifyContent: 'center',
              alignItems: 'center',
            }}
            resizeMode="contain"
          >
            <Text
              style={{
                color: '#000000',
                fontSize: scaleSize(14),
                fontWeight: 'bold',
                fontFamily: 'Baloo2',
              }}
            >
              {safeGemsDisplay}
            </Text>
          </ImageBackground>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  balanceContent: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 'auto',
    zIndex: 2,
  },
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
  },
  gemIcon: {
    height: scaleSize(24),
    marginRight: scaleSize(8),
    width: scaleSize(24),
  },
  gemsText: {
    color: 'white',
    fontSize: scaleSize(16),
    fontWeight: 'bold',
  },
  gradientContainer: {
    minHeight: scaleSize(60),
    paddingHorizontal: scaleSize(16),
    paddingTop: scaleSize(10), // Profile standard
    paddingBottom: scaleSize(12), // Profile standard
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  headingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
});

export default ShopBalance;
