/**
 * ProfileNavigationBar - TypeScript Implementation
 * Navigation bar component for profile screen with back button and actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useReduxHooks';

interface ProfileNavigationBarProps {
  title?: string;
  showBackButton?: boolean;
  showSettings?: boolean;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
}

const ProfileNavigationBar: React.FC<ProfileNavigationBarProps> = ({
  title = 'Profile',
  showBackButton = true,
  showSettings = false,
  onBackPress,
  onSettingsPress,
}) => {
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? colors.background : 'white',
          borderBottomColor: isDarkMode ? colors.border : '#f3f4f6',
        },
      ]}
    >
      {/* Left Section */}
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[
              styles.iconButton,
              { backgroundColor: isDarkMode ? colors.cardBackground : '#f3f4f6' },
            ]}
          >
            <Image
              source={require('../../../assets/icons/close.png')}
              style={[styles.icon, { tintColor: isDarkMode ? colors.text : '#1f2937' }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: isDarkMode ? colors.text : '#1f2937' }]}>{title}</Text>
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        {showSettings && (
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={[
              styles.iconButton,
              styles.settingsButton,
              { backgroundColor: isDarkMode ? colors.cardBackground : '#f3f4f6' },
            ]}
          >
            <Image
              source={require('../../../assets/icons/refresh.png')}
              style={[styles.icon, { tintColor: isDarkMode ? colors.text : '#1f2937' }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* Profile Status Indicator */}
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isDarkMode ? colors.accent : '#e0e7ff' },
          ]}
        >
          <Text style={[styles.statusText, { color: isDarkMode ? colors.text : '#7B68EE' }]}>
            Premium
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    height: 20,
    width: 20,
  },
  iconButton: {
    borderRadius: 20,
    marginRight: 12,
    padding: 8,
  },
  leftSection: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  settingsButton: {
    marginRight: 8,
  },
  statusIndicator: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileNavigationBar;
