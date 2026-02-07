/**
 * Chat SSE Hook
 * Real-time message streaming using Server-Sent Events
 * Professional enterprise-level implementation with comprehensive logging
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EventSource from 'react-native-sse';
import { authService } from '../services/authService';
// Message slice removed - import commented out
// import { addMessage, Message } from '../store/slices/messageSlice';
import { decryptMessage } from '../crypto/encryptor';
import { RootState } from '../store';
import api from '../api/client';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface SSEMessage {
  conversation_id: string;
  message_id: string;
  sender_user_id: number;
  sender_device_id: string;
  ciphertext: string;
  proto: number;
  created_at: string;
  client_message_id: string;
}

interface UseChatSSEOptions {
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

/**
 * Hook for listening to chat messages via SSE
 */
export const useChatSSE = (options: UseChatSSEOptions = {}) => {
  const { onMessage, onError, autoReconnect = true, reconnectDelay = 5000 } = options;

  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  /**
   * Check SSE connection (OPTIONS request)
   * Step 0: Pre-flight check
   */
  const checkSSEConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.options('/dm/sse');

      return true;
    } catch (error: any) {
      logger.warn('⚠️ [SSE] Step 0: SSE pre-flight check failed (non-critical):', 'CHAT', error);
      // Don't fail - continue with connection attempt
      return true;
    }
  }, []);

  /**
   * Connect to SSE endpoint
   * Step 1: Establish SSE connection
   */
  const connect = useCallback(async () => {
    if (isConnectingRef.current) {
      return;
    }

    if (!user) {
      return;
    }

    isConnectingRef.current = true;

    try {
      // Step 0: Pre-flight check (optional)
      await checkSSEConnection();

      // Step 1.1: Get authentication token (ensures refresh if needed)
      const token = await authService.ensureValidToken();
      if (!token) {
        logger.warn('⚠️ [SSE] Step 1.1: No token available for SSE connection', 'CHAT');
        isConnectingRef.current = false;
        return;
      }

      // Step 1.2: Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Step 1.3: Create new EventSource connection

      const eventSource = new EventSource(`${API_BASE_URL}/dm/sse`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      eventSourceRef.current = eventSource;

      // Step 1.4: Handle connection open
      eventSource.addEventListener('open', () => {
        isConnectingRef.current = false;
        if (mountedRef.current) {
          setIsConnected(true);
        }
      });

      // Step 1.5: Handle retry directive
      eventSource.addEventListener('retry', (event: { data?: string }) => {
        const retryDelay = event.data ? parseInt(event.data, 10) : reconnectDelay;
      });

      // Step 1.6: Handle new messages
      eventSource.addEventListener('message', async (event: { data: string }) => {
        try {
          // Parse SSE message
          const data: SSEMessage = JSON.parse(event.data);

          // Step 2.1: Get current user ID for comparison
          const currentUserId = user?.id;
          const isUserMessage = data.sender_user_id === currentUserId;

          // Step 2.2: Decrypt message if not from current user
          let plaintext: string | undefined;
          if (!isUserMessage) {
            try {
              plaintext = await decryptMessage(String(data.sender_user_id), data.ciphertext);
            } catch (decryptError) {
              logger.warn('⚠️ [SSE] Step 2.2: Failed to decrypt message:', 'CHAT', decryptError);
              plaintext = '🔒 Encrypted message';
            }
          }

          // Step 2.3: Create message object for Redux

          const message: {
            id: string;
            conversationId: string;
            senderUserId: number;
            senderDeviceId: string;
            ciphertext: string;
            plaintext?: string;
            proto: number;
            createdAt: string;
            clientMessageId: string;
            status: 'delivered';
            isUser: boolean;
          } = {
            id: data.message_id,
            conversationId: data.conversation_id,
            senderUserId: data.sender_user_id,
            senderDeviceId: data.sender_device_id,
            ciphertext: data.ciphertext,
            plaintext,
            proto: data.proto,
            createdAt: data.created_at,
            clientMessageId: data.client_message_id,
            status: 'delivered',
            isUser: isUserMessage,
          };

          // Step 2.4: Dispatch to Redux

          // addMessage removed - messageSlice deleted
          // dispatch(addMessage({ conversationId: data.conversation_id, message }));

          // Call custom callback if provided
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          logger.error('❌ [SSE] ========================================', 'CHAT');
          logger.error('❌ [SSE] Step 2 FAILED: Error processing SSE message', 'CHAT');
          logger.error('❌ [SSE] Error:', 'CHAT', error);
          logger.error('❌ [SSE] ========================================', 'CHAT');
          if (onError) {
            onError(error as Error);
          }
        }
      });

      // Step 1.7: Handle errors
      eventSource.addEventListener('error', (error: unknown) => {
        logger.error('❌ [SSE] ========================================', 'CHAT');
        logger.error('❌ [SSE] Step 1.7: SSE connection error', 'CHAT');
        logger.error('❌ [SSE] Error:', 'CHAT', error);
        logger.error('❌ [SSE] Ready state:', 'CHAT', eventSource.readyState);
        logger.error('❌ [SSE] ========================================', 'CHAT');

        isConnectingRef.current = false;
        if (mountedRef.current) {
          setIsConnected(false);
        }

        if (onError) {
          onError(new Error('SSE connection error'));
        }

        // Auto-reconnect if enabled
        if (autoReconnect && eventSource.readyState === EventSource.CLOSED) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      });
    } catch (error) {
      logger.error('❌ [SSE] ========================================', 'CHAT');
      logger.error('❌ [SSE] Step 1 FAILED: Error setting up SSE connection', 'CHAT');
      logger.error('❌ [SSE] Error:', 'CHAT', error);
      logger.error('❌ [SSE] ========================================', 'CHAT');

      isConnectingRef.current = false;
      if (mountedRef.current) {
        setIsConnected(false);
      }

      if (onError) {
        onError(error as Error);
      }

      // Auto-reconnect if enabled
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    }
  }, [user?.id, onMessage, onError, autoReconnect, reconnectDelay, checkSSEConnection]);

  /**
   * Disconnect from SSE
   * Step 3: Disconnect from SSE
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      global.clearTimeout(reconnectTimeoutRef.current as any);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = false;
    if (mountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  // Auto-connect on mount if autoReconnect is true
  // Use ref to track if we've already initialized to prevent loops
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    // Only connect once when user is authenticated and encryption is enabled
    if (autoReconnect && user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      connect();
    }

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (hasInitializedRef.current) {
        disconnect();
        hasInitializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user ID, not the functions

  return {
    connect,
    disconnect,
    isConnected: isConnected && eventSourceRef.current?.readyState === EventSource.OPEN,
  };
};
