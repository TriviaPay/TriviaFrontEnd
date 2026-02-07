/**
 * ChatScreen Component
 * Main chat interface with real-time messaging
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
} from 'react-native';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeArea } from '../../../hooks/useSafeArea';
import { useStatusBar } from '../../../hooks/useStatusBar';
import { usePlatformOptimization, useHapticFeedback, useAndroidBackButton } from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import {
  setMessages,
  addMessage,
  setLoading,
  setTypingState,
  clearTypingState,
  setCurrentConversation,
  setShowImagePreview,
  setSelectedImage
} from '../../../store/slices/chatSlice';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import {
  sendMessage,
  fetchMessages,
  markConversationAsRead,
  sendTypingIndicator,
  sendTypingStopIndicator,
  acceptRejectChat,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  getBlockedUsers,
  deleteConversation
} from '../../../services/chatService';
import {
  subscribeToConversation,
  unsubscribeFromConversation,
} from '../../../services/pusherChatHandlers';
import MessageBubble from '../../../components/chat/MessageBubble';
import TypingIndicator from '../../../components/chat/TypingIndicator';
import ChatInput from '../../../components/chat/ChatInput';
import AcceptRejectPanel from '../../../components/chat/AcceptRejectPanel';
import ChatDetailHeader from '../../../components/chat/ChatDetailHeader';
import ChatDetailModals from '../../../components/chat/ChatDetailModals';
import { Message } from '../../../types/chat.types';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';
import { logger } from '../../../lib/utils/logger';

interface ChatScreenRouteParams {
  conversationId?: number;
  receiverId?: number;
  receiverName?: string;
  receiverAvatar?: string;
  chat?: any; // For flexibility
  conversation?: any; // For flexibility
}

const ChatScreen: React.FC = () => {
  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  const safeArea = useSafeArea();
  const insets = useSafeAreaInsets();
  useStatusBar({ style: 'light-content', backgroundColor: '#000000' });
  usePlatformOptimization();

  // Android back button handling
  useAndroidBackButton(() => {
    // Allow default navigation back behavior
    return false;
  });

  // Responsive design hooks
  const {
    height: screenHeight,
    width: screenWidth,
    scaleSize,
    scaleFont,
    getVerticalSpacing,
    getHorizontalSpacing,
  } = useStandardResponsive();

  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as ChatScreenRouteParams;

  // Redux hooks
  const dispatch = useDispatch();
  const { messages, currentConversation, typingStates = {}, loading, showImagePreview, selectedImage } = useSelector((state: RootState) => state.chat);
  const { token: userToken, user } = useSelector((state: RootState) => state.auth);
  // Get numeric user ID from profile or user object for consistent comparison
  const profile = useSelector((state: RootState) => state.profile.profile);
  const currentUserId = profile?.account_id || (user?.id ? Number(user.id) : 0);

  // Local state
  const [isAcceptingReject, setIsAcceptingReject] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [muteLoading, setMuteLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  // Calculate available height for chat messages
  const headerHeight = useMemo(() => 60, []);
  const availableHeight = useMemo(() => {
    const safeAreaTop = insets.top;
    const safeAreaBottom = insets.bottom;
    const totalSafeArea = safeAreaTop + safeAreaBottom;
    const keyboardOffset = keyboardHeight > 0 ? keyboardHeight : 0;
    return screenHeight - headerHeight - totalSafeArea - keyboardOffset;
  }, [screenHeight, headerHeight, insets.top, insets.bottom, keyboardHeight]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      clearTimeoutRefs();
    };
  }, []);

  const conversationId = params.conversationId || currentConversation?.conversation_id;
  const currentMessages = conversationId ? messages[conversationId] || [] : [];
  const typingState = conversationId ? typingStates[conversationId] : null;

  // Initialize chat and load messages
  useEffect(() => {
    initializeChat();

    // Fetch blocked users on mount
    loadBlockedUsers();

    return () => {
      // Cleanup: Unsubscribe from Pusher when leaving
      if (conversationId) {
        unsubscribeFromConversation(conversationId);
      }
    };
  }, [conversationId]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (conversationId && currentConversation?.status === 'active') {
        markAsRead();
      }
    }, [conversationId, currentConversation?.status])
  );

  const clearTimeoutRefs = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  };

  const initializeChat = async () => {
    try {
      // INSTANT DISPLAY: Show cached data immediately, fetch in background
      if (conversationId) {
        // Show cached messages immediately if available
        if (currentMessages.length > 0) {
          // Already have messages, just subscribe
          subscribeToConversation(conversationId).catch(() => { });
        } else {
          // No cached messages, fetch in background
          loadMessages(conversationId).catch(() => { });
          subscribeToConversation(conversationId).catch(() => { });
        }
      }
    } catch (error) {
      // Silently handle errors - don't block UI
    }
  };

  const loadMessages = async (convId: number) => {
    if (!userToken) return;
    try {
      const response = await fetchMessages(userToken, convId);
      if (response.messages) {
        dispatch(setMessages({ conversationId: convId, messages: response.messages }));
        // Scroll to bottom after loading
        const timeout = setTimeout(() => {
          timeoutRefs.current.delete(timeout);
          scrollToBottom();
        }, 100);
        timeoutRefs.current.add(timeout);
      }
    } catch (error) {
      logger.error('Error loading messages', 'CHAT', error);
    }
  };

  const loadBlockedUsers = async () => {
    if (!userToken) return;
    try {
      const users = await getBlockedUsers(userToken);
      setBlockedUsers(users);
    } catch (error) {
      logger.error('Error loading blocked users', 'CHAT', error);
    }
  };

  const markAsRead = async () => {
    if (!conversationId || !userToken) return;
    try {
      await markConversationAsRead(userToken, conversationId);
    } catch (error) {
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !userToken) return;

    try {
      setIsSendingMessage(true);

      const payload = {
        recipient_id: params.receiverId || (currentConversation?.peer_user_id ?? 0),
        message: messageText
      };

      const response = await sendMessage(userToken, payload);

      if (response.success || response.message_id) {
        const newMessage: Message = {
          id: response.message_id,
          sender_id: currentUserId,
          message: messageText,
          created_at: response.created_at,
          is_read: false,
          sender_level: profile?.level || user?.level || 0,
        };

        if (response.conversation_id && !conversationId) {
          // New conversation handling
        } else if (conversationId) {
          dispatch(addMessage({ conversationId, message: newMessage }));
          scrollToBottom();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleTyping = async () => {
    if (!conversationId || currentConversation?.status !== 'active' || !userToken) return;
    try {
      await sendTypingIndicator(userToken, conversationId);
    } catch (error) {
    }
  };

  const handleTypingStop = async () => {
    if (!conversationId || currentConversation?.status !== 'active' || !userToken) return;
    try {
      await sendTypingStopIndicator(userToken, conversationId);
    } catch (error) {
    }
  };

  const handleAcceptChat = async () => {
    if (!conversationId || !userToken) return;
    try {
      setIsAcceptingReject(true);
      const response = await acceptRejectChat(userToken, {
        conversation_id: conversationId,
        action: 'accept',
      });

      if (response.success && response.conversation) {
        dispatch(setCurrentConversation(response.conversation));
        Alert.alert('Success', 'Chat request accepted');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept chat');
    } finally {
      setIsAcceptingReject(false);
    }
  };

  const handleRejectChat = async () => {
    if (!conversationId || !userToken) return;
    try {
      setIsAcceptingReject(true);
      await acceptRejectChat(userToken, {
        conversation_id: conversationId,
        action: 'reject',
      });

      Alert.alert('Chat Rejected', 'You have rejected this chat request');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject chat');
    } finally {
      setIsAcceptingReject(false);
    }
  };

  const handleToggleMute = async (peerId: number) => {
    if (!userToken || !conversationId) return;
    setMuteLoading(true);
    try {
      const isMuted = currentConversation?.is_muted;
      const response = isMuted
        ? await unmuteUser(userToken, peerId)
        : await muteUser(userToken, peerId);

      if (response.success) {
        // Optimistically update conversation status in Redux if possible, or refetch
        // For now just close menu
        handleToggleUserMenu();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update mute status');
    } finally {
      setMuteLoading(false);
    }
  };

  const handleBlockUser = async () => {
    const peerUserId = params.receiverId || currentConversation?.peer_user_id;
    if (!userToken || !peerUserId) return;

    // Confirm block
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to message you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userToken, peerUserId);
              Alert.alert('Blocked', 'User has been blocked');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block user');
            }
          }
        }
      ]
    );
  };

  const handleDeleteChat = async () => {
    if (!userToken || !conversationId) return;

    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(userToken, conversationId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete chat');
            }
          }
        }
      ]
    );
  };

  const handleUnblockUser = async (userId: number) => {
    if (!userToken) return;
    try {
      await unblockUser(userToken, userId);
      loadBlockedUsers(); // Refresh list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unblock user');
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && currentMessages.length > 0) {
      const timeout = setTimeout(() => {
        timeoutRefs.current.delete(timeout);
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      timeoutRefs.current.add(timeout);
    }
  };

  // Auto-scroll on new message
  useEffect(() => {
    if (currentMessages.length > 0) {
      scrollToBottom();
    }
  }, [currentMessages.length]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    return <MessageBubble message={item} isOwnMessage={isOwnMessage} />;
  };

  const handleToggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Format helpers
  const formatLastSeen = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Simple logic: if < 1 min, just now; < 1 hour, x min ago; < 1 day, x hours ago; else date
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const showAcceptRejectPanel = currentConversation?.status === 'pending';
  const isChatDisabled = !conversationId || currentConversation?.status === 'pending' || currentConversation?.status === 'rejected';
  const peerUserId = params.receiverId || currentConversation?.peer_user_id;

  // Prepare chat object for header
  const chatInfo = {
    name: params.receiverName || currentConversation?.peer_username || 'Chat',
    avatar: params.receiverAvatar || currentConversation?.peer_avatar_url,
    status: currentConversation?.peer_online ? 'online' : 'offline',
  };

  const conversationInfo = {
    peer_username: params.receiverName || currentConversation?.peer_username,
    peer_online: currentConversation?.peer_online,
    peer_last_seen: currentConversation?.peer_last_seen,
    last_message_at: currentConversation?.last_message_at
  };

  return (
    <ScreenErrorBoundary screenName="ChatScreen">
      <ScreenBackButtonHandler action="navigate" />
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
        <SafeAreaView
          style={[styles.container, { width: '100%', height: '100%' }]}
          edges={Platform.OS === 'ios' ? ['top'] : []}
        >
          <ChatDetailHeader
            chat={chatInfo}
            conversation={conversationInfo}
            isPrivateChat={true}
            isOtherUserTyping={typingState?.isTyping || false}
            isCurrentChatMuted={currentConversation?.is_muted || false}
            muteLoading={muteLoading}
            canShowUserMenu={true}
            showUserMenu={showUserMenu}
            onGoBack={() => navigation.goBack()}
            onToggleUserMenu={handleToggleUserMenu}
            onToggleMute={async () => peerUserId && handleToggleMute(peerUserId)}
            onToggleGroupOptions={() => { }}
            formatLastSeen={formatLastSeen}
            formatTime={formatTime}
            styles={styles}
            currentConversationId={conversationId}
          />

          {showAcceptRejectPanel && (
            <AcceptRejectPanel
              onAccept={handleAcceptChat}
              onReject={handleRejectChat}
              isLoading={isAcceptingReject}
              username={currentConversation?.peer_username || currentConversation?.other_user?.username}
            />
          )}

          <KeyboardAvoidingView
            style={[styles.keyboardAvoid, { height: availableHeight }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + headerHeight : 0}
          >
            <View style={{ flex: 1, height: availableHeight }}>
              <FlatList
                ref={flatListRef}
                data={currentMessages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()}
                {...getOptimizedFlatListProps(80, {
                  initialNumToRender: 15,
                  maxToRenderPerBatch: 10,
                  windowSize: 21,
                  removeClippedSubviews: Platform.OS === 'android',
                })}
                contentContainerStyle={[
                  styles.messageList,
                  { minHeight: availableHeight - 80 }
                ]}
                style={{ flex: 1 }}
                onContentSizeChange={scrollToBottom}
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { minHeight: availableHeight - 80 }]}>
                    <Text style={styles.emptyText}>
                      {isChatDisabled
                        ? 'Start a conversation by sending a message'
                        : 'No messages yet'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  typingState?.isTyping ? (
                    <TypingIndicator username={typingState.user?.username} />
                  ) : null
                }
              />

              <ChatInput
                onSend={handleSendMessage}
                onTyping={handleTyping}
                onTypingStop={handleTypingStop}
                disabled={isChatDisabled}
                isSending={isSendingMessage}
                placeholder={
                  isChatDisabled
                    ? currentConversation?.status === 'pending'
                      ? 'Accept chat to start messaging'
                      : 'Chat not available'
                    : 'Type a message...'
                }
              />
            </View>
          </KeyboardAvoidingView>

          <ChatDetailModals
            showImagePreview={showImagePreview}
            selectedImage={selectedImage}
            onCloseImagePreview={() => {
              dispatch(setShowImagePreview(false));
              dispatch(setSelectedImage(null));
            }}
            showBlockedUsersModal={showBlockedUsersModal}
            blockedUsers={blockedUsers}
            onCloseBlockedUsers={() => setShowBlockedUsersModal(false)}
            onUnblockUser={handleUnblockUser}
            showUserMenu={showUserMenu}
            canShowUserMenu={true}
            onCloseUserMenu={() => setShowUserMenu(false)}
            onToggleMute={() => peerUserId && handleToggleMute(peerUserId)}
            onBlockUser={handleBlockUser}
            onDeleteChat={handleDeleteChat}
            onOpenBlockedUsers={() => setShowBlockedUsersModal(true)}
            styles={styles}
            dispatch={dispatch}
            logger={logger}
            isPeerMuted={currentConversation?.is_muted}
            isPeerBlocked={false} // Would need to check against blocked list
          />
        </SafeAreaView>
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Dark theme
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Dark border
    backgroundColor: '#000000', // Dark theme
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  headerStatus: {
    fontSize: 12,
    color: '#CCCCCC', // Light grey
    marginTop: 2,
  },
  headerAvatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  keyboardAvoid: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 5,
  },
  userMenuDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#40444B', // Dark theme menu
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 14,
    color: '#FFFFFF', // White text for dark menu
    marginLeft: 12,
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  imagePreviewSafeArea: {
    flex: 1,
  },
  imagePreviewHeader: {
    padding: 16,
    alignItems: 'flex-end',
  },
  imagePreviewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    justifyContent: 'space-between',
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  blockedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  blockedUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  blockedUserDetails: {
    flex: 1,
  },
  blockedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  blockedUserId: {
    fontSize: 12,
    color: '#6B7280',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E6FFFA',
    borderRadius: 16,
  },
  unblockButtonText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyBlockedUsers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyBlockedUsersText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ChatScreen;
