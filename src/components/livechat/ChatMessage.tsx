import React, { memo } from 'react';
import { View, Text, Image } from 'react-native';
import { MessageAlignmentService, ChatMessage as ChatMessageType } from './MessageAlignmentService';
import { logger } from '../../lib/utils/logger';
import { typography } from '../../theme/typography';

interface ChatMessageProps {
  message: ChatMessageType;
  currentUserId: string | null;
  currentUsername: string | null;
  getResponsiveFontSize: (size: number) => number;
  getResponsiveSpacing: (size: number) => number;
  getResponsiveImageSize: (size: number) => number;
  getResponsiveIconSize: (size: number) => number;
}

// Chat Message Component - WhatsApp/Messenger Style - EXACTLY matching provided code
export const ChatMessage = memo(
  ({
    message,
    currentUserId,
    currentUsername,
    getResponsiveFontSize,
    getResponsiveSpacing,
    getResponsiveImageSize,
    getResponsiveImageSize,
    getResponsiveIconSize,
  }: ChatMessageProps) => {
    // Compare user_id with string conversion to handle both string and number types
    // Also check username as fallback, and check if this is an optimistic message (those are always own messages)
    const isOwnMessage =
      message.isOptimistic ||
      (currentUserId &&
        message.user_id &&
        message.user_id !== '' &&
        (message.user_id === currentUserId ||
          String(message.user_id) === String(currentUserId) ||
          // Also check if user_id contains currentUserId (in case of format differences)
          String(message.user_id).includes(String(currentUserId)) ||
          String(currentUserId).includes(String(message.user_id)))) ||
      (currentUsername &&
        message.username &&
        message.username !== '' &&
        message.username.toLowerCase() === currentUsername.toLowerCase());

    // Messaging app style layout - EXACTLY like provided code
    return (
      <View
        style={{
          flexDirection: 'column',
          marginBottom: getResponsiveSpacing(8),
          paddingHorizontal: getResponsiveSpacing(12),
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Username and badges - outside bubble, only for other users - ALIGNED with bubble */}
        {!isOwnMessage && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: getResponsiveSpacing(4),
              flexWrap: 'wrap',
              paddingLeft: 0, // No padding - align with bubble start (avatar handles spacing)
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  typography.h6,
                  {
                    color: message.isHost ? '#F59E0B' : '#9CA3AF', // Gray color for username at left
                    fontSize: getResponsiveFontSize(12),
                    fontWeight: '600',
                    marginLeft: getResponsiveSpacing(40), // Align with bubble start (avatar width + margin)
                    marginRight: getResponsiveSpacing(4),
                  },
                ]}
              >
                {typeof message.username === 'string' ? message.username : 'Anonymous'}
              </Text>
              {/* Level Display */}
              {message.level !== undefined && message.level !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: getResponsiveSpacing(4) }}>
                  <Image
                    source={require('../../../assets/home/star.png')}
                    style={{ width: getResponsiveImageSize(12), height: getResponsiveImageSize(12), marginRight: 2 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: '#FFD700', fontSize: getResponsiveFontSize(10), fontWeight: 'bold' }}>
                    {message.level}
                  </Text>
                </View>
              )}
            </View>

            {/* Badge Image */}
            {message.badge?.image_url &&
              typeof message.badge.image_url === 'string' &&
              message.badge.image_url.trim().length > 0 &&
              message.badge.image_url !== 'null' && (
                <Image
                  source={{ uri: message.badge.image_url }}
                  style={{
                    width: getResponsiveImageSize(14),
                    height: getResponsiveImageSize(14),
                    marginRight: getResponsiveSpacing(4),
                  }}
                  resizeMode="contain"
                  onError={() => {
                    // Silent fail - badge failed to load
                  }}
                />
              )}

            {/* Host Tag */}
            {message.isHost && (
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 3,
                  paddingHorizontal: getResponsiveSpacing(4),
                  paddingVertical: getResponsiveSpacing(1),
                  marginRight: getResponsiveSpacing(4),
                }}
              >
                <Text
                  style={[
                    typography.buttonSmall,
                    {
                      color: 'black',
                      fontSize: getResponsiveFontSize(8),
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  HOST
                </Text>
              </View>
            )}

            {/* Winner Tag */}
            {message.isWinner && (
              <View
                style={{
                  backgroundColor:
                    message.winnerPosition === 1
                      ? '#FFD700'
                      : message.winnerPosition === 2
                        ? '#C0C0C0'
                        : '#CD7F32',
                  borderRadius: 4,
                  paddingHorizontal: getResponsiveSpacing(4),
                  paddingVertical: getResponsiveSpacing(1),
                  marginLeft: getResponsiveSpacing(4),
                }}
              >
                <Text
                  style={[
                    typography.buttonSmall,
                    {
                      color: 'black',
                      fontSize: getResponsiveFontSize(8),
                    },
                  ]}
                >
                  WINNER
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Message row with avatar and bubble */}
        <View
          style={{
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            maxWidth: '85%',
          }}
        >
          {/* Avatar - only show for other users' messages */}
          {!isOwnMessage && (
            <View style={{ marginRight: getResponsiveSpacing(8) }}>
              {/* Profile styling dimensions - scaled down versions of Header */}
              <View style={{ width: getResponsiveImageSize(32), height: getResponsiveImageSize(32), position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                {/* Frame */}
                <Image
                  source={require('../../../assets/home/profile.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                  }}
                  resizeMode="contain"
                />
                {/* Inner Avatar */}
                <View style={{
                  width: '75%',
                  height: '75%',
                  borderRadius: 999,
                  overflow: 'hidden',
                  zIndex: 2,
                }}>
                  <Image
                    source={{
                      uri:
                        message.avatar &&
                          typeof message.avatar === 'string' &&
                          message.avatar.trim().length > 0 &&
                          message.avatar !== 'null'
                          ? message.avatar
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(message.username || 'User')}&size=128`,
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Message Bubble - Different colors for own vs others */}
          <View
            style={{
              backgroundColor: isOwnMessage ? '#A855F7' : '#6B21A8', // Bright purple/neon for own messages, dark purple for others
              borderRadius: 16,
              borderTopRightRadius: isOwnMessage ? 4 : 16,
              borderTopLeftRadius: isOwnMessage ? 16 : 4,
              paddingHorizontal: getResponsiveSpacing(12),
              paddingVertical: getResponsiveSpacing(8),
              shadowColor: isOwnMessage ? '#A855F7' : '#6B21A8',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isOwnMessage ? 0.4 : 0.2,
              shadowRadius: isOwnMessage ? 4 : 2,
              elevation: isOwnMessage ? 3 : 2,
              minWidth: 60, // Minimum width to make bubbles visible
            }}
          >
            {/* Message Text Only */}
            <Text
              style={[
                typography.body,
                {
                  color: 'white',
                  fontSize: getResponsiveFontSize(14),
                  lineHeight: getResponsiveSpacing(20),
                  flexWrap: 'wrap',
                },
              ]}
            >
              {typeof message.message === 'string'
                ? message.message
                : String(message.message || '')}
            </Text>

            {/* Optimistic indicator */}
            {message.isOptimistic && (
              <View style={{ marginTop: 2, alignSelf: 'flex-end' }}>
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: '#E9D5FF',
                      fontSize: getResponsiveFontSize(10),
                    },
                  ]}
                >
                  ⏳
                </Text>
              </View>
            )}
          </View>

          {/* Spacer for own messages (to replace avatar space) */}
          {isOwnMessage && <View style={{ width: getResponsiveImageSize(8) }} />}
        </View>

        {/* Timestamp BELOW bubble - EXACT same as group chat (userTimestamp/otherTimestamp) */}
        {message.created_at && (
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)', // Light white for timestamps - same as group chat
              fontSize: getResponsiveFontSize(10), // Same as group chat
              marginTop: getResponsiveSpacing(2),
              ...(isOwnMessage
                ? { marginRight: getResponsiveSpacing(8) }
                : { marginLeft: getResponsiveSpacing(8) }), // Same as group chat ownMessageTime/otherMessageTime
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            }}
          >
            {typeof message.created_at === 'string'
              ? message.created_at
              : String(message.created_at || '')}
          </Text>
        )}
      </View>
    );
  }
);
