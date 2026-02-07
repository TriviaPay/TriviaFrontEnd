/**
 * useChat Hook
 * Custom hook for managing chat functionality
 */

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import {
  subscribeToConversation,
  unsubscribeFromConversation,
  initChatHandlers,
} from '../services/pusherChatHandlers';
import {
  fetchMessages,
  sendMessage as sendMessageApi,
  markConversationAsRead,
  sendTypingIndicator,
  sendTypingStopIndicator,
} from '../services/chatService';

interface UseChatOptions {
  userToken: string;
  userId: number;
  conversationId?: number;
  autoMarkRead?: boolean;
}

export const useChat = ({
  userToken,
  userId,
  conversationId,
  autoMarkRead = true,
}: UseChatOptions) => {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    messages,
    currentConversation,
    typingStates,
    isSendingMessage,
    addMessage,
    setMessages,
    setSendingMessage,
  } = useChatStore();

  // Initialize chat handlers
  useEffect(() => {
    initChatHandlers(userToken, userId);
  }, [userToken, userId]);

  // Subscribe to conversation on mount
  useEffect(() => {
    if (conversationId) {
      subscribeToConversation(conversationId);

      return () => {
        unsubscribeFromConversation(conversationId);
      };
    }
  }, [conversationId]);

  // Auto-mark as read when conversation becomes active
  useEffect(() => {
    if (conversationId && autoMarkRead && currentConversation?.status === 'active') {
      markAsRead();
    }
  }, [conversationId, currentConversation?.status, autoMarkRead]);

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await fetchMessages(userToken, conversationId);
      if (response.success) {
        setMessages(conversationId, response.messages);
      }
    } catch (error) {
      logger.error('❌ [useChat] Error loading messages:', 'CHAT', error);
      throw error;
    }
  };

  const sendMessage = async (messageText: string, receiverId: number) => {
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);

      const payload = {
        receiver_id: receiverId,
        message: messageText,
        conversation_id: conversationId,
      };

      const response = await sendMessageApi(userToken, payload);

      if (response.success && conversationId) {
        addMessage(conversationId, response.message);
      }

      return response;
    } catch (error) {
      logger.error('❌ [useChat] Error sending message:', 'CHAT', error);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  };

  const markAsRead = async () => {
    if (!conversationId) return;

    try {
      await markConversationAsRead(userToken, conversationId);
    } catch (error) {
      logger.error('❌ [useChat] Error marking as read:', 'CHAT', error);
    }
  };

  const startTyping = async () => {
    if (!conversationId || currentConversation?.status !== 'active') return;

    try {
      await sendTypingIndicator(userToken, conversationId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 1.5 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1500);
    } catch (error) {
      logger.error('❌ [useChat] Error sending typing indicator:', 'CHAT', error);
    }
  };

  const stopTyping = async () => {
    if (!conversationId || currentConversation?.status !== 'active') return;

    try {
      await sendTypingStopIndicator(userToken, conversationId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      logger.error('❌ [useChat] Error sending typing stop:', 'CHAT', error);
    }
  };

  const currentMessages = conversationId ? messages[conversationId] || [] : [];
  const typingState = conversationId ? typingStates[conversationId] : null;

  return {
    messages: currentMessages,
    conversation: currentConversation,
    typingState,
    isSendingMessage,
    loadMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
  };
};

export default useChat;
