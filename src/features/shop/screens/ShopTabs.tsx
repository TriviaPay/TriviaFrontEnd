import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../hooks/useReduxHooks';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { BREAKPOINTS } from '../../constants/uiConstants';

interface ShopTabsProps {
  activeMainTab: string;
  setActiveMainTab: (tab: string) => void;
  activeShopTab: string;
  setActiveShopTab: (tab: string) => void;
}

const ShopTabs: React.FC<ShopTabsProps> = ({
  activeMainTab,
  setActiveMainTab,
  activeShopTab,
  setActiveShopTab,
}) => {
  const theme = useTheme();
  const {
    width: screenWidth,
    height: screenHeight,
    isSmallDevice,
    scaleSize,
  } = useStandardResponsive();

  // Create responsive styles
  const styles = React.useMemo(
    () => createStyles(screenHeight, isSmallDevice, scaleSize),
    [screenHeight, isSmallDevice, scaleSize]
  );

  // Safely extract isDarkMode with fallback
  const isDarkMode = theme?.isDarkMode || false;
  //different gradient colors based on theme
  const mainTabsGradient = isDarkMode ? ['#1E3A8A', '#2563EB'] : ['#3B82F6', '#2563EB'];
  const subTabsGradient = isDarkMode ? ['#1E40AF', '#1E3A8A'] : ['#2563EB', '#1E3A8A'];

  // Safe handlers to prevent crashes
  const handleMainTabPress = React.useCallback(
    (tab: string) => {
      try {
        if (setActiveMainTab && typeof setActiveMainTab === 'function') {
          setActiveMainTab(tab);
        }
      } catch (error) {}
    },
    [setActiveMainTab]
  );

  const handleShopTabPress = React.useCallback(
    (tab: string) => {
      try {
        if (setActiveShopTab && typeof setActiveShopTab === 'function') {
          setActiveShopTab(tab);
        }
      } catch (error) {}
    },
    [setActiveShopTab]
  );

  return (
    <View>
      {/* Main Tabs with Gradient - Only show if settings tab exists */}
      {activeMainTab !== 'shop' && (
        <LinearGradient colors={mainTabsGradient} style={styles.mainTabsContainer}>
          <SoundTouchableOpacity
            style={[styles.tabButton, activeMainTab === 'shop' && styles.activeTab]}
            onPress={() => handleMainTabPress('shop')}
          >
            <Text style={[styles.tabText, activeMainTab === 'shop' && styles.activeTabText]}>
              SHOP
            </Text>
          </SoundTouchableOpacity>
          <SoundTouchableOpacity
            style={[styles.tabButton, activeMainTab === 'settings' && styles.activeTab]}
            onPress={() => handleMainTabPress('settings')}
          >
            <Text style={[styles.tabText, activeMainTab === 'settings' && styles.activeTabText]}>
              SETTINGS
            </Text>
          </SoundTouchableOpacity>
        </LinearGradient>
      )}

      {/* Sub-tabs for Shop (always show when main tab is shop or when main tabs are hidden) */}
      {activeMainTab === 'shop' && (
        <LinearGradient colors={subTabsGradient} style={styles.subTabsContainer}>
          <SoundTouchableOpacity
            style={[styles.subTabButton, activeShopTab === 'gems' && styles.activeSubTab]}
            onPress={() => handleShopTabPress('gems')}
          >
            <View style={styles.tabTextContainer}>
              <Text
                style={[styles.subTabText, activeShopTab === 'gems' && styles.activeSubTabText]}
              >
                GEMS
              </Text>
              {activeShopTab === 'gems' && <View style={styles.activeBorderLine} />}
            </View>
          </SoundTouchableOpacity>
          <SoundTouchableOpacity
            style={[styles.subTabButton, activeShopTab === 'avatars' && styles.activeSubTab]}
            onPress={() => handleShopTabPress('avatars')}
          >
            <View style={styles.tabTextContainer}>
              <Text
                style={[styles.subTabText, activeShopTab === 'avatars' && styles.activeSubTabText]}
              >
                AVATARS
              </Text>
              {activeShopTab === 'avatars' && <View style={styles.activeBorderLine} />}
            </View>
          </SoundTouchableOpacity>
        </LinearGradient>
      )}
    </View>
  );
};

const createStyles = (
  screenHeight: number,
  isSmallDevice: boolean,
  scaleSize: (size: number) => number
) =>
  StyleSheet.create({
    activeBorderLine: {
      alignSelf: 'stretch',
      backgroundColor: '#FFD700',
      borderRadius: 2,
      bottom: -4,
      height: 3,
      left: 0,
      position: 'absolute',
      right: 0,
    },
    activeSubTab: {
      backgroundColor: '#2563EB',
    },
    activeSubTabText: {
      color: '#FFD700',
      fontSize: isSmallDevice ? scaleSize(13) : scaleSize(15),
      fontWeight: 'bold',
    },
    activeTab: {
      // No background or border, just text styling
    },
    activeTabText: {
      color: '#FFD700',
      fontSize: isSmallDevice ? scaleSize(13) : scaleSize(15),
      fontWeight: 'bold',
    },
    mainTabsContainer: {
      flexDirection: 'row',
    },
    subTabButton: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: screenHeight < 600 ? scaleSize(6) : scaleSize(10),
      position: 'relative',
    },
    subTabText: {
      color: 'white',
      fontSize: isSmallDevice ? scaleSize(11) : scaleSize(13),
      fontWeight: '600',
      textAlign: 'center',
    },
    subTabsContainer: {
      flexDirection: 'row',
    },
    tabButton: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: screenHeight < 600 ? scaleSize(6) : scaleSize(10),
    },
    tabText: {
      color: 'white',
      fontSize: isSmallDevice ? scaleSize(11) : scaleSize(13),
      fontWeight: '600',
      textAlign: 'center',
    },
    tabTextContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
  });

export default ShopTabs;
