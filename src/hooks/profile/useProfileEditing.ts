/**
 * useProfileEditing - Hook for profile editing logic
 * Single Responsibility: Handles profile editing state and operations
 */

import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { RootState } from '../../store';
import {
  updateProfileExtended,
  fetchProfileSummary,
  updateProfileLocal,
  type ProfileUpdatePayload,
} from '../../store/profileSlice';
import { apiClient } from '../../services/api/apiclient';
import { store } from '../../store/store';
import { setUser } from '../../store/authSlice';

interface Address {
  street1: string;
  street2: string;
  aptNumber: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface Profile {
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  accountNumber: string;
  countryCode: string;
  mobileNumber: string;
  mobileVerified: boolean;
  email: string;
  emailVerified: boolean;
  address: Address;
  dob: string;
  gender: string;
  occupation: string;
  income: string;
  password: string;
  profilePicture: string | null;
}

interface UseProfileEditingOptions {
  editedProfile: Profile;
  selectedAvatarId: string | null;
  pendingProfilePicture: string | null;
  setSelectedAvatarId: (id: string | null) => void;
  setPendingProfilePicture: (uri: string | null) => void;
  originalEmail: string;
  emailVerified: boolean;
}

export const useProfileEditing = (options: UseProfileEditingOptions) => {
  const {
    editedProfile,
    selectedAvatarId,
    pendingProfilePicture,
    setSelectedAvatarId,
    setPendingProfilePicture,
    originalEmail,
    emailVerified,
  } = options;

  const dispatch = useDispatch();
  const [uploadingImage, setUploadingImage] = useState(false);
  const profile = useSelector((state: RootState) => state.profile.profile);

  const saveProfile = useCallback(async (): Promise<boolean> => {
    try {
      setUploadingImage(true);

      const updatePayload: ProfileUpdatePayload = {
        street_1: editedProfile?.address?.street1 || '',
        street_2: editedProfile?.address?.street2 || '',
        suite_or_apt_number: editedProfile?.address?.aptNumber || '',
        city: editedProfile?.address?.city || '',
        state: editedProfile?.address?.state || '',
        zip: editedProfile?.address?.zipCode || '',
        country: editedProfile?.address?.country || '',
        gender: editedProfile?.gender || '',
      };

      if (editedProfile?.mobileNumber) {
        updatePayload.mobile = editedProfile.mobileNumber;
        updatePayload.country_code = editedProfile.countryCode || '+1';
      }

      if (editedProfile?.firstName || editedProfile?.lastName) {
        updatePayload.first_name = editedProfile.firstName || '';
        updatePayload.last_name = editedProfile.lastName || '';
      }

      // Step 1: Select avatar if changed
      if (selectedAvatarId) {
        try {
          const avatarSelectionResponse = await apiClient.selectAvatar(selectedAvatarId);
          if (avatarSelectionResponse.status !== 'success') {
            throw new Error(avatarSelectionResponse.message || 'Failed to select avatar');
          }
        } catch (error: any) {
          logger.error('❌ [ProfileScreen] Failed to select avatar:', 'PROFILE', error);
          setUploadingImage(false);
          Alert.alert('Error', error.message || 'Failed to select avatar. Please try again.');
          return false;
        }
      }

      // Step 3: Upload profile picture if selected
      if (pendingProfilePicture) {
        try {
          const uploadResponse = await apiClient.uploadProfilePicture(pendingProfilePicture);
          if (uploadResponse.status !== 'success' || !uploadResponse.data) {
            throw new Error(uploadResponse.message || 'Failed to upload profile picture');
          }
        } catch (error: any) {
          logger.error('❌ [ProfileScreen] Failed to upload profile picture:', 'PROFILE', error);
          setUploadingImage(false);
          Alert.alert(
            'Error',
            error.message || 'Failed to upload profile picture. Please try again.'
          );
          return false;
        }
      }

      // Step 4: Update profile details
      if (
        editedProfile?.emailVerified &&
        editedProfile?.email &&
        editedProfile.email !== originalEmail
      ) {
        // Email was verified, include in update
        updatePayload.email = editedProfile.email;
      }

      const updateResult = await dispatch(updateProfileExtended(updatePayload) as any);

      if (updateResult.type === 'profile/updateExtended/fulfilled') {
        const fetchResult = await dispatch(fetchProfileSummary({ forceFresh: true }) as any);

        if (fetchResult.type === 'profile/fetchSummary/fulfilled') {
          const updatedProfile = fetchResult.payload;

          // Verify avatar was updated
          if (selectedAvatarId) {
            const expectedAvatarId = selectedAvatarId;
            const actualAvatarId = updatedProfile?.avatar?.id;

            const expectedIdNormalized = expectedAvatarId?.toLowerCase();
            const actualIdNormalized = actualAvatarId?.toLowerCase();

            if (actualIdNormalized !== expectedIdNormalized) {
              logger.warn('⚠️ [ProfileScreen] Avatar update mismatch:', 'PROFILE', {
                expected: expectedAvatarId,
                actual: actualAvatarId,
              });
            }
          }

          // Sync email with auth state
          if (updatePayload.email) {
            const rootState = store.getState();
            const authState = (rootState as any).auth;

            if (authState?.user && updatedProfile?.email) {
              dispatch(
                setUser({
                  ...authState.user,
                  email: updatedProfile.email,
                })
              );
            }
          }

          Alert.alert('Success', 'Profile updated successfully!');

          // Clear pending states
          setPendingProfilePicture(null);
          setSelectedAvatarId(null);

          setUploadingImage(false);
          return true;
        } else {
          logger.error('❌ [ProfileScreen] Failed to refresh profile after update', 'PROFILE');
          Alert.alert(
            'Update Sent',
            'Profile update was sent, but failed to refresh. Please check your profile.'
          );

          setPendingProfilePicture(null);
          setSelectedAvatarId(null);

          setUploadingImage(false);
          return true; // Still consider it successful
        }
      } else {
        logger.error('❌ [ProfileScreen] Profile update failed:', 'PROFILE', updateResult.error);
        setUploadingImage(false);
        Alert.alert('Error', updateResult.error?.message || 'Failed to update profile');
        return false;
      }
    } catch (error: any) {
      logger.error('Error updating profile:', 'PROFILE', error);
      setUploadingImage(false);
      Alert.alert('Error', error.message || 'Failed to update profile');
      return false;
    }
  }, [
    editedProfile,
    selectedAvatarId,
    pendingProfilePicture,
    setSelectedAvatarId,
    setPendingProfilePicture,
    originalEmail,
    emailVerified,
    dispatch,
  ]);

  return {
    saveProfile,
    uploadingImage,
  };
};
