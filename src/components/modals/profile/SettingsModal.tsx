/**
 * SettingsModal - TypeScript Implementation
 * Modal for profile settings and preferences
 */

import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../hooks/useReduxHooks';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl p-5 shadow-lg"
          style={{ backgroundColor: isDarkMode ? colors.cardBackground : 'white' }}
          onPress={e => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between mb-5">
            <Text
              className="text-lg font-bold"
              style={{ color: isDarkMode ? colors.text : '#1f2937' }}
            >
              Settings
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={isDarkMode ? colors.textSecondary : '#666'} />
            </TouchableOpacity>
          </View>

          {/* Dark Mode Toggle */}
          <View
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderColor: isDarkMode ? colors.border : '#f3f4f6' }}
          >
            <View className="flex-row items-center">
              <Icon
                name="theme-light-dark"
                size={24}
                color={isDarkMode ? colors.accent : '#7B68EE'}
              />
              <Text
                className="text-base ml-3"
                style={{ color: isDarkMode ? colors.text : '#1f2937' }}
              >
                Dark Mode
              </Text>
            </View>
            <Switch
              trackColor={{
                false: isDarkMode ? '#555' : '#E0E0E0',
                true: isDarkMode ? colors.accent : '#7B68EE',
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDarkMode ? '#555' : '#E0E0E0'}
              onValueChange={onToggleDarkMode}
              value={isDarkMode}
            />
          </View>

          {/* Notifications */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderColor: isDarkMode ? colors.border : '#f3f4f6' }}
          >
            <View className="flex-row items-center">
              <Icon name="bell-outline" size={24} color={isDarkMode ? colors.accent : '#7B68EE'} />
              <Text
                className="text-base ml-3"
                style={{ color: isDarkMode ? colors.text : '#1f2937' }}
              >
                Notifications
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={isDarkMode ? colors.textSecondary : '#666'}
            />
          </TouchableOpacity>

          {/* Privacy */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderColor: isDarkMode ? colors.border : '#f3f4f6' }}
          >
            <View className="flex-row items-center">
              <Icon
                name="shield-outline"
                size={24}
                color={isDarkMode ? colors.accent : '#7B68EE'}
              />
              <Text
                className="text-base ml-3"
                style={{ color: isDarkMode ? colors.text : '#1f2937' }}
              >
                Privacy & Security
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={isDarkMode ? colors.textSecondary : '#666'}
            />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderColor: isDarkMode ? colors.border : '#f3f4f6' }}
          >
            <View className="flex-row items-center">
              <Icon
                name="information-outline"
                size={24}
                color={isDarkMode ? colors.accent : '#7B68EE'}
              />
              <Text
                className="text-base ml-3"
                style={{ color: isDarkMode ? colors.text : '#1f2937' }}
              >
                About
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={isDarkMode ? colors.textSecondary : '#666'}
            />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center">
              <Icon
                name="help-circle-outline"
                size={24}
                color={isDarkMode ? colors.accent : '#7B68EE'}
              />
              <Text
                className="text-base ml-3"
                style={{ color: isDarkMode ? colors.text : '#1f2937' }}
              >
                Help & Support
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={isDarkMode ? colors.textSecondary : '#666'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="py-3.5 rounded-lg mt-4 items-center"
            style={{ backgroundColor: isDarkMode ? '#3D2A72' : '#f3f4f6' }}
            onPress={onClose}
          >
            <Text
              className="text-base font-medium"
              style={{ color: isDarkMode ? colors.text : '#4b5563' }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SettingsModal;
