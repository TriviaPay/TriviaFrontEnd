/**
 * NotificationPopup - TypeScript Implementation
 * Professional notification popup component with comprehensive features
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationItem from './NotificationItem';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useThemeColors } from '../../../utils/themeColors';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: string;
}

interface NotificationPopupProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = memo(
  ({ visible, onClose, notifications, markAsRead, markAllAsRead, onDelete, onDeleteAll }) => {
    const { isDarkMode, colors } = useTheme();
    const themeColors = useThemeColors();
    const [slideAnim] = useState(new Animated.Value(screenWidth));
    const hasUnreadNotifications = useMemo(() => notifications.some(n => !n.read), [notifications]);

    // Button animation for close button
    const closeButtonScale = useRef(new Animated.Value(1)).current;

    const animateClosePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(closeButtonScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(closeButtonScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, [closeButtonScale]);

    const handleClosePress = useCallback(() => {
      animateClosePress();
      setTimeout(() => {
        onClose();
      }, 150);
    }, [animateClosePress, onClose]);

    const popupWidth = useMemo(() => Math.min(screenWidth * 0.8, 400), []);
    const titleSize = useMemo(() => Math.max(20, screenWidth * 0.05), []);
    const countTextSize = useMemo(() => Math.max(10, screenWidth * 0.025), []);
    const markAllTextSize = useMemo(() => Math.max(14, screenWidth * 0.035), []);
    const emptyTextSize = useMemo(() => Math.max(16, screenWidth * 0.04), []);
    const lottieSize = useMemo(() => Math.min(150, screenWidth * 0.4), []);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const renderNotificationItem = useCallback(
      ({ item }: { item: Notification }) => (
        <NotificationItem item={item} onPress={() => markAsRead(item.id)} onDelete={onDelete} />
      ),
      [markAsRead, onDelete]
    );

    useEffect(() => {
      let animation: Animated.CompositeAnimation | null = null;

      if (visible) {
        animation = Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        });
        animation.start();
      } else {
        animation = Animated.timing(slideAnim, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        });
        animation.start();
      }

      return () => {
        if (animation) {
          animation.stop();
        }
      };
    }, [visible, slideAnim, screenWidth]);

    return (
      <Modal transparent={true} visible={visible} animationType="none" onRequestClose={onClose}>
        <View
          style={{ flex: 1, backgroundColor: `${themeColors.black}80` }}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={onClose}
            activeOpacity={1}
          />

          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: popupWidth,
              transform: [{ translateX: slideAnim }],
              backgroundColor: isDarkMode ? colors.background : themeColors.gray100,
              borderWidth: 2,
              borderColor: themeColors.warning,
              shadowColor: '#000',
              shadowOffset: { width: -2, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 5,
            }}
          >
            <View style={{ flex: 1, padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: isDarkMode ? colors.text : themeColors.textDark,
                      fontSize: titleSize,
                    }}
                  >
                    Notifications
                  </Text>
                  <View
                    style={{
                      marginLeft: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? colors.tabActive : themeColors.secondary,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: 'bold',
                        fontSize: countTextSize,
                      }}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                </View>

                <SoundTouchableOpacity
                  onPress={handleClosePress}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.05)', // Slight background for touch target
                    borderRadius: 20,
                    padding: 8, // Increased padding
                    margin: -4, // Negative margin to compensate
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // Huge hitSlop
                  soundType="button" // Ensuring correct sound
                >
                  <Animated.View
                    style={{
                      width: 22,
                      height: 22,
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: [{ scale: closeButtonScale }],
                    }}
                  >
                    <Image
                      source={require('../../../../assets/common/closeIcon.png')}
                      style={{ width: 26, height: 26 }}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </SoundTouchableOpacity>
              </View>

              {(hasUnreadNotifications || notifications.length > 0) && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {hasUnreadNotifications && (
                    <SoundTouchableOpacity
                      onPress={markAllAsRead}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? colors.cardBackground : 'white',
                        borderWidth: 1,
                        borderColor: isDarkMode ? colors.border : themeColors.gray200,
                      }}
                    >
                      <Icon
                        name="check-all"
                        size={16}
                        color={isDarkMode ? colors.tabActive : themeColors.secondary}
                      />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontWeight: '500',
                          color: isDarkMode ? colors.tabActive : themeColors.secondary,
                          fontSize: markAllTextSize,
                        }}
                      >
                        Mark all as read
                      </Text>
                    </SoundTouchableOpacity>
                  )}
                  {notifications.length > 0 && onDeleteAll && (
                    <SoundTouchableOpacity
                      onPress={onDeleteAll}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? colors.cardBackground : 'white',
                        borderWidth: 1,
                        borderColor: themeColors.error,
                      }}
                    >
                      <Icon name="delete-sweep" size={16} color={themeColors.error} />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontWeight: '500',
                          color: themeColors.error,
                          fontSize: markAllTextSize,
                        }}
                      >
                        Delete all
                      </Text>
                    </SoundTouchableOpacity>
                  )}
                </View>
              )}

              {notifications.length > 0 ? (
                <FlatList
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  {...getOptimizedFlatListProps(80, {
                    initialNumToRender: 15,
                    maxToRenderPerBatch: 10,
                    windowSize: 21,
                    removeClippedSubviews: Platform.OS === 'android',
                    updateCellsBatchingPeriod: 50,
                  })}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <LottieView
                    source={require('../../../../assets/animations/verification.json')}
                    style={{ width: lottieSize, height: lottieSize }}
                    autoPlay
                    loop
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      marginTop: 16,
                      color: isDarkMode ? colors.textSecondary : themeColors.gray500,
                      fontSize: emptyTextSize,
                    }}
                  >
                    No notifications yet
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.visible === nextProps.visible &&
      prevProps.notifications.length === nextProps.notifications.length &&
      prevProps.notifications.every(
        (n, i) =>
          n.id === nextProps.notifications[i]?.id && n.read === nextProps.notifications[i]?.read
      ) &&
      prevProps.onDelete === nextProps.onDelete &&
      prevProps.onDeleteAll === nextProps.onDeleteAll
    );
  }
);

export default NotificationPopup;
