/**
 * TypingIndicator Component
 * Animated typing dots indicator
 * Single Responsibility: Typing animation display
 */

import React, { useState, useEffect, memo } from 'react';
import { View } from 'react-native';
import { useIsMounted } from '../../hooks/useIsMounted';
import { useThemeColors } from '../../utils/themeColors';

export const TypingIndicator: React.FC = memo(() => {
  const [activeDot, setActiveDot] = useState(0);
  const isMounted = useIsMounted();
  const colors = useThemeColors();

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted()) {
        setActiveDot((prev) => (prev + 1) % 3);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isMounted]);

  const activeColor = colors.white || '#FFFFFF';
  const inactiveColor = `${activeColor}66`; // 40% opacity

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: activeDot === 0 ? activeColor : inactiveColor,
      }} />
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: activeDot === 1 ? activeColor : inactiveColor,
      }} />
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: activeDot === 2 ? activeColor : inactiveColor,
      }} />
    </View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

export default TypingIndicator;
