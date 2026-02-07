/**
 * ChatDetailHeader Component
 * Header section for ChatDetailScreen with user info, status, and actions
 * Single Responsibility: Header rendering and user actions
 */

import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import OptimizedImage from '../OptimizedImage';
import { scaleSize } from '../../utils/scaleSize';

// Helper function to check if URL is a Lottie file
const isLottieFile = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.json') || url.includes('.json?') || url.includes('.json&') || url.includes('lottiefiles.com');
};

interface ChatDetailHeaderProps {
  chat: {
    name: string;
    avatar?: string;
    avatar_url?: string | null;
    isGroup?: boolean;
    members?: any[];
    status?: string;
    time?: string;
  };
  conversation?: {
    peer_username?: string;
    peer_online?: boolean;
    peer_last_seen?: string | null;
    last_message_at?: string;
    peer_avatar_url?: string | null;
    peer_frame_url?: string | null;
    peer_profile_pic?: string | null;
  };
  isPrivateChat: boolean;
  isOtherUserTyping: boolean;
  isCurrentChatMuted: boolean;
  muteLoading: boolean;
  canShowUserMenu: boolean;
  showUserMenu: boolean;
  peerUserId?: number;
  allConversations?: any[];
  currentConversationId?: number | null;
  onGoBack: () => void;
  onGroupInfo?: () => void;
  onToggleMute: (peerUserId: number) => Promise<void>;
  onToggleUserMenu: () => void;
  onToggleGroupOptions: () => void;
  formatLastSeen: (lastSeen: string) => string;
  formatTime: (time: string | Date) => string;
}

const ChatDetailHeader: React.FC<ChatDetailHeaderProps> = memo(({
  chat,
  conversation,
  isPrivateChat,
  isOtherUserTyping,
  isCurrentChatMuted,
  muteLoading,
  canShowUserMenu,
  showUserMenu,
  peerUserId,
  allConversations,
  currentConversationId,
  onGoBack,
  onGroupInfo,
  onToggleMute,
  onToggleUserMenu,
  onToggleGroupOptions,
  formatLastSeen,
  formatTime,
}) => {
  // Calculate status text
  const getStatusText = (): string => {
    if (chat.isGroup) {
      return `${chat.members ? chat.members.length : 0} members`;
    }

    if (isPrivateChat) {
      // Priority: typing > online > last seen > last message > offline
      if (isOtherUserTyping) {
        return 'typing...';
      }

      const activeConv = currentConversationId
        ? (Array.isArray(allConversations) ? allConversations.find(c => c && c.conversation_id === currentConversationId) : null)
        : conversation;

      if (activeConv) {
        if (activeConv.peer_online === true) {
          return 'online';
        }

        // Show last seen if available (regardless of peer_online value, as long as it's not true)
        if (activeConv.peer_online !== true && activeConv.peer_last_seen) {
          const lastSeen = formatLastSeen(activeConv.peer_last_seen);
          return lastSeen ? `last seen ${lastSeen}` : 'offline';
        }

        // Show offline if not online and no last_seen
        if (activeConv.peer_online !== true) {
          return 'offline';
        }
      }

      if (conversation?.last_message_at) {
        const lastMsgTime = formatTime(conversation.last_message_at);
        return `last message at ${lastMsgTime}`;
      }

      return 'offline';
    }

    return chat.status === 'online'
      ? 'Online'
      : chat.time ? `Last seen today at ${chat.time}` : 'online';
  };

  return (
    <View style={styles.header}>
      <SoundTouchableOpacity onPress={onGoBack} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#FFFFFF" />
      </SoundTouchableOpacity>

      <SoundTouchableOpacity style={styles.headerInfo} onPress={chat.isGroup ? onGroupInfo : undefined}>
        {isPrivateChat ? (
          // Private chat: Match conversation list priority - avatar_url first (with frame), then profile_pic, then chat.avatar
          (() => {
            // Use activeConversation from allConversations if available (has latest data), otherwise use conversation prop
            const activeConv = currentConversationId
              ? (Array.isArray(allConversations) ? allConversations.find(c => c && c.conversation_id === currentConversationId) : null)
              : conversation;

            // PRIORITY: avatar_url first, then profile_pic fallback, then chat.avatar
            // Check both activeConv and conversation to ensure we get the avatar data
            // Also check chat.avatar_url and chat.avatar as fallback (comes from navigation params)
            const peerAvatarUrl = activeConv?.peer_avatar_url || conversation?.peer_avatar_url || chat.avatar_url;
            const peerProfilePic = activeConv?.peer_profile_pic || conversation?.peer_profile_pic;
            // Frame removed - not displaying frames in chat header
            const avatarUrl = peerAvatarUrl || peerProfilePic || chat.avatar;

            // Check if avatar_url exists first (for frame display)
            if (peerAvatarUrl && typeof peerAvatarUrl === 'string' && peerAvatarUrl.trim().length > 0 && peerAvatarUrl !== 'null') {
              return (
                <View style={styles.headerAvatarContainer}>
                  {/* Frame removed - not displaying frames in chat header */}
                  {/* Avatar (middle layer) - Display avatar_url */}
                  {isLottieFile(peerAvatarUrl) ? (
                    <LottieView
                      key={`header-avatar-${activeConv?.peer_username || conversation?.peer_username}-${peerAvatarUrl}`}
                      source={{ uri: peerAvatarUrl }}
                      autoPlay
                      loop
                      renderMode="SOFTWARE"
                      style={styles.headerAvatar}
                      resizeMode="contain"
                    />
                  ) : (
                    <OptimizedImage
                      source={{ uri: peerAvatarUrl }}
                      style={styles.headerAvatar}
                      resizeMode="contain"
                    />
                  )}
                  {/* Level Star Overlay - Inside Container for correct positioning */}
                  {activeConv?.peer_level && activeConv?.peer_level > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: scaleSize(-6),
                        right: scaleSize(-6),
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <Image
                        source={require('../../../assets/home/star.png')}
                        style={{
                          width: scaleSize(22),
                          height: scaleSize(22),
                        }}
                        resizeMode="contain"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#000000',
                            fontSize: scaleSize(10),
                            fontWeight: 'bold',
                            marginTop: Platform.OS === 'ios' ? 1 : 0,
                          }}
                        >
                          {activeConv.peer_level}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            } else if (peerProfilePic && typeof peerProfilePic === 'string' && peerProfilePic.trim().length > 0 && peerProfilePic !== 'null') {
              // Fallback to profile_pic if avatar_url doesn't exist (no frame, no absolute positioning)
              return (
                <View style={styles.headerAvatarContainer}>
                  <OptimizedImage
                    source={{ uri: peerProfilePic }}
                    style={styles.headerAvatarFallback}
                    resizeMode="cover"
                  />
                  {/* Level Star Overlay - Inside Container for correct positioning */}
                  {activeConv?.peer_level && activeConv?.peer_level > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: scaleSize(-6),
                        right: scaleSize(-6),
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <Image
                        source={require('../../../assets/home/star.png')}
                        style={{
                          width: scaleSize(22),
                          height: scaleSize(22),
                        }}
                        resizeMode="contain"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#000000',
                            fontSize: scaleSize(10),
                            fontWeight: 'bold',
                            marginTop: Platform.OS === 'ios' ? 1 : 0,
                          }}
                        >
                          {activeConv.peer_level}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            } else if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 && avatarUrl !== 'null') {
              // Fallback to chat.avatar - check if it's a Lottie file (avatar_url) or regular image (profile_pic)
              // If it's a Lottie file, treat it as avatar_url (with absolute positioning)
              // Otherwise treat it as profile_pic (no absolute positioning)
              if (isLottieFile(avatarUrl)) {
                // chat.avatar is a avatar_url (Lottie file) - render with absolute positioning like avatar_url
                return (
                  <View style={styles.headerAvatarContainer}>
                    <LottieView
                      key={`header-avatar-chat-${chat.name}-${avatarUrl}`}
                      source={{ uri: avatarUrl }}
                      autoPlay
                      loop
                      renderMode="SOFTWARE"
                      style={styles.headerAvatar}
                      resizeMode="contain"
                    />
                  </View>
                );
              } else {
                // chat.avatar is a profile_pic (regular image) - render without absolute positioning
                return (
                  <View style={styles.headerAvatarContainer}>
                    <OptimizedImage
                      source={{ uri: avatarUrl }}
                      style={styles.headerAvatarFallback}
                      resizeMode="cover"
                    />
                  </View>
                );
              }
            } else {
              // Fallback to initial (no frame, no absolute positioning)
              return (
                <View style={styles.headerAvatarContainer}>
                  <View style={[styles.headerAvatarFallback, { backgroundColor: '#9333EA', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                      {(activeConv?.peer_username || conversation?.peer_username || chat.name)?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  {/* Level Star Overlay - Inside Container for correct positioning */}
                  {activeConv?.peer_level && activeConv?.peer_level > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: scaleSize(-6),
                        right: scaleSize(-6),
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <Image
                        source={require('../../../assets/home/star.png')}
                        style={{
                          width: scaleSize(22),
                          height: scaleSize(22),
                        }}
                        resizeMode="contain"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#000000',
                            fontSize: scaleSize(10),
                            fontWeight: 'bold',
                            marginTop: Platform.OS === 'ios' ? 1 : 0,
                          }}
                        >
                          {activeConv.peer_level}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            }
          })()
        ) : (
          // Group chat or no conversation: Use chat.avatar
          chat.avatar && typeof chat.avatar === 'string' ? (
            <OptimizedImage source={{ uri: chat.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: '#9333EA', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerName}>
            {isPrivateChat ? (conversation?.peer_username || chat.name) : chat.name}
          </Text>
          <Text style={styles.headerStatus}>
            {getStatusText()}
          </Text>
        </View>
      </SoundTouchableOpacity>

      {canShowUserMenu && (
        <SoundTouchableOpacity onPress={onToggleUserMenu}>
          <Icon name="dots-vertical" size={24} color="#FFFFFF" />
        </SoundTouchableOpacity>
      )}

      {chat.isGroup && (
        <SoundTouchableOpacity onPress={onToggleGroupOptions}>
          <Icon name="dots-vertical" size={24} color="#FFFFFF" />
        </SoundTouchableOpacity>
      )}
    </View>
  );
});

ChatDetailHeader.displayName = 'ChatDetailHeader';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleSize(12),
    backgroundColor: '#9333EA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: scaleSize(12),
    padding: scaleSize(4),
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    width: scaleSize(40),
    height: scaleSize(40),
    marginRight: scaleSize(12),
  },
  headerAvatar: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: scaleSize(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: scaleSize(2),
  },
  headerStatus: {
    fontSize: scaleSize(12),
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default ChatDetailHeader;

