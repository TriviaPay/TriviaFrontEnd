/**
 * ProfilePictureModal - TypeScript Implementation
 * Modal for selecting profile picture from camera, gallery, frames, or avatars
 */

import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { PermissionsAndroid } from 'react-native';
import { logger } from '../../../lib/utils/logger';

interface ProfilePictureModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (imageUri: string) => void;
  onRemoveImage: () => void;
  onChooseAvatars: () => void;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  visible,
  onClose,
  onSelectImage,
  onRemoveImage,
  onChooseAvatars,
}) => {
  if (!visible) return null;

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera Permission',
          message: 'App needs camera permission to take pictures',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        logger.warn('Warning', 'PROFILE', err);
        return false;
      }
    } else {
      return true; // iOS handles permissions differently
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchCamera(options, response => {
      if (response.didCancel) {
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        onSelectImage(response.assets[0].uri || '');
        onClose();
      }
    });
  };

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to select image. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        onSelectImage(response.assets[0].uri || '');
        onClose();
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end',
          zIndex: 9999,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 20,
            zIndex: 10000,
            maxHeight: '80%',
          }}
          onPress={e => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 24,
              textAlign: 'center',
              color: '#1f2937',
            }}
          >
            Profile Picture Options
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 18,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
              backgroundColor: '#fafafa',
              borderRadius: 8,
              marginBottom: 8,
            }}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <Icon name="camera" size={28} color="#7B68EE" />
            <Text style={{ fontSize: 17, marginLeft: 16, color: '#1f2937', fontWeight: '500' }}>
              Take Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 18,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
              backgroundColor: '#fafafa',
              borderRadius: 8,
              marginBottom: 8,
            }}
            onPress={handleSelectImage}
            activeOpacity={0.7}
          >
            <Icon name="image" size={28} color="#7B68EE" />
            <Text style={{ fontSize: 17, marginLeft: 16, color: '#1f2937', fontWeight: '500' }}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 18,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
              backgroundColor: '#fafafa',
              borderRadius: 8,
              marginBottom: 8,
            }}
            onPress={onChooseAvatars}
            activeOpacity={0.7}
          >
            <Icon name="account-circle-outline" size={28} color="#7B68EE" />
            <Text style={{ fontSize: 17, marginLeft: 16, color: '#1f2937', fontWeight: '500' }}>
              Choose Avatars
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
            onPress={() => {
              onRemoveImage();
              onClose();
            }}
          >
            <Icon name="trash-can-outline" size={24} color="#666" />
            <Text style={{ fontSize: 16, marginLeft: 16, color: '#1f2937' }}>
              Remove Current Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 14,
              borderRadius: 8,
              marginTop: 16,
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
            }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#4b5563' }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ProfilePictureModal;
