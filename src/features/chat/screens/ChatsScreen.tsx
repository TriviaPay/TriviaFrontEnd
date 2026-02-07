import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Keyboard,
  InteractionManager,
  Modal,
  Pressable,
  PanResponder,
  Platform,
  Alert
} from 'react-native';
import { useIsMounted } from '../../../hooks/useIsMounted';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { RootState } from '../../../store';
import useKeyboardStatus from '../../../core/hooks/useKeyboardStatus';
import { useGlobalChat, GlobalChatMessage } from '../../../hooks/useGlobalChat';
import { usePrivateChat, PrivateConversation } from '../../../hooks/usePrivateChat';
import { useChatMute } from '../../../hooks/useChatMute';
import { useSafeArea } from '../../../hooks/useSafeArea';
import { usePlatformOptimization, useHapticFeedback } from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { KeyboardManager } from '../../../core/keyboard/KeyboardManager';
import { usePlatform } from '../../../core/hooks/usePlatform';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { spacing } from '../../../theme/spacing';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';
import OptimizedImage from '../../../components/OptimizedImage';
import { logger } from '../../../lib/utils/logger';

import { ChatMessageItem, UIMessage } from '../../../components/chat/ChatMessageItem';
import { useGetBlockedUsersQuery, useUnblockUserMutation } from '../../../store/api/chatApi';

// Helper function to check if URL is a Lottie file
const isLottieFile = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.json') || url.includes('.json?') || url.includes('.json&') || url.includes('lottiefiles.com');
};

// Swipeable message wrapper for swipe-to-reply (without animations)
const SwipeableMessage: React.FC<{
  children: React.ReactNode;
  onSwipeReply: () => void;
  onLongPress: () => void;
}> = memo(({ children, onSwipeReply, onLongPress }) => {
  const swipeThreshold = 50;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > swipeThreshold) {
          onSwipeReply();
        }
      },
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      <SoundTouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.9}
        delayLongPress={500}
      >
        {children}
      </SoundTouchableOpacity>
    </View>
  );
});

SwipeableMessage.displayName = 'SwipeableMessage';

interface ChatsScreenProps { }

interface ChatMessage {
  id: number;
  username: string;
  message: string;
  avatar: string;
  timestamp: string;
  isOwn: boolean;
  user_id?: string;
  is_from_trivia_live?: boolean;
  profile_pic?: string;
  avatar_url?: string | null;
  badge?: {
    image_url?: string;
    name?: string;
  } | null;
  reply_to?: {
    id: number;
    message: string;
    sender: string;
  } | null;
  level?: number | null;
}

type ChatTab = 'GLOBAL' | 'PERSONAL';

// Interface for personal chat user
interface PersonalChatUser {
  id: number; // conversation_id
  name: string;
  avatar: string | null;
  avatar_url?: string | null;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: 'online' | 'offline';
  messages: ChatMessage[];
  peer_user_id?: number; // Store peer_user_id directly to avoid lookup issues
  peer_online?: boolean;
  peer_last_seen?: string | null;
  badge?: {
    image_url?: string;
    name?: string;
  } | null;
  conversationId?: number; // Added for explicit chat lookups
}

const ChatsScreen: React.FC<ChatsScreenProps> = () => {
  // CRITICAL: Mount tracking to prevent state updates after unmount
  const isMounted = useIsMounted();

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  const safeArea = useSafeArea();
  // Status bar is handled by MainNavigator - removed to prevent conflicts
  usePlatformOptimization();

  // Responsive design hooks
  const {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    deviceType,
    width: screenWidth,
    height: screenHeight,
  } = useStandardResponsive();

  // Create responsive styles
  const styles = useMemo(() => createStyles(scaleFont, scaleSizeFunc, getSpacing, getVerticalSpacing, getHorizontalSpacing), [scaleFont, scaleSizeFunc, getSpacing, getVerticalSpacing, getHorizontalSpacing]);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation();
  const route = useRoute();

  // Track scroll state to prevent auto-scroll when user is manually scrolling
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Get initialTab from route params if provided
  const routeParams = route.params as { initialTab?: 'GLOBAL' | 'PERSONAL' } | undefined;
  const initialTab = routeParams?.initialTab || 'GLOBAL';

  const [activeTab, setActiveTab] = useState<ChatTab>(initialTab);

  // Optimized tab switching - immediate and reliable
  const handleTabSwitch = useCallback((newTab: ChatTab) => {
    if (isMounted()) {
      // Update immediately for instant UI feedback - always update regardless of current tab
      setActiveTab(newTab);
    }
  }, [isMounted]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; message: string; sender: string } | null>(null);
  const [showGlobalChatMenu, setShowGlobalChatMenu] = useState(false);
  const [showPersonalChatMenu, setShowPersonalChatMenu] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const headerMenuButtonRef = useRef<View>(null);
  const personalMenuButtonRef = useRef<View>(null);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [personalMenuButtonLayout, setPersonalMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Redux state
  const { user } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.profile);

  // Global chat hook with real API and Pusher
  const { messages: globalChatMessages, loading: globalChatLoading, sending: globalChatSending, sendMessage: sendGlobalMessage, fetchMessages: fetchGlobalMessages } = useGlobalChat({
    limit: 50,
    autoFetch: true,
  });

  // Private chat hook with real API and Pusher
  const {
    conversations: privateConversations,
    loading: privateChatsLoading,
    fetchConversations: refreshPrivateChats
  } = usePrivateChat();

  // Chat mute preferences hook - for global chat mute
  const {
    isGlobalChatMuted,
    toggleGlobalChat,
    loading: muteLoading,
  } = useChatMute({ autoFetch: true });

  // Blocked users hooks - always call hooks unconditionally (React rules)
  const { data: blockedUsersData, refetch: refetchBlockedUsers } = useGetBlockedUsersQuery();
  const blockedUsers = blockedUsersData?.blocked_users || [];
  const [unblockUserMutation] = useUnblockUserMutation();

  // Format last seen time helper function
  const formatLastSeen = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }, []);

  // Transform private conversations to PersonalChatUser format - memoized for performance
  const personalChatUsers: PersonalChatUser[] = useMemo(() => privateConversations.map((conv) => {
    // Format last message time
    const lastMessageDate = new Date(conv.last_message_at);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24));

    let formattedTime: string;
    if (diffInDays === 0) {
      formattedTime = lastMessageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInDays === 1) {
      formattedTime = 'Yesterday';
    } else if (diffInDays < 7) {
      formattedTime = `${diffInDays} days ago`;
    } else {
      formattedTime = lastMessageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Determine status based on peer_online and peer_last_seen
    let status: 'online' | 'offline' = 'offline';
    if (conv.peer_online === true) {
      status = 'online';
    } else if (conv.peer_online === false && conv.peer_last_seen) {
      status = 'offline';
    }

    return {
      id: conv.conversation_id,
      name: conv.peer_username,
      avatar: conv.peer_profile_pic || conv.peer_avatar_url || null, // Priority: profile_pic first, then avatar_url
      avatar_url: conv.peer_avatar_url || null,
      lastMessage: (conv as any).last_message || (conv as any).last_message_text || '', // Get last message text if available
      timestamp: formattedTime,
      unread: conv.unread_count,
      status: status,
      messages: [], // Will be loaded when conversation is opened
      peer_user_id: conv.peer_user_id, // Store peer_user_id directly to avoid lookup issues
      peer_online: conv.peer_online,
      peer_last_seen: conv.peer_last_seen,
      badge: (conv as any).peer_badge || null, // Add badge from conversation
    };
  }), [privateConversations]);

  // Filter users based on search query
  const filteredPersonalUsers = useMemo(() => {
    if (!searchQuery.trim()) return personalChatUsers;

    return personalChatUsers.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [personalChatUsers, searchQuery]);

  // Keyboard status
  const { keyboardShown, keyboardHeight } = useKeyboardStatus();

  // Aggressive prefetching: Prefetch everything when screen is focused
  // Show cached data immediately, refresh in background
  // Track if initial load is done to prevent repeated calls
  const initialLoadDoneRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!isMounted()) return;

      // Only fetch on first focus - use cached data after that
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true;

        // Show cached conversations immediately (no loading)
        // Refresh in background (non-blocking) - silent error handling
        refreshPrivateChats().catch(() => {
          // Silent fail - don't show errors
        });

        // Refresh global chat messages when screen is focused (only once)
        if (activeTab === 'GLOBAL') {
          fetchGlobalMessages().catch(() => {
            // Silent fail - don't show errors
          });
        }
      }

      return () => {
        // Cleanup on unfocus - don't reset initialLoadDoneRef to allow cached data to persist
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted]) // Remove dependencies to prevent re-running
  );

  // Respect initialTab from route params only on initial mount
  // This prevents flickering when user comes from different screens
  const hasSetInitialTabRef = useRef(false);
  useEffect(() => {
    if (!hasSetInitialTabRef.current && routeParams?.initialTab && isMounted()) {
      hasSetInitialTabRef.current = true;
      setActiveTab(routeParams.initialTab);
    }
  }, []); // Only run once on mount

  // Fetch global chat messages when switching to GLOBAL tab (only if not already loaded)
  const globalMessagesLoadedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'GLOBAL' && isMounted() && !globalMessagesLoadedRef.current) {
      globalMessagesLoadedRef.current = true;
      // Use cached data first, fetch in background silently
      fetchGlobalMessages().catch(() => {
        // Silent fail - don't show errors, use cached data
      });
      // Reset scroll flag when switching to GLOBAL tab to ensure scroll to bottom
      hasScrolledToBottomRef.current = false;
    } else if (activeTab !== 'GLOBAL') {
      // Reset when switching away from GLOBAL tab
      globalMessagesLoadedRef.current = false;
      hasScrolledToBottomRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isMounted]); // Remove fetchGlobalMessages from deps to prevent loops

  // Transform global chat messages to ChatMessage format
  // Sort by created_at (oldest first, newest at bottom) and filter invalid messages
  const globalMessages: ChatMessage[] = globalChatMessages
    .filter((msg: GlobalChatMessage) => {
      const isValid = msg.user_id != null && msg.id != null && msg.created_at && msg.message;
      if (!isValid) {

      }
      return isValid;
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((msg: GlobalChatMessage) => {
      // Get current user ID from profile.account_id (numeric) - this is the actual user ID
      // user.id in auth is email (string), but profile.account_id is the numeric ID used by API
      // Handle both number and string types
      let currentUserId: number | null = null;
      if (profile?.account_id) {
        currentUserId = typeof profile.account_id === 'number' ? profile.account_id : (typeof profile.account_id === 'string' ? parseInt(profile.account_id, 10) : null);
        if (currentUserId !== null && isNaN(currentUserId)) {
          currentUserId = null;
        }
      }
      if (!currentUserId && user?.id) {
        if (typeof user.id === 'number') {
          currentUserId = user.id;
        } else if (typeof user.id === 'string') {
          const parsedUserId = parseInt(user.id, 10);
          currentUserId = isNaN(parsedUserId) ? null : parsedUserId;
        }
      }

      const rawMessageUserId = typeof msg.user_id === 'number' ? msg.user_id : (typeof msg.user_id === 'string' ? parseInt(msg.user_id, 10) : null);
      const messageUserId = rawMessageUserId !== null && !isNaN(rawMessageUserId) ? rawMessageUserId : null;
      const messageDate = new Date(msg.created_at);
      const fallbackUsername = (profile?.username || user?.username || user?.email || '').trim().toLowerCase();
      const messageUsername = (msg.username || '').trim().toLowerCase();

      // Check if message is from current user (strict numeric comparison with type handling)
      // CRITICAL: This determines message alignment - own messages go RIGHT, others go LEFT
      let isOwn = false;
      if (currentUserId !== null && messageUserId !== null) {
        isOwn = currentUserId === messageUserId;
      } else if (fallbackUsername && messageUsername) {
        isOwn = fallbackUsername === messageUsername;
      } else if (msg.id < 0) {
        // Optimistic/local messages (negative IDs) must stay on right
        isOwn = true;
      }

      // Debug logging for user ID comparison
      if (globalChatMessages.indexOf(msg) < 2) {

      }

      // Format time from API response: Convert ISO timestamp to local time properly
      // The API returns ISO 8601 format (e.g., "2025-11-20T05:59:17.484173")
      // Convert to local time and display in HH:MM AM/PM format
      const localDate = new Date(messageDate);
      const formattedTime = localDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      return {
        id: msg.id,
        username: msg.username,
        message: msg.message,
        avatar: msg.profile_pic,
        profile_pic: msg.profile_pic,
        avatar_url: msg.avatar_url || null,
        badge: msg.badge || null,
        timestamp: formattedTime,
        isOwn: isOwn,
        user_id: messageUserId !== null ? messageUserId.toString() : undefined,
        is_from_trivia_live: msg.is_from_trivia_live || false,
        reply_to: msg.reply_to ? {
          id: msg.reply_to.id || 0,
          message: msg.reply_to.message || '',
          sender: msg.reply_to.sender || '',
        } : null,
        level: msg.level,
      };
    });

  // Get messages based on active tab
  const getMessages = (): ChatMessage[] => {
    return activeTab === 'GLOBAL' ? globalMessages : [];
  };

  const displayMessages = getMessages();

  // Debug: Log message counts
  useEffect(() => {
    if (activeTab === 'GLOBAL') {

      if (globalMessages.length > 0) {

      }
    }
  }, [globalChatMessages.length, globalMessages.length, activeTab, user?.id]);

  // Track timeouts for cleanup to prevent memory leaks
  const scrollTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Handle scroll events to track user scrolling and position
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollOffset = contentOffset.y;
    const contentHeight = contentSize.height;
    const containerHeight = layoutMeasurement.height;

    // Check if user is near bottom (within 100px of bottom)
    const distanceFromBottom = contentHeight - scrollOffset - containerHeight;
    isNearBottomRef.current = distanceFromBottom < 100;

    // Show/hide scroll to bottom button (show if not near bottom)
    if (isMounted()) {
      setShowScrollToBottom(distanceFromBottom > 200);
    }

    // Mark as user scrolling
    isUserScrollingRef.current = true;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Reset user scrolling flag after scroll ends (500ms of no scrolling)
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      scrollTimeoutRef.current = null;
    }, 500);
  }, [isMounted]);

  // Scroll to bottom when messages load or tab changes - ALWAYS scroll on initial load
  const hasScrolledToBottomRef = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (activeTab === 'GLOBAL' && displayMessages.length > 0 && isMounted()) {
      // Always scroll to bottom on initial load or when switching to GLOBAL tab
      const shouldScroll = initialLoadRef.current || !hasScrolledToBottomRef.current || (!isUserScrollingRef.current && isNearBottomRef.current);

      if (shouldScroll) {
        // Use requestAnimationFrame for smoother scroll on initial load
        requestAnimationFrame(() => {
          const timeout = setTimeout(() => {
            scrollTimeoutsRef.current.delete(timeout);
            if (isMounted() && flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
              hasScrolledToBottomRef.current = true;
              initialLoadRef.current = false;
              if (isMounted()) {
                setShowScrollToBottom(false);
              }
            }
          }, 100);
          scrollTimeoutsRef.current.add(timeout);
        });
      }
    } else if (activeTab !== 'GLOBAL') {
      // Reset when switching away from GLOBAL tab
      hasScrolledToBottomRef.current = false;
    }
  }, [displayMessages.length, activeTab, isMounted]);

  // Auto-scroll when new messages arrive (from Pusher) - only if user is near bottom
  useEffect(() => {
    if (activeTab === 'GLOBAL' && displayMessages.length > 0 && isMounted() && !isUserScrollingRef.current && isNearBottomRef.current) {
      const timeout = setTimeout(() => {
        scrollTimeoutsRef.current.delete(timeout);
        if (isMounted() && !isUserScrollingRef.current && isNearBottomRef.current && flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 300);
      scrollTimeoutsRef.current.add(timeout);

      return () => {
        clearTimeout(timeout);
        scrollTimeoutsRef.current.delete(timeout);
      };
    }
  }, [globalChatMessages.length, activeTab, isMounted]);

  // Scroll to bottom when keyboard opens - only if user is near bottom
  useEffect(() => {
    if (keyboardShown && displayMessages.length > 0 && isMounted() && isNearBottomRef.current) {
      const timeout = setTimeout(() => {
        scrollTimeoutsRef.current.delete(timeout);
        if (isMounted() && isNearBottomRef.current && flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      scrollTimeoutsRef.current.add(timeout);

      return () => {
        clearTimeout(timeout);
        scrollTimeoutsRef.current.delete(timeout);
      };
    }
  }, [keyboardShown, displayMessages.length, isMounted]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup all scroll timeouts on unmount
  useEffect(() => {
    return () => {
      scrollTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      scrollTimeoutsRef.current.clear();
    };
  }, []);

  // Handle send message (only for GLOBAL tab)
  const handleSendMessage = async () => {
    if (!messageText.trim() || activeTab !== 'GLOBAL' || globalChatSending) return;

    const messageToSend = messageText.trim();

    // Create optimistic message for instant UI update
    // Use negative ID to avoid conflicts with real message IDs (which are positive)
    const optimisticId = -Date.now();
    const now = new Date().toISOString();
    const optimisticMessage: GlobalChatMessage = {
      id: optimisticId,
      user_id: profile?.account_id || 0,
      username: profile?.username || user?.username || 'You',
      profile_pic: profile?.profile_pic_url || profile?.avatar?.url || 'https://ui-avatars.com/api/?name=User&size=128',
      message: messageToSend,
      created_at: now,
      is_from_trivia_live: false,
      // Include reply_to information for frontend display
      reply_to: replyingTo ? {
        id: replyingTo.id,
        message: replyingTo.message,
        sender: replyingTo.sender,
      } : null,
    };

    // Clear message and reply IMMEDIATELY for instant UI feedback
    if (isMounted()) {
      setMessageText('');
      setReplyingTo(null);
      // Dismiss keyboard
      Keyboard.dismiss();
    }

    // Send message via API with optimistic message (optimistic message is added inside sendMessage)
    // The optimistic message is added IMMEDIATELY in sendMessage function before API call
    // Pass timestamp as client_message_id
    const clientMessageId = Date.now().toString();
    const result = await sendGlobalMessage(messageToSend, clientMessageId, optimisticMessage);

    // Scroll to bottom immediately - optimistic message should already be visible
    // Use requestAnimationFrame to ensure state has updated
    if (isMounted()) {
      requestAnimationFrame(() => {
        if (isMounted()) {
          const timeout = setTimeout(() => {
            scrollTimeoutsRef.current.delete(timeout);
            if (isMounted() && flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
          scrollTimeoutsRef.current.add(timeout);
        }
      });
    }

    if (!result && isMounted()) {
      // Error sending, restore message text
      setMessageText(messageToSend);
    }
  };

  // Handle opening personal chat with a user
  const handleOpenPersonalChat = (chatUser: PersonalChatUser) => {
    // Find the real conversation from private conversations (for full conversation object)
    // Note: chatUser.id is conversation_id (from line 105: id: conv.conversation_id)
    const conversation = privateConversations.find(c => c.conversation_id === chatUser.id);

    // CRITICAL: peerUserId MUST be the peer_user_id, NOT chatUser.id
    // chatUser.id is the conversation_id (e.g., 14), NOT the peer_user_id (e.g., 6055426125)
    // We now store peer_user_id directly in chatUser to avoid lookup issues
    const peerUserId = chatUser.peer_user_id || conversation?.peer_user_id;

    // Validate peerUserId before proceeding
    if (!peerUserId || peerUserId <= 0) {
      logger.error('❌ [ChatsScreen] Cannot open chat: peer_user_id is missing or invalid', 'CHAT', {
        chatUser,
        conversation,
        peerUserId,
        conversationsCount: privateConversations.length,
        allConversations: privateConversations.map(c => ({
          conversation_id: c.conversation_id,
          peer_user_id: c.peer_user_id
        }))
      });
      return;
    }

    // NOTE: Private chats use useConversationMessages hook which auto-fetches
    // No need to prefetch here - the hook will fetch when screen opens
    // Prefetching is only for DM conversations (non-private)

    const chatData = {
      id: chatUser.id, // This is conversation_id for display purposes
      name: chatUser.name,
      avatar: chatUser.avatar, // This is peer_profile_pic || peer_avatar_url || null
      avatar_url: chatUser.avatar_url, // Pass avatar_url separately for header
      message: chatUser.lastMessage,
      time: chatUser.timestamp,
      unread: chatUser.unread,
      status: chatUser.status,
      isGroup: false,
      peerUserId: peerUserId, // Use peer_user_id from chatUser or conversation
      conversationId: chatUser.id, // Pass conversation ID for API calls
    };

    // Navigate immediately - messages already prefetched
    (navigation as any).navigate('ChatDetail', {
      conversationId: chatUser.id, // chatUser.id is the conversation_id
      receiverId: peerUserId,
      receiverName: chatUser.name,
      receiverAvatar: chatUser.avatar,
      // Pass full objects for fallback
      chat: chatData,
      conversation: conversation || undefined, // Pass conversation if found
    });
  };

  // Handle long press on message for reply
  const handleMessageLongPress = useCallback((messageId: number, messageText: string, sender: string) => {
    setReplyingTo({ id: messageId, message: messageText, sender });
  }, []);

  // Handle swipe to reply
  const handleSwipeReply = useCallback((messageId: number, messageText: string, sender: string) => {
    setReplyingTo({ id: messageId, message: messageText, sender });
    // Focus input after swipe reply
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle scroll to bottom button click
  const handleScrollToBottom = useCallback(() => {
    if (flatListRef.current && isMounted()) {
      // First scroll without animation to ensure we reach the end
      flatListRef.current.scrollToEnd({ animated: false });
      // Then do a small animated scroll to give feedback
      requestAnimationFrame(() => {
        if (flatListRef.current && isMounted()) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      });
      // Use scrollToOffset to ensure we go to the very end
      setTimeout(() => {
        if (flatListRef.current && isMounted()) {
          // Scroll to a very large offset to ensure we reach the end
          flatListRef.current.scrollToOffset({ offset: 999999, animated: true });
          // Also try scrollToEnd as backup
          requestAnimationFrame(() => {
            if (flatListRef.current && isMounted()) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          });
        }
      }, 50);
      // Hide button after scrolling
      setTimeout(() => {
        if (isMounted()) {
          setShowScrollToBottom(false);
        }
      }, 500);
    }
  }, [isMounted]);

  // Render chat message - proper alignment like WhatsApp (for GLOBAL tab)
  // CRITICAL: User's own messages ALWAYS on RIGHT, others on LEFT
  // Render chat message - proper alignment like WhatsApp (for GLOBAL tab)
  // CRITICAL: User's own messages ALWAYS on RIGHT, others on LEFT
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    // Map ChatMessage to UIMessage for ChatMessageItem
    // NOTE: We map 'username' to 'sender' and 'message' to 'text'
    const uiMessage: UIMessage = {
      id: item.id,
      text: item.message,
      sender: item.username,
      timestamp: item.timestamp,
      status: 'sent', // Default to sent for global chat as we don't track status meticulously here
      isUser: item.isOwn,
      profile_pic: item.profile_pic,
      avatar_url: item.avatar_url,
      badge: item.badge,
      reply_to: item.reply_to,
      image: null, // Global chat doesn't support images yet
      isTriviaLive: item.is_from_trivia_live,
      level: item.level || undefined,
    };

    return (
      <ChatMessageItem
        item={uiMessage}
        isGroupChat={true} // Global chat is effectively a group chat
        isPrivateChat={false}
        styles={styles}
        onLongPress={(id, text, sender) => handleMessageLongPress(id, text, sender)}
        onSwipeReply={(id, text, sender) => handleSwipeReply(id, text, sender)}
        level={item.level || undefined}
      />
    );
  }, [handleMessageLongPress, handleSwipeReply]);


  // Render personal chat user item (for PERSONAL tab)
  const renderPersonalChatUser = useCallback(({ item }: { item: PersonalChatUser }) => {
    // INSTANT prefetch private chat messages when user touches conversation
    const handlePressIn = () => {
      try {
        const { prefetchService } = require('../../services/prefetchService');
        if (item.conversationId) {
          // Prefetch private chat messages immediately on touch
          prefetchService.prefetchPrivateChatMessages(item.conversationId).catch(() => { });
        }
      } catch (error) {
        // Silent fail
      }
    };

    return (
      <SoundTouchableOpacity
        style={styles.personalChatItem}
        onPressIn={handlePressIn}
        onPress={() => handleOpenPersonalChat(item)}
        activeOpacity={0.7}
      >
        {/* Display avatar_url if available, otherwise profile_pic, otherwise initial */}
        {item.avatar_url && typeof item.avatar_url === 'string' && item.avatar_url.trim().length > 0 && item.avatar_url !== 'null' ? (
          <View style={styles.personalChatAvatarContainer}>
            {/* Avatar */}
            {isLottieFile(item.avatar_url) ? (
              <LottieView
                key={`list-avatar-${item.id}-${item.avatar_url}`}
                source={{ uri: item.avatar_url }}
                autoPlay
                loop
                renderMode="SOFTWARE"
                cacheStrategy="weak"
                cacheComposition={false}
                style={styles.personalChatAvatar}
                resizeMode="contain"
              />
            ) : (
              <OptimizedImage
                source={{ uri: item.avatar_url }}
                style={styles.personalChatAvatar}
                resizeMode="contain"
              />
            )}
          </View>
        ) : item.avatar && typeof item.avatar === 'string' && item.avatar.trim().length > 0 && item.avatar !== 'null' ? (
          <View style={styles.personalChatAvatarContainer}>
            <OptimizedImage
              source={{ uri: item.avatar }}
              style={styles.personalChatAvatarFallback}
            />
          </View>
        ) : (
          <View style={styles.personalChatAvatarContainer}>
            <View style={[styles.personalChatAvatarFallback, { backgroundColor: '#9333EA', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600' }}>
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.personalChatInfo}>
          <View style={styles.personalChatHeader}>
            <View style={styles.personalChatNameRow}>
              <Text style={styles.personalChatName}>{item.name}</Text>
              {/* Badge - beside username, 2px left and 2px up, no gap, full display */}
              {item.badge?.image_url && typeof item.badge.image_url === 'string' && item.badge.image_url.trim().length > 0 && item.badge.image_url !== 'null' && (
                <OptimizedImage
                  source={{ uri: item.badge.image_url }}
                  style={styles.personalChatBadge}
                  resizeMode="contain"
                />
              )}
            </View>
            <Text style={styles.personalChatTime}>{item.timestamp}</Text>
          </View>
          <View style={styles.personalChatFooter}>
            <View style={styles.personalChatMessageRow}>
              <Text style={styles.personalChatLastMessage} numberOfLines={1}>
                {item.lastMessage || (item.timestamp ? 'No messages yet' : 'Start a conversation...')}
              </Text>
              {item.unread > 0 && (
                <View style={styles.personalChatUnreadBadge}>
                  <Text style={styles.personalChatUnreadText}>{item.unread}</Text>
                </View>
              )}
            </View>
            {/* Show online status or last seen below message */}
            {item.status === 'online' ? (
              <Text style={styles.personalChatStatus}>online</Text>
            ) : item.peer_last_seen ? (
              <Text style={styles.personalChatStatus}>
                last seen {formatLastSeen(item.peer_last_seen)}
              </Text>
            ) : null}
          </View>
        </View>
        {item.status === 'online' && (
          <View style={styles.onlineIndicator} />
        )}
      </SoundTouchableOpacity>
    );
  }, [formatLastSeen]);

  const platform = usePlatform();

  return (
    <ScreenErrorBoundary screenName="ChatsScreen">
      <ScreenBackButtonHandler action="navigate" />
      <View style={[styles.container, { width: '100%', height: '100%' }]}>
        {/* CRITICAL: Status bar is hidden for Chats, no safe area edges needed to prevent overlap */}
        <SafeAreaView style={[styles.safeArea, { width: '100%', height: '100%', paddingTop: 0 }]} edges={[]}>
          <KeyboardManager
            style={styles.keyboardView}
          >
            {/* Header - TRIVIA COIN CHAT */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>
                    TRIVIA COIN CHAT
                  </Text>
                </View>
                {activeTab === 'GLOBAL' && (
                  <View
                    ref={headerMenuButtonRef}
                    onLayout={(event) => {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      headerMenuButtonRef.current?.measure((fx, fy, fwidth, fheight, px, py) => {
                        setMenuButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                      });
                    }}
                  >
                    <SoundTouchableOpacity
                      onPress={() => setShowGlobalChatMenu(true)}
                      style={styles.headerMenuButton}
                      activeOpacity={0.7}
                    >
                      <Icon name="dots-vertical" size={24} color="#FFFFFF" />
                    </SoundTouchableOpacity>
                  </View>
                )}
                {activeTab === 'PERSONAL' && (
                  <View
                    ref={personalMenuButtonRef}
                    onLayout={(event) => {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      personalMenuButtonRef.current?.measure((fx, fy, fwidth, fheight, px, py) => {
                        setPersonalMenuButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                      });
                    }}
                  >
                    <SoundTouchableOpacity
                      onPress={() => setShowPersonalChatMenu(true)}
                      style={styles.headerMenuButton}
                      activeOpacity={0.7}
                    >
                      <Icon name="dots-vertical" size={24} color="#FFFFFF" />
                    </SoundTouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Tabs - GLOBAL and PERSONAL */}
            <View style={styles.tabsContainer}>
              <SoundTouchableOpacity
                style={[styles.tab, activeTab === 'GLOBAL' && styles.tabActive]}
                onPress={() => handleTabSwitch('GLOBAL')}
                activeOpacity={0.7}
              >
                <Icon
                  name="earth"
                  size={18}
                  color={activeTab === 'GLOBAL' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabText, activeTab === 'GLOBAL' && styles.tabTextActive]}>
                  GLOBAL
                </Text>
              </SoundTouchableOpacity>

              <SoundTouchableOpacity
                style={[styles.tab, activeTab === 'PERSONAL' && styles.tabActive]}
                onPress={() => handleTabSwitch('PERSONAL')}
                activeOpacity={0.7}
              >
                <Icon
                  name="account-multiple"
                  size={18}
                  color={activeTab === 'PERSONAL' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabText, activeTab === 'PERSONAL' && styles.tabTextActive]}>
                  PRIVATE
                </Text>
              </SoundTouchableOpacity>
            </View>

            {/* Messages List or Personal Chats List */}
            {activeTab === 'GLOBAL' ? (
              <View style={{ flex: 1, position: 'relative' }}>
                <FlatList
                  ref={flatListRef}
                  data={displayMessages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={[
                    styles.messagesContent,
                    platform.isAndroid && keyboardShown && { paddingBottom: keyboardHeight - 80 }
                  ]}
                  style={styles.messagesList}
                  inverted={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  refreshing={false}
                  onRefresh={() => {
                    // Refresh in background - no loading indicator
                    fetchGlobalMessages().catch(() => { });
                  }}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  initialNumToRender={25}
                  maxToRenderPerBatch={15}
                  windowSize={21}
                  removeClippedSubviews={platform.isAndroid}
                  updateCellsBatchingPeriod={50}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10,
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No messages yet</Text>
                      <Text style={styles.emptySubtext}>Start chatting!</Text>
                    </View>
                  }
                  onContentSizeChange={() => {
                    // Always scroll to bottom when content size changes on initial load or if user is near bottom
                    if (displayMessages.length > 0 && isMounted() && flatListRef.current) {
                      if (initialLoadRef.current || (!isUserScrollingRef.current && isNearBottomRef.current)) {
                        requestAnimationFrame(() => {
                          if (flatListRef.current && isMounted()) {
                            flatListRef.current.scrollToEnd({ animated: false });
                          }
                        });
                      }
                    }
                  }}
                  onLayout={() => {
                    if (displayMessages.length > 0 && isMounted() && !isUserScrollingRef.current && isNearBottomRef.current) {
                      const timeout = setTimeout(() => {
                        scrollTimeoutsRef.current.delete(timeout);
                        if (isMounted() && !isUserScrollingRef.current && isNearBottomRef.current && flatListRef.current) {
                          flatListRef.current.scrollToEnd({ animated: false });
                        }
                      }, 100);
                      scrollTimeoutsRef.current.add(timeout);
                    }
                  }}
                />
                {/* Scroll to bottom button */}
                {showScrollToBottom && activeTab === 'GLOBAL' && (
                  <SoundTouchableOpacity
                    style={styles.scrollToBottomButton}
                    onPress={handleScrollToBottom}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-double-down" size={18} color="#000000" />
                  </SoundTouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Icon name="magnify" size={20} color="rgba(255, 255, 255, 0.5)" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search conversations..."
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                      <SoundTouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={18} color="rgba(255, 255, 255, 0.5)" />
                      </SoundTouchableOpacity>
                    )}
                  </View>
                </View>

                <FlatList
                  data={filteredPersonalUsers}
                  renderItem={renderPersonalChatUser}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.personalChatsContent}
                  style={styles.messagesList}
                  {...getOptimizedFlatListProps(80, {
                    initialNumToRender: 10,
                    maxToRenderPerBatch: 5,
                    windowSize: 10,
                    removeClippedSubviews: platform.isAndroid,
                    updateCellsBatchingPeriod: 50,
                  })}
                  getItemLayout={(data, index) => ({
                    length: 80, // Approximate personal chat item height
                    offset: 80 * index,
                    index,
                  })}
                  refreshing={false}
                  onRefresh={() => {
                    // Refresh in background - no loading indicator
                    refreshPrivateChats().catch(() => { });
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        {searchQuery ? 'No users found' : 'No personal chats yet'}
                      </Text>
                      <Text style={styles.emptySubtext}>
                        {searchQuery ? 'Try a different search term' : 'Start a conversation!'}
                      </Text>
                    </View>
                  }
                />
              </View>
            )}

            {/* Input Field - Only show for GLOBAL tab */}
            {activeTab === 'GLOBAL' && (
              <View>
                {/* Reply preview - above input (WhatsApp style) */}
                {replyingTo && (
                  <View style={styles.replyPreviewContainerGlobal}>
                    <View style={styles.replyPreviewContentGlobal}>
                      <Text style={styles.replyPreviewSenderGlobal}>{replyingTo.sender}</Text>
                      <Text style={styles.replyPreviewMessageGlobal} numberOfLines={1}>
                        {replyingTo.message}
                      </Text>
                    </View>
                    <SoundTouchableOpacity
                      onPress={() => setReplyingTo(null)}
                      style={styles.replyCancelButtonGlobal}
                    >
                      <Icon name="close" size={20} color="#FFFFFF" />
                    </SoundTouchableOpacity>
                  </View>
                )}
                <View
                  style={[
                    styles.inputContainer,
                    platform.isAndroid && keyboardShown && {
                      paddingBottom: 0,
                      marginBottom: 0
                    }
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder="Type your message..."
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                      maxLength={1000}
                      returnKeyType="send"
                      blurOnSubmit={false}
                      onSubmitEditing={handleSendMessage}
                      keyboardAppearance="dark"
                      textAlignVertical="center"
                    />
                  </View>
                  <SoundTouchableOpacity
                    style={[styles.sendButton, (!messageText.trim() || globalChatSending) && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || globalChatSending}
                    activeOpacity={0.7}
                  >
                    {globalChatSending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Icon name="send" size={20} color="#FFFFFF" />
                    )}
                  </SoundTouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardManager>

          {/* Global Chat Menu Modal */}
          <Modal
            visible={showGlobalChatMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowGlobalChatMenu(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowGlobalChatMenu(false)}
            >
              <View
                style={[
                  styles.modalContent,
                  {
                    position: 'absolute',
                    top: menuButtonLayout.y > 0 ? menuButtonLayout.y + menuButtonLayout.height + scaleSizeFunc(8) : scaleSizeFunc(60),
                    right: scaleSizeFunc(16),
                  }
                ]}
              >
                <SoundTouchableOpacity
                  style={styles.modalMenuItem}
                  onPress={async () => {
                    await toggleGlobalChat();
                    setShowGlobalChatMenu(false);
                  }}
                  disabled={muteLoading}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isGlobalChatMuted ? "bell-off" : "bell-outline"}
                    size={20}
                    color={isGlobalChatMuted ? "#EF4444" : "#FFFFFF"}
                    style={styles.modalMenuIcon}
                  />
                  <Text style={styles.modalMenuText}>
                    {isGlobalChatMuted ? "Unmute Group Chat" : "Mute Group Chat"}
                  </Text>
                </SoundTouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          {/* Personal Chat Menu Modal */}
          <Modal
            visible={showPersonalChatMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPersonalChatMenu(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowPersonalChatMenu(false)}
            >
              <View
                style={[
                  styles.modalContent,
                  {
                    position: 'absolute',
                    top: personalMenuButtonLayout.y > 0 ? personalMenuButtonLayout.y + personalMenuButtonLayout.height + scaleSizeFunc(8) : scaleSizeFunc(60),
                    right: scaleSizeFunc(16),
                  }
                ]}
              >
                <SoundTouchableOpacity
                  style={styles.modalMenuItem}
                  onPress={() => {
                    setShowPersonalChatMenu(false);
                    setShowBlockedUsersModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="account-cancel"
                    size={20}
                    color="#9333EA"
                    style={styles.modalMenuIcon}
                  />
                  <Text style={styles.modalMenuText}>View Blocked Users</Text>
                </SoundTouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          {/* Blocked Users Modal */}
          <Modal
            visible={showBlockedUsersModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowBlockedUsersModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.blockedUsersModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Blocked Users</Text>
                  <SoundTouchableOpacity
                    onPress={() => setShowBlockedUsersModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </SoundTouchableOpacity>
                </View>

                {blockedUsers.length === 0 ? (
                  <View style={styles.emptyBlockedUsers}>
                    <Icon name="account-check" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyBlockedUsersText}>No blocked users</Text>
                    <Text style={styles.emptyBlockedUsersSubtext}>You haven't blocked any users yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={blockedUsers}
                    keyExtractor={(item: any) => item.user_id?.toString() || Math.random().toString()}
                    {...getOptimizedFlatListProps(70, {
                      initialNumToRender: 10,
                      maxToRenderPerBatch: 5,
                      windowSize: 10,
                      removeClippedSubviews: Platform.OS === 'android',
                    })}
                    renderItem={({ item }: { item: any }) => (
                      <View style={styles.blockedUserItem}>
                        <View style={styles.blockedUserInfo}>
                          <View style={styles.blockedUserAvatar}>
                            <Text style={styles.blockedUserAvatarText}>
                              {item.username?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={styles.blockedUserDetails}>
                            <Text style={styles.blockedUserName}>{item.username || 'Unknown User'}</Text>
                            <Text style={styles.blockedUserId}>ID: {item.user_id}</Text>
                          </View>
                        </View>
                        <SoundTouchableOpacity
                          style={styles.unblockButton}
                          onPress={async () => {
                            try {
                              await unblockUserMutation(item.user_id).unwrap();
                              refetchBlockedUsers();
                              Alert.alert('Success', 'User has been unblocked');
                            } catch (error: any) {
                              Alert.alert('Error', 'Failed to unblock user');
                            }
                          }}
                        >
                          <Icon name="lock-open" size={18} color="#059669" />
                          <Text style={styles.unblockButtonText}>Unblock</Text>
                        </SoundTouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </ScreenErrorBoundary>
  );
};

// Create responsive styles function
const createStyles = (scaleFont: (size: number) => number, scaleSize: (size: number) => number, getSpacing: (multiplier: number) => number, getVerticalSpacing: (multiplier: number) => number, getHorizontalSpacing: (multiplier: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // Black background
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: getHorizontalSpacing(2),
    paddingTop: getVerticalSpacing(2.5),
    paddingBottom: getVerticalSpacing(2),
    alignItems: 'center',
    backgroundColor: '#000000', // Black background
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#a78bfa', // Purple color like before
    letterSpacing: scaleSize(2),
    textTransform: 'uppercase',
    textShadowColor: '#a78bfa',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: scaleSize(10),
  },
  headerMenuButton: {
    padding: scaleSize(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#40444B',
    borderRadius: scaleSize(12),
    paddingVertical: getVerticalSpacing(0.5),
    minWidth: scaleSize(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.25,
    shadowRadius: scaleSize(4),
    elevation: 5,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1.5),
  },
  modalMenuIcon: {
    marginRight: getHorizontalSpacing(1.5),
  },
  modalMenuText: {
    fontSize: scaleFont(16),
    color: '#FFFFFF',
  },
  // Blocked Users Modal Styles
  blockedUsersModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#36393F',
    borderRadius: scaleSize(16),
    overflow: 'hidden',
  },
  modalCloseButton: {
    padding: scaleSize(4),
  },
  emptyBlockedUsers: {
    padding: getVerticalSpacing(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBlockedUsersText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: getVerticalSpacing(2),
  },
  emptyBlockedUsersSubtext: {
    fontSize: scaleFont(14),
    color: '#9CA3AF',
    marginTop: getVerticalSpacing(1),
  },
  blockedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getHorizontalSpacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  blockedUserAvatar: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getHorizontalSpacing(1.5),
  },
  blockedUserAvatarText: {
    color: '#FFFFFF',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
  blockedUserDetails: {
    flex: 1,
  },
  blockedUserName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  blockedUserId: {
    fontSize: scaleFont(12),
    color: '#9CA3AF',
    marginTop: scaleSize(4),
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1),
    borderRadius: scaleSize(8),
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  unblockButtonText: {
    color: '#059669',
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginLeft: getHorizontalSpacing(0.75),
  },
  keyboardView: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1.5),
    backgroundColor: '#000000', // Black background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: getVerticalSpacing(1.25),
    paddingHorizontal: getHorizontalSpacing(2),
    borderRadius: scaleSize(8),
    marginHorizontal: getHorizontalSpacing(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabActive: {
    backgroundColor: '#9333EA', // Purple
  },
  tabIcon: {
    marginRight: getHorizontalSpacing(0.75),
  },
  tabText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: getVerticalSpacing(1.5),
    paddingHorizontal: getHorizontalSpacing(2),
    flexGrow: 1,
  },
  // Own message (RIGHT aligned - like WhatsApp)
  // CRITICAL: User's own messages ALWAYS on RIGHT side
  ownMessageContainer: {
    alignItems: 'flex-end', // RIGHT alignment for own messages
    marginBottom: getVerticalSpacing(1.5),
    paddingRight: 0,
  },
  ownMessageBubble: {
    backgroundColor: '#8B5CF6',
    borderRadius: scaleSize(16),
    borderTopRightRadius: scaleSize(4),
    paddingHorizontal: getHorizontalSpacing(1.5),
    paddingVertical: getVerticalSpacing(1),
    maxWidth: '75%',
    marginBottom: getVerticalSpacing(0.5),
  },
  ownMessageText: {
    fontSize: scaleFont(14),
    color: '#FFFFFF',
    lineHeight: scaleFont(20),
  },
  ownMessageTime: {
    fontSize: scaleFont(10),
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: getHorizontalSpacing(1),
  },
  // Other user's message (LEFT aligned - like WhatsApp)
  // CRITICAL: Other users' messages ALWAYS on LEFT side
  otherMessageContainer: {
    alignItems: 'flex-start', // LEFT alignment for others' messages
    marginBottom: getVerticalSpacing(1.5),
    paddingLeft: 0,
  },
  otherMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getVerticalSpacing(0.5),
    paddingLeft: 0,
  },
  messageProfileContainer: {
    position: 'relative',
    width: scaleSize(32), // Keep original size
    height: scaleSize(32), // Keep original size
    marginRight: 2, // 2px gap between profile and username
    overflow: 'visible', // Allow frame to extend outside
    minWidth: scaleSize(32),
    minHeight: scaleSize(32),
  },
  messageFrame: {
    position: 'absolute',
    // Frame should wrap around the profile pic from outside
    // Container is 32px, avatar is 24px centered at (4,4), frame is 34px
    // To center 34px frame around 24px avatar: offset = (34-24)/2 = 5px
    // Avatar is at (4,4), so frame at (4-5, 4-5) = (-1, -1) relative to container
    top: -1, // Frame extends 1px outside container on top
    left: -1, // Frame extends 1px outside container on left
    width: scaleSize(34), // 24 (avatar) + 10px = 34px to cover around avatar
    height: scaleSize(34), // 24 (avatar) + 10px = 34px to cover around avatar
    zIndex: 3,
    minWidth: scaleSize(34),
    minHeight: scaleSize(34),
  },
  messageAvatar: {
    position: 'absolute',
    // Center 24px avatar in 32px container: (32-24)/2 = 4px
    top: scaleSize(4), // Center avatar in container
    left: scaleSize(4), // Center avatar in container
    width: scaleSize(24), // Keep original avatar size
    height: scaleSize(24), // Keep original avatar size
    zIndex: 2,
    minWidth: scaleSize(24),
    minHeight: scaleSize(24),
  },
  messageProfilePic: {
    width: scaleSize(24),
    height: scaleSize(24),
    borderRadius: scaleSize(12),
    zIndex: 1,
  },
  messageSenderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap', // Prevent badge from wrapping/scrolling
  },
  messageUsername: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#FFFFFF', // White text for usernames
  },
  messageBadge: {
    width: scaleSize(16),
    height: scaleSize(16),
    marginLeft: 2, // 2px gap between username and badge
    flexShrink: 0, // Prevent badge from being compressed/scrolling
  },
  otherMessageBubble: {
    backgroundColor: '#40444B', // Discord-like message bubble color
    borderRadius: scaleSize(16),
    borderTopLeftRadius: scaleSize(4),
    paddingHorizontal: getHorizontalSpacing(1.5),
    paddingVertical: getVerticalSpacing(1),
    maxWidth: '75%',
    marginBottom: getVerticalSpacing(0.5),
  },
  otherMessageText: {
    fontSize: scaleFont(14),
    color: '#FFFFFF',
    lineHeight: scaleFont(20),
  },
  otherMessageTime: {
    fontSize: scaleFont(10),
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: getHorizontalSpacing(1),
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1.5),
    backgroundColor: '#000000', // Black background
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'flex-end',
    minHeight: scaleSize(60),
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#40444B',
    borderRadius: scaleSize(24),
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1),
    marginRight: getHorizontalSpacing(1),
    maxHeight: scaleSize(100),
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(20),
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  muteButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getHorizontalSpacing(1),
    padding: scaleSize(8),
  },
  sendButton: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    backgroundColor: '#9333EA', // Purple
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(4),
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(88, 101, 242, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getVerticalSpacing(7.5),
  },
  emptyText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: getVerticalSpacing(1),
  },
  emptySubtext: {
    fontSize: scaleFont(14),
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Personal chat list styles
  personalChatsContent: {
    paddingVertical: getVerticalSpacing(1),
  },
  personalChatItem: {
    flexDirection: 'row',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1.5),
    backgroundColor: '#40444B', // Discord-like message bubble color
    marginHorizontal: getHorizontalSpacing(2),
    marginVertical: getVerticalSpacing(0.5),
    borderRadius: scaleSize(12),
    alignItems: 'center',
    borderWidth: 0,
  },
  personalChatAvatarContainer: {
    position: 'relative',
    width: scaleSize(50), // Keep original size
    height: scaleSize(50), // Keep original size
    marginRight: getHorizontalSpacing(1.5),
    overflow: 'visible', // Allow frame to extend outside
  },
  personalChatFrame: {
    position: 'absolute',
    // Frame should wrap around the profile pic from outside
    // Container is 50px, avatar is 50px at (0,0), frame is 60px
    // To center 60px frame around 50px avatar: offset = (60-50)/2 = 5px
    // Avatar is at (0,0), so frame at (0-5, 0-5) = (-5, -5) relative to container
    top: -5, // Frame extends 5px outside container on top
    left: -5, // Frame extends 5px outside container on left
    width: scaleSize(60), // 50 (avatar) + 10px = 60px to cover around avatar
    height: scaleSize(60), // 50 (avatar) + 10px = 60px to cover around avatar
    zIndex: 3,
  },
  personalChatAvatar: {
    position: 'absolute',
    top: 0, // Avatar at container origin
    left: 0, // Avatar at container origin
    width: scaleSize(50), // Keep original avatar size
    height: scaleSize(50), // Keep original avatar size
    borderRadius: scaleSize(25),
    zIndex: 2,
  },
  personalChatAvatarFallback: {
    width: scaleSize(50),
    height: scaleSize(50),
    borderRadius: scaleSize(25),
    // No absolute positioning - it's the only element in container
  },
  personalChatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  personalChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getVerticalSpacing(0.5),
  },
  personalChatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  personalChatName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  personalChatBadge: {
    width: 16,
    height: 16,
    marginLeft: 1, // 1px gap between username and badge
    marginTop: -2, // 2px up
    flexShrink: 0,
  },
  // Reply preview above input in global chat (WhatsApp style)
  replyPreviewContainerGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getHorizontalSpacing(2),
    paddingVertical: getVerticalSpacing(1.2),
    marginBottom: getVerticalSpacing(0.5),
    marginHorizontal: getHorizontalSpacing(2),
    backgroundColor: '#2C2F33',
    borderRadius: scaleSize(6),
    borderLeftWidth: scaleSize(4),
    borderLeftColor: '#9333EA',
  },
  replyPreviewContentGlobal: {
    flex: 1,
    paddingLeft: getHorizontalSpacing(1),
  },
  replyPreviewSenderGlobal: {
    color: '#9333EA',
    fontSize: scaleFont(13),
    fontWeight: '600',
    marginBottom: getVerticalSpacing(0.3),
  },
  replyPreviewMessageGlobal: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: scaleFont(13),
    lineHeight: scaleFont(17),
  },
  replyCancelButtonGlobal: {
    padding: scaleSize(6),
    marginLeft: getHorizontalSpacing(1),
  },
  // Reply preview inside message bubble in global chat (WhatsApp style)
  replyPreviewGlobal: {
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(6),
    marginBottom: scaleSize(6),
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: scaleSize(8),
    borderLeftWidth: scaleSize(3),
    borderLeftColor: '#10B981', // Green for user's reply
  },
  replyPreviewGlobalOther: {
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(6),
    marginBottom: scaleSize(6),
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: scaleSize(8),
    borderLeftWidth: scaleSize(3),
    borderLeftColor: '#FFFFFF', // White for other's reply
  },
  replyPreviewSenderGlobalUser: {
    color: '#10B981',
    fontSize: scaleFont(12),
    fontWeight: '600',
    marginBottom: getVerticalSpacing(0.3),
  },
  replyPreviewSenderGlobalOther: {
    color: '#FFFFFF',
    fontSize: scaleFont(12),
    fontWeight: '600',
    marginBottom: getVerticalSpacing(0.3),
  },

  replyPreviewMessageGlobalOther: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scaleFont(12),
    lineHeight: scaleFont(16),
  },
  personalChatTime: {
    fontSize: scaleFont(12),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  personalChatFooter: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  personalChatMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  personalChatLastMessage: {
    fontSize: scaleFont(14),
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
    marginRight: getHorizontalSpacing(1),
  },
  personalChatStatus: {
    fontSize: scaleFont(12),
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: getVerticalSpacing(0.25),
  },
  personalChatUnreadBadge: {
    backgroundColor: '#9333EA',
    borderRadius: scaleSize(12),
    minWidth: scaleSize(24),
    height: scaleSize(24),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getHorizontalSpacing(1),
  },
  personalChatUnreadText: {
    color: '#FFFFFF',
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  onlineIndicator: {
    width: scaleSize(12),
    height: scaleSize(12),
    borderRadius: scaleSize(6),
    backgroundColor: '#10B981',
    borderWidth: scaleSize(2),
    borderColor: '#000000', // Black background
    position: 'absolute',
    bottom: getVerticalSpacing(1.5),
    left: scaleSize(54),
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: getVerticalSpacing(2),
    right: getHorizontalSpacing(2),
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(18),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.2,
    shadowRadius: scaleSize(3),
    elevation: 3,
    zIndex: 1000,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  // ChatMessageItem Compatibility Styles
  messageContainer: {
    marginBottom: getVerticalSpacing(1),
    maxWidth: '100%',
    backgroundColor: 'transparent',
    width: '100%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginRight: 'auto',
  },
  userBubble: {
    backgroundColor: '#9333EA',
    borderTopRightRadius: scaleSize(4),
    borderRadius: scaleSize(16),
    paddingHorizontal: getHorizontalSpacing(1.5),
    paddingVertical: getVerticalSpacing(1),
    maxWidth: '85%', // Prevent full width
  },
  otherBubble: {
    backgroundColor: '#40444B',
    borderTopLeftRadius: scaleSize(4),
    borderRadius: scaleSize(16),
    paddingHorizontal: getHorizontalSpacing(1.5),
    paddingVertical: getVerticalSpacing(1),
    maxWidth: '85%', // Prevent full width
  },
  messageBubble: {
    // Common bubble properties if needed, currently handled by user/other
    borderRadius: scaleSize(16),
  },
  messageText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(4),
  },
  timestamp: {
    fontSize: scaleFont(10),
    marginTop: scaleSize(2),
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    alignSelf: 'flex-end',
    marginRight: getHorizontalSpacing(1),
  },
  otherTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    alignSelf: 'flex-start',
    marginLeft: getHorizontalSpacing(1),
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: scaleFont(12),
    fontWeight: '600',
    marginBottom: scaleSize(2),
  },
  replyPreview: {
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(6),
    marginBottom: scaleSize(6),
    borderRadius: scaleSize(8),
    borderLeftWidth: scaleSize(3),
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  replyPreviewUser: {
    borderLeftColor: '#10B981',
  },
  replyPreviewOther: {
    borderLeftColor: '#FFFFFF',
  },
  replyPreviewSenderUser: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: scaleFont(12),
  },
  replyPreviewSenderOther: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: scaleFont(12),
  },
  replyPreviewBubbleMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scaleFont(12),
  },
  encryptedMessageContainer: { alignSelf: 'center', width: '90%' },
  encryptedBubble: { backgroundColor: '#333', borderRadius: 10, padding: 10 },
  encryptedTextContainer: { flexDirection: 'row', alignItems: 'center' },
  encryptedMessageText: { color: '#ccc', marginLeft: 8 },
  encryptionIndicator: { marginLeft: 5 },
  systemMessage: { alignSelf: 'center', marginVertical: 5 },
  systemMessageText: { color: '#aaa', fontSize: 12 },
  notificationMessage: { alignSelf: 'center', marginVertical: 5 },
  notificationMessageText: { color: '#aaa', fontSize: 12 },
  statusIconContainer: { marginLeft: 4 },
  messageImageContainer: { marginTop: 4 },
  messageImage: { width: 200, height: 150, borderRadius: 8 },
  messageContentContainer: { flexDirection: 'row', alignItems: 'flex-end' },
});

export default ChatsScreen;