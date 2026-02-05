/**
 * NotificationItem - TypeScript Implementation
 * Professional notification item component with comprehensive features
 */

import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useThemeColors } from '../../../utils/themeColors';
import {
  getNotificationIcon,
  getNotificationColor,
} from '../../../lib/notifications/notificationUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: string;
  time: string;
}

interface NotificationItemProps {
  item: Notification;
  onPress: () => void;
  onDelete?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item, onPress, onDelete }) => {
  const { isDarkMode, colors } = useTheme();

  const iconSize = useMemo(() => Math.max(40, screenWidth * 0.1), []);
  const titleSize = useMemo(() => Math.max(14, screenWidth * 0.035), []);
  const messageSize = useMemo(() => Math.max(12, screenWidth * 0.03), []);
  const timeSize = useMemo(() => Math.max(10, screenWidth * 0.025), []);
  const iconTextSize = useMemo(() => Math.max(16, screenWidth * 0.04), []);
  const unreadDotSize = useMemo(() => Math.max(8, screenWidth * 0.02), []);
  const deleteIconSize = useMemo(() => Math.max(18, screenWidth * 0.045), []);

  const notificationColor = useMemo(
    () => getNotificationColor(item.type, isDarkMode),
    [item.type, isDarkMode]
  );
  const notificationIcon = useMemo(() => getNotificationIcon(item.type), [item.type]);

  const handleDelete = useMemo(() => {
    if (!onDelete) return undefined;
    return (e: any) => {
      e.stopPropagation();
      onDelete(item.id);
    };
  }, [onDelete, item.id]);

  return (
    <TouchableOpacity onPress={onPress} style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderRadius: 12,
          backgroundColor: isDarkMode ? colors.cardBackground : 'white',
          borderLeftWidth: !item.read ? 4 : 0,
          borderColor: !item.read ? notificationColor : 'transparent',
          opacity: item.read ? 0.8 : 1,
        }}
      >
        <View
          style={{
            borderRadius: iconSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: notificationColor + '33',
            width: iconSize,
            height: iconSize,
          }}
        >
          <Text style={{ fontSize: iconTextSize }}>{notificationIcon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                fontWeight: 'bold',
                color: isDarkMode ? colors.text : '#333333',
                fontSize: titleSize,
                flex: 1,
                marginRight: 8,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: isDarkMode ? colors.textSecondary : '#666666',
                fontSize: timeSize,
              }}
            >
              {item.time}
            </Text>
          </View>

          <Text
            style={{
              marginTop: 4,
              color: isDarkMode ? colors.textSecondary : '#666666',
              fontSize: messageSize,
            }}
          >
            {item.message}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {!item.read && (
            <View
              style={{
                borderRadius: unreadDotSize / 2,
                marginRight: onDelete ? 8 : 0,
                backgroundColor: notificationColor,
                width: unreadDotSize,
                height: unreadDotSize,
              }}
            />
          )}
          {onDelete && (
            <SoundTouchableOpacity
              onPress={handleDelete}
              style={{
                padding: 4,
                borderRadius: 4,
              }}
              activeOpacity={0.7}
            >
              <Icon
                name="delete-outline"
                size={deleteIconSize}
                color={isDarkMode ? colors.textSecondary : '#999999'}
              />
            </SoundTouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(NotificationItem, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.read === nextProps.item.read &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.message === nextProps.item.message &&
    prevProps.item.time === nextProps.item.time &&
    prevProps.item.type === nextProps.item.type &&
    prevProps.onDelete === nextProps.onDelete
  );
});
