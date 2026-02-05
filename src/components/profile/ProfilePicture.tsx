/**
 * ProfilePicture - TypeScript Implementation
 * Profile picture component with frame, badge, and edit functionality
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import ProfileFrame from '../ProfileFrame';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';

interface ProfilePictureProps {
  isEditing: boolean;
  uploadingImage: boolean;
  profilePicture: string | null;
  frameUrl: string;
  badgeImageUrl: string;
  isSubscribed: boolean;
  onPressEdit: () => void;
  onPressPicture?: () => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  isEditing,
  uploadingImage,
  profilePicture,
  frameUrl,
  badgeImageUrl,
  isSubscribed,
  onPressEdit,
  onPressPicture,
}) => {
  // Check if URL is a Lottie file (JSON or dotlottie format) - memoized callback
  const isLottieFile = useCallback((url: string | null, mimeType?: string): boolean => {
    if (!url) return false;
    // Check mime_type first (most reliable)
    if (mimeType === 'application/json' || mimeType === 'application/octet-stream') return true;
    // Fallback to URL check - more comprehensive
    const lowerUrl = url.toLowerCase();
    const cleanUrl = lowerUrl.split('?')[0]; // Remove query params
    return (
      cleanUrl.endsWith('.json') ||
      cleanUrl.endsWith('.lottie') ||
      cleanUrl.endsWith('.dotlottie') ||
      lowerUrl.includes('.json?') ||
      lowerUrl.includes('.json&') ||
      lowerUrl.includes('.lottie?') ||
      lowerUrl.includes('.lottie&') ||
      lowerUrl.includes('.dotlottie?') ||
      lowerUrl.includes('.dotlottie&') ||
      lowerUrl.includes('lottie') ||
      lowerUrl.includes('animation') ||
      lowerUrl.includes('lottiefiles.com')
    );
  }, []);

  // Check if URL is a dotlottie file (.lottie format) - memoized callback
  const isDotLottieFile = useCallback((url: string | null, mimeType?: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const cleanUrl = lowerUrl.split('?')[0]; // Remove query params
    return (
      cleanUrl.endsWith('.lottie') ||
      cleanUrl.endsWith('.dotlottie') ||
      lowerUrl.includes('.lottie?') ||
      lowerUrl.includes('.lottie&') ||
      lowerUrl.includes('.dotlottie?') ||
      lowerUrl.includes('.dotlottie&')
    );
  }, []);

  // Get initials from email or username - memoized callback
  const getInitials = useCallback((text: string): string => {
    if (!text) return 'U';
    const name = text.split('@')[0];
    const words = name.split(/[._\s]/);
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, []);

  // Extract username from profile picture URL if it's a placeholder - memoized
  const username = useMemo(
    () =>
      profilePicture?.includes('placeholder')
        ? 'User'
        : profilePicture?.split('/').pop()?.split('.')[0] || 'User',
    [profilePicture]
  );
  const initials = useMemo(() => getInitials(username), [username, getInitials]);

  // FIXED: Calculate frame size dynamically with consistent square dimensions
  // Calculate frame size first (base size or from screen dimensions) - memoized
  const { width: screenWidth } = Dimensions.get('window');
  const BASE_FRAME_SIZE = useMemo(() => Math.min(screenWidth * 0.4, 220), [screenWidth]); // 40% of screen width, max 220px (increased by 10px from 210)

  // FIXED: Use consistent square frame dimensions - height same as width
  const frameSize = useMemo(
    () => (frameUrl ? BASE_FRAME_SIZE : 120 + 30),
    [frameUrl, BASE_FRAME_SIZE]
  );
  const frameWidth = frameSize;
  const frameHeight = frameSize; // Always same as width for consistent height

  // Calculate profile size relative to frame size - memoized
  // Profile should be smaller than frame to allow frame to wrap around
  const FRAME_PADDING_RATIO = 0.15; // 15% padding on each side
  const calculatedProfileSize = useMemo(
    () => frameSize * (1 - FRAME_PADDING_RATIO * 2),
    [frameSize]
  );

  // FIXED: Maintain square aspect ratio for profile - height same as width
  const profileSize = useMemo(() => Math.max(calculatedProfileSize, 40), [calculatedProfileSize]); // Minimum 40px
  const profileWidth = profileSize;
  const profileHeight = profileSize; // Always same as width for consistent height

  // Use calculated sizes - memoized
  const PROFILE_SIZE = useMemo(() => profileSize, [profileSize]);
  const FRAME_SIZE = useMemo(() => frameSize, [frameSize]); // Square frame - height same as width
  const CONTAINER_SIZE = FRAME_SIZE;
  const FRAME_PADDING = useMemo(() => (FRAME_SIZE - PROFILE_SIZE) / 2, [FRAME_SIZE, PROFILE_SIZE]);

  // Calculate frame center coordinates (both width and height centers) - memoized
  // For square frames, center X and Y are the same
  const FRAME_CENTER_X = useMemo(() => FRAME_SIZE / 2, [FRAME_SIZE]); // Width center
  const FRAME_CENTER_Y = useMemo(() => FRAME_SIZE / 2, [FRAME_SIZE]); // Height center (same as width center for square)

  // Calculate other sizes relative to profile - memoized
  const BORDER_WIDTH = useMemo(() => Math.max(2, PROFILE_SIZE * 0.02), [PROFILE_SIZE]); // 2% of profile size, minimum 2px
  const BADGE_SIZE = useMemo(() => PROFILE_SIZE * 0.25, [PROFILE_SIZE]); // Badge is 25% of profile size
  const BADGE_OFFSET = useMemo(() => -PROFILE_SIZE * 0.05, [PROFILE_SIZE]); // Badge position offset (5% of profile size)
  const MARGIN_BOTTOM = useMemo(() => 4, []); // FIXED: Exact 4px gap between profile frame and username/hello greeting
  const CAMERA_BUTTON_SIZE = useMemo(() => PROFILE_SIZE * 0.29, [PROFILE_SIZE]); // Camera button size (29% of profile)
  const CAMERA_ICON_SIZE = useMemo(() => PROFILE_SIZE * 0.15, [PROFILE_SIZE]); // Camera icon size (15% of profile)

  const isBadgeLottie = useMemo(
    () => (badgeImageUrl ? isLottieFile(badgeImageUrl) : false),
    [badgeImageUrl, isLottieFile]
  );

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: MARGIN_BOTTOM,
        marginTop: -16, // Move frame up by 16px (10px + 6px more)
      }}
    >
      <View
        style={{
          position: 'relative',
          width: CONTAINER_SIZE,
          height: CONTAINER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Profile with Lottie Frame - Using universal ProfileFrame component */}
        {uploadingImage ? (
          <View
            style={{
              width: PROFILE_SIZE,
              height: PROFILE_SIZE,
              borderRadius: PROFILE_SIZE / 2,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderWidth: BORDER_WIDTH,
              borderColor: '#e5e7eb',
            }}
          >
            <LottieView
              source={require('../../../assets/signup/DogParachute.json')}
              autoPlay
              loop
              style={{ width: PROFILE_SIZE * 0.8, height: PROFILE_SIZE * 0.8 }}
            />
          </View>
        ) : (
          <ProfileFrame
            size={CONTAINER_SIZE} // Will be recalculated if profileSize prop is provided
            imageUrl={profilePicture}
            frameUrl={frameUrl}
            initials={initials}
            backgroundColor="#f3f4f6"
            profileSize={PROFILE_SIZE} // Pass profile size - ProfileFrame calculates frame size from this for consistent sizing
            onPress={isEditing ? undefined : onPressPicture}
          />
        )}

        {/* Badge (if subscribed) - positioned at the top-right corner */}
        {isSubscribed && badgeImageUrl && (
          <View
            style={{
              position: 'absolute',
              top: CONTAINER_SIZE * 0.11 + BADGE_OFFSET, // ProfileFrame uses 11% offset, match it
              right: CONTAINER_SIZE * 0.11 + BADGE_OFFSET, // ProfileFrame uses 11% offset, match it
              zIndex: 10,
            }}
          >
            {isBadgeLottie ? (
              <LottieView
                source={{ uri: badgeImageUrl }}
                autoPlay
                loop
                renderMode="SOFTWARE"
                style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
                resizeMode="contain"
                onAnimationFailure={error => { }}
              />
            ) : (
              <Image
                source={{ uri: badgeImageUrl }}
                style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
                resizeMode="contain"
                onError={error => { }}
              />
            )}
          </View>
        )}

        {/* Camera button */}
        {isEditing && (
          <SoundTouchableOpacity
            style={{
              position: 'absolute',
              bottom: CONTAINER_SIZE * 0.11, // ProfileFrame uses 11% offset, match it
              right: CONTAINER_SIZE * 0.11, // ProfileFrame uses 11% offset, match it
              width: CAMERA_BUTTON_SIZE,
              height: CAMERA_BUTTON_SIZE,
              borderRadius: CAMERA_BUTTON_SIZE / 2,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#6366f1',
              zIndex: 10,
            }}
            onPress={onPressEdit}
          >
            <Icon name="camera" size={CAMERA_ICON_SIZE} color="white" />
          </SoundTouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default memo(ProfilePicture, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.uploadingImage === nextProps.uploadingImage &&
    prevProps.profilePicture === nextProps.profilePicture &&
    prevProps.frameUrl === nextProps.frameUrl &&
    prevProps.badgeImageUrl === nextProps.badgeImageUrl &&
    prevProps.isSubscribed === nextProps.isSubscribed
  );
});
