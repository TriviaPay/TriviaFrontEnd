/**
 * Message Bubble Component
 * Displays individual chat messages with status indicators and user metadata
 * Ported from legacy TriviaPay design
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../../types/chat.types';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import OptimizedImage from '../OptimizedImage';
import LottieView from 'lottie-react-native';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  isPrivateChat?: boolean;
}

// Helper function to check if URL is a Lottie file
const isLottieFile = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.json') || url.includes('.json?') || url.includes('.json&') || url.includes('lottiefiles.com');
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ message, isOwnMessage, isPrivateChat = true }) => {
    const formattedTime = useMemo(
      () => dayjs(message.created_at).format('HH:mm'),
      [message.created_at]
    );

    const renderStatus = () => {
      if (!isOwnMessage || !isPrivateChat) return null;

      switch (message.status) {
        case 'pending':
          return <Icon name="clock-outline" size={14} color="rgba(255, 255, 255, 0.5)" />;
        case 'sent':
          return <Icon name="check" size={14} color="rgba(255, 255, 255, 0.7)" />;
        case 'delivered':
          return <Icon name="check-all" size={14} color="rgba(255, 255, 255, 0.7)" />;
        case 'read':
          return <Icon name="check-all" size={14} color="#4FC3F7" />;
        default:
          return null;
      }
    };

    const renderMetadata = () => {
      if (isOwnMessage) return null;

      // Profile styling dimensions - scaled down versions of Header
      const CONTAINER_SIZE = 40; // Reduced from Header size 
      const AVATAR_SIZE = 30; // Reduced proportionally

      return (
        <View style={styles.senderInfo}>
          {/* Profile Picture with Frame - Matching Header.tsx style */}
          <View style={[styles.avatarContainer, { width: CONTAINER_SIZE, height: CONTAINER_SIZE }]}>
            {/* Profile PNG Background Frame */}
            <OptimizedImage
              source={require('../../../assets/home/profile.png')}
              style={{
                width: CONTAINER_SIZE,
                height: CONTAINER_SIZE,
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
              }}
              resizeMode="contain"
            />

            {/* Avatar Centered inside Frame */}
            <View style={{
              position: 'absolute',
              top: (CONTAINER_SIZE - AVATAR_SIZE) / 2,
              left: (CONTAINER_SIZE - AVATAR_SIZE) / 2,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              zIndex: 2,
              borderRadius: AVATAR_SIZE / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {message.sender_avatar_url ? (
                isLottieFile(message.sender_avatar_url) ? (
                  <LottieView
                    source={{ uri: message.sender_avatar_url }}
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <OptimizedImage
                    source={{ uri: message.sender_avatar_url }}
                    style={{ width: '100%', height: '100%' }}
                  />
                )
              ) : message.sender_profile_pic ? (
                <OptimizedImage
                  source={{ uri: message.sender_profile_pic }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <View style={[styles.placeholderAvatar, { width: '100%', height: '100%' }]}>
                  <Text style={[styles.placeholderText, { fontSize: AVATAR_SIZE * 0.5 }]}>
                    {message.sender_username?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {message.sender_frame_url && (
              <View style={styles.frameContainer}>
                {isLottieFile(message.sender_frame_url) ? (
                  <LottieView
                    source={{ uri: message.sender_frame_url }}
                    autoPlay
                    loop
                    style={styles.frame}
                  />
                ) : (
                  <OptimizedImage source={{ uri: message.sender_frame_url }} style={styles.frame} />
                )}
              </View>
            )}
          </View>

          <View style={styles.senderNameRow}>
            <Text style={styles.senderName}>{message.sender_username}</Text>

            {/* Level and Star Display removed as it's redundant with profile overlay */}

            {message.sender_badge?.image_url && (
              <OptimizedImage
                source={{ uri: message.sender_badge.image_url }}
                style={styles.badge}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      );
    };

    return (
      <View
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {renderMetadata()}

        <View style={[styles.bubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          {message.reply_to && (
            <View style={[
              styles.replyPreview,
              isOwnMessage ? styles.replyPreviewOwn : styles.replyPreviewOther
            ]}>
              <View style={[
                styles.replyIndicator,
                { backgroundColor: isOwnMessage ? '#10B981' : '#FFFFFF' }
              ]} />
              <View style={styles.replyContent}>
                <Text style={[
                  styles.replySender,
                  { color: isOwnMessage ? '#10B981' : '#FFFFFF' }
                ]}>
                  {message.reply_to.sender}
                </Text>
                <Text style={styles.replyText} numberOfLines={2}>
                  {message.reply_to.message}
                </Text>
              </View>
            </View>
          )}

          {message.image && (
            <OptimizedImage
              source={{ uri: message.image }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.messageContent}>
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.message}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.timestamp}>{formattedTime}</Text>
              {renderStatus()}
            </View>
          </View>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.message === nextProps.message.message &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.image === nextProps.message.image &&
      prevProps.isOwnMessage === nextProps.isOwnMessage
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: '85%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarContainer: {
    marginRight: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#36393F',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  frameContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  frame: {
    width: 40,
    height: 40,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  badge: {
    width: 14,
    height: 14,
  },
  bubble: {
    borderRadius: 16,
    padding: 2,
    overflow: 'hidden',
  },
  ownBubble: {
    backgroundColor: '#9333EA', // Legacy Purple
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#40444B', // Legacy Discord-like grey
    borderTopLeftRadius: 4,
  },
  messageContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'column',
    minWidth: 80,
  },
  messageText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageImage: {
    width: 250,
    height: 200,
    borderRadius: 16,
    marginBottom: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    margin: 4,
    overflow: 'hidden',
    maxHeight: 60,
  },
  replyPreviewOwn: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  replyPreviewOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  replyIndicator: {
    width: 4,
    height: '100%',
  },
  replyContent: {
    padding: 6,
    flex: 1,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default MessageBubble;
