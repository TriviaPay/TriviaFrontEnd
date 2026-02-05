/**
 * PasswordModal - TypeScript Implementation
 * Modal for changing password with current and new password fields
 */

import React from 'react';
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../hooks/useReduxHooks';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordModalProps {
  visible: boolean;
  onClose: () => void;
  passwordData: PasswordData;
  setPasswordData: (data: PasswordData) => void;
  showPasswordField: boolean;
  setShowPasswordField: (show: boolean) => void;
  updatePassword: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  visible,
  onClose,
  passwordData,
  setPasswordData,
  showPasswordField,
  setShowPasswordField,
  updatePassword,
}) => {
  const { isDarkMode, colors } = useTheme();

  const handleInputChange = (field: keyof PasswordData, value: string) => {
    setPasswordData({
      ...passwordData,
      [field]: value,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={onClose}>
        <Pressable
          className="mx-4 p-5 rounded-xl shadow-lg"
          style={{ backgroundColor: isDarkMode ? colors.cardBackground : 'white' }}
          onPress={e => e.stopPropagation()}
        >
          <Text
            className="text-lg font-bold mb-5 text-center"
            style={{ color: isDarkMode ? colors.text : '#1f2937' }}
          >
            Change Password
          </Text>

          <View className="mb-4">
            <Text
              className="text-base font-medium mb-2"
              style={{ color: isDarkMode ? colors.text : '#1f2937' }}
            >
              Current Password
            </Text>
            <TextInput
              className="border rounded-lg p-3 text-base"
              style={{
                borderColor: isDarkMode ? colors.border : '#e5e7eb',
                backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                color: isDarkMode ? colors.text : '#1f2937',
              }}
              value={passwordData.currentPassword}
              onChangeText={text => handleInputChange('currentPassword', text)}
              placeholder="Enter current password"
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
              secureTextEntry={true}
            />
          </View>

          <View className="mb-4">
            <Text
              className="text-base font-medium mb-2"
              style={{ color: isDarkMode ? colors.text : '#1f2937' }}
            >
              New Password
            </Text>
            <TextInput
              className="border rounded-lg p-3 text-base"
              style={{
                borderColor: isDarkMode ? colors.border : '#e5e7eb',
                backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                color: isDarkMode ? colors.text : '#1f2937',
              }}
              value={passwordData.newPassword}
              onChangeText={text => handleInputChange('newPassword', text)}
              placeholder="Enter new password"
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
              secureTextEntry={true}
            />
          </View>

          <View className="mb-6">
            <Text
              className="text-base font-medium mb-2"
              style={{ color: isDarkMode ? colors.text : '#1f2937' }}
            >
              Confirm New Password
            </Text>
            <TextInput
              className="border rounded-lg p-3 text-base"
              style={{
                borderColor: isDarkMode ? colors.border : '#e5e7eb',
                backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                color: isDarkMode ? colors.text : '#1f2937',
              }}
              value={passwordData.confirmPassword}
              onChangeText={text => handleInputChange('confirmPassword', text)}
              placeholder="Confirm new password"
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
              secureTextEntry={true}
            />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center"
              style={{ backgroundColor: isDarkMode ? '#3D2A72' : '#f3f4f6' }}
              onPress={onClose}
            >
              <Text
                className="text-base font-medium"
                style={{ color: isDarkMode ? colors.text : '#4b5563' }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center"
              style={{ backgroundColor: isDarkMode ? colors.tabActive : '#6366f1' }}
              onPress={updatePassword}
            >
              <Text className="text-base font-medium text-white">Update Password</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PasswordModal;
