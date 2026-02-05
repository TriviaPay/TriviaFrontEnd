/**
 * ProfileFrame - Universal Profile Picture Frame Component
 *
 * UNIVERSAL FIX for ALL Lottie frames from backend.
 * Works for crown-heavy frames, top decorations, uneven ornaments, non-centered masks.
 *
 * Features:
 * - Fixed square wrapper (size x size)
 * - Profile image at 76% of container size with universal upward shift (12% top offset)
 * - Lottie animation overscaled (1.25x) with resizeMode="cover" to fill container
 * - Universal alignment that works for ALL frame designs without JSON analysis
 */

import React from 'react';
import { View, Image, Text, StyleSheet, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import OptimizedImage from './OptimizedImage';
import { store } from '../store/store';
import { fetchProfileSummary } from '../store/profileSlice';
import { safeImageUri } from '../utils/safeValues';
import { logger } from '../lib/utils/logger';

interface ProfileFrameProps {
  size: number; // Container size (square) - if profileSize is provided, this is calculated automatically
  imageUrl: string | null; // Profile picture URL
  frameUrl: string | null; // Lottie frame JSON URL
  initials?: string; // Initials to show if no image (default: 'U')
  backgroundColor?: string; // Background color for empty avatar (default: '#E5E7EB')
  profileSize?: number; // Optional: Profile picture size - if provided, container size is calculated from this
  onPress?: () => void;
}

// Check if URL is a Lottie file (JSON or dotlottie format)
const isLottieFile = (url: string | null): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const cleanUrl = lowerUrl.split('?')[0]; // Remove query params

  // Check for both .json and .lottie (dotlottie) formats
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
};

// Check if URL is a dotlottie file (.lottie format)
const isDotLottieFile = (url: string | null): boolean => {
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
};

const ProfileFrame: React.FC<ProfileFrameProps> = ({
  size,
  imageUrl,
  frameUrl,
  initials = 'U',
  backgroundColor = '#E5E7EB',
  profileSize,
  onPress,
}) => {
  // CRASH PREVENTION: Wrap everything in try-catch to prevent crashes
  try {
    // UNIVERSAL FIX FOR ALL FRAMES
    // If profileSize is provided, calculate container size from profile size
    // Otherwise use size as container size (backward compatibility)
    let safeSize: number;
    let safeProfileSize: number;

    if (profileSize && profileSize > 0) {
      // FIXED: Calculate container size from profile size - ensure ALL frames display same size
      // Use same calculation as ProfilePicture component for consistency
      const FRAME_PADDING_RATIO = 0.15; // 15% padding on each side
      safeProfileSize = profileSize;
      // Calculate container size: profileSize / (1 - padding on both sides)
      // This ensures consistent container size for all frames
      safeSize = profileSize / (1 - FRAME_PADDING_RATIO * 2); // ~1.428x profile size
    } else {
      // Use size as container size (backward compatibility)
      safeSize = size && size > 0 ? size : 100;
      // Inner circle scale: 0.76 (works for all frame designs)
      safeProfileSize = safeSize * 0.76;
    }

    // FIXED: Ensure container size is always square and consistent
    // Round to nearest integer to avoid sub-pixel rendering issues
    safeSize = Math.round(safeSize);
    safeProfileSize = Math.round(safeProfileSize);

    // FIXED: Maintain consistent square container - height same as width

    // FIXED: Calculate frame center properly based on frame width and height
    const safeFrameWidth = safeSize; // Frame width matches container
    const safeFrameHeight = safeSize; // Frame height matches container (square)
    const frameCenterX = safeFrameWidth / 2; // Center X coordinate of frame
    const frameCenterY = safeFrameHeight / 2; // Center Y coordinate of frame

    // FIXED: Calculate profile center properly based on profile width and height
    const profileCenterX = safeProfileSize / 2; // Center X coordinate of profile
    const profileCenterY = safeProfileSize / 2; // Center Y coordinate of profile

    // FIXED: Position profile so its center aligns with frame center
    // Calculate offset: frame center - profile center
    const safeProfileLeft = frameCenterX - profileCenterX; // Center horizontally
    const safeProfileTop = frameCenterY - profileCenterY; // Center vertically

    // FIXED: Lottie frame size - use EXACT container size to ensure all frames display same size
    // Don't overscale - use container size exactly to match profile width/height
    const safeFrameSize = safeSize; // Use exact container size - ensures all frames same size

    // Frame offset: center the frame (no offset needed since frame matches container size)
    // Frame is positioned at (0, 0) to fill the container
    const safeFrameOffset = 0; // No offset needed - frame matches container size exactly

    // Sanitize image and frame URLs using safe utilities
    const sanitizedImageUrl = safeImageUri(imageUrl);
    const sanitizedFrameUrl = safeImageUri(frameUrl);

    // If both image and frame are invalid, return null
    if (!sanitizedImageUrl && !sanitizedFrameUrl) {
      return null;
    }

    // ALWAYS show an image - use fallback if imageUrl is null/empty
    // Extract initials from imageUrl if it's a name-based URL, otherwise use provided initials
    const getInitials = (): string => {
      if (sanitizedImageUrl) {
        // Try to extract name from URL (e.g., ui-avatars.com API)
        const nameMatch = sanitizedImageUrl.match(/name=([^&]+)/);
        if (nameMatch) {
          const name = decodeURIComponent(nameMatch[1]);
          const parts = name.split(' ');
          if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
          }
          return name[0].toUpperCase();
        }
      }
      // Ensure initials is always a string
      return typeof initials === 'string' ? initials : String(initials || 'U');
    };

    // Generate fallback avatar URL if imageUrl is missing
    // Ensure we always have a valid URL string
    const fallbackImageUrl =
      sanitizedImageUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitials())}&background=random&color=fff&size=${safeSize}`;

    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.container,
          {
            width: safeSize,
            height: safeSize, // FIXED: Maintain consistent height same as width
            overflow: 'visible', // Changed to visible to ensure frame displays around profile
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        {/* Profile Image/Avatar - Universal alignment for ALL frames */}
        {/* ALWAYS show an image - use fallback if imageUrl is null/empty */}
        {fallbackImageUrl && isLottieFile(fallbackImageUrl) ? (
          /* Lottie Avatar */
          <View
            style={[
              styles.profileImage,
              {
                width: safeProfileSize,
                height: safeProfileSize,
                borderRadius: safeProfileSize / 2,
                // UNIVERSAL FIX FOR ALL FRAMES
                top: safeProfileTop,
                left: safeProfileLeft,
                overflow: 'hidden',
              },
            ]}
          >
            <LottieView
              key={`avatar-${fallbackImageUrl.substring(fallbackImageUrl.length - 20)}-${isDotLottieFile(fallbackImageUrl) ? 'dotlottie' : 'json'}`}
              source={{ uri: fallbackImageUrl }}
              autoPlay
              loop
              renderMode="SOFTWARE"
              cacheStrategy="strong"
              style={{
                width: safeProfileSize,
                height: safeProfileSize,
                borderRadius: safeProfileSize / 2,
              }}
              onLayout={() => {
                // Force play when layout is ready - ensures rendering for dotlottie
                try {
                  // This will be handled by LottieView automatically
                } catch (e) {
                  // Silent fail
                }
              }}
              onAnimationFailure={error => {
                logger.warn('⚠️ ProfileFrame: Lottie avatar animation failed:', 'PROFILE', error);
              }}
            />
          </View>
        ) : fallbackImageUrl ? (
          /* Regular Image - Use OptimizedImage for better performance */
          /* ALWAYS show image - fallback URL ensures something is displayed */
          <View
            style={[
              styles.profileImage,
              {
                width: safeProfileSize,
                height: safeProfileSize,
                borderRadius: safeProfileSize / 2,
                // UNIVERSAL FIX FOR ALL FRAMES
                top: safeProfileTop,
                left: safeProfileLeft,
                overflow: 'hidden',
              },
            ]}
          >
            <OptimizedImage
              source={{ uri: fallbackImageUrl }}
              style={{
                width: safeProfileSize,
                height: safeProfileSize,
                borderRadius: safeProfileSize / 2,
              }}
              resizeMode="cover"
              priority="high"
              fallbackSource={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitials())}&background=random&color=fff&size=${size}`,
              }}
            />
          </View>
        ) : (
          /* Fallback: Show initials if no image at all */
          <View
            style={[
              styles.initialsContainer,
              {
                width: safeProfileSize,
                height: safeProfileSize,
                borderRadius: safeProfileSize / 2,
                // UNIVERSAL FIX FOR ALL FRAMES
                top: safeProfileTop,
                left: safeProfileLeft,
                backgroundColor,
              },
            ]}
          >
            <Text
              style={{
                ...styles.initialsText,
                fontSize: safeProfileSize * 0.4,
              }}
            >
              {getInitials()}
            </Text>
          </View>
        )}

        {/* Lottie Frame - Fixed size, display fully without cropping */}
        {sanitizedFrameUrl && isLottieFile(sanitizedFrameUrl) && (
          <LottieView
            key={`frame-${sanitizedFrameUrl.substring(sanitizedFrameUrl.length - 20)}-${isDotLottieFile(sanitizedFrameUrl) ? 'dotlottie' : 'json'}`}
            source={{ uri: sanitizedFrameUrl }}
            autoPlay
            loop
            resizeMode="contain" // FIXED: Use "contain" to display Lottie fully without cropping
            renderMode="SOFTWARE"
            cacheStrategy="strong"
            style={[
              styles.frame,
              {
                width: safeFrameSize,
                height: safeFrameSize, // FIXED: Same width and height - ensures all frames same size
                left: safeFrameOffset,
                top: safeFrameOffset,
              },
            ]}
            onLayout={() => {
              // Force play when layout is ready - ensures rendering for dotlottie
              try {
                // This will be handled by LottieView automatically
              } catch (e) {
                // Silent fail
              }
            }}
            onAnimationFailure={async error => {
              const errorMsg = error?.toString() || '';
              const isExpiredUrl =
                errorMsg.includes('403') ||
                errorMsg.includes('InvalidAccessKeyId') ||
                errorMsg.includes('AWS Access Key Id') ||
                errorMsg.includes('Request has expired');

              // If URL expired, try to fetch fresh frame data
              if (isExpiredUrl && sanitizedFrameUrl) {
                try {
                  const result = await store.dispatch(fetchProfileSummary({ forceFresh: true }));
                  if (result.type === 'profile/fetchSummary/fulfilled') {
                    const updatedProfile = result.payload;
                    if (updatedProfile?.frame?.url) {
                      // Frame URL will be updated via Redux state, component will re-render
                      logger.log('✅ [ProfileFrame] Refreshed expired frame URL', 'PROFILE');
                    }
                  }
                } catch (refreshError) {
                  logger.warn(
                    '⚠️ [ProfileFrame] Failed to refresh expired frame URL:',
                    'PROFILE',
                    refreshError
                  );
                }
              } else if (!isExpiredUrl) {
                // Only log non-expired errors (expired URLs are expected and handled above)
                logger.warn('⚠️ ProfileFrame: Lottie animation failed:', 'PROFILE', error);
              }
            }}
          />
        )}

        {/* Static Image Frame Fallback (if frame is not Lottie) */}
        {sanitizedFrameUrl && !isLottieFile(sanitizedFrameUrl) && (
          <Image
            source={{ uri: sanitizedFrameUrl }}
            style={[
              styles.frame,
              {
                width: safeFrameSize,
                height: safeFrameSize, // FIXED: Same width and height - ensures all frames same size
                left: safeFrameOffset,
                top: safeFrameOffset,
              },
            ]}
            resizeMode="contain" // FIXED: Use "contain" to display image fully without cropping
            onError={error => {
              logger.warn('⚠️ ProfileFrame: Frame image load failed:', 'PROFILE', error);
            }}
          />
        )}
      </Pressable>
    );
  } catch (error) {
    // CRASH PREVENTION: Return fallback UI if anything fails
    logger.warn('⚠️ ProfileFrame error:', 'PROFILE', error);
    const fallbackSize = size && size > 0 ? size : 100;
    return (
      <View style={[styles.container, { width: fallbackSize, height: fallbackSize }]}>
        <View
          style={[
            styles.initialsContainer,
            {
              width: fallbackSize * 0.76,
              height: fallbackSize * 0.76,
              borderRadius: (fallbackSize * 0.76) / 2,
              top: fallbackSize * 0.12,
              left: fallbackSize * 0.12,
              backgroundColor,
            },
          ]}
        >
          <Text
            style={{
              ...styles.initialsText,
              fontSize: fallbackSize * 0.76 * 0.4,
            }}
          >
            {initials || 'U'}
          </Text>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    zIndex: 2, // Ensure frame is above profile image
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
  },
  initialsText: {
    color: '#6B7280',
    fontWeight: 'bold',
  },
  profileImage: {
    overflow: 'hidden',
    position: 'absolute',
  },
});

export default ProfileFrame;
