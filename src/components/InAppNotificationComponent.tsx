/**
 * In-App Notification Component
 * Displays custom in-app notifications when show_as_in_app flag is true
 * Follows the IN_APP_NOTIFICATIONS_GUIDE.md specification
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../lib/utils/logger';
import { addNotification } from '../services/notificationService';

export interface InAppNotification {
  id: string;
  heading: string;
  content: string;
  data: any;
  timestamp: number;
}

// Global notification queue and handler
let notificationQueue: InAppNotification[] = [];
let showNotificationHandler: ((notification: InAppNotification) => void) | null = null;

/**
 * Show an in-app notification
 * Called from OneSignal handler
 */
export const showInAppNotification = (notification: any): void => {
  try {
    const inAppNotification: InAppNotification = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      heading:
        notification.title || notification.headings?.en || notification.heading || 'Notification',
      content: notification.body || notification.contents?.en || notification.content || '',
      data: notification.additionalData || notification.data || {},
      timestamp: Date.now(),
    };

    logger.log('📱 Showing in-app notification:', 'NOTIFICATIONS', {
      heading: inAppNotification.heading,
      content: inAppNotification.content,
      type: inAppNotification.data.type,
    });

    // Store notification in service for popup modal
    addNotification({
      id: inAppNotification.id,
      title: inAppNotification.heading,
      message: inAppNotification.content,
      timestamp: inAppNotification.timestamp,
      type: inAppNotification.data.type || 'system',
      data: inAppNotification.data,
    });

    // Add to queue
    notificationQueue.push(inAppNotification);

    // Show if handler is available
    if (showNotificationHandler) {
      showNotificationHandler(inAppNotification);
    }
  } catch (error) {
    logger.error('❌ Error showing in-app notification:', 'NOTIFICATIONS', error);
  }
};

/**
 * Handle notification navigation based on type
 * Exported for use in OneSignal notification opened handler
 */
export const handleNotificationNavigation = (data: any, navigation: any): void => {
  try {
    const { type, conversation_id, sender_id, message_id, draw_date } = data;

    logger.log('🧭 Navigating from notification:', 'NOTIFICATIONS', { type, data });

    switch (type) {
      case 'private_message':
      case 'chat_request':
        // Navigate to private chat
        if (conversation_id) {
          navigation.navigate('PrivateChat', { conversationId: conversation_id });
        } else if (sender_id) {
          navigation.navigate('PrivateChat', { userId: sender_id });
        }
        break;

      case 'global_chat':
        // Navigate to global chat
        navigation.navigate('GlobalChat');
        break;

      case 'trivia_live_chat':
        // Navigate to trivia live chat
        if (draw_date) {
          // TriviaLiveChat removed - live chat no longer used
          // navigation.navigate('TriviaLiveChat', { drawDate: draw_date });
        } else {
          // TriviaLiveChat removed - live chat no longer used
          // navigation.navigate('TriviaLiveChat');
        }
        break;

      case 'trivia_reminder':
        // Navigate to trivia questions
        navigation.navigate('Trivia');
        break;

      default:
        logger.warn('⚠️ Unknown notification type:', 'NOTIFICATIONS', type);
    }
  } catch (error) {
    logger.error('❌ Error handling notification navigation:', 'NOTIFICATIONS', error);
  }
};

const InAppNotificationComponent: React.FC = () => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Register handler on mount
  useEffect(() => {
    showNotificationHandler = (notification: InAppNotification) => {
      setNotifications(prev => {
        // Add to queue if not already there
        const exists = prev.some(n => n.id === notification.id);
        if (!exists) {
          return [...prev, notification];
        }
        return prev;
      });
    };

    // Process any queued notifications
    if (notificationQueue.length > 0) {
      notificationQueue.forEach(notification => {
        if (showNotificationHandler) {
          showNotificationHandler(notification);
        }
      });
      notificationQueue = [];
    }

    return () => {
      showNotificationHandler = null;
    };
  }, []);

  // Show notification animation
  useEffect(() => {
    if (notifications.length > 0) {
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        if (notifications.length > 0) {
          dismissNotification(notifications[0].id);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const dismissNotification = (id: string): void => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Reset animation values for next notification
      slideAnim.setValue(-200);
      opacityAnim.setValue(0);
    });
  };

  const handleNotificationPress = (notification: InAppNotification): void => {
    dismissNotification(notification.id);
    handleNotificationNavigation(notification.data, navigation);
  };

  if (notifications.length === 0) return null;

  const currentNotification = notifications[0];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={() => handleNotificationPress(currentNotification)}
        activeOpacity={0.8}
      >
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon name="bell" size={24} color="#007AFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.heading} numberOfLines={1}>
              {currentNotification.heading}
            </Text>
            <Text style={styles.content} numberOfLines={2}>
              {currentNotification.content}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => dismissNotification(currentNotification.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  container: {
    left: 10,
    position: 'absolute',
    right: 10,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  content: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  contentContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
  },
  heading: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  notification: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
  },
});

export default InAppNotificationComponent;
