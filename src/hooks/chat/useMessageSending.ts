/**
 * useMessageSending - Hook for sending messages
 * Single Responsibility: Handles all message sending logic
 */

import { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Keyboard } from 'react-native';
import { RootState } from '../../store';
// Group, message, and privacy slices removed - imports commented out
// import {
//   sendGroupChatMessage,
//   addGroupMessage,
//   removeGroupMessage,
//   fetchGroupDetails,
// } from '../../store/slices/groupMessageSlice';
// import { sendChatMessage } from '../../store/slices/messageSlice';
// import { fetchBlockedUsers } from '../../store/slices/privacySlice';
// import { GroupMessageInternal } from '../../store/slices/groupMessageSlice';
import { PrivateMessage } from '../usePrivateChat';

interface UseMessageSendingOptions {
  isGroupChat: boolean;
  isPrivateChat: boolean;
  groupId?: string;
  conversationId?: string | number;
  peerUserId?: number;
  currentConversationId?: number | null;
  currentGroup?: any;
  profile?: any;
  blockedUsers?: any[];
  sendPrivateMessage?: (
    recipientId: number,
    message: string,
    clientMessageId: string,
    optimisticMessage?: PrivateMessage
  ) => Promise<any>;
  acceptRejectConversation?: (conversationId: number, action: 'accept' | 'reject') => Promise<any>;
  currentConversationStatus?: string;
  privateMessages?: any[];
  activeConversation?: any;
  conversation?: {
    conversation_id?: number;
    peer_user_id?: number;
    peer_username?: string;
    status?: string;
    peer_online?: boolean;
    peer_last_seen?: string | null;
    last_message_at?: string;
  };
  refreshConversationsList?: () => Promise<void>;
  addConversation?: (conversation: any) => void;
  setCurrentConversationId?: (id: number | null) => void;
  setLocalConversationStatus?: (status: 'pending' | 'accepted' | 'declined') => void;
  chat?: any;
  flatListRef?: React.RefObject<any>;
}

export const useMessageSending = (options: UseMessageSendingOptions) => {
  const {
    isGroupChat,
    isPrivateChat,
    groupId,
    conversationId,
    peerUserId,
    currentConversationId,
    currentGroup,
    profile,
    blockedUsers = [],
    sendPrivateMessage,
    currentConversationStatus,
    privateMessages = [],
    activeConversation,
    conversation,
    refreshConversationsList,
    addConversation,
    setCurrentConversationId,
    setLocalConversationStatus,
    chat,
    flatListRef,
  } = options;

  const dispatch = useDispatch();
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [localIsTyping, setLocalIsTyping] = useState(false);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim()) return;

      // Group chat
      if (isGroupChat && groupId) {
        try {
          const groupEpoch = currentGroup?.groupEpoch ?? 0;
          const senderKeyId = `sender_key_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          if (currentGroup?.isClosed) {
            Alert.alert(
              'Group Closed',
              'This group is closed. Messages cannot be sent to closed groups.'
            );
            return;
          }

          Keyboard.dismiss();

          const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const optimisticMessage: GroupMessageInternal = {
            id: optimisticId,
            groupId,
            senderUserId: profile?.account_id || 0,
            senderDeviceId: '',
            ciphertext: '',
            plaintext: messageText,
            proto: 10,
            groupEpoch,
            createdAt: new Date().toISOString(),
            clientMessageId: `client_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            senderKeyId,
            status: 'sending',
          };

          dispatch(addGroupMessage(optimisticMessage));

          setTimeout(() => {
            flatListRef?.current?.scrollToEnd({ animated: true });
          }, 50);

          let result = await dispatch(
            sendGroupChatMessage({
              groupId,
              plaintext: messageText,
              groupEpoch,
              senderKeyId,
            })
          );

          if (sendGroupChatMessage.fulfilled.match(result)) {
            dispatch(removeGroupMessage({ groupId, messageId: optimisticId }));
          } else {
            const errorMessage = (result.payload as string) || 'Failed to send group message';
            dispatch(removeGroupMessage({ groupId, messageId: optimisticId }));

            if (errorMessage.includes('EPOCH_STALE')) {
              try {
                const groupDetailsResult = await dispatch(fetchGroupDetails(groupId));

                if (fetchGroupDetails.fulfilled.match(groupDetailsResult)) {
                  const updatedGroup = groupDetailsResult.payload;
                  let newEpoch = updatedGroup.group_epoch ?? currentGroup?.groupEpoch ?? 0;

                  if (newEpoch === 0 && groupEpoch === 0) {
                    newEpoch = 1;
                  } else if (newEpoch === groupEpoch && groupEpoch >= 0) {
                    newEpoch = groupEpoch + 1;
                  }

                  result = await dispatch(
                    sendGroupChatMessage({
                      groupId,
                      plaintext: messageText,
                      groupEpoch: newEpoch,
                      senderKeyId: `sender_key_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    })
                  );

                  if (sendGroupChatMessage.fulfilled.match(result)) {
                    return;
                  }
                }
              } catch (retryError: any) {
                logger.error(
                  '❌ [ChatDetail] Error during epoch update retry:',
                  'CHAT',
                  retryError
                );
              }
            }

            Alert.alert('Error', errorMessage);
          }
        } catch (error: any) {
          logger.error('❌ [ChatDetail] Failed to send group message:', 'CHAT', error);
          Alert.alert('Error', error?.message || 'Failed to send group message');
        }
      }
      // Private chat
      else if (isPrivateChat && peerUserId && sendPrivateMessage) {
        try {
          const currentUserId = profile?.account_id;

          if (currentConversationStatus === 'pending') {
            const messagesFromUs = privateMessages.filter(
              msg =>
                msg.sender_id && currentUserId && String(msg.sender_id) === String(currentUserId)
            );
            const messagesFromOther = privateMessages.filter(
              msg =>
                msg.sender_id && currentUserId && String(msg.sender_id) !== String(currentUserId)
            );

            if (messagesFromOther.length > 0 && messagesFromUs.length === 0) {
              Alert.alert(
                'Accept Message Request First',
                'Please accept or decline the message request before replying.',
                [{ text: 'OK' }]
              );
              return;
            }

            if (messagesFromUs.length > 0) {
              Alert.alert(
                'Message Request Pending',
                'Please wait for the recipient to accept your message request before sending another message.',
                [{ text: 'OK' }]
              );
              return;
            }
          }

          const optimisticId = -Date.now();
          const optimisticMessage: PrivateMessage = {
            id: optimisticId,
            sender_id: profile?.account_id || 0,
            sender_username: profile?.username || 'You',
            message: messageText,
            status: 'sent',
            created_at: new Date().toISOString(),
            delivered_at: null,
            is_read: null,
          };

          const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // IMPORTANT: Always use peer_user_id from conversation GET endpoint as recipient_id
          // The peer_user_id from the conversation response is the correct recipient
          // This ensures we send to the right user even when conversation is pending
          let recipientIdToUse = peerUserId;

          if (currentConversationId && activeConversation) {
            // Always prefer peer_user_id from conversation - it's the source of truth from GET /conversations
            if (activeConversation.peer_user_id) {
              recipientIdToUse = activeConversation.peer_user_id;
            }
          } else if (conversation?.peer_user_id) {
            // Fallback to conversation from route params
            recipientIdToUse = conversation.peer_user_id;
          }

          // Validate recipientIdToUse before sending
          if (!recipientIdToUse || recipientIdToUse <= 0) {
            const errorMsg = `Invalid recipient ID: ${recipientIdToUse}. peerUserId: ${peerUserId}, activeConversation.peer_user_id: ${activeConversation?.peer_user_id}, conversation.peer_user_id: ${conversation?.peer_user_id}`;
            logger.error('❌ [ChatDetail]', 'CHAT', errorMsg);
            Alert.alert('Error', 'Cannot determine recipient. Please try again.');
            return;
          }

          const result = await sendPrivateMessage(
            recipientIdToUse,
            messageText,
            clientMessageId,
            optimisticMessage
          );

          if (result) {
            if (result.conversation_id && !currentConversationId && setCurrentConversationId) {
              setCurrentConversationId(result.conversation_id);
              if (setLocalConversationStatus) {
                setLocalConversationStatus('pending');
              }

              if (addConversation && peerUserId) {
                const newConversation = {
                  conversation_id: result.conversation_id,
                  peer_user_id: peerUserId,
                  peer_username: chat?.name || 'Unknown',
                  peer_profile_pic: chat?.avatar || '',
                  last_message_at: result.created_at || new Date().toISOString(),
                  unread_count: 0,
                  status: 'pending',
                };
                addConversation(newConversation);
              }

              if (refreshConversationsList) {
                refreshConversationsList();
                setTimeout(() => refreshConversationsList(), 1000);
              }
            }

            Keyboard.dismiss();
          } else {
            Alert.alert('Error', 'Failed to send message. Please try again.');
          }
        } catch (error: any) {
          logger.error('❌ [ChatDetail] Failed to send private chat message:', 'CHAT', error);
          Alert.alert('Error', error?.message || 'Failed to send message');
        }
      }
      // DM with E2EE
      else if (conversationId && peerUserId) {
        try {
          if (peerUserId && peerUserId !== profile?.account_id) {
            const actuallyBlocked = blockedUsers.some(bu => bu.user_id === peerUserId);
            if (actuallyBlocked) {
              Alert.alert(
                'User Blocked',
                'You cannot send messages to this user. Unblock them to continue.',
                [{ text: 'OK' }]
              );
              return;
            }
          }

          let recipientDeviceIds =
            currentGroup?.participants?.find((p: any) => p.user_id === peerUserId)?.device_ids ||
            [];

          if (recipientDeviceIds.length === 0) {
            try {
              const { getUserKeyBundle } = await import('../../api/e2eeApi');
              const keyBundle = await getUserKeyBundle(String(peerUserId));
              if (keyBundle?.devices && keyBundle.devices.length > 0) {
                recipientDeviceIds = keyBundle.devices.map((d: any) => d.device_id);
              } else {
                recipientDeviceIds = [];
              }
            } catch (keyBundleError) {
              recipientDeviceIds = [];
            }
          }

          const result = await dispatch(
            sendChatMessage({
              conversationId,
              recipientUserId: peerUserId,
              plaintext: messageText,
              recipientDeviceIds,
            })
          );

          if (sendChatMessage.fulfilled.match(result)) {
            Keyboard.dismiss();

            if (isPrivateChat && currentConversationId && localIsTyping) {
              setLocalIsTyping(false);
              // sendTyping(false, currentConversationId);
              if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
              }
            }
          } else {
            const errorMessage = (result.payload as string) || 'Failed to send message';
            logger.error('❌ [ChatDetail] Failed to send message:', 'CHAT', errorMessage);

            if (errorMessage.includes('BLOCKED') || errorMessage.includes('blocked')) {
              Alert.alert(
                'User Blocked',
                'You cannot send messages to this user. They may have blocked you, or you may have blocked them.',
                [{ text: 'OK' }]
              );
              // fetchBlockedUsers removed - privacySlice deleted
              // dispatch(fetchBlockedUsers());
            } else {
              Alert.alert('Error', errorMessage);
            }
          }
        } catch (error: any) {
          logger.error('❌ [ChatDetail] Failed to send message:', 'CHAT', error);
          const errorMessage = error?.message || '';
          if (
            errorMessage.includes('BLOCKED') ||
            errorMessage.includes('blocked') ||
            error?.response?.status === 403
          ) {
            Alert.alert(
              'User Blocked',
              'You cannot send messages to this user. They may have blocked you, or you may have blocked them.',
              [{ text: 'OK' }]
            );
            dispatch(fetchBlockedUsers());
          } else {
            Alert.alert('Error', errorMessage || 'Failed to send message');
          }
        }
      } else {
        Alert.alert(
          'Error',
          'Cannot send message: No conversation or group ID. Please start a conversation first.',
          [{ text: 'OK' }]
        );
      }
    },
    [
      isGroupChat,
      isPrivateChat,
      groupId,
      conversationId,
      peerUserId,
      currentConversationId,
      currentGroup,
      profile,
      blockedUsers,
      sendPrivateMessage,
      currentConversationStatus,
      privateMessages,
      activeConversation,
      refreshConversationsList,
      addConversation,
      setCurrentConversationId,
      setLocalConversationStatus,
      chat,
      flatListRef,
      dispatch,
      localIsTyping,
      conversation,
    ]
  );

  return {
    handleSendMessage,
    localIsTyping,
    setLocalIsTyping,
    typingTimerRef,
  };
};
