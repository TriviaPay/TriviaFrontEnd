// Updated: 2026-02-27T19:15:00Z - Force cache bust for Redux rename fix
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';
import { authenticatedRequest } from '../services/api/apiclient';
import {
  setGlobalMessages,
  addGlobalMessage,
  setChatLoading
} from '../store/chatSlice';
import { GlobalChatMessage } from '../types/chat.types';
export type { GlobalChatMessage };
import { pusherService } from '../core/services/PusherService';

interface SendMessageResponse {
  message_id: number;
  created_at: string;
  duplicate: boolean;
}

interface UseGlobalChatOptions {
  limit?: number;
  autoFetch?: boolean;
}

export const useGlobalChat = (options: UseGlobalChatOptions = {}) => {
  const { limit = 50, autoFetch = true } = options;
  const dispatch = useDispatch();

  // Select state from Redux
  const messages = useSelector((state: RootState) => state.chat.globalMessages);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const error = useSelector((state: RootState) => state.chat.error);

  const { user, token } = useSelector((state: RootState) => state.auth);

  const [sending, setSending] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      if (isMounted.current) dispatch(setChatLoading(true));

      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GLOBAL_CHAT.MESSAGES}?limit=${limit}`,
        {
          method: 'GET',
          headers: { accept: 'application/json' },
        }
      );

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      if (data && Array.isArray(data.messages) && isMounted.current) {
        dispatch(setGlobalMessages(data.messages));
      }
    } catch (err) {
      logger.error('❌ [Global Chat] Fetch error:', 'CHAT', err);
    } finally {
      if (isMounted.current) dispatch(setChatLoading(false));
    }
  }, [limit, dispatch, token]);

  // Send message
  const sendMessage = useCallback(
    async (
      message: string,
      clientMessageId?: string,
      optimisticMessage?: GlobalChatMessage
    ): Promise<SendMessageResponse | null> => {
      if (optimisticMessage) {
        dispatch(addGlobalMessage(optimisticMessage));
      }

      try {
        setSending(true);
        const requestBody = {
          message: message.trim(),
          client_message_id: clientMessageId || Date.now().toString(),
        };

        if (optimisticMessage?.reply_to?.id) {
          (requestBody as any).reply_to_message_id = optimisticMessage.reply_to.id;
        }

        const response = await authenticatedRequest(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GLOBAL_CHAT.SEND}`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) throw new Error('Failed to send');

        const data: SendMessageResponse = await response.json();
        return data;
      } catch (err) {
        logger.error('❌ [Global Chat] Send error:', 'CHAT', err);
        return null;
      } finally {
        setSending(false);
      }
    },
    [dispatch]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && user && token) {
      fetchMessages();
    }
  }, [autoFetch, user, token, fetchMessages]);

  // Real-time listener for live incoming messages
  useEffect(() => {
    if (!token) return;

    const channelName = 'global-chat';

    const handleNewMessage = (data: any) => {
      const message = data?.message ?? data;
      if (message && message.id != null && message.created_at && message.message) {
        dispatch(addGlobalMessage(message));
      }
    };

    pusherService.subscribe(channelName, 'new-message', handleNewMessage);
    pusherService.subscribe(channelName, 'message', handleNewMessage);

    return () => {
      pusherService.unsubscribe(channelName);
    };
  }, [token, dispatch]);

  return {
    messages,
    loading,
    sending,
    error,
    fetchMessages,
    sendMessage,
  };
};
