// Updated: 2026-02-27T19:15:00Z - Force cache bust for Redux rename fix
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';
import { authenticatedRequest } from '../services/api/apiclient';
import {
  setConversations,
  updateConversation,
  setMessages,
  addMessage,
  setChatLoading
} from '../store/chatSlice';
import { Conversation, Message } from '../types/chat.types';
export type { Conversation as PrivateConversation };
import { pusherService } from '../core/services/PusherService';

const EMPTY_ARRAY: any[] = [];

export const usePrivateChat = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const error = useSelector((state: RootState) => state.chat.error);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      dispatch(setChatLoading(true));
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.CONVERSATIONS}?include_pending=true`,
        { method: 'GET', headers: { accept: 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      dispatch(setConversations(data.conversations || []));
    } catch (err) {
      logger.error('❌ [Private Chat] Fetch error:', 'CHAT', err);
    } finally {
      dispatch(setChatLoading(false));
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  return { conversations, loading, error, fetchConversations };
};

export const useConversationMessages = (conversationId: number | null) => {
  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) =>
    conversationId ? (state.chat.messages[conversationId] ?? EMPTY_ARRAY) : EMPTY_ARRAY
  );
  const typingState = useSelector((state: RootState) =>
    conversationId ? state.chat.typingStates[conversationId] : null
  );
  const isOtherUserTyping = !!typingState?.isTyping;

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async (limit: number = 50) => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.MESSAGES}/${conversationId}/messages?limit=${limit}`,
        { method: 'GET', headers: { accept: 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        dispatch(setMessages({ conversationId, messages: data.messages || [] }));
      }
    } catch (err) {
      logger.error('❌ [Private Chat] Messages error:', 'CHAT', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, dispatch]);

  // Real-time listener for live private messages
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `private-conversation-${conversationId}`;

    const handleNewMessage = (data: any) => {
      const message = data?.message ?? data;
      if (message && message.id != null) {
        dispatch(addMessage({ conversationId, message }));
      }
    };

    pusherService.subscribe(channelName, 'new-message', handleNewMessage);
    pusherService.subscribe(channelName, 'message.sent', handleNewMessage);
    pusherService.subscribe(channelName, 'message', handleNewMessage);

    return () => {
      pusherService.unsubscribe(channelName);
    };
  }, [conversationId, dispatch]);

  const sendMessage = useCallback(async (
    recipientId: number,
    message: string,
    clientMessageId?: string,
    optimisticMessage?: Message
  ) => {
    if (optimisticMessage && conversationId) {
      dispatch(addMessage({ conversationId, message: optimisticMessage }));
    }

    try {
      setSending(true);
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.SEND}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_id: recipientId,
            message: message.trim(),
            client_message_id: clientMessageId || Date.now().toString(),
          })
        }
      );
      if (!response.ok) throw new Error('Failed to send');
      return await response.json();
    } catch (err) {
      logger.error('❌ [Private Chat] Send error:', 'CHAT', err);
      return null;
    } finally {
      setSending(false);
    }
  }, [conversationId, dispatch]);

  return {
    messages,
    loading,
    sending,
    isOtherUserTyping,
    fetchMessages,
    sendMessage,
  };
};
