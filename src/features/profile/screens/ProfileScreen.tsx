/**
 * ProfileScreen - TypeScript Implementation
 * Complete profile screen implementation with same UI as old JavaScript version
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  StyleSheet,
  Keyboard,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// Descope auth
import { useDescope, useSession } from '@descope/react-native-sdk';
// Redux actions
import { logoutUser } from '../../../store/authSlice';
import { authService } from '../../../services/authService';
import { apiClient } from '../../../services/api/apiclient';
import { apiService } from '../../../services/apiService';
// Profile Redux
import {
  fetchProfileSummary,
  updateProfileExtended,
  clearError,
  fetchOwnedAvatars,
  type ProfileData,
  type ProfileUpdatePayload,
} from '../../../store/profileSlice';
import type { RootState } from '../../../store/store';
import { showGlobalLoader, hideGlobalLoader } from '../../../store/slices/appSlice';

// Import components
import ProfileHeader from '../../../components/profile/ProfileHeader';
import ProfilePicture from '../../../components/profile/ProfilePicture';
import ProfileInfo from '../../../components/profile/ProfileInfo';
import AccountInfo from '../../../components/profile/AccountInfo';
import PersonalDetails from '../../../components/profile/PersonalDetails';
import { scaleSize } from '../../../utils/scaleSize';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import {
  usePlatformOptimization,
  useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import useIsMounted from '../../../hooks/useIsMounted';
import { logger } from '../../../lib/utils/logger';
import { useProfileData } from '../../../hooks/profile/useProfileData';
import ProfileModals from '../../../components/profile/ProfileModals';
import GlobalLoader from '../../../components/GlobalLoader';
import { isLottieFile } from '../../../utils/safeValues';

// No hardcoded data - all data comes from API

// Types
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
  account_id?: string | number;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Types

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  // Platform-specific optimizations
  const scrollViewRef = useRef<ScrollView>(null);
  usePlatformOptimization();

  // State for modals
  const [showAvatarsModal, setShowAvatarsModal] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  // State for editing
  const [isEditing, setIsEditing] = useState(false);

  // Handlers
  const handleCopyAccountNumber = useCallback(async () => {
    if (profileData?.account_number) {
      // Logic handled in component, this is a placeholder if needed
    }
  }, [profileData?.account_number]);

  // CRITICAL: Safe back button handler
  const handleBackPress = useCallback((): boolean => {
    try {
      if (showAvatarsModal) { setShowAvatarsModal(false); return true; }
      if (showProfilePictureModal) { setShowProfilePictureModal(false); return true; }
      if (showPasswordModal) { setShowPasswordModal(false); return true; }
      if (showLogoutModal) { setShowLogoutModal(false); return true; }
      if (showCalendar) { setShowCalendar(false); return true; }
      if (showCountryPicker) { setShowCountryPicker(false); return true; }

      if (isEditing) {
        setIsEditing(false);
        return true;
      }

      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, [
    navigation,
    showAvatarsModal,
    showProfilePictureModal,
    showPasswordModal,
    showLogoutModal,
    showCalendar,
    showCountryPicker,
    isEditing,
  ]);

  // Android back button handler
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
      }
    }, [handleBackPress])
  );

  useAndroidBackButton(handleBackPress);

  // Descope and Responsive hooks
  const descope = useDescope();
  const { session, clearSession } = useSession();
  const {
    scaleFont,
    scaleWidth,
    scaleHeight,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
  } = useStandardResponsive();

  // Redux state
  const { profileData, avatars, isLoading, isUpdating, error, clearError, refetch } = useProfileData();
  const authState = useSelector((state: RootState) => state.auth, shallowEqual);

  // Debug: Log avatars data (only once when data changes)
  useEffect(() => {
    if (avatars && avatars.length > 0) {
      // Only log summary, not every avatar
      logger.debug(`Avatars loaded: ${avatars.length} avatars`, 'PROFILE');
    }
  }, [avatars?.length]); // Only depend on length to prevent excessive logging

  // Get avatar URL from profile data
  const avatarUrl = profileData?.avatar?.url || null;
  const isSubscribed = profileData?.avatar?.is_premium || false;
  // Get badge from profile data (from API) - use new badge structure or fallback
  const badgeImageUrl =
    profileData?.badge?.image_url ||
    profileData?.badge_image_url ||
    'https://www.transparentpng.com/thumb/award-ribbon/yellow-award-ribbon-png-0.png';

  // Mount tracking
  const isMounted = useIsMounted();

  // Date formatting helpers
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (e) { return dateString; }
  };

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const [month, day, year] = dateString.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (e) { return dateString; }
  };

  // Map API ProfileData to local Profile format
  const mapProfileDataToLocal = useCallback((
    data: ProfileData | null,
    silent: boolean = false
  ): Profile | null => {
    if (!data) {
      if (!silent) logger.warn('mapProfileDataToLocal: No data provided', 'PROFILE');
      return null;
    }

    const mapped: Profile = {
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fullName: data.full_name || '',
      username: data.username || '',
      accountNumber: data.account_number || '',
      countryCode: data.country_code || '+1',
      mobileNumber: data.mobile || '',
      mobileVerified: data.mobile_verified || false,
      email: data.email || '',
      emailVerified: data.email_verified || false,
      dob: formatDateForDisplay(data.date_of_birth || ''),
      gender: data.gender || '',
      occupation: '',
      income: '',
      password: '********',
      address: {
        street1: '',
        street2: '',
        aptNumber: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
      },
      profilePicture:
        data.profile_pic_type === 'custom' && data.profile_pic_url
          ? data.profile_pic_url
          : data.profile_pic_type === 'avatar' && data.avatar?.url
            ? data.avatar.url
            : data.profile_pic_url || null,
      account_id: data.account_id,
    };

    if (data.address) {
      mapped.address = {
        street1: data.address.street_1 || '',
        street2: data.address.street_2 || '',
        aptNumber: data.address.suite_or_apt_number || '',
        city: data.address.city || '',
        state: data.address.state || '',
        country: data.address.country || '',
        zipCode: data.address.zip || '',
      };
    } else {
      // Fallback for flat address fields if nested address is not present
      mapped.address = {
        street1: (data as any).address1 || '',
        street2: (data as any).address2 || '',
        aptNumber: (data as any).apt_number || '',
        city: (data as any).city || '',
        state: (data as any).state || '',
        country: (data as any).country || '',
        zipCode: (data as any).zip || '',
      };
    }

    return mapped;
  }, []);

  // Initialize profile with defaults
  const defaultProfile: Profile = useMemo(() => ({
    firstName: '',
    lastName: '',
    fullName: '',
    username: '',
    accountNumber: '',
    countryCode: '+1',
    mobileNumber: '',
    mobileVerified: false,
    email: '',
    emailVerified: false,
    address: { street1: '', street2: '', aptNumber: '', city: '', state: '', country: '', zipCode: '' },
    dob: '',
    gender: '',
    occupation: '',
    income: '',
    password: '********',
    profilePicture: null,
    account_id: '',
  }), []);

  // Profile states
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [editedProfile, setEditedProfile] = useState<Profile>(defaultProfile);

  // Monitor error state and show alerts for user mismatches
  useEffect(() => {
    if (error) {
      if (error.includes('mismatch') || error.includes('different user')) {
        showStatus(
          'error',
          'Authentication Mismatch',
          'The profile data does not match your logged-in account. Please log out and log back in to refresh your session.'
        );
        clearError();
      }
    }
  }, [error, clearError]);

  // State for password modal
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Mobile OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [mobileVerificationLoading, setMobileVerificationLoading] = useState(false);
  const [mobileVerificationError, setMobileVerificationError] = useState<string | null>(null);
  const [resendMobileCountdown, setResendMobileCountdown] = useState(0);

  // Dropdown states
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState(false);
  const [showCountryListDropdown, setShowCountryListDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  // State for modals (showCalendar, showPasswordModal already declared above)
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Status Modal states
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const showStatus = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setStatusType(type);
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusVisible(true);
  }, []);

  // Picture Viewer states
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [pictureViewerUrl, setPictureViewerUrl] = useState('');
  const [pictureViewerIsLottie, setPictureViewerIsLottie] = useState(false);

  // Other states
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null); // null = not checked, false = exists, true = doesn't exist
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingProfilePicture, setPendingProfilePicture] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Sync profile from data
  useEffect(() => {
    if (!isMounted()) return;

    const rafId = requestAnimationFrame(() => {
      if (!isMounted()) return;

      if (profileData) {
        const mapped = mapProfileDataToLocal(profileData, true);
        if (mapped && isMounted()) {
          setProfile(mapped);
          if (!isEditing) {
            setEditedProfile(mapped);
          }
        }
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [profileData, isEditing, mapProfileDataToLocal, isMounted]);

  // Debug: Log frame and avatar URLs (after all state declarations)
  useEffect(() => { }, [
    editedProfile?.profilePicture,
    profile?.profilePicture,
    selectedAvatarId,
    isEditing,
  ]);

  // Cleanup email check timeout on unmount
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle input focus to scroll to specific field
  const handleInputFocus = () => {
    // Don't auto-scroll - KeyboardAvoidingView will handle it
    // This prevents the jarring automatic scroll behavior
  };

  // Keyboard visibility handlers
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (isMounted()) {
          setKeyboardVisible(true);
        }
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (isMounted()) {
          setKeyboardVisible(false);
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isMounted]);

  // Close all dropdowns when scrolling (but delay to prevent closing during selection)
  const handleScroll = () => {
    // Use setTimeout to prevent closing dropdown during selection
    setTimeout(() => {
      setShowCountryCodeDropdown(false);
      setShowCountryListDropdown(false);
      setShowGenderDropdown(false);
    }, 100);
  };

  const goBack = () => {
    navigation.goBack();
  };

  // Handlers for edit mode

  const toggleEdit = async () => {
    if (isEditing) {
      try {
        setUploadingImage(true);

        const updatePayload: ProfileUpdatePayload = {
          street_1: editedProfile.address.street1 || '',
          street_2: editedProfile.address.street2 || '',
          suite_or_apt_number: editedProfile.address.aptNumber || '',
          city: editedProfile.address.city || '',
          state: editedProfile.address.state || '',
          zip: editedProfile.address.zipCode || '',
          country: editedProfile.address.country || '',
          gender: editedProfile.gender || '',
        };

        if (editedProfile.fullName) {
          const parts = editedProfile.fullName.trim().split(' ');
          updatePayload.first_name = parts[0] || '';
          updatePayload.last_name = parts.slice(1).join(' ') || '';
        }

        // Mobile update? (Optional, based on requirement)
        if (editedProfile.mobileNumber) {
          (updatePayload as any).mobile = editedProfile.mobileNumber;
          (updatePayload as any).country_code = editedProfile.countryCode || '+1';
        }

        let avatarSelectionResponse: any = null;
        if (selectedAvatarId) {
          avatarSelectionResponse = await apiClient.selectAvatar(selectedAvatarId);
          if (avatarSelectionResponse.status !== 'success') throw new Error('Avatar selection failed');
        }

        if (pendingProfilePicture) {
          const uploadResponse = await apiClient.uploadProfilePicture(pendingProfilePicture);
          if (uploadResponse.status !== 'success') throw new Error('Image upload failed');
        }

        const updateResult = await dispatch(updateProfileExtended(updatePayload) as any);
        if (updateResult.type === 'profile/updateExtended/fulfilled') {
          const fetchResult = await dispatch(fetchProfileSummary({ forceFresh: true }) as any);
          if (fetchResult.type === 'profile/fetchSummary/fulfilled' && isMounted()) {
            showStatus('success', 'Perfect!', 'Profile updated successfully!');
            setProfile(editedProfile);
            setPendingProfilePicture(null);
            setSelectedAvatarId(null);
            if (refetch) refetch().catch(() => { });
          } else {
            throw new Error('Failed to refresh profile');
          }
        } else {
          throw new Error(updateResult.error?.message || 'Update failed');
        }
      } catch (error: any) {
        logger.error('Profile update error', 'PROFILE', error);
        if (isMounted()) {
          showStatus('error', 'Error', error.message || 'Failed to update profile');
        }
      } finally {
        if (isMounted()) setUploadingImage(false);
      }
    } else {
      // Entering edit mode
      if (!editedProfile.fullName || editedProfile.fullName.trim() === '') {
        const username = profileData?.username || profile?.username || '';
        setEditedProfile(prev => ({ ...prev, fullName: username }));
      }
      setIsEditing(true);
      return;
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditedProfile({ ...profile });
    setPendingProfilePicture(null);
    setSelectedAvatarId(null);
    setIsEditing(false);
  };

  const handleChange = (field: keyof Profile, value: any) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const handleProfilePictureChange = async (imageUri: string) => {
    setPendingProfilePicture(imageUri);
    setEditedProfile(prev => ({ ...prev, profilePicture: imageUri }));
    setSelectedAvatarId(null);
  };

  const handleRemoveProfilePicture = () => {
    setEditedProfile(prev => ({ ...prev, profilePicture: null }));
  };

  const handleChooseAvatars = () => {
    if (!isMounted()) return;
    setShowProfilePictureModal(false);
    if (!avatars || avatars.length === 0) {
      dispatch(fetchOwnedAvatars() as any).catch(() => { });
    }
    setTimeout(() => {
      if (isMounted()) setShowAvatarsModal(true);
    }, 300);
  };

  const sendMobileOtp = () => {
    setOtpSent(true);
    showStatus('success', 'OTP Sent', `OTP sent to ${editedProfile.mobileNumber}`);
  };

  const verifyMobileOtp = () => {
    if (otp === '123456') {
      setEditedProfile(prev => ({ ...prev, mobileVerified: true }));
      setOtpSent(false);
      setOtp('');
      showStatus('success', 'Success', 'Verified!');
    } else {
      showStatus('error', 'Error', 'Invalid OTP');
    }
  };

  const checkEmailAvailability = async (emailToCheck: string): Promise<boolean | null> => {
    try {
      setEmailChecking(true);
      const resp = await apiService.checkEmailAvailability(emailToCheck);
      const available = resp.success ? resp.data?.available ?? null : null;
      if (isMounted()) setEmailAvailable(available);
      return available;
    } catch (e) {
      return null;
    } finally {
      if (isMounted()) setEmailChecking(false);
    }
  };

  // Email verification logic removed as per user request

  useEffect(() => {
    Keyboard.dismiss();
  }, [isEditing]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendMobileCountdown > 0) {
      const timer = setTimeout(() => {
        if (isMounted()) {
          setResendMobileCountdown(resendMobileCountdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendMobileCountdown, isMounted]);

  const updatePassword = () => {
    // Validate password
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showStatus('error', 'Error', 'New passwords do not match');
      return;
    }

    if (passwordData.currentPassword !== 'password123') {
      showStatus('error', 'Error', 'Current password is incorrect');
      return;
    }

    // Simulate password update
    showStatus('success', 'Perfect!', 'Password updated successfully!');
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const selectCountryCode = (code: string) => {
    setEditedProfile(prev => ({
      ...prev,
      countryCode: code,
    }));
    setShowCountryCodeDropdown(false);
  };

  const selectCountry = (country: string) => {
    handleAddressChange('country', country);
    setShowCountryPicker(false);
  };

  const selectGender = (gender: string) => {
    // Update gender value
    handleChange('gender', gender);
    // Close dropdown after a small delay to ensure selection is visible
    setTimeout(() => {
      setShowGenderDropdown(false);
    }, 150);
  };

  const selectDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return;
    // Date from DatePicker is already YYYY-MM-DD
    // If it's already in that format, we will convert it to display format for profile display
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    const formattedDisplay = `${month}/${day}/${year}`;
    handleChange('dob', formattedDisplay);
  };

  const handleLogout = () => {
    if (!isMounted()) return;
    // Show custom confirmation modal instead of Alert
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    if (!isMounted()) return;
    setShowLogoutModal(false);
    await performLogout();
  };

  const cancelLogout = () => {
    if (!isMounted()) return;
    setShowLogoutModal(false);
  };

  // Separate logout function to avoid Alert issues
  const performLogout = async () => {
    dispatch(showGlobalLoader({ message: '', operation: 'logout' }));
    try {
      // Clear Descope session first
      if (session?.refreshJwt) {
        try {
          await descope.logout(session.refreshJwt);
        } catch (e) {
          logger.warn('Descope logout failed', 'PROFILE', e);
        }
      }

      // Clear Descope session locally
      try {
        await clearSession();
      } catch (e) {
        logger.warn('Clear session failed', 'PROFILE', e);
      }

      // Use Redux logout action for proper state management (clears all Redux data including profile)
      await dispatch(logoutUser() as any).unwrap();

      // Use authService for complete logout (clears all data)
      await authService.logout();

      // Force reset to ensure complete cleanup
      await authService.forceReset();

      // Navigation will be handled automatically by AppNavigator when isAuthenticated becomes false
      // No need to manually navigate - the AppNavigator will re-render and show Welcome screen
    } catch (error) {
      logger.error('Logout error', 'PROFILE', error);
      // Force logout even if there's an error
      try {
        await dispatch(logoutUser() as any).unwrap();
        await authService.logout();
      } catch (fallbackError) {
        logger.error('Fallback logout failed', 'PROFILE', fallbackError);
      }

      // Navigation will be handled automatically by AppNavigator when isAuthenticated becomes false
      // No need to manually navigate - the AppNavigator will re-render and show Welcome screen
    } finally {
      dispatch(hideGlobalLoader('logout'));
    }
  };

  // Close all dropdowns when tapping outside
  const handleOutsidePress = () => {
    if (!isMounted()) return;
    setShowCountryCodeDropdown(false);
    setShowCountryListDropdown(false);
    setShowGenderDropdown(false);
    setShowCountryPicker(false);
  };

  // Avatar selection handler
  const handleAvatarSelection = (avatar: any) => {
    logger.debug(`Avatar selected: ${avatar.name} (${avatar.id})`, 'PROFILE');

    // Only update local state for preview - don't save to backend yet
    setSelectedAvatarId(avatar.id);
    setPendingProfilePicture(null); // Clear pending custom image
    const avatarUrl = avatar.image_url || avatar.url || '';
    setEditedProfile(prev => ({
      ...prev,
      profilePicture: avatarUrl,
    }));

    setShowAvatarsModal(false);
  };

  return (
    <ScreenErrorBoundary screenName="ProfileScreen">
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScreenBackButtonHandler action="navigate" />

        <View
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
          }}
        >
          {(isLoading || isUpdating || uploadingImage) && <GlobalLoader forceShow={true} />}

          {/* Profile Header */}
          <ProfileHeader
            isEditing={isEditing}
            goBack={goBack}
            toggleEdit={toggleEdit}
            cancelEdit={cancelEdit}
            handleLogout={handleLogout}
          />

          {/* Profile Section - Centered on Screen */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: scaleSize(20),
              marginLeft: 0,
              width: '100%',
            }}
          >
            <ProfilePicture
              isEditing={isEditing}
              uploadingImage={uploadingImage}
              profilePicture={
                isEditing
                  ? editedProfile?.profilePicture || profile?.profilePicture || null
                  : profile?.profilePicture || null
              }
              frameUrl={profileData?.frame?.url || ''}
              badgeImageUrl={badgeImageUrl}
              isSubscribed={isSubscribed}
              onPressEdit={() => setShowProfilePictureModal(true)}
              onPressPicture={() => {
                const currentUrl = isEditing
                  ? editedProfile?.profilePicture || profile?.profilePicture || null
                  : profile?.profilePicture || null;
                if (currentUrl) {
                  setPictureViewerUrl(currentUrl);
                  setPictureViewerIsLottie(isLottieFile(currentUrl));
                  setShowPictureViewer(true);
                }
              }}
            />

            <ProfileInfo
              isEditing={isEditing}
              fullName={
                isEditing
                  ? editedProfile?.fullName || profileData?.username || ''
                  : profile?.fullName || profileData?.username || ''
              }
              username={profileData?.username || ''}
              badgeImageUrl={badgeImageUrl}
              subscriptionBadges={profileData?.subscription_badges || []}
              totalGems={profileData?.total_gems ?? 0}
              totalTriviaCoins={profileData?.total_trivia_coins ?? 0}
              level={profileData?.level ?? 0}
              levelProgress={profileData?.level_progress ?? '0/100'}
              onCopyUsername={name => {
                // Silent copy (inline feedback handled in component)
              }}
              onChangeName={(text: string) => {
                handleChange('fullName', text);
                // Update firstName and lastName from fullName
                const nameParts = text.trim().split(' ');
                handleChange('firstName', nameParts[0] || '');
                handleChange('lastName', nameParts.slice(1).join(' ') || '');
              }}
            />
          </View>

          {/* Cancel Button - Top Left (absolute positioned, mirrors Save button) */}
          {isEditing && (
            <View
              style={{
                position: 'absolute',
                left: scaleSize(16),
                top:
                  scaleSize(10) + // Header paddingTop
                  scaleSize(36) + // Header icon height
                  scaleSize(12) + // Header paddingBottom
                  scaleSize(14), // Spacing
                zIndex: 10,
              }}
            >
              <SoundTouchableOpacity
                soundType="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: getHorizontalSpacing(1.5),
                  paddingVertical: getVerticalSpacing(1),
                  borderRadius: scaleSize(20),
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }}
                onPress={cancelEdit}
              >
                <Icon name="close" size={scaleSize(18)} color="#ffffff" />
                <Text
                  style={{
                    fontSize: scaleFont(14),
                    marginLeft: getHorizontalSpacing(0.5),
                    fontWeight: 'bold',
                    color: '#ffffff',
                  }}
                >
                  Cancel
                </Text>
              </SoundTouchableOpacity>
            </View>
          )}

          {/* Edit Button - Right aligned (absolute positioned, outside profile section) */}
          <View
            style={{
              position: 'absolute',
              right: scaleSize(16),
              top:
                scaleSize(10) + // Header paddingTop
                scaleSize(36) + // Header icon height
                scaleSize(12) + // Header paddingBottom
                scaleSize(14), // Spacing
              zIndex: 10,
            }}
          >
            <SoundTouchableOpacity
              soundType="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: getHorizontalSpacing(1.5),
                paddingVertical: getVerticalSpacing(1),
                borderRadius: scaleSize(20),
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.5)',
              }}
              onPress={toggleEdit}
            >
              {isEditing ? (
                <Icon name="check" size={scaleSize(18)} color="#ffffff" />
              ) : (
                <Icon name="pencil" size={scaleSize(18)} color="#ffffff" />
              )}
              <Text
                style={{
                  fontSize: scaleFont(14),
                  marginLeft: getHorizontalSpacing(0.5),
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}
              >
                {isEditing ? 'Save' : 'Edit'}
              </Text>
            </SoundTouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : scaleSize(20)}
          >
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, zIndex: 1 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{
                paddingBottom: keyboardVisible ? scaleSize(150) : scaleSize(40),
              }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              bounces={true}
              decelerationRate="normal"
              overScrollMode="auto"
              scrollEnabled={true}
              pointerEvents="auto"
            >
              <View style={{ padding: scaleSize(16) }}>
                {/* Account Details */}
                <AccountInfo
                  accountNumber={profile?.accountNumber || ''}
                  account_id={profile?.account_id}
                  email={profile?.email || ''}
                  emailVerified={profile?.emailVerified || false}
                  onCopyAccountNumber={handleCopyAccountNumber}
                />

                {/* Personal Details */}
                <PersonalDetails
                  isEditing={isEditing}
                  dob={editedProfile?.dob || ''}
                  gender={editedProfile?.gender || ''}
                  address={
                    editedProfile?.address || {
                      street1: '',
                      street2: '',
                      aptNumber: '',
                      city: '',
                      state: '',
                      country: '',
                      zipCode: '',
                    }
                  }
                  showGenderDropdown={showGenderDropdown}
                  toggleGenderDropdown={() => {
                    setShowGenderDropdown(!showGenderDropdown);
                    setShowCountryCodeDropdown(false);
                    setShowCountryListDropdown(false);
                  }}
                  toggleCountryListDropdown={() => {
                    setShowCountryPicker(true);
                  }}
                  handleDateSelect={() => setShowCalendar(true)}
                  handleGenderSelect={selectGender}
                  handleAddressChange={handleAddressChange}
                  onInputFocus={handleInputFocus}
                />

                {/* Action Buttons (only visible when editing) */}
                {isEditing && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: scaleSize(12),
                      marginVertical: scaleSize(20),
                      paddingHorizontal: scaleSize(24),
                    }}
                  >
                    <SoundTouchableOpacity
                      soundType="button"
                      style={{
                        paddingVertical: scaleSize(10),
                        paddingHorizontal: scaleSize(16),
                        borderRadius: scaleSize(25),
                        backgroundColor: '#6B7280', // Better Gray
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: scaleSize(4) },
                        shadowOpacity: 0.3,
                        shadowRadius: scaleSize(4.65),
                        elevation: 8,
                        flex: 1,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                      }}
                      onPress={cancelEdit}
                    >
                      <Text style={{ color: 'white', fontSize: scaleSize(14), fontWeight: 'bold' }}>
                        Cancel
                      </Text>
                    </SoundTouchableOpacity>

                    <SoundTouchableOpacity
                      soundType="button"
                      style={{
                        paddingVertical: scaleSize(10),
                        paddingHorizontal: scaleSize(16),
                        borderRadius: scaleSize(25),
                        backgroundColor: '#3B82F6', // Solid Blue
                        shadowColor: '#3B82F6',
                        shadowOffset: { width: 0, height: scaleSize(4) },
                        shadowOpacity: 0.4,
                        shadowRadius: scaleSize(4.65),
                        elevation: 8,
                        flex: 1,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                      }}
                      onPress={toggleEdit}
                    >
                      <Text style={{ color: 'white', fontSize: scaleSize(14), fontWeight: 'bold' }}>
                        Save Changes
                      </Text>
                    </SoundTouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Modals */}
          <ProfileModals
            showPasswordModal={showPasswordModal}
            setShowPasswordModal={setShowPasswordModal}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            showPasswordField={showPasswordField}
            setShowPasswordField={setShowPasswordField}
            updatePassword={updatePassword}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            onSelectDate={selectDate}
            initialDate={formatDateForAPI(editedProfile.dob)}
            showCountryPicker={showCountryPicker}
            setShowCountryPicker={setShowCountryPicker}
            onSelectCountry={selectCountry}
            initialCountry={editedProfile.address.country}
            showProfilePictureModal={showProfilePictureModal}
            setShowProfilePictureModal={setShowProfilePictureModal}
            onSelectImage={handleProfilePictureChange}
            onRemoveImage={handleRemoveProfilePicture}
            onChooseAvatars={handleChooseAvatars}
            navigation={navigation}
            showAvatarsModal={showAvatarsModal}
            setShowAvatarsModal={setShowAvatarsModal}
            avatars={
              avatars && avatars.length > 0
                ? avatars.map(a => ({
                  id: a.id || '',
                  name: a.name || '',
                  image_url: (a as any).url || '',
                }))
                : []
            }
            avatarsLoading={isLoading}
            onSelectAvatar={handleAvatarSelection}
            showLogoutModal={showLogoutModal}
            setShowLogoutModal={setShowLogoutModal}
            onConfirmLogout={confirmLogout}
            onCancelLogout={cancelLogout}
            statusVisible={statusVisible}
            setStatusVisible={setStatusVisible}
            statusType={statusType}
            statusTitle={statusTitle}
            statusMessage={statusMessage}
            showPictureViewer={showPictureViewer}
            setShowPictureViewer={setShowPictureViewer}
            pictureViewerUrl={pictureViewerUrl}
            pictureViewerIsLottie={pictureViewerIsLottie}
          />
        </View>
      </SafeScreenWrapper>
    </ScreenErrorBoundary >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    height: 'auto',
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  pressableContainer: {
    padding: scaleSize(16),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: scaleSize(24),
    marginTop: scaleSize(16),
  },
  saveButton: {
    alignSelf: 'center',
    borderRadius: scaleSize(12),
    elevation: 5,
    marginVertical: scaleSize(24),
    paddingHorizontal: scaleSize(24),
    paddingVertical: scaleSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.25,
    shadowRadius: scaleSize(3.84),
  },
  saveButtonText: {
    color: 'white',
    fontSize: scaleSize(16),
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: scaleSize(40),
  },
  scrollView: {
    flex: 1,
  },
});

export default ProfileScreen;
