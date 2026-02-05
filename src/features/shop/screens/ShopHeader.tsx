import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

const ShopHeader: React.FC = () => {
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

  // Ensure strokeWidth is always a valid number
  const strokeWidth = React.useMemo(() => {
    const spacing = getResponsiveSpacing(2);
    return typeof spacing === 'number' && !isNaN(spacing) && isFinite(spacing) ? spacing : 2;
  }, [getResponsiveSpacing]);

  return (
    <View style={styles.container}>
      {/* Shop Heading - Centered */}
      <View style={styles.headingContainer}>
        <View style={styles.headingWrapper}>
          {/* Violet border text - rendered 8 times around the white text */}
          {(() => {
            const fontSize = (() => {
              const size = getResponsiveSpacing(28);
              return typeof size === 'number' && !isNaN(size) && isFinite(size) ? size : 28;
            })();
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
                SHOP
              </Text>
            ));
          })()}
          {/* White text on top */}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(8),
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
});

export default ShopHeader;
