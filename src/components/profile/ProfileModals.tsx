/**
 * ProfileModals Component
 * Manages all modals for ProfileScreen
 * Single Responsibility: Modal rendering and state management
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scaleSize } from '../../utils/scaleSize';
import PasswordModal from '../modals/profile/PasswordModal';
import DatePicker from '../../core/components/DatePicker';
import CountryPicker from '../../core/components/CountryPicker';
import ProfilePictureModal from '../modals/profile/ProfilePictureModal';
import AvatarsModal from '../modals/profile/AvatarsModal';
import StatusModal from './StatusModal';
import ProfilePictureViewer from './ProfilePictureViewer';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileModalsProps {
  // Password Modal
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  passwordData: PasswordData;
  setPasswordData: (data: PasswordData) => void;
  showPasswordField: boolean;
  setShowPasswordField: (show: boolean) => void;
  updatePassword: () => void;

  // Date Picker Modal
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
  onSelectDate: (date: string) => void;
  initialDate: string;

  // Country Picker Modal
  showCountryPicker: boolean;
  setShowCountryPicker: (show: boolean) => void;
  onSelectCountry: (country: string) => void;
  initialCountry: string;

  // Profile Picture Modal
  showProfilePictureModal: boolean;
  setShowProfilePictureModal: (show: boolean) => void;
  onSelectImage: (uri: string) => void;
  onRemoveImage: () => void;
  onChooseAvatars: () => void;
  navigation: any;

  // Avatars Modal
  showAvatarsModal: boolean;
  setShowAvatarsModal: (show: boolean) => void;
  avatars: Array<{ id: string; name: string; image_url: string }>;
  avatarsLoading: boolean;
  onSelectAvatar: (avatar: any) => void;

  // Logout Modal
  showLogoutModal: boolean;
  setShowLogoutModal: (show: boolean) => void;
  onConfirmLogout: () => void;
  onCancelLogout: () => void;

  // Status Modal
  statusVisible: boolean;
  setStatusVisible: (visible: boolean) => void;
  statusType: 'success' | 'error';
  statusTitle: string;
  statusMessage: string;

  // Picture Viewer
  showPictureViewer: boolean;
  setShowPictureViewer: (visible: boolean) => void;
  pictureViewerUrl: string;
  pictureViewerIsLottie: boolean;
}

const ProfileModals: React.FC<ProfileModalsProps> = ({
  showPasswordModal,
  setShowPasswordModal,
  passwordData,
  setPasswordData,
  showPasswordField,
  setShowPasswordField,
  updatePassword,
  showCalendar,
  setShowCalendar,
  onSelectDate,
  initialDate,
  showCountryPicker,
  setShowCountryPicker,
  onSelectCountry,
  initialCountry,
  showProfilePictureModal,
  setShowProfilePictureModal,
  onSelectImage,
  onRemoveImage,
  onChooseAvatars,
  navigation,
  showAvatarsModal,
  setShowAvatarsModal,
  avatars,
  avatarsLoading,
  onSelectAvatar,
  showLogoutModal,
  setShowLogoutModal: _setShowLogoutModal,
  onConfirmLogout,
  onCancelLogout,
  statusVisible,
  setStatusVisible,
  statusType,
  statusTitle,
  statusMessage,
  showPictureViewer,
  setShowPictureViewer,
  pictureViewerUrl,
  pictureViewerIsLottie,
}) => {
  return (
    <>
      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        showPasswordField={showPasswordField}
        setShowPasswordField={setShowPasswordField}
        updatePassword={updatePassword}
      />

      <DatePicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={onSelectDate}
        selectedDate={initialDate}
      />

      <CountryPicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={onSelectCountry}
        selectedCountry={initialCountry}
      />

      <ProfilePictureModal
        visible={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        onSelectImage={onSelectImage}
        onRemoveImage={onRemoveImage}
        onChooseAvatars={onChooseAvatars}
      />

      <AvatarsModal
        visible={showAvatarsModal}
        onClose={() => setShowAvatarsModal(false)}
        avatars={avatars}
        loading={avatarsLoading}
        navigation={navigation}
        onSelectAvatar={onSelectAvatar}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.logoutModalButtons}>
              <SoundTouchableOpacity
                onPress={onCancelLogout}
                soundType="button"
                style={[styles.logoutButton, styles.logoutButtonCancel]}
              >
                <Text style={styles.logoutButtonTextCancel}>Cancel</Text>
              </SoundTouchableOpacity>
              <SoundTouchableOpacity
                onPress={onConfirmLogout}
                soundType="button"
                style={[styles.logoutButton, styles.logoutButtonConfirm]}
              >
                <Text style={styles.logoutButtonTextConfirm}>Logout</Text>
              </SoundTouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <StatusModal
        visible={statusVisible}
        onClose={() => setStatusVisible(false)}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
      />

      <ProfilePictureViewer
        visible={showPictureViewer}
        onClose={() => setShowPictureViewer(false)}
        imageUrl={pictureViewerUrl}
        isLottie={pictureViewerIsLottie}
      />
    </>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    alignItems: 'center',
    borderRadius: scaleSize(8),
    flex: 1,
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(12),
  },
  logoutButtonCancel: {
    backgroundColor: '#E5E7EB',
  },
  logoutButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  logoutButtonTextCancel: {
    color: '#374151',
    fontSize: scaleSize(16),
    fontWeight: '600',
  },
  logoutButtonTextConfirm: {
    color: 'white',
    fontSize: scaleSize(16),
    fontWeight: '600',
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: scaleSize(12),
    width: '100%',
  },
  logoutModalContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: scaleSize(16),
    maxWidth: scaleSize(400),
    padding: scaleSize(24),
    width: '80%',
  },
  logoutModalMessage: {
    color: '#6B7280',
    fontSize: scaleSize(16),
    marginBottom: scaleSize(24),
    textAlign: 'center',
  },
  logoutModalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  logoutModalTitle: {
    color: '#1F2937',
    fontSize: scaleSize(20),
    fontWeight: 'bold',
    marginBottom: scaleSize(12),
  },
});

export default ProfileModals;
