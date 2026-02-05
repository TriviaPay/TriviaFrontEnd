import React, { memo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { useIsMounted } from '../../hooks/useIsMounted';

interface TypingIndicatorProps {
  getResponsiveFontSize: (size: number) => number;
  getResponsiveSpacing: (size: number) => number;
}

export const TypingIndicator = memo(
  ({ getResponsiveFontSize, getResponsiveSpacing }: TypingIndicatorProps) => {
    const [activeDot, setActiveDot] = useState(0);
    const isMounted = useIsMounted();

    useEffect(() => {
      const interval = setInterval(() => {
        if (isMounted()) {
          setActiveDot(prev => (prev + 1) % 3);
        }
      }, 400);

      return () => clearInterval(interval);
    }, [isMounted]);

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: getResponsiveSpacing(12),
          paddingVertical: getResponsiveSpacing(8),
          marginBottom: getResponsiveSpacing(8),
        }}
      >
        <View
          style={{
            backgroundColor: '#6B21A8',
            borderRadius: 16,
            paddingHorizontal: getResponsiveSpacing(12),
            paddingVertical: getResponsiveSpacing(8),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                activeDot === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                activeDot === 1 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                activeDot === 2 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
            }}
          />
        </View>
      </View>
    );
  }
);
