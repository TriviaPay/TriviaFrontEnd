import React, { memo } from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { typography } from '../../theme/typography';
import { ChatMessage } from './MessageAlignmentService';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  getResponsiveFontSize: (size: number) => number;
  getResponsiveSpacing: (size: number) => number;
  getResponsiveIconSize: (size: number) => number;
}

export const MessageBubble = memo(
  ({
    message,
    isOwn,
    getResponsiveFontSize,
    getResponsiveSpacing,
    getResponsiveIconSize,
  }: MessageBubbleProps) => {
    // Format timestamp - same as global chat
    const formatTimestamp = (timestamp: string): string => {
      if (!timestamp) return '';
      try {
        // If already formatted (contains AM/PM), return as is
        if (timestamp.includes('AM') || timestamp.includes('PM')) {
          return timestamp;
        }
        // Otherwise, try to parse and format
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return timestamp;
        }
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return timestamp;
      }
    };

    // EXACTLY match global chat styling
    const bubbleStyle = {
      backgroundColor: isOwn ? '#8B5CF6' : '#40444B', // Purple for own, gray for others - same as global chat
      borderRadius: 16,
      borderTopRightRadius: isOwn ? 4 : 16, // Tail on right for own messages
      borderTopLeftRadius: isOwn ? 16 : 4, // Tail on left for others
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
      minWidth: 60,
    };

    return (
      <View style={bubbleStyle}>
        {/* Message Text - EXACTLY like global chat */}
        <Text
          style={{
            color: 'white',
            fontSize: getResponsiveFontSize(14),
            lineHeight: getResponsiveFontSize(20),
            flexWrap: 'wrap',
          }}
        >
          {message.message || ''}
        </Text>

        {/* Status indicators - only for own messages, inside bubble */}
        {isOwn && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: getResponsiveSpacing(4),
              justifyContent: 'flex-end',
            }}
          >
            {message.isOptimistic && (
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: getResponsiveFontSize(10),
                  marginRight: getResponsiveSpacing(4),
                }}
              >
                ⏳
              </Text>
            )}
            {!message.isOptimistic && message.status && (
              <Icon
                name={
                  message.status === 'read'
                    ? 'check-all'
                    : message.status === 'delivered'
                      ? 'check-all'
                      : 'check'
                }
                size={getResponsiveIconSize(12)}
                color={
                  message.status === 'read'
                    ? '#4FC3F7'
                    : message.status === 'delivered'
                      ? 'rgba(255, 255, 255, 0.7)'
                      : 'rgba(255, 255, 255, 0.7)'
                }
              />
            )}
          </View>
        )}
      </View>
    );
  }
);
