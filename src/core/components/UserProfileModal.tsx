/**
 * User Profile Modal - Updated Implementation
 * Modal for displaying detailed user profile information
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Alert,
  Dimensions, // Added Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';

// CRITICAL: Define screenHeight to prevent crash
const { height: screenHeight } = Dimensions.get('window');

interface Badge {
  id: number;
  icon: string;
  url?: string;
}

interface User {
  id: number;
  account_id?: number; // Account ID for private chat
  userid?: number; // User ID (lowercase)
  user_id?: number; // User ID (snake_case)
  peer_user_id?: number; // Peer user ID (used in conversations)
  rank: number;
  name: string;
  image: string;
  amount: string;
  color?: string;
  streakTotal?: number;
  streakMax?: number;
  highestStreak?: number;
  questionsAttempted?: number;
  questionsMax?: number;
  lastOnline?: string;
  isOnline?: boolean;
  badges?: Badge[];
  subscription_badges?: any[];
  isCurrentUser?: boolean;
  level?: number;
  level_progress?: string;
}

interface UserProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
  isDarkMode: boolean;
}

// User profile modal component
const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isVisible,
  onClose,
  user,
  isDarkMode,
}) => {
  const navigation = useNavigation();

  // Button animation for close button
  const closeButtonScale = useRef(new Animated.Value(1)).current;

  const animateClosePress = () => {
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
  };

  const handleClosePress = () => {
    animateClosePress();
    setTimeout(() => {
      onClose();
    }, 150);
  };

  // Parse level_progress (format: "3/100")
  const parseLevelProgress = (levelProgress?: string): { current: number; max: number } => {
    if (!levelProgress) return { current: 0, max: 100 };
    const parts = levelProgress.split('/');
    if (parts.length === 2) {
      const current = parseInt(parts[0], 10) || 0;
      const max = parseInt(parts[1], 10) || 100;
      return { current, max };
    }
    return { current: 0, max: 100 };
  };

  const levelProgress = parseLevelProgress(user?.level_progress);
  const levelProgressPercentage = (levelProgress.current / levelProgress.max) * 100;

  // Default values if user data is incomplete
  const userData = {
    id: user?.id || Math.floor(Math.random() * 1000),
    name: user?.name || 'User',
    image: user?.image || 'https://randomuser.me/api/portraits/men/32.jpg',
    level: user?.level || 1,
    level_progress: user?.level_progress || '0/100',
    levelProgressCurrent: levelProgress.current,
    levelProgressMax: levelProgress.max,
    badges: (() => {
      // First check subscription_badges from API response
      if (
        user?.subscription_badges &&
        Array.isArray(user.subscription_badges) &&
        user.subscription_badges.length > 0
      ) {
        const validBadges = user.subscription_badges
          .filter((badge: any) => {
            // Only include badges with valid image URLs (not empty, not "trophy")
            const imageUrl = badge.badge_image_url || badge.image_url;
            return (
              imageUrl &&
              typeof imageUrl === 'string' &&
              imageUrl.trim() !== '' &&
              imageUrl !== 'trophy' &&
              !imageUrl.includes('trophy')
            );
          })
          .map((badge: any, index: number) => ({
            id: badge.id || index + 1,
            icon: badge.badge_image_url || badge.image_url,
            url: badge.badge_image_url || badge.image_url,
          }));
        if (validBadges.length > 0) return validBadges;
      }

      // Fallback to badges array if available
      if (user?.badges && Array.isArray(user.badges) && user.badges.length > 0) {
        const validBadges = user.badges
          .filter((badge: any) => {
            const badgeAny = badge as any;
            const badgeUrl = badgeAny.url || badgeAny.icon;
            // Only include badges with valid URLs (not default "trophy" or empty)
            return (
              badgeUrl &&
              typeof badgeUrl === 'string' &&
              badgeUrl.trim() !== '' &&
              badgeUrl !== 'trophy' &&
              !badgeUrl.includes('trophy')
            );
          })
          .map((badge: any, index: number) => ({
            id: badge.id || index + 1,
            icon: badge.url || badge.icon,
            url: badge.url || badge.icon,
          }));
        if (validBadges.length > 0) return validBadges;
      }

      // Return empty array if no valid badges
      return [];
    })(),
    isOnline: user?.isOnline || false,
  };

  // Colors based on theme
  const bgColor = isDarkMode ? '#1F2937' : '#F3F0FF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937';
  const secondaryTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const cardBgColor = isDarkMode ? '#1E293B' : '#F3F4F6';
  const progressBgColor = isDarkMode ? '#374151' : '#E5E7EB';

  // Handle send message button press
  const handleSendMessage = () => {
    // Close the modal first
    onClose();

    // Get the account_id for private chat - API returns 'userid' (lowercase), prioritize this
    // Priority: userid (API field) > peer_user_id > account_id > user_id > id (only if id > 1000)
    let peerUserId: number | null = null;

    // Try userid FIRST (this is what the API actually returns)
    if (user.userid) {
      peerUserId =
        typeof user.userid === 'number' ? user.userid : parseInt(String(user.userid), 10);
    }
    // Try peer_user_id (used in conversations)
    else if (user.peer_user_id) {
      peerUserId =
        typeof user.peer_user_id === 'number'
          ? user.peer_user_id
          : parseInt(String(user.peer_user_id), 10);
    }
    // Try account_id
    else if (user.account_id) {
      peerUserId =
        typeof user.account_id === 'number'
          ? user.account_id
          : parseInt(String(user.account_id), 10);
    }
    // Try user_id
    else if (user.user_id) {
      peerUserId =
        typeof user.user_id === 'number' ? user.user_id : parseInt(String(user.user_id), 10);
    }
    // Try id only if it looks like a real account ID (large number > 1000)
    else if (user.id && user.id > 1000) {
      peerUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    }

    // Validate peerUserId
    if (peerUserId === null || isNaN(peerUserId) || peerUserId <= 0) {
      console.error(
        '❌ [UserProfileModal] Invalid peerUserId - ALL USER DATA:',
        JSON.stringify(user, null, 2)
      );
      console.error('❌ [UserProfileModal] User ID extraction failed:', {
        peer_user_id: user.peer_user_id,
        account_id: user.account_id,
        userid: user.userid,
        user_id: user.user_id,
        id: user.id,
        idType: typeof user.id,
        extracted: peerUserId,
      });
      Alert.alert(
        'Unable to Start Chat',
        'User account ID not found in leaderboard data. The backend API needs to include userid or user_id field in the response.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Removed excessive logging - only log errors

    // Create a chat object with the user data for private chat
    // CRITICAL: Use peerUserId for both id and peerUserId to ensure correct user is selected
    const chatData = {
      id: peerUserId, // Use peerUserId for id to ensure uniqueness
      name: userData.name,
      avatar: userData.image,
      message: 'Tap to start chatting',
      time: 'Just now',
      unread: 0,
      status: 'accepted', // Set to accepted so we can send messages immediately
      isGroup: false,
      peerUserId, // This is required for private chat (must be a number)
      conversationId: undefined, // Will be created when first message is sent
    };

    // Navigate directly to ChatDetailScreen
    setTimeout(() => {
      // Navigate to ChatDetail screen with structured chat and conversation objects
      // CRITICAL: ChatScreen expects chat object with peerUserId, not flat params
      (navigation as any).navigate('TabNavigator' as any, {
        screen: 'Chats' as any,
        params: {
          screen: 'ChatDetail' as any,
          params: {
            chat: chatData,
            conversation: {
              conversation_id: undefined,
              peer_user_id: peerUserId,
              peer_username: userData.name,
              peer_avatar_url: userData.image,
            },
            _timestamp: Date.now(),
          },
        },
      });
    }, 300);
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: bgColor, borderWidth: 2, borderColor: '#FFD700' },
          ]}
        >
          {/* Header with close button */}
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              onPress={handleClosePress}
              activeOpacity={0.8}
              style={styles.closeButton}
            >
              <Animated.View
                style={[
                  styles.closeButtonInner,
                  {
                    transform: [{ scale: closeButtonScale }],
                  },
                ]}
              >
                <Image
                  source={require('../../../assets/common/closeIcon.png')}
                  style={styles.closeIcon}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Profile header */}
          <View style={styles.profileHeader}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.avatarContainer, { backgroundColor: 'transparent' }]}>
                {userData.image &&
                  (userData.image.includes('.json') || userData.image.includes('lottie')) ? (
                  <LottieView
                    source={{ uri: userData.image }}
                    autoPlay
                    loop
                    style={styles.avatar}
                  />
                ) : (
                  <Image source={{ uri: userData.image }} style={styles.avatar} />
                )}
              </View>
            </View>

            <Text style={[styles.userName, { color: textColor }]}>{userData.name}</Text>

            {/* Send Message Button with icon */}
            <TouchableOpacity style={styles.sendMessageButton} onPress={handleSendMessage}>
              <Icon
                name="message-text-outline"
                size={18}
                color="white"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>
          </View>

          {/* Level and Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.levelContainer}>
              <Text style={[styles.levelText, { color: textColor }]}>Level {userData.level}</Text>
            </View>

            <View>
              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressBar, { backgroundColor: progressBgColor }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: '#FBBF24',
                        width: `${levelProgressPercentage}%`,
                      },
                    ]}
                  />
                </View>
                {/* Star icon at the end of progress bar - no gap */}
                <View style={styles.starIconContainer}>
                  <Image
                    source={require('../../../assets/home/star.png')}
                    style={styles.starIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.progressStats}>
                <Text style={[styles.progressText, { color: textColor }]}>
                  Questions Answered Correctly
                </Text>
                <View style={[styles.progressBarWidth, { marginRight: 20 }]}>
                  <Text style={[styles.progressText, { color: textColor, textAlign: 'right' }]}>
                    {userData.levelProgressCurrent}/{userData.levelProgressMax}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {(() => {
              // Filter valid badges first
              const validBadges = userData.badges.filter(badge => {
                const badgeAny = badge as any;
                const badgeUrl = badgeAny.url || badgeAny.icon;
                return (
                  badgeUrl &&
                  typeof badgeUrl === 'string' &&
                  badgeUrl.trim() !== '' &&
                  badgeUrl !== 'trophy' &&
                  !badgeUrl.includes('trophy')
                );
              });

              return (
                <>
                  <Text style={[styles.badgesTitle, { color: textColor }]}>
                    Badges ({validBadges.length || 0})
                  </Text>

                  {validBadges.length > 0 ? (
                    <View style={styles.badgesList}>
                      {validBadges.map((badge, index) => {
                        const badgeAny = badge as any;
                        const badgeUrl = badgeAny.url || badgeAny.icon;
                        const isLottie =
                          badgeUrl.includes('.json') ||
                          badgeUrl.includes('lottie') ||
                          badgeUrl.includes('application/json');

                        return (
                          <View
                            key={badge.id || `badge-${index}`}
                            style={[styles.badgeItem, { backgroundColor: progressBgColor }]}
                          >
                            {isLottie ? (
                              <LottieView
                                source={{ uri: badgeUrl }}
                                autoPlay
                                loop
                                style={{ width: 32, height: 32 }}
                                onAnimationFailure={() => {
                                  console.warn(
                                    '[UserProfileModal] Lottie animation failed for badge:',
                                    badgeUrl
                                  );
                                }}
                              />
                            ) : (
                              <Image
                                source={{ uri: badgeUrl }}
                                style={{ width: 32, height: 32 }}
                                resizeMode="contain"
                                onError={error => {
                                  console.warn(
                                    '[UserProfileModal] Image load error for badge:',
                                    badgeUrl,
                                    error
                                  );
                                }}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.noBadgesText, { color: secondaryTextColor }]}>
                      No badges
                    </Text>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarContainer: {
    borderRadius: 20,
    padding: 4,
  },
  badgeItem: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    overflow: 'hidden',
    width: 48,
  },
  badgesContainer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgesTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 4,
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  closeButtonInner: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  closeIcon: {
    height: 26,
    width: 26,
  },
  levelContainer: {
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    width: '85%',
  },
  noBadgesText: {},
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 24,
  },
  progressBar: {
    borderRadius: 20,
    flex: 1,
    height: 16,
    marginRight: 0,
    overflow: 'hidden',
  },
  progressBarWidth: {
    flex: 1,
  },
  progressBarWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressFill: {
    height: '100%',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
  },
  sendMessageButton: {
    alignItems: 'center',
    backgroundColor: '#603A7C',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '80%',
  },
  sendMessageText: {
    color: 'white',
    fontWeight: '500',
  },
  starIcon: {
    height: 30,
    width: 30,
  },
  starIconContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: -4,
    width: 24,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
});

export default UserProfileModal;
