/**
 * BlockedUserBanner Component
 * Displays banner when user is blocked
 * Single Responsibility: Blocked user notification
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface BlockedUserBannerProps {
  styles?: any;
}

export const BlockedUserBanner: React.FC<BlockedUserBannerProps> = memo(({ styles }) => {
  return (
    <View style={styles?.blockedBanner || defaultStyles.blockedBanner}>
      <Icon name="block" size={20} color="#DC2626" style={styles?.blockedIcon || defaultStyles.blockedIcon} />
      <Text style={styles?.blockedText || defaultStyles.blockedText}>
        You have blocked this user. You cannot send or receive messages.
      </Text>
    </View>
  );
});

BlockedUserBanner.displayName = 'BlockedUserBanner';

const defaultStyles = StyleSheet.create({
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#40444B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  blockedIcon: {
    marginRight: 8,
  },
  blockedText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BlockedUserBanner;
