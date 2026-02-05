/**
 * ProfileLottieFrame - Reusable Component
 * Renders profile picture with optional Lottie frame overlay
 *
 * Scales 512×512 backend Lottie frames proportionally to match any profile size
 * Adds 2px spacing on each side (4px total) for frame border visibility
 */

import React, { useState } from 'react';
import { View, Image, Text, ViewStyle, ImageStyle, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

interface ProfileLottieFrameProps {
  imageUrl: string | null | undefined; // Profile picture URL
  frameLottie?: string | null | undefined; // Lottie JSON URL (512×512 from backend)
  size: number; // Final profile picture size (e.g., 48, 60, 120)
  borderWidth?: number; // Optional border width (default: 0)
  borderColor?: string; // Optional border color
  backgroundColor?: string; // Background color for empty avatar
  initials?: string; // Initials to show if no image
  style?: ViewStyle; // Additional container styles
}

// Check if URL is a Lottie JSON file
const isLottieFile = (url: string | null | undefined, mimeType?: string): boolean => {
  if (!url) return false;
  // Check mime_type first (most reliable)
  if (mimeType === 'application/json') return true;
  // Fallback to URL check
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith('.json') ||
    lowerUrl.includes('.json?') ||
    lowerUrl.includes('.json&') ||
    lowerUrl.includes('lottie') ||
    lowerUrl.includes('animation')
  );
};

const ProfileLottieFrame: React.FC<ProfileLottieFrameProps> = ({
  imageUrl,
  frameLottie,
  size,
  borderWidth = 0,
  borderColor = 'transparent',
  backgroundColor = '#E5E7EB',
  initials = 'U',
  style,
}) => {
  // Removed measured dimensions state - using consistent calculated sizes instead
  // Calculate initial frame size dynamically from screen dimensions
  const { width: screenWidth } = Dimensions.get('window');
  const BASE_FRAME_SIZE = Math.min(screenWidth * 0.4, 210); // 40% of screen width, max 210px (increased by 10px)

  // FIXED: Use consistent square container size - maintain height same for all frames
  // Calculate container size based on frame presence, ensuring square aspect ratio
  const containerSize = frameLottie ? BASE_FRAME_SIZE : size + 30;

  // Frame padding ratio - how much smaller profile is relative to frame
  const FRAME_PADDING_RATIO = 0.15; // 15% padding on each side

  // FIXED: Use consistent square frame dimensions - maintain height same
  const actualFrameWidth = containerSize;
  const actualFrameHeight = containerSize; // Always same as width for consistent height

  // Calculate profile size relative to frame size - maintain square aspect ratio
  let actualProfileWidth: number;
  let actualProfileHeight: number;

  if (frameLottie) {
    // Profile is smaller than frame by the padding ratio
    const calculatedProfileSize = actualFrameWidth * (1 - FRAME_PADDING_RATIO * 2);
    // Maintain square aspect ratio for profile
    actualProfileWidth = Math.max(calculatedProfileSize, 40); // Minimum 40px
    actualProfileHeight = actualProfileWidth; // Always same as width for consistent height
  } else {
    // No frame: use provided size as profile, maintain square aspect ratio
    const profileSize = Math.max(size, 40);
    actualProfileWidth = profileSize;
    actualProfileHeight = profileSize; // Always same as width for consistent height
  }

  // Calculate frame center coordinates dynamically (both width and height centers)
  const frameCenterX = actualFrameWidth / 2; // Width center
  const frameCenterY = actualFrameHeight / 2; // Height center (same as width center for square)

  // Profile offset to center it within frame circle - dynamic alignment
  // Center the profile at the frame's center point (both X and Y)
  const profileOffsetX = frameCenterX - actualProfileWidth / 2; // Center horizontally
  const profileOffsetY = frameCenterY - actualProfileHeight / 2; // Center vertically

  // Log calculations for debugging
  React.useEffect(() => {}, [
    actualFrameWidth,
    actualFrameHeight,
    frameCenterX,
    frameCenterY,
    actualProfileWidth,
    actualProfileHeight,
    containerSize,
    profileOffsetX,
    profileOffsetY,
  ]);

  return (
    <View
      style={[
        {
          position: 'relative',
          width: containerSize,
          height: containerSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {/* Profile Picture - Base Layer (z-index: 1) */}
      <View
        style={{
          position: 'absolute',
          width: actualProfileWidth,
          height: actualProfileHeight,
          borderRadius: Math.min(actualProfileWidth, actualProfileHeight) / 2,
          overflow: 'hidden',
          backgroundColor,
          borderWidth,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          top: profileOffsetY,
          left: profileOffsetX,
        }}
      >
        {imageUrl ? (
          isLottieFile(imageUrl) ? (
            <LottieView
              source={{ uri: imageUrl }}
              autoPlay
              loop
              style={{
                width: actualProfileWidth,
                height: actualProfileHeight,
              }}
              onAnimationFailure={error => {
                logger.warn('⚠️ Lottie profile animation failed:', 'PROFILE', error);
              }}
            />
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: actualProfileWidth,
                height: actualProfileHeight,
              }}
              resizeMode="cover"
              onError={error => {
                logger.warn('⚠️ Profile image load failed:', 'PROFILE', error);
              }}
            />
          )
        ) : (
          <Text
            style={{
              fontSize: Math.min(actualProfileWidth, actualProfileHeight) * 0.4,
              fontWeight: 'bold',
              color: '#6B7280',
            }}
          >
            {initials}
          </Text>
        )}
      </View>

      {/* Lottie Frame Overlay - Wraps around Profile (z-index: 2) */}
      {frameLottie && isLottieFile(frameLottie) && (
        <View
          style={{
            position: 'absolute',
            width: actualFrameWidth,
            height: actualFrameHeight,
            top: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <LottieView
            source={{ uri: frameLottie }}
            autoPlay
            loop
            style={{
              width: actualFrameWidth,
              height: actualFrameHeight,
            }}
            resizeMode="contain" // Scale proportionally, maintain aspect ratio
            onAnimationFailure={error => {
              logger.warn('⚠️ Lottie frame animation failed:', 'PROFILE', error);
            }}
          />
        </View>
      )}

      {/* Static Image Frame Fallback - Wraps around Profile (if frame is not Lottie) */}
      {frameLottie && !isLottieFile(frameLottie) && (
        <View
          style={{
            position: 'absolute',
            width: actualFrameWidth,
            height: actualFrameHeight,
            top: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Image
            source={{ uri: frameLottie }}
            style={{
              width: actualFrameWidth,
              height: actualFrameHeight,
            }}
            resizeMode="contain"
            onError={error => {
              logger.warn('⚠️ Frame image load failed:', 'PROFILE', error);
            }}
          />
        </View>
      )}
    </View>
  );
};

export default ProfileLottieFrame;
