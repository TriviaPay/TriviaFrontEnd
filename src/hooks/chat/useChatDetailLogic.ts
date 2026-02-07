/**
 * useChatDetailLogic - Business logic hook for ChatDetailScreen
 * Single Responsibility: Handles all chat detail business logic
 * Follows SOLID principles - separated from UI concerns
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useConversationMessages, usePrivateChat } from '../usePrivateChat';
// Group, message, and privacy slices removed - imports commented out
// import {
//   fetchGroupMessages,
//   sendGroupChatMessage,
//   markGroupMessageReadAction,
//   addGroupMessage,
//   removeGroupMessage,
// } from '../../store/slices/groupMessageSlice';
// import { fetchMessages, sendChatMessage, markMessageRead } from '../../store/slices/messageSlice';
// import { fetchBlockedUsers } from '../../store/slices/privacySlice';
// import { GroupMessageInternal } from '../../store/slices/groupMessageSlice';
import { subscribeToChannel, unsubscribeFromChannel } from '../../pusherClient';
import { decryptMessage } from '../../crypto/encryptor';
import { API_CONFIG } from '../../config/api';
import { authenticatedRequest } from '../../services/api/apiclient';
import { Alert, Keyboard } from 'react-native';

interface Chat {
  id: number;
  name: string;
  avatar: string;
  isGroup?: boolean;
  conversationId?: string;
  peerUserId?: number;
  groupId?: string;
  pendingRequest?: boolean;
}

interface Conversation {
  conversation_id: number;
  peer_user_id: number;
  peer_username: string;
  status?: string;
  peer_online?: boolean;
  peer_last_seen?: string | null;
  last_message_at?: string;
}

export const useChatDetailLogic = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { chat, initialMessage, conversation } = route.params as {
    chat: Chat & { conversationId?: string; peerUserId?: number; groupId?: string };
    initialMessage?: string;
    conversation?: Conversation;
  };

  // Redux state
  const { user, token } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.profile);
  // Message, conversation, group, and privacy slices removed - provide safe fallbacks
  const { items: dmMessages } = useSelector((state: RootState) => state.messages || { items: [] });
  const { currentConversation } = useSelector(
    (state: RootState) => state.conversations || { currentConversation: null }
  );
  const { items: groupMessages, loading: groupMessagesLoading } = useSelector(
    (state: RootState) => state.groupMessages || { items: [], loading: false }
  );
  const { currentGroup } = useSelector(
    (state: RootState) => state.groups || { currentGroup: null }
  );
  const { blockedUsers } = useSelector((state: RootState) => state.privacy || { blockedUsers: [] });
  // e2ee slice removed, default to false
  const encryptionEnabled = useSelector(
    (state: RootState) => state.e2ee?.encryptionEnabled || false
  );

  // Local state
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversation?.conversation_id || null
  );
  const [conversationInitialized, setConversationInitialized] = useState(false);
  const [localConversationStatus, setLocalConversationStatus] = useState<
    'pending' | 'accepted' | 'declined' | undefined
  >(undefined);
  const [detectedPendingStatus, setDetectedPendingStatus] = useState<boolean>(false);
  const [conversationStatusFromAPI, setConversationStatusFromAPI] = useState<string | undefined>(
    undefined
  );

  // Extract peerUserId
  const rawPeerUserId =
    chat.peerUserId || conversation?.peer_user_id || currentConversation?.peerUserId;
  const peerUserId: number | undefined = useMemo(() => {
    if (!rawPeerUserId) return undefined;
    const parsed =
      typeof rawPeerUserId === 'number'
        ? rawPeerUserId
        : typeof rawPeerUserId === 'string'
          ? parseInt(rawPeerUserId, 10)
          : undefined;
    if (parsed !== undefined && (isNaN(parsed) || parsed <= 0)) {
      return undefined;
    }
    return parsed;
  }, [rawPeerUserId]);

  const groupId = chat.groupId;
  const isGroupChat = chat.isGroup || !!groupId;
  const isPrivateChat = !isGroupChat && (currentConversationId || peerUserId);

  // Use conversation messages hook
  const {
    messages: privateMessages,
    loading: privateMessagesLoading,
    sending: privateSending,
    sendMessage: sendPrivateMessage,
    markAsRead,
    sendTyping,
    acceptRejectConversation,
    isOtherUserTyping,
    fetchMessages: fetchPrivateMessages,
  } = useConversationMessages(currentConversationId);

  const {
    fetchConversations: refreshConversationsList,
    addConversation,
    conversations: allConversations,
    findConversationByPeerUserId,
  } = usePrivateChat();

  // Get conversation status
  const activeConversationForStatus = currentConversationId
    ? allConversations.find(c => c.conversation_id === currentConversationId)
    : conversation;

  const hasNoStatus = activeConversationForStatus && !activeConversationForStatus.status;
  const hasNoMessages = privateMessages.length === 0;
  const hasConversationId = !!currentConversationId;

  const inferredStatus =
    localConversationStatus === 'accepted'
      ? 'accepted'
      : detectedPendingStatus || (hasNoStatus && hasNoMessages && hasConversationId)
        ? 'pending'
        : undefined;

  const currentConversationStatus =
    conversationStatusFromAPI ||
    localConversationStatus ||
    (currentConversationId
      ? allConversations.find(c => c.conversation_id === currentConversationId)?.status ||
        inferredStatus ||
        'pending'
      : conversation?.status || inferredStatus || 'pending');

  // Check if peer is blocked
  const isPeerBlocked =
    peerUserId && peerUserId !== profile?.account_id
      ? blockedUsers.some(bu => bu.user_id === peerUserId)
      : false;

  // Get messages for conversation
  const messagesForConversation = useMemo(() => {
    if (isPrivateChat) {
      return privateMessages;
    } else if (isGroupChat && groupId) {
      return groupMessages[groupId] || [];
    } else if (conversationId) {
      return dmMessages[conversationId] || [];
    }
    return [];
  }, [
    isPrivateChat,
    isGroupChat,
    groupId,
    conversationId,
    privateMessages,
    groupMessages,
    dmMessages,
  ]);

  const conversationId =
    chat.conversationId || conversation?.conversation_id || currentConversation?.id;
  const activeConversation = currentConversationId
    ? allConversations.find(c => c.conversation_id === currentConversationId)
    : conversation;

  // Fetch conversation status
  const fetchConversationStatus = useCallback(async () => {
    if (!currentConversationId || !isPrivateChat) return;

    try {
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.CONVERSATION_DETAILS}/${currentConversationId}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversationStatusFromAPI(data.status);

        if (data.status === 'accepted' && localConversationStatus !== 'accepted') {
          setLocalConversationStatus('accepted');
          setDetectedPendingStatus(false);
        }

        if (
          data.peer_online !== undefined ||
          data.peer_last_seen !== undefined ||
          data.last_message_at
        ) {
          refreshConversationsList();
        }
      }
    } catch (error) {
      logger.error('❌ [ChatDetail] Error fetching conversation status:', 'CHAT', error);
    }
  }, [
    currentConversationId,
    isPrivateChat,
    token,
    localConversationStatus,
    refreshConversationsList,
  ]);

  // Initialize conversation
  useEffect(() => {
    if (isPrivateChat && peerUserId && !conversationInitialized) {
      if (conversation?.conversation_id && !currentConversationId) {
        setCurrentConversationId(conversation.conversation_id);
        setConversationInitialized(true);
        return;
      }

      if (!currentConversationId) {
        if (allConversations.length === 0) {
          refreshConversationsList().then(() => {
            const existingConv = findConversationByPeerUserId(peerUserId);
            if (existingConv) {
              setCurrentConversationId(existingConv.conversation_id);
            }
            setConversationInitialized(true);
          });
        } else {
          const existingConv = findConversationByPeerUserId(peerUserId);
          if (existingConv) {
            setCurrentConversationId(existingConv.conversation_id);
          }
          setConversationInitialized(true);
        }
      } else {
        setConversationInitialized(true);
      }
    }
  }, [
    isPrivateChat,
    peerUserId,
    conversationInitialized,
    currentConversationId,
    conversation,
    allConversations,
    findConversationByPeerUserId,
    refreshConversationsList,
  ]);

  // Fetch messages
  useEffect(() => {
    if (isGroupChat && groupId) {
      dispatch(fetchGroupMessages({ groupId, params: { limit: 50 } }) as any);
    } else if (conversationId && !isPrivateChat) {
      dispatch(fetchMessages({ conversationId: String(conversationId), params: { limit: 50 } }));
    }
  }, [conversationId, groupId, isGroupChat, isPrivateChat, dispatch]);

  // Subscribe to Pusher
  useEffect(() => {
    if (!isGroupChat || !groupId || !token) {
      return;
    }

    let channelRef: any = null;

    const subscribeToGroupChat = async () => {
      try {
        const channelName = `group-chat.${groupId}`;
        const channel = await subscribeToChannel(channelName, event => {
          if (event.eventName === 'new-message' || event.eventName === 'message') {
            const newMessage = event.data;

            if (!newMessage.id || !newMessage.sender_user_id || !newMessage.plaintext) {
              logger.warn('⚠️ [Group Chat] Invalid message received', 'CHAT');
              return;
            }

            const groupMessage: GroupMessageInternal = {
              id: newMessage.id,
              groupId,
              senderUserId: newMessage.sender_user_id,
              senderDeviceId: newMessage.sender_device_id || '',
              ciphertext: newMessage.ciphertext || '',
              plaintext: newMessage.plaintext,
              proto: newMessage.proto || 10,
              groupEpoch: newMessage.group_epoch || 0,
              createdAt: newMessage.created_at || new Date().toISOString(),
              clientMessageId: newMessage.client_message_id,
              senderKeyId: newMessage.sender_key_id || '',
              status: 'sent',
            };

            dispatch(addGroupMessage(groupMessage));
          }
        });

        channelRef = channel;
      } catch (error) {
        logger.error('❌ [Group Chat] Error subscribing to channel:', 'CHAT', error);
      }
    };

    subscribeToGroupChat();

    return () => {
      if (channelRef) {
        const channelName = `group-chat.${groupId}`;
        unsubscribeFromChannel(channelName);
      }
    };
  }, [isGroupChat, groupId, token, dispatch]);

  // Fetch blocked users
  useEffect(() => {
    if (profile?.account_id) {
      // fetchBlockedUsers removed - privacySlice deleted
      // dispatch(fetchBlockedUsers());
    }
  }, [profile?.account_id, dispatch]);

  // Mark messages as read
  useEffect(() => {
    if (isPrivateChat && privateMessages.length > 0) {
      markAsRead();
    } else if (isGroupChat && groupId && messagesForConversation.length > 0) {
      (messagesForConversation as GroupMessageInternal[])
        .filter(msg => msg.senderUserId !== profile?.account_id && msg.status !== 'read')
        .forEach(msg => {
          dispatch(markGroupMessageReadAction(msg.clientMessageId || msg.id));
        });
    } else if (conversationId && messagesForConversation.length > 0) {
      (messagesForConversation as any[])
        .filter(msg => !msg.isUser && msg.status !== 'read')
        .forEach(msg => {
          dispatch(markMessageRead(msg.id));
        });
    }
  }, [
    conversationId,
    groupId,
    isGroupChat,
    messagesForConversation.length,
    dispatch,
    isPrivateChat,
    privateMessages.length,
    markAsRead,
    profile?.account_id,
  ]);

  return {
    // State
    currentConversationId,
    setCurrentConversationId,
    conversationInitialized,
    localConversationStatus,
    setLocalConversationStatus,
    currentConversationStatus,
    isPeerBlocked,
    messagesForConversation,
    privateMessages,
    privateMessagesLoading,
    privateSending,
    groupMessagesLoading,
    isOtherUserTyping,
    isGroupChat,
    isPrivateChat,
    peerUserId,
    groupId,
    conversationId,
    activeConversation,
    allConversations,

    // Actions
    sendPrivateMessage,
    markAsRead,
    sendTyping,
    acceptRejectConversation,
    fetchPrivateMessages,
    refreshConversationsList,
    addConversation,
    fetchConversationStatus,

    // Navigation
    navigation,
    goBack: () => navigation.goBack(),
  };
};
