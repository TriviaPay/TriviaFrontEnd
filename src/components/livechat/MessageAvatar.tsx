import React, { memo } from 'react';
import { View, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { ChatMessage } from './MessageAlignmentService';

interface MessageAvatarProps {
  message: ChatMessage;
  getResponsiveImageSize: (size: number) => number;
  getResponsiveSpacing: (size: number) => number;
}

const isLottieFile = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.json') ||
    url.includes('.json?') ||
    url.includes('.json&') ||
    url.includes('lottiefiles.com')
  );
};

export const MessageAvatar = memo(
  ({ message, getResponsiveImageSize, getResponsiveSpacing }: MessageAvatarProps) => {
    return (
      <View
        style={{
          position: 'relative',
          width: getResponsiveImageSize(32),
          height: getResponsiveImageSize(32),
          marginRight: getResponsiveSpacing(8),
        }}
      >
        {message.frame_url &&
          typeof message.frame_url === 'string' &&
          message.frame_url.trim().length > 0 &&
          message.frame_url !== 'null' &&
          (isLottieFile(message.frame_url) ? (
            <LottieView
              source={{ uri: message.frame_url }}
              autoPlay
              loop
              style={{
                position: 'absolute',
                top: -4,
                left: -4,
                width: getResponsiveImageSize(40),
                height: getResponsiveImageSize(40),
                zIndex: 3,
              }}
              resizeMode="contain"
              onAnimationFailure={() => {}}
            />
          ) : (
            <Image
              source={{ uri: message.frame_url }}
              style={{
                position: 'absolute',
                top: -4,
                left: -4,
                width: getResponsiveImageSize(40),
                height: getResponsiveImageSize(40),
                zIndex: 3,
              }}
              resizeMode="contain"
              onError={() => {}}
            />
          ))}

        {message.avatar_url &&
        typeof message.avatar_url === 'string' &&
        message.avatar_url.trim().length > 0 &&
        message.avatar_url !== 'null' ? (
          isLottieFile(message.avatar_url) ? (
            <LottieView
              source={{ uri: message.avatar_url }}
              autoPlay
              loop
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: getResponsiveImageSize(32),
                height: getResponsiveImageSize(32),
                zIndex: 2,
              }}
              resizeMode="contain"
              onAnimationFailure={() => {}}
            />
          ) : (
            <Image
              source={{ uri: message.avatar_url }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: getResponsiveImageSize(32),
                height: getResponsiveImageSize(32),
                zIndex: 2,
              }}
              resizeMode="contain"
              onError={() => {}}
            />
          )
        ) : (
          /* Profile picture (base layer) - only if profile_pic exists */
          message.profile_pic &&
          typeof message.profile_pic === 'string' &&
          message.profile_pic.trim().length > 0 &&
          message.profile_pic !== 'null' && (
            <Image
              source={{ uri: message.profile_pic }}
              style={{
                width: getResponsiveImageSize(32),
                height: getResponsiveImageSize(32),
                borderRadius: getResponsiveImageSize(16),
                zIndex: 1,
              }}
              resizeMode="cover"
              onError={() => {}}
            />
          )
        )}
      </View>
    );
  }
);
