import React, { memo } from 'react';
import { View, Text } from 'react-native';

interface MessageTimestampProps {
  timestamp: string;
  isOwn: boolean;
  getResponsiveFontSize: (size: number) => number;
  getResponsiveSpacing: (size: number) => number;
}

export const MessageTimestamp = memo(
  ({ timestamp, isOwn, getResponsiveFontSize, getResponsiveSpacing }: MessageTimestampProps) => {
    const formatTimestamp = (ts: string): string => {
      if (!ts) return '';
      try {
        if (ts.includes('AM') || ts.includes('PM')) {
          return ts;
        }
        const date = new Date(ts);
        if (isNaN(date.getTime())) {
          return ts;
        }
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return ts;
      }
    };

    return (
      <View
        style={{
          width: '100%',
          alignItems: isOwn ? 'flex-start' : 'flex-end',
          marginTop: getResponsiveSpacing(4),
          paddingHorizontal: getResponsiveSpacing(4),
        }}
      >
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: getResponsiveFontSize(11),
            fontWeight: '400',
            ...(isOwn
              ? { marginLeft: getResponsiveSpacing(12) }
              : { marginRight: getResponsiveSpacing(12) }),
          }}
        >
          {formatTimestamp(timestamp)}
        </Text>
      </View>
    );
  }
);
