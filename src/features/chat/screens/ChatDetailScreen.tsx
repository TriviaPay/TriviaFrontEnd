import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { skipToken } from '@reduxjs/toolkit/query/react';

// Hooks & Utils
import { useIsMounted } from '../../../hooks/useIsMounted';
import { useTrackScreenView } from '../../../hooks/useAnalytics';
import { useSoundEffects } from '../../../hooks/use-sound-effects';
import useKeyboardStatus from '../../../core/hooks/useKeyboardStatus';
import { useSafeArea } from '../../../hooks/useSafeArea';
import { useStatusBar } from '../../../hooks/useStatusBar';
import { usePlatformOptimization, useHapticFeedback, useAndroidBackButton } from '../../../hooks/usePlatformOptimization';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { formatTime, formatLastSeen } from '../../../utils/chat/messageFormatters';
import { decryptMessage } from '../../../lib/crypto/encryptor';
import { logger } from '../../../lib/utils/logger';
import { scaleSize } from '../../../utils/scaleSize';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { API_CONFIG } from '../../../config/api';
import BlockedUserBanner from '../../../components/chat/BlockedUserBanner';
import { usePrivateChat, useConversationMessages } from '../../../hooks/usePrivateChat';
import { useChatMute } from '../../../hooks/useChatMute';
import { requestPermission, checkPermission } from '../../../utils/permissions';

// Store & Selectors
import { RootState } from '../../../store';
import { selectCurrentUser } from '../../../utils/selectors';
import { setSelectedImage as setPreviewImage, setShowImagePreview } from '../../../store/chatSlice';
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useAcceptRejectChatMutation,
  useMarkConversationAsReadMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useSendTypingIndicatorMutation,
  useSendTypingStopIndicatorMutation,
  useMutePrivateChatMutation,
  useDeleteConversationMutation,
  useGetBlockedUsersQuery,
} from '../../../store/api/chatApi';

// Components
import ChatDetailHeader from '../../../components/chat/ChatDetailHeader';
import ChatDetailInput from '../../../components/chat/ChatDetailInput';
import ChatDetailModals from '../../../components/chat/ChatDetailModals';
import { ChatMessageItem } from '../../../components/chat/ChatMessageItem';
import { TypingIndicator } from '../../../components/chat/TypingIndicator';
import AcceptRejectPanel from '../../../components/chat/AcceptRejectPanel';
import SoundTouchableOpacity from '../../../components/common/SoundTouchableOpacity';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { useTypingHandler } from '../../../hooks/chat/useTypingHandler';

// --- TYPES ---

interface ChatDetailScreenProps { }

interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'pending';
  isUser: boolean;
  image?: string;
  level?: number | null;
  avatar_url?: string | null;
  profile_pic?: string | null;
  frame_url?: string | null;
  badge?: {
    image_url?: string | null;
  } | null;
  reply_to?: {
    id: number;
    message: string;
    sender: string;
  };
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  message: string;
  time: string;
  unread: number;
  status: 'online' | 'offline' | 'read' | 'unread';
  isGroup?: boolean;
}

const ChatDetailScreen: React.FC<ChatDetailScreenProps> = () => {
  // Hooks
  const isMounted = useIsMounted();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { playClick, playMessage, canPlaySounds } = useSoundEffects();
  const { keyboardShown, keyboardHeight } = useKeyboardStatus();
  const safeArea = useSafeArea();
  const { triggerHaptic } = useHapticFeedback();

  const {
    scaleFont,
    scaleSize: scaleSizeFunc,
    getHorizontalSpacing,
    getVerticalSpacing
  } = useStandardResponsive();

  useTrackScreenView('ChatDetailScreen');
  useStatusBar({ style: 'light-content', backgroundColor: '#000000' });
  usePlatformOptimization();

  // Params
  const { chat, conversation: conversationParam } = route.params as {
    chat: Chat & { conversationId?: string; peerUserId?: number; groupId?: string };
    conversation?: {
      conversation_id: number;
      peer_user_id: number;
      peer_username: string;
      status?: string;
      peer_online?: boolean;
    };
  };

  // Redux & Derived Params
  const profile = useSelector(selectCurrentUser, shallowEqual);
  const { showImagePreview, selectedImage: previewImage } = useSelector((state: RootState) => state.chat);
  const encryptionEnabled = useSelector((state: RootState) => (state as any).chatStore?.encryptionEnabled || false);
  const peerUserId = chat.peerUserId || conversationParam?.peer_user_id;
  const isGroupChat = !!(chat?.isGroup || chat.groupId);
  const isPrivateChat = !isGroupChat;
  const { token } = useSelector((state: RootState) => state.auth);

  // Local State
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; message: string; sender: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversationParam?.conversation_id ||
    (route.params as any)?.conversationId ||
    chat?.conversationId ||
    null
  );
  const [displayMessages, setDisplayMessages] = useState<any[]>([]);
  const [localConversationStatus, setLocalConversationStatus] = useState<'pending' | 'accepted' | 'declined' | undefined>(undefined);
  const [detectedPendingStatus, setDetectedPendingStatus] = useState<boolean>(false);
  const [conversationStatusFromAPI, setConversationStatusFromAPI] = useState<string | undefined>(undefined);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [localIsTyping, setLocalIsTyping] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const prevMessagesKeyRef = useRef<string>('');
  const isNearBottomRef = useRef<boolean>(true);

  // --- API HOOKS ---
  const { data: conversationsData, refetch: refetchConversations } = useGetConversationsQuery(undefined, {
    pollingInterval: 30000,
  });
  const allConversations = conversationsData?.conversations || [];

  // Use real-time hook for private chat messages
  const {
    messages: privateMessages,
    loading: isMessagesLoading,
    sending: privateSending,
    sendMessage: sendPrivateMessage,
    markAsRead,
    sendTyping,
    acceptRejectConversation,
    isOtherUserTyping,
    fetchMessages: fetchPrivateMessages,
  } = useConversationMessages(currentConversationId);

  // Chat mute preferences
  const {
    isPrivateChatMuted,
    togglePrivateChat,
    loading: muteLoading,
  } = useChatMute({ autoFetch: true });

  const isCurrentChatMuted = useMemo(() => {
    if (!peerUserId) return false;
    return isPrivateChatMuted(peerUserId);
  }, [peerUserId, isPrivateChatMuted]);

  const { refreshConversationsList, findConversationByPeerUserId } = usePrivateChat();

  const [sendMessageMutation] = useSendMessageMutation();
  const [acceptRejectMutation] = useAcceptRejectChatMutation();
  const [markAsReadMutation] = useMarkConversationAsReadMutation();
  const [mutePrivateChatMutation] = useMutePrivateChatMutation();
  const [blockUserMutation] = useBlockUserMutation();
  const [unblockUserMutation] = useUnblockUserMutation();
  const [deleteConversationMutation] = useDeleteConversationMutation();
  const [sendTypingMutation] = useSendTypingIndicatorMutation();
  const [sendStopTypingMutation] = useSendTypingStopIndicatorMutation();

  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const blockedUsers = blockedUsersData?.blocked_users || [];

  // --- DERIVED STATE ---
  const activeConversation = useMemo(() =>
    allConversations.find(c => c.conversation_id === currentConversationId),
    [allConversations, currentConversationId]
  );

  const hasMessages = Array.isArray(privateMessages) && privateMessages.length > 0;

  // Status Inference Logic
  const inferredStatus = useMemo(() => {
    if (localConversationStatus === 'accepted' || hasMessages || activeConversation?.last_message_at) return 'accepted';
    if (detectedPendingStatus || currentConversationId) return 'pending';
    return undefined;
  }, [localConversationStatus, hasMessages, activeConversation, detectedPendingStatus, currentConversationId]);

  const currentConversationStatus = conversationStatusFromAPI ||
    localConversationStatus ||
    activeConversation?.status ||
    inferredStatus ||
    'accepted';

  const isRecipient = useMemo(() => {
    const currentUserId = (profile as any)?.account_id || (profile as any)?.id;
    if (!currentUserId || !activeConversation) return false;
    const initiatorId = activeConversation.initiated_by || activeConversation.initiator_id;
    return initiatorId && String(initiatorId) !== String(currentUserId);
  }, [profile, activeConversation]);

  const needsAcceptance = isPrivateChat && isRecipient && currentConversationStatus === 'pending' && !hasMessages;
  const isPeerBlocked = peerUserId ? blockedUsers.some(bu => bu.user_id === peerUserId) : false;

  const displayChat = useMemo(() => ({
    id: currentConversationId || chat?.id || 0,
    name: activeConversation?.peer_username || chat?.name || conversationParam?.peer_username || 'Chat',
    avatar: activeConversation?.peer_profile_pic || chat?.avatar || conversationParam?.peer_profile_pic || '',
    avatar_url: activeConversation?.peer_avatar_url || chat?.avatar_url || conversationParam?.peer_avatar_url || null,
    status: activeConversation?.peer_online ? 'online' as const : 'offline' as const,
    pendingRequest: needsAcceptance,
  }), [currentConversationId, activeConversation, chat, conversationParam, needsAcceptance]);

  // --- EFFECTS ---

  // Resolve conversation ID if missing
  useEffect(() => {
    if (!currentConversationId && peerUserId && allConversations.length > 0) {
      const found = allConversations.find(c => String(c.peer_user_id) === String(peerUserId));
      if (found && isMounted()) setCurrentConversationId(found.conversation_id);
    }
  }, [peerUserId, allConversations, currentConversationId, isMounted]);

  const fetchConversationStatus = useCallback(async () => {
    if (!currentConversationId || !isPrivateChat || !token) return;
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.CONVERSATION_DETAILS}/${currentConversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (isMounted()) {
          setConversationStatusFromAPI(data.status);
          if (data.status === 'accepted' && localConversationStatus !== 'accepted') {
            setLocalConversationStatus('accepted');
            setDetectedPendingStatus(false);
          }
        }
      }
    } catch (error) {
      logger.error('Error fetching conversation status', 'CHAT_DETAIL', error);
    }
  }, [currentConversationId, isPrivateChat, token, isMounted, localConversationStatus]);

  useEffect(() => {
    if (currentConversationId && isPrivateChat) {
      fetchConversationStatus();
      const interval = setInterval(fetchConversationStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [currentConversationId, isPrivateChat, fetchConversationStatus]);

  // Early Prefetch
  useEffect(() => {
    const prefetch = async () => {
      if (isPrivateChat && peerUserId) {
        if (allConversations.length === 0) refreshConversationsList();
        const existing = findConversationByPeerUserId(peerUserId);
        const convId = conversationParam?.conversation_id || existing?.conversation_id;
        if (convId && isMounted() && currentConversationId !== convId) {
          setCurrentConversationId(convId);
        }
      }
    };
    prefetch();
  }, []);

  // Mark as read
  useEffect(() => {
    if (currentConversationId && privateMessages.length > 0) {
      markAsReadMutation(currentConversationId);
    }
  }, [currentConversationId, privateMessages.length, markAsReadMutation]);

  // Convert API message to UI format
  const convertMessageToUI = useCallback(async (msg: any): Promise<Message> => {
    let plaintext = msg.message;
    if (!plaintext && msg.ciphertext && msg.sender_id) {
      try {
        plaintext = await decryptMessage(String(msg.sender_id), msg.ciphertext);
      } catch {
        plaintext = '🔒 Decryption failed';
      }
    }

    // Check if message is from current user
    // In private chat: if sender_id matches peerUserId, it's the OTHER user's message
    // Otherwise, it's the current user's message
    const currentUserId = (profile as any)?.account_id || (profile as any)?.id;
    const currentUsername = (profile as any)?.username || (profile as any)?.name || '';
    const msgSenderId = msg.sender_id ? Number(msg.sender_id) : null;
    const msgSenderUsername = String(msg.sender_username || msg.sender || '').trim();
    const peerId = peerUserId ? Number(peerUserId) : null;
    
    // PRIMARY CHECK: In private chat, if sender_id != peerUserId, it's the current user's message
    let isCurrentUser = false;
    if (peerId !== null && msgSenderId !== null) {
      // If sender_id matches peerUserId, it's the OTHER user's message
      isCurrentUser = msgSenderId !== peerId;
    } else {
      // Fallback: match by current user ID or username
      isCurrentUser = 
        (currentUserId && msgSenderId !== null && Number(msgSenderId) === Number(currentUserId)) ||
        (currentUsername && msgSenderUsername && 
         msgSenderUsername.toLowerCase() === currentUsername.toLowerCase());
    }

    // DEBUG: Log user matching logic
    console.log('🔍 [ChatDetailScreen] USER MATCHING DEBUG:', {
      messageId: msg.id,
      msgSenderId,
      msgSenderUsername,
      peerUserId: peerId,
      currentUserId,
      currentUsername,
      isCurrentUser,
      logic: peerId !== null && msgSenderId !== null ? 'peerId comparison' : 'fallback comparison',
    });

    // Get level and profile data - use sender's data if available, otherwise use current user's profile for own messages
    let level: number | null = null;
    let avatar_url: string | null = null;
    let profile_pic: string | null = null;
    let frame_url: string | null = null;
    let badge: { image_url?: string | null } | null = null;

    if (isCurrentUser) {
      // For user's own messages, use profile data
      level = (profile as any)?.level || (profile as any)?.user_level || null;
      avatar_url = (profile as any)?.avatar_url || null;
      profile_pic = (profile as any)?.profile_pic || (profile as any)?.avatar || null;
      frame_url = (profile as any)?.frame_url || null;
      badge = (profile as any)?.badge || null;
    } else {
      // For other users' messages, use sender's data from message
      level = msg.sender_level || msg.level || null;
      avatar_url = msg.sender_avatar_url || msg.avatar_url || null;
      profile_pic = msg.sender_profile_pic || msg.profile_pic || null;
      frame_url = msg.sender_frame_url || msg.frame_url || null;
      badge = msg.sender_badge || msg.badge || null;
    }

    return {
      id: msg.id,
      text: plaintext || '',
      sender: isCurrentUser ? 'You' : (msg.sender_username || 'Unknown'),
      timestamp: formatTime(new Date(msg.created_at || Date.now())),
      status: msg.is_read ? 'read' : msg.delivered_at ? 'delivered' : 'sent',
      isUser: isCurrentUser,
      image: msg.image,
      level,
      avatar_url,
      profile_pic,
      frame_url,
      badge,
      reply_to: msg.reply_to,
    };
  }, [profile, peerUserId]);

  useEffect(() => {
    const processMessages = async () => {
      if (!privateMessages.length) {
        if (displayMessages.length) setDisplayMessages([]);
        return;
      }
      const key = `${currentConversationId}:${privateMessages.length}:${privateMessages[0]?.id || 0}`;
      if (prevMessagesKeyRef.current === key) return;
      prevMessagesKeyRef.current = key;

      const converted = await Promise.all(privateMessages.map(convertMessageToUI));
      if (isMounted()) setDisplayMessages(converted.sort((a, b) => a.id - b.id));
    };
    processMessages();
  }, [privateMessages, currentConversationId, convertMessageToUI, isMounted, displayMessages.length]);

  // Back button handler
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [navigation]);

  useAndroidBackButton(handleGoBack);

  // --- HANDLERS ---

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const cameraGranted = await checkPermission('camera');
      const storageGranted = await checkPermission('storage');
      if (cameraGranted && storageGranted) return true;

      const cameraResult = await requestPermission('camera');
      const storageResult = await requestPermission('storage');
      return cameraResult && storageResult;
    } catch (err) {
      logger.warn('Error requesting permissions', 'CHAT_DETAIL', err);
      return false;
    }
  };

  const handleImagePicker = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant camera and storage permissions');
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    try {
      launchImageLibrary(options, (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setSelectedImage(response.assets[0].uri || null);
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleCameraLaunch = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant camera and storage permissions');
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      saveToPhotos: true,
    };

    try {
      launchCamera(options, (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to launch camera');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setSelectedImage(response.assets[0].uri || null);
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to launch camera');
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (!peerUserId) return;
    logger.info('🔕 [ChatDetail] TOGGLING MUTE', 'CHAT', { peerUserId });
    try {
      await togglePrivateChat(peerUserId);
      triggerHaptic?.();
      logger.info('✅ [ChatDetail] MUTE TOGGLED', 'CHAT');
    } catch (error) {
      logger.error('❌ [ChatDetail] MUTE FAILED', 'CHAT', error);
      Alert.alert('Error', 'Failed to toggle mute');
    }
  }, [peerUserId, togglePrivateChat, triggerHaptic]);

  const handleAcceptConversation = useCallback(async () => {
    if (!currentConversationId || !acceptRejectConversation) return;
    logger.info('🤝 [ChatDetail] ACCEPTING CONVERSATION', 'CHAT', { conversationId: currentConversationId });
    try {
      if (canPlaySounds) playClick?.();
      const result = await acceptRejectConversation(currentConversationId, 'accept');
      if (result && result.success !== false && isMounted()) {
        setLocalConversationStatus('accepted');
        setDetectedPendingStatus(false);
        refreshConversationsList();
        fetchPrivateMessages(50).catch(() => { });
        logger.info('✅ [ChatDetail] CONVERSATION ACCEPTED', 'CHAT');
      }
    } catch (error) {
      logger.error('❌ [ChatDetail] ACCEPT FAILED', 'CHAT', error);
      Alert.alert('Error', 'Failed to accept conversation');
    }
  }, [currentConversationId, acceptRejectConversation, canPlaySounds, playClick, isMounted, refreshConversationsList, fetchPrivateMessages]);

  const handleRejectConversation = useCallback(async () => {
    if (!currentConversationId || !acceptRejectConversation) return;
    Alert.alert('Decline Request', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          logger.info('🚫 [ChatDetail] REJECTING CONVERSATION', 'CHAT', { conversationId: currentConversationId });
          try {
            const result = await acceptRejectConversation(currentConversationId, 'reject');
            if (result && result.success !== false && isMounted()) {
              setLocalConversationStatus('declined');
              logger.info('✅ [ChatDetail] CONVERSATION REJECTED', 'CHAT');
              navigation.goBack();
            }
          } catch (error) {
            logger.error('❌ [ChatDetail] REJECT FAILED', 'CHAT', error);
            Alert.alert('Error', 'Failed to decline conversation');
          }
        }
      }
    ]);
  }, [currentConversationId, acceptRejectConversation, isMounted, navigation]);

  const handleBlockUser = useCallback(async () => {
    if (!peerUserId) return;
    try {
      if (isPeerBlocked) {
        await unblockUserMutation(peerUserId).unwrap();
        Alert.alert('Success', 'User unblocked');
      } else {
        await blockUserMutation({ userId: peerUserId, muted: false }).unwrap();
        Alert.alert('Success', 'User blocked');
      }
      refetchConversations();
      setShowUserMenu(false);
    } catch (error) {
      Alert.alert('Error', 'Action failed');
    }
  }, [peerUserId, isPeerBlocked, unblockUserMutation, blockUserMutation, refetchConversations]);


  const handleDeleteChat = useCallback(async () => {
    if (!currentConversationId) return;
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversationMutation(currentConversationId).unwrap();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete chat');
          }
        }
      }
    ]);
  }, [currentConversationId, deleteConversationMutation, navigation]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && !selectedImage) return;

    if (needsAcceptance) {
      Alert.alert('Request Pending', 'Please accept the chat request before sending messages.');
      return;
    }

    if (isPeerBlocked) {
      Alert.alert('Blocked User', 'You cannot send messages to a blocked user.');
      return;
    }

    const textToSend = message.trim();
    const imageToSend = selectedImage;

    logger.info('🚀 [ChatDetail] SENDING MESSAGE', 'CHAT', {
      recipientId: peerUserId,
      hasImage: !!imageToSend,
      replyTo: replyingTo?.id
    });

    // Clear input immediately for feel
    setMessage('');
    setReplyingTo(null);
    setSelectedImage(null);

    try {
      if (canPlaySounds) playClick?.();

      const clientMessageId = Date.now().toString();
      const optimisticMessage: any = {
        id: -Date.now(),
        sender_id: profile?.account_id || 0,
        sender_username: profile?.username || 'You',
        message: textToSend,
        image: imageToSend,
        status: 'sending',
        created_at: new Date().toISOString(),
        reply_to: replyingTo,
      };

      if (sendPrivateMessage && peerUserId) {
        const result = await sendPrivateMessage(peerUserId, textToSend, clientMessageId, optimisticMessage, imageToSend, replyingTo?.id);
        if (canPlaySounds) playMessage?.();
        logger.info('✅ [ChatDetail] PRIVATE MESSAGE SENT TRIGGERED', 'CHAT', { success: !!result });
      } else {
        // Fallback for non-private or if hook not ready
        logger.info('♻️ [ChatDetail] SENDING VIA FALLBACK MUTATION', 'CHAT');
        const payload = {
          message: textToSend,
          conversation_id: currentConversationId,
          recipient_id: !currentConversationId ? peerUserId : undefined,
          image: imageToSend,
          reply_to_message_id: replyingTo?.id,
        };
        await sendMessageMutation(payload as any).unwrap();
        logger.info('✅ [ChatDetail] FALLBACK SEND SUCCESS', 'CHAT');
      }
    } catch (err: any) {
      logger.error('❌ [ChatDetail] SEND FAILED', 'CHAT', err);
      Alert.alert('Error', err?.message || 'Failed to send message');
      setMessage(textToSend);
      setSelectedImage(imageToSend);
    }
  }, [message, selectedImage, needsAcceptance, isPeerBlocked, canPlaySounds, playClick, profile, replyingTo, sendPrivateMessage, peerUserId, currentConversationId, sendMessageMutation, playMessage]);

  const { handleTypingChange, handleBlur, handleSubmitEditing } = useTypingHandler({
    isPrivateChat,
    currentConversationId,
    sendTyping: (cid, typing) => typing ? sendTypingMutation(cid) : sendStopTypingMutation(cid),
    setLocalIsTyping,
    localIsTyping
  });

  const styles = createStyles(scaleFont, scaleSizeFunc, getHorizontalSpacing, getVerticalSpacing);

  // DEBUG: Log styles when they're created
  useEffect(() => {
    console.log('🔍 [ChatDetailScreen] STYLES DEBUG:', {
      messageContainer: styles.messageContainer,
      userMessage: styles.userMessage,
      otherMessage: styles.otherMessage,
      messagesList: styles.messagesList,
    });
  }, [styles.messageContainer, styles.userMessage, styles.otherMessage, styles.messagesList]);

  const renderMessageItem = ({ item }: { item: Message }) => {
    // DEBUG: Log message item rendering
    console.log('🔍 [ChatDetailScreen] RENDERING MESSAGE:', {
      messageId: item.id,
      sender: item.sender,
      isUser: item.isUser,
      text: item.text?.substring(0, 20) + '...',
      messageContainerStyle: styles.messageContainer,
      userMessageStyle: styles.userMessage,
      otherMessageStyle: styles.otherMessage,
    });

    return (
    <ChatMessageItem
      item={item}
      isPrivateChat={isPrivateChat}
      isGroupChat={isGroupChat}
        onLongPress={(id, text, sender, isUser) => {
          // Always use 'You' if it's the user's own message, otherwise use sender name
          const replySender = isUser ? 'You' : (sender || 'Unknown');
          setReplyingTo({ id, message: text, sender: replySender });
          inputRef.current?.focus();
        }}
        onSwipeReply={(id, text, sender, isUser) => {
          // Always use 'You' if it's the user's own message, otherwise use sender name
          const replySender = isUser ? 'You' : (sender || 'Unknown');
          setReplyingTo({ id, message: text, sender: replySender });
        inputRef.current?.focus();
      }}
      styles={styles}
    />
  );
  };

  if (!isMounted()) return null;

  return (
    <ScreenErrorBoundary screenName="ChatDetailScreen">
      <View style={styles.container}>
        <SafeAreaView style={[styles.safeArea, safeArea.safeAreaStyle]}>
          <ScreenBackButtonHandler action="navigate" />

          <ChatDetailHeader
            chat={displayChat}
            isPrivateChat={isPrivateChat}
            isOtherUserTyping={isOtherUserTyping}
            isCurrentChatMuted={isCurrentChatMuted}
            muteLoading={muteLoading}
            canShowUserMenu={isPrivateChat && !!peerUserId}
            showUserMenu={showUserMenu}
            peerUserId={peerUserId}
            currentConversationId={currentConversationId}
            onGoBack={handleGoBack}
            onToggleMute={toggleMute}
            onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
            formatLastSeen={formatLastSeen}
            formatTime={formatTime}
          />

          {isPeerBlocked && (
            <BlockedUserBanner
              onUnblock={handleBlockUser}
              isLoading={false}
            />
          )}

          {needsAcceptance && (
            <AcceptRejectPanel
              username={displayChat.name}
              isLoading={false}
              onAccept={handleAcceptConversation}
              onReject={handleRejectConversation}
            />
          )}

          {/* User menu dropdown (for private chats) - matching TriviaPay exactly */}
          {showUserMenu && isPrivateChat && !!peerUserId && (
            <>
              {/* Backdrop to close menu when tapping outside */}
              <SoundTouchableOpacity
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998,
                }}
                activeOpacity={1}
                onPress={() => setShowUserMenu(false)}
              >
                <View />
              </SoundTouchableOpacity>
              <View style={styles.userMenuDropdown}>
                {/* Mute Chat option for private chats */}
                {isPrivateChat && peerUserId && (
                  <SoundTouchableOpacity
                    style={styles.userMenuItem}
                    onPress={async () => {
                      setShowUserMenu(false);
                      if (peerUserId) {
                        await toggleMute();
                      }
                    }}
                    disabled={muteLoading}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={isCurrentChatMuted ? "bell-off" : "bell-outline"}
                      size={20}
                      color={isCurrentChatMuted ? "#EF4444" : "#FFFFFF"}
                      style={styles.userMenuIcon}
                    />
                    <Text style={styles.userMenuText}>Mute Chat</Text>
                  </SoundTouchableOpacity>
                )}
                <SoundTouchableOpacity
                  style={styles.userMenuItem}
                  onPress={async () => {
                    setShowUserMenu(false);
                    await handleBlockUser();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isPeerBlocked ? 'lock-open' : 'block'}
                    size={20}
                    color={isPeerBlocked ? '#059669' : '#DC2626'}
                    style={styles.userMenuIcon}
                  />
                  <Text style={[styles.userMenuText, isPeerBlocked && styles.userMenuTextUnblock]}>
                    {isPeerBlocked ? 'Unblock User' : 'Block User'}
                  </Text>
                </SoundTouchableOpacity>
                
                <SoundTouchableOpacity
                  style={styles.userMenuItem}
                  onPress={() => {
                    setShowUserMenu(false);
                    handleDeleteChat();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="delete-outline" size={20} color="#DC2626" style={styles.userMenuIcon} />
                  <Text style={[styles.userMenuText, styles.userMenuTextDelete]}>
                    Delete Conversation
                  </Text>
                </SoundTouchableOpacity>
              </View>
            </>
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.messagesList}
              style={{ flex: 1 }}
              inverted={false}
              onLayout={(event) => {
                const { width, height, x, y } = event.nativeEvent.layout;
                console.log('📐 [ChatDetailScreen] FlatList LAYOUT:', {
                  width,
                  height,
                  x,
                  y,
                  messagesCount: displayMessages.length,
                  userMessagesCount: displayMessages.filter(m => m.isUser).length,
                  otherMessagesCount: displayMessages.filter(m => !m.isUser).length,
                });
              }}
              onScroll={e => {
                const dist = e.nativeEvent.contentSize.height - e.nativeEvent.contentOffset.y - e.nativeEvent.layoutMeasurement.height;
                setShowScrollToBottomButton(dist > 200);
              }}
              ListHeaderComponent={
                encryptionEnabled ? (
                  <View style={styles.e2eeBannerContainer}>
                    <View style={styles.e2eeBanner}>
                      <Icon name="lock" size={12} color="#FFFFFF" style={styles.e2eeLockIcon} />
                      <Text style={styles.e2eeBannerText}>Messages are end-to-end encrypted</Text>
                    </View>
                  </View>
                ) : null
              }
              onContentSizeChange={() => {
                if (isNearBottomRef.current) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ListEmptyComponent={
                !isMessagesLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
                  </View>
                ) : null
              }
            />

            {isOtherUserTyping && (
              <View style={[styles.typingIndicatorWrapper, { marginBottom: scaleSize(10) }]}>
                <TypingIndicator username={displayChat.name} />
              </View>
            )}

            <ChatDetailInput
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              onAttach={handleImagePicker}
              onCamera={handleCameraLaunch}
              disabled={isPeerBlocked || needsAcceptance}
              needsAcceptance={needsAcceptance}
              isPeerBlocked={isPeerBlocked}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              selectedImage={selectedImage}
              onClearImage={() => setSelectedImage(null)}
              inputRef={inputRef as React.RefObject<TextInput>}
              onTypingChange={handleTypingChange}
              onBlur={handleBlur}
              onSubmitEditing={handleSubmitEditing}
              styles={styles}
              currentUserId={(profile as any)?.account_id || (profile as any)?.id}
              profile={profile}
            />
          </KeyboardAvoidingView>

          <ChatDetailModals
            showImagePreview={showImagePreview}
            selectedImage={previewImage}
            onCloseImagePreview={() => dispatch(setShowImagePreview(false))}
            showBlockedUsersModal={showBlockedUsersModal}
            onCloseBlockedUsers={() => setShowBlockedUsersModal(false)}
            blockedUsers={blockedUsers}
            onUnblockUser={async (uid) => {
              try {
                await unblockUserMutation(uid).unwrap();
                refetchConversations();
              } catch { Alert.alert('Error', 'Failed to unblock'); }
            }}
            styles={styles}
            dispatch={dispatch}
            logger={logger}
          />

          {showScrollToBottomButton && (
            <SoundTouchableOpacity
              style={[
                styles.scrollToBottomButton,
                { bottom: keyboardShown ? keyboardHeight + scaleSize(80) : scaleSize(90) }
              ]}
              onPress={() => flatListRef.current?.scrollToEnd()}
            >
              <Icon name="chevron-double-down" size={20} color="#000" />
            </SoundTouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    </ScreenErrorBoundary>
  );
};

function createStyles(
  scaleFont: (size: number) => number,
  scaleSize: (size: number) => number,
  getHorizontalSpacing: (multiplier: number) => number,
  getVerticalSpacing: (multiplier: number) => number
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    safeArea: { flex: 1 },
    messagesList: {
      paddingHorizontal: getHorizontalSpacing(2),
      paddingTop: getVerticalSpacing(2), // Add top padding to ensure first message is visible
      paddingBottom: getVerticalSpacing(2),
      flexGrow: 1,
      backgroundColor: '#000000', // Black background to match global chat
      // CRITICAL: Don't set alignItems here - it prevents alignSelf from working on children
      // Messages will align themselves using alignSelf: flex-start/flex-end
    },
    // Reply preview container above input - matching global chat
    replyPreviewContainer: {
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
    replyPreviewContent: {
      flex: 1,
      paddingLeft: getHorizontalSpacing(1),
    },
    replyPreviewSender: {
      color: '#9333EA',
      fontSize: scaleFont(13),
      fontWeight: '600',
      marginBottom: getVerticalSpacing(0.3),
    },
    replyPreviewMessage: {
      color: 'rgba(255, 255, 255, 0.65)',
      fontSize: scaleFont(13),
      lineHeight: scaleFont(17),
    },
    replyCancelButton: {
      padding: scaleSize(6),
      marginLeft: getHorizontalSpacing(1),
    },
    // Input field styles - matching global chat
    inputRow: {
      flexDirection: 'row',
      paddingHorizontal: getHorizontalSpacing(2),
      paddingVertical: getVerticalSpacing(1.5),
      backgroundColor: '#000000',
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
    sendButton: {
      width: scaleSize(44),
      height: scaleSize(44),
      borderRadius: scaleSize(22),
      backgroundColor: '#9333EA',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#9333EA',
      shadowOffset: { width: 0, height: scaleSize(2) },
      shadowOpacity: 0.3,
      shadowRadius: scaleSize(4),
      elevation: 3,
    },
    sendButtonDisabled: {
      backgroundColor: 'rgba(147, 51, 234, 0.4)',
      shadowOpacity: 0,
      elevation: 0,
    },
    e2eeBannerContainer: {
      width: '100%',
      alignItems: 'center',
      marginVertical: getVerticalSpacing(1.5)
    },
    e2eeBanner: {
      backgroundColor: '#40444B',
      borderRadius: scaleSize(8),
      paddingHorizontal: getHorizontalSpacing(2),
      paddingVertical: getVerticalSpacing(1),
      flexDirection: 'row',
      alignItems: 'center'
    },
    e2eeLockIcon: { marginRight: getHorizontalSpacing(1) },
    e2eeBannerText: {
      color: '#FFF',
      fontSize: scaleFont(12),
      lineHeight: scaleFont(16)
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getVerticalSpacing(5)
    },
    emptyStateText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: scaleFont(16),
      fontWeight: 'bold',
      marginBottom: getVerticalSpacing(1)
    },
    emptyStateSubtext: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: scaleFont(14),
      textAlign: 'center'
    },
    typingIndicator: {
      flexDirection: 'row',
      paddingHorizontal: getHorizontalSpacing(2),
      paddingBottom: getVerticalSpacing(1),
      alignItems: 'center'
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: getHorizontalSpacing(1.5),
      paddingVertical: getVerticalSpacing(0.5),
      borderRadius: scaleSize(16),
    },
    typingText: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: scaleFont(12),
      marginLeft: getHorizontalSpacing(1),
      fontStyle: 'italic'
    },
    scrollToBottomButton: {
      position: 'absolute',
      right: getHorizontalSpacing(2),
      bottom: getVerticalSpacing(2),
      width: scaleSize(36),
      height: scaleSize(36),
      borderRadius: scaleSize(18),
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 99,
    },
    // Message item styles for ChatMessageItem - matching global chat styling EXACTLY
    messageContainer: { 
      marginBottom: getVerticalSpacing(1.5), 
      maxWidth: '100%', // Match global chat - use 100% like global chat
      backgroundColor: 'transparent',
      width: '100%', // Match global chat - use 100% width
    },
    userMessage: { 
      alignSelf: 'flex-end', 
      alignItems: 'flex-end',
      marginLeft: 'auto',
      // Match global chat exactly
    },
    otherMessage: { 
      alignSelf: 'flex-start', 
      alignItems: 'flex-start',
      marginRight: 'auto',
      // Match global chat exactly
    },
    messageBubble: {
      borderRadius: scaleSize(16),
      paddingHorizontal: getHorizontalSpacing(1.5),
      paddingVertical: getVerticalSpacing(1),
      maxWidth: '75%',
      marginBottom: scaleSize(4),
    },
    userBubble: { 
      backgroundColor: '#9333EA', 
      borderTopRightRadius: scaleSize(4),
    },
    otherBubble: { 
      backgroundColor: '#40444B', 
      borderTopLeftRadius: scaleSize(4),
    },
    messageText: { 
      color: '#FFF', 
      fontSize: scaleFont(14), 
      lineHeight: scaleFont(20) 
    },
    userMessageText: {
      color: '#FFFFFF',
    },
    otherMessageText: {
      color: '#FFFFFF',
    },
    timestamp: { 
      color: 'rgba(255,255,255,0.6)', 
      fontSize: scaleFont(10), 
      marginTop: getVerticalSpacing(0.5) 
    },
    userTimestamp: {
      color: 'rgba(255,255,255,0.6)',
      marginRight: getHorizontalSpacing(1),
      alignSelf: 'flex-end',
    },
    otherTimestamp: {
      color: 'rgba(255,255,255,0.6)',
      marginLeft: getHorizontalSpacing(1),
      alignSelf: 'flex-start',
    },
    // Sender info styles
    messageSenderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getVerticalSpacing(0.5),
      paddingLeft: 0,
    },
    messageProfileContainer: {
      position: 'relative',
      width: scaleSize(32),
      height: scaleSize(32),
      marginRight: scaleSize(2),
      overflow: 'visible',
      minWidth: scaleSize(32),
      minHeight: scaleSize(32),
    },
    messageFrame: {
      position: 'absolute',
      top: -1,
      left: -1,
      width: scaleSize(34),
      height: scaleSize(34),
      zIndex: 3,
      minWidth: scaleSize(34),
      minHeight: scaleSize(34),
    },
    messageAvatar: {
      position: 'absolute',
      top: scaleSize(4),
      left: scaleSize(4),
      width: scaleSize(24),
      height: scaleSize(24),
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
    messageSenderTextContainer: {
      flex: 1,
    },
    messageSenderNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    senderName: {
      fontSize: scaleFont(12),
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: scaleSize(2),
    },
    messageBadge: {
      width: scaleSize(16),
      height: scaleSize(16),
      marginLeft: scaleSize(2),
      flexShrink: 0,
    },
    // Reply preview styles - matching global chat exactly
    replyPreview: {
      paddingHorizontal: scaleSize(10),
      paddingVertical: scaleSize(6),
      marginBottom: scaleSize(6),
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      borderRadius: scaleSize(8),
      borderLeftWidth: scaleSize(3),
      overflow: 'hidden', // Prevent content from expanding
    },
    replyPreviewUser: {
      borderLeftColor: '#10B981', // Green for user's reply (same as global chat)
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    replyPreviewOther: {
      borderLeftColor: '#FFFFFF', // White for other's reply (same as global chat)
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    replyPreviewBubbleContent: {
      // Content container
    },
    replyPreviewBubbleSender: {
      fontSize: scaleFont(12),
      fontWeight: '600',
      marginBottom: scaleSize(2),
    },
    replyPreviewSenderUser: {
      color: '#10B981',
    },
    replyPreviewSenderOther: {
      color: '#FFFFFF',
    },
    replyPreviewBubbleMessage: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: scaleFont(12),
      lineHeight: scaleFont(16),
    },
    // Encrypted message styles
    encryptedMessageContainer: {
      alignSelf: 'center',
      width: '90%',
    },
    encryptedBubble: {
      backgroundColor: '#333',
      borderRadius: scaleSize(10),
      padding: scaleSize(10),
    },
    encryptedTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    encryptedMessageText: {
      color: '#ccc',
      marginLeft: scaleSize(8),
    },
    encryptionIndicator: {
      marginLeft: scaleSize(5),
    },
    // System and notification messages
    systemMessage: {
      alignSelf: 'center',
      marginVertical: scaleSize(5),
    },
    systemMessageText: {
      color: '#aaa',
      fontSize: scaleFont(12),
    },
    notificationMessage: {
      alignSelf: 'center',
      marginVertical: scaleSize(5),
    },
    notificationMessageText: {
      color: '#aaa',
      fontSize: scaleFont(12),
    },
    // Status icon container
    statusIconContainer: {
      marginLeft: scaleSize(4),
    },
    // Message image container
    messageImageContainer: {
      marginTop: scaleSize(4),
    },
    messageImage: {
      width: scaleSize(200),
      height: scaleSize(150),
      borderRadius: scaleSize(8),
    },
    // Message content container
    messageContentContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    // User menu styles - matching TriviaPay exactly
    userMenuDropdown: {
      position: 'absolute',
      top: scaleSize(64),
      right: getHorizontalSpacing(2),
      borderRadius: scaleSize(8),
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: scaleSize(2) },
      shadowOpacity: 0.3,
      shadowRadius: scaleSize(8),
      elevation: 5,
      zIndex: 999,
      width: scaleSize(200),
      backgroundColor: '#000000', // Black background like TriviaPay
    },
    userMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getHorizontalSpacing(2),
      paddingVertical: getVerticalSpacing(1.5),
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    userMenuIcon: {
      marginRight: getHorizontalSpacing(1.5),
      width: scaleSize(20),
    },
    userMenuText: {
      color: '#FFFFFF',
      fontSize: scaleFont(16),
      fontWeight: '500',
      flex: 1,
    },
    userMenuTextUnblock: {
      color: '#059669',
    },
    userMenuTextDelete: {
      color: '#DC2626',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getHorizontalSpacing(2),
      paddingVertical: getVerticalSpacing(1.5),
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuText: {
      fontSize: scaleFont(16),
      color: '#FFFFFF',
      fontWeight: '500',
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    // Image preview modal styles
    imagePreviewModal: {
      flex: 1,
      backgroundColor: '#000000',
    },
    imagePreviewSafeArea: {
      flex: 1,
    },
    imagePreviewHeader: {
      padding: getHorizontalSpacing(2),
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    imagePreviewContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewImage: {
      width: '100%',
      height: '75%',
    },
    // Blocked users modal styles
    modalContent: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: '#36393F',
      borderRadius: scaleSize(16),
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: getHorizontalSpacing(2),
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      color: '#FFFFFF',
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
  });
}

export default ChatDetailScreen;
