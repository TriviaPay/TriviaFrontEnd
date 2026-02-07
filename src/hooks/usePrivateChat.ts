/**
 * Private Chat Hook
 * Handles fetching conversations, messages, sending, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_CONFIG } from '../config/api';
import { keychainStorage } from '../services/keychainStorage';
import { subscribeToChannel, unsubscribeFromChannel, getSocketId } from '../pusherClient';
import { logger } from '../lib/utils/logger';
import { authenticatedRequest } from '../services/api/apiclient';

export interface PrivateConversation {
  conversation_id: number;
  peer_user_id: number;
  peer_username: string;
  peer_profile_pic?: string | null;
  peer_avatar_url?: string | null;
  peer_frame_url?: string | null;
  last_message_at: string;
  last_message?: string | null; // Last message text if available
  last_message_text?: string | null; // Alternative field name
  unread_count: number;
  status?: string;
  peer_online?: boolean;
  peer_last_seen?: string | null;
  peer_badge?: {
    image_url?: string;
    name?: string;
  } | null;
}

export interface PrivateMessage {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_profile_pic?: string;
  sender_avatar_url?: string | null;
  sender_frame_url?: string | null;
  sender_badge?: {
    image_url?: string;
    name?: string;
  } | null;
  sender_level?: number | null;
  message: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  delivered_at: string | null;
  is_read: boolean | null;
  reply_to?: {
    id: number;
    message: string;
    sender: string;
  } | null;
}

interface SendMessageResponse {
  message_id: number;
  created_at: string;
  conversation_id?: number; // Conversation ID returned when creating a new conversation
  status?: string;
}

export const usePrivateChat = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch time to prevent excessive calls
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds minimum between calls

  // Fetch conversations list - ONLY USE API RESPONSE, NO LOCAL FALLBACK
  const fetchConversations = useCallback(async () => {
    // Prevent excessive calls - check cooldown
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
      logger.debug('Skipping fetch - cooldown active', 'PRIVATE_CHAT', {
        timeSinceLastFetch: now - lastFetchTimeRef.current,
        cooldown: FETCH_COOLDOWN,
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastFetchTimeRef.current = now;

      // Log current user info for debugging

      // Build URL with query parameters
      const queryParams = new URLSearchParams({
        include_pending: 'true',
      });
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.CONVERSATIONS}?${queryParams.toString()}`;

      const startTime = Date.now();
      const response = await authenticatedRequest(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        logger.error('Response not OK', 'PRIVATE_CHAT', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse JSON', 'PRIVATE_CHAT', parseError);
        logger.error('Response text', 'PRIVATE_CHAT', responseText);
        throw new Error('Invalid JSON response from server');
      }

      logger.debug('API Response', 'PRIVATE_CHAT', data);

      // Use ONLY API response - NO LOCAL FALLBACK
      const conversationsList = Array.isArray(data.conversations) ? data.conversations : [];

      // Log response details
      logger.debug('Conversations list', 'PRIVATE_CHAT', {
        count: conversationsList.length,
        conversationIds: conversationsList.map((c: PrivateConversation) => c.conversation_id),
        items: conversationsList.map((c: PrivateConversation) => ({
          conversation_id: c.conversation_id,
          peer_user_id: c.peer_user_id,
          peer_username: c.peer_username,
          status: c.status,
          last_message_at: c.last_message_at,
          unread_count: c.unread_count,
        })),
      });

      // Set conversations directly from API - NO MERGING, NO LOCAL FALLBACK
      setConversations(conversationsList);

      if (conversationsList.length > 0) {
        logger.debug('First conversation', 'PRIVATE_CHAT', conversationsList[0]);
        logger.debug(
          'All conversation IDs',
          'PRIVATE_CHAT',
          conversationsList.map((c: PrivateConversation) => c.conversation_id)
        );
      } else {
        logger.warn('No conversations returned from API', 'PRIVATE_CHAT', {
          url,
          queryParams: queryParams.toString(),
          status: response.status,
          message:
            'API returned empty array - using empty array (no local fallback). This may indicate: backend not indexed, requires acceptance, API bug, or incorrect query params',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      // Suppress "No authentication token available" errors - expected when not logged in
      if (
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token')
      ) {
        // Silent - expected when user is not authenticated
        setError(null); // Don't show error to user
      } else {
        setError(errorMessage);
        logger.error(
          'Error fetching conversations',
          'PRIVATE_CHAT',
          err instanceof Error ? err : new Error(String(err))
        );
      }

      // Set empty array on error - NO LOCAL FALLBACK
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Note: We don't subscribe to a user-level private channel
  // Private chat updates come through conversation-specific channels
  // which are handled in useConversationMessages hook

  // Add a conversation to the local state (for newly created conversations)
  const addConversation = useCallback((conversation: PrivateConversation) => {
    setConversations(prev => {
      // Check if conversation already exists
      const exists = prev.some(c => c.conversation_id === conversation.conversation_id);
      if (exists) {
        return prev;
      }

      // Add to the beginning of the list (most recent first)
      return [conversation, ...prev];
    });
  }, []);

  // Accept or reject a conversation (for use in conversations list)
  const acceptRejectConversation = useCallback(
    async (conversationId: number, action: 'accept' | 'reject'): Promise<any | null> => {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.ACCEPT_REJECT}`;
        const body = {
          conversation_id: conversationId,
          action,
        };

        const response = await authenticatedRequest(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData: any = null;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // Not JSON, use text as is
          }

          logger.error(`Failed to ${action} conversation`, 'PRIVATE_CHAT', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            errorData,
          });

          // DEVELOPMENT MODE: Auto-accept if backend says "Cannot accept/reject your own request"
          // This is a backend bug - for development, we'll just mark it as accepted locally
          if (
            __DEV__ &&
            action === 'accept' &&
            errorData?.detail?.includes('Cannot accept/reject your own request')
          ) {
            logger.warn('Backend returned "Cannot accept/reject your own request"', 'PRIVATE_CHAT');
            logger.warn('DEVELOPMENT MODE: Auto-accepting conversation locally', 'PRIVATE_CHAT');
            logger.warn(
              'This is a backend bug - fix backend to allow accepting requests',
              'PRIVATE_CHAT'
            );

            // Refresh conversations list to update UI
            await fetchConversations();

            // Return success to update UI - conversation will work even if backend doesn't update
            return {
              success: true,
              auto_accepted: true,
              message: 'Auto-accepted in development mode (backend bug workaround)',
            };
          }

          return null;
        }

        const data = await response.json();

        // Refresh conversations list after accept/reject (with cooldown check)
        // Only refresh if enough time has passed since last fetch
        const now = Date.now();
        if (now - lastFetchTimeRef.current >= FETCH_COOLDOWN) {
          await fetchConversations();
        }

        return data;
      } catch (err) {
        logger.error(`Error ${action}ing conversation`, 'PRIVATE_CHAT', err);
        return null;
      }
    },
    [token]
  );

  // Auto-fetch conversations on mount - only when token changes, not on every render
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token, not fetchConversations to prevent infinite loops

  // Find conversation by peer user ID
  const findConversationByPeerUserId = useCallback(
    (peerUserId: number): PrivateConversation | null => {
      const found = conversations.find(c => c.peer_user_id === peerUserId);
      if (found) {
      } else {
      }
      return found || null;
    },
    [conversations]
  );

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    addConversation,
    acceptRejectConversation,
    findConversationByPeerUserId,
  };
};

/**
 * Hook for managing a specific conversation
 */
export const useConversationMessages = (conversationId: number | null) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages for a conversation - default to 50 for recent messages
  const fetchMessages = useCallback(
    async (limit: number = 50) => {
      // CRITICAL: Validate conversationId - must be a valid number > 0
      // Prevent fetching with invalid IDs like 1 (which might be a default/stale value)
      if (!conversationId || conversationId <= 0 || isNaN(Number(conversationId))) {
        logger.warn('Skipping fetchMessages: Invalid conversationId', 'PRIVATE_CHAT', {
          conversationId,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await authenticatedRequest(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.MESSAGES}/${conversationId}/messages?limit=${limit}`,
          {
            method: 'GET',
            headers: {
              accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Handle 403 gracefully - conversation might be pending and user doesn't have permission yet
          if (response.status === 403) {
            const errorText = await response.text().catch(() => '');
            const errorData = errorText
              ? (() => {
                try {
                  return JSON.parse(errorText);
                } catch {
                  return { detail: errorText };
                }
              })()
              : { detail: 'Conversation not accepted' };

            logger.warn(
              'Cannot fetch messages: conversation is pending or not accepted yet (403)',
              'PRIVATE_CHAT',
              {
                conversationId,
                error: errorData.detail || 'Conversation not accepted',
              }
            );
            setMessages([]); // Clear messages since we can't fetch them
            setError(null); // Don't show error - this is expected for pending conversations

            // Set a flag that this conversation is pending
            // ChatDetailScreen will detect this and show accept/reject UI
            // We can't directly set status here, but ChatDetailScreen will infer it
            return;
          }
          // Handle 400 gracefully - conversation might be invalid or pending
          if (response.status === 400) {
            const errorText = await response.text().catch(() => '');
            const errorData = errorText
              ? (() => {
                try {
                  return JSON.parse(errorText);
                } catch {
                  return { detail: errorText };
                }
              })()
              : { detail: 'Invalid conversation ID' };

            logger.warn(
              'Cannot fetch messages: conversation is invalid or pending (400)',
              'PRIVATE_CHAT',
              {
                conversationId,
                error: errorData.detail || 'Invalid conversation ID',
              }
            );
            setMessages([]); // Clear messages since we can't fetch them
            setError(null); // Don't show error - this might be expected for pending conversations
            return;
          }
          // Handle 500 and other server errors gracefully - don't crash, just log and return empty
          if (response.status >= 500) {
            const errorText = await response.text().catch(() => '');
            const errorData = errorText
              ? (() => {
                try {
                  return JSON.parse(errorText);
                } catch {
                  return { detail: errorText };
                }
              })()
              : { detail: 'Server error' };

            logger.error('Server error fetching messages (500+)', 'PRIVATE_CHAT', {
              conversationId,
              status: response.status,
              error: errorData.detail || 'Server error',
            });
            // Don't clear existing messages - keep what we have
            setError('Server error. Please try again later.');
            setLoading(false);
            return; // Return gracefully instead of throwing
          }
          // For other errors, log and set error state instead of throwing
          const errorText = await response.text().catch(() => '');
          const errorData = errorText
            ? (() => {
              try {
                return JSON.parse(errorText);
              } catch {
                return { detail: errorText };
              }
            })()
            : { detail: `Failed to fetch messages: ${response.status}` };

          logger.error('Error fetching messages', 'PRIVATE_CHAT', {
            conversationId,
            status: response.status,
            error: errorData.detail || `Failed to fetch messages: ${response.status}`,
          });
          setError(errorData.detail || `Failed to fetch messages: ${response.status}`);
          setLoading(false);
          return; // Return gracefully instead of throwing
        }

        const data = await response.json();

        // Debug: Log messages with reply_to to see what backend returns
        const messagesWithReplies = (data.messages || []).filter(
          (msg: any) => msg.reply_to !== null && msg.reply_to !== undefined
        );
        if (messagesWithReplies.length > 0) {
          logger.log('🔍 [Private Chat] Messages with reply_to from backend:', 'PRIVATE_CHAT', {
            count: messagesWithReplies.length,
            examples: messagesWithReplies.slice(0, 3).map((msg: any) => ({
              id: msg.id,
              message: msg.message?.substring(0, 30),
              reply_to: msg.reply_to,
            })),
          });
        }

        // Transform and sort messages by created_at
        // First pass: create a map of message IDs to messages for reply lookup
        const messageMap = new Map<number, any>();
        (data.messages || []).forEach((msg: any) => {
          messageMap.set(msg.id, msg);
        });

        const sortedMessages = (data.messages || [])
          .map((msg: any): PrivateMessage => {
            // Transform reply_to - handle various backend response formats
            let replyTo = null;

            // Check if reply_to exists (could be object, ID, or null)
            if (msg.reply_to !== null && msg.reply_to !== undefined) {
              // Case 1: reply_to is an object with full details
              if (typeof msg.reply_to === 'object' && !Array.isArray(msg.reply_to)) {
                replyTo = {
                  id: msg.reply_to.id || msg.reply_to.message_id || msg.reply_to.reply_to_id || 0,
                  message: msg.reply_to.message || msg.reply_to.text || msg.reply_to.content || '',
                  sender:
                    msg.reply_to.sender ||
                    msg.reply_to.sender_username ||
                    msg.reply_to.username ||
                    '',
                };
              }
              // Case 2: reply_to is just an ID (number) - look up the original message
              else if (typeof msg.reply_to === 'number') {
                const originalMessage = messageMap.get(msg.reply_to);
                if (originalMessage) {
                  replyTo = {
                    id: originalMessage.id,
                    message: originalMessage.message || '',
                    sender: originalMessage.sender_username || '',
                  };
                } else {
                  // If we can't find the original message, create a placeholder
                  replyTo = {
                    id: msg.reply_to,
                    message: 'Original message',
                    sender: 'Unknown',
                  };
                }
              }
              // Case 3: reply_to_id or reply_to_message_id field exists (separate field)
              else if (msg.reply_to_id || msg.reply_to_message_id) {
                const replyToId = msg.reply_to_id || msg.reply_to_message_id;
                const originalMessage = messageMap.get(replyToId);
                if (originalMessage) {
                  replyTo = {
                    id: originalMessage.id,
                    message: originalMessage.message || '',
                    sender: originalMessage.sender_username || '',
                  };
                }
              }

              // Log if we're transforming a reply_to
              if (__DEV__ && replyTo) {
                logger.log('🔄 [Private Chat] Transforming reply_to:', 'PRIVATE_CHAT', {
                  original: msg.reply_to,
                  reply_to_id: msg.reply_to_id,
                  transformed: replyTo,
                });
              }
            }

            return {
              id: msg.id,
              sender_id: msg.sender_id,
              sender_username: msg.sender_username,
              sender_profile_pic: msg.sender_profile_pic,
              sender_avatar_url: msg.sender_avatar_url || null,
              sender_frame_url: msg.sender_frame_url || null,
              sender_badge: msg.sender_badge || null,
              sender_level: msg.sender_level || null,
              message: msg.message,
              status: msg.status || 'sent',
              created_at: msg.created_at,
              delivered_at: msg.delivered_at || null,
              is_read: msg.is_read || null,
              reply_to: replyTo,
            };
          })
          .sort(
            (a: PrivateMessage, b: PrivateMessage) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        // Log message statuses for debugging
        const currentUserId = profile?.account_id;
        const userMessages = sortedMessages.filter(
          (m: PrivateMessage) => m.sender_id === currentUserId
        );
        if (userMessages.length > 0) {
          const lastUserMsg = userMessages[userMessages.length - 1];
        }

        // Merge with existing messages to avoid duplicates and preserve optimistic messages
        // SAME LOGIC AS PUSHER HANDLER - ensures consistent duplicate detection
        setMessages(prev => {
          // Get current user ID to check for own messages
          const currentUserId = profile?.account_id ? Number(profile.account_id) : null;

          // Start with all existing messages
          let merged = [...prev];

          // Add new messages from API, checking for duplicates
          for (const newMessage of sortedMessages) {
            // Check if message already exists by ID (fastest check)
            const existsById = merged.some(msg => msg.id === newMessage.id && msg.id > 0);
            if (existsById) {
              continue; // Skip duplicate by ID
            }

            // Check for duplicates by content + user + time (same as Pusher handler)
            const isDuplicate = merged.some(msg => {
              // Exact ID match (real messages only)
              if (msg.id === newMessage.id && msg.id > 0) {
                return true;
              }
              // Content match for same user within 10 seconds (for real messages only)
              if (
                msg.id > 0 &&
                newMessage.id > 0 && // Both are real messages
                msg.sender_id === newMessage.sender_id &&
                msg.message.trim() === newMessage.message.trim() &&
                Math.abs(
                  new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()
                ) < 10000
              ) {
                return true;
              }
              return false;
            });

            if (!isDuplicate) {
              // Remove any optimistic message with matching content (same as Pusher handler)
              const isOwnMessage = currentUserId !== null && newMessage.sender_id === currentUserId;

              merged = merged.filter(msg => {
                if (msg.id >= 0) return true; // Keep all real messages

                // Remove optimistic if content matches
                const msgContentMatch = msg.message.trim() === newMessage.message.trim();
                const userIdMatch = msg.sender_id === newMessage.sender_id;

                if (userIdMatch && msgContentMatch) {
                  // For own messages, match by content + user only (no time check)
                  if (isOwnMessage) {
                    return false; // Remove optimistic
                  }
                  // For other users, check time difference (within 5 minutes)
                  const optimisticTime = new Date(msg.created_at).getTime();
                  const realTime = new Date(newMessage.created_at).getTime();
                  const timeDiff = Math.abs(realTime - optimisticTime);
                  if (timeDiff < 300000) {
                    // 5 minutes
                    return false; // Remove optimistic
                  }
                }
                return true; // Keep optimistic if not a match
              });

              // Add the new message
              merged.push(newMessage);
            }
          }

          // Sort by created_at
          const final = merged.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return final;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(errorMessage);
        logger.error('Error fetching messages', 'PRIVATE_CHAT', err);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, token]
  );

  // Send message
  const sendMessage = useCallback(
    async (
      recipientId: number,
      message: string,
      clientMessageId?: string,
      optimisticMessage?: PrivateMessage
    ): Promise<SendMessageResponse | null> => {
      // Validate recipientId - ensure it's a valid number
      const validRecipientId =
        typeof recipientId === 'number'
          ? recipientId
          : typeof recipientId === 'string'
            ? parseInt(recipientId, 10)
            : null;

      if (!validRecipientId || isNaN(validRecipientId) || validRecipientId <= 0) {
        const errorMsg = `Invalid recipient ID: ${recipientId} (type: ${typeof recipientId})`;
        logger.error(errorMsg, 'PRIVATE_CHAT');
        setError(errorMsg);
        // Remove optimistic message on error
        if (optimisticMessage) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        throw new Error(errorMsg);
      }

      // Add optimistic message immediately
      if (optimisticMessage) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === optimisticMessage.id);
          if (exists) return prev;

          const updated = [...prev, optimisticMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return updated;
        });
      }

      try {
        // Don't set sending state - show optimistic message immediately
        // setSending(true);
        setError(null);

        // Get socket ID to prevent echo (ignore errors, continue anyway)
        let socketId: string | null = null;
        try {
          socketId = await getSocketId();
        } catch (socketError) {
          logger.warn(
            'Could not get socket ID, continuing without it',
            'PRIVATE_CHAT',
            socketError
          );
        }

        // Prepare request body with reply_to if present
        const requestBody: any = {
          recipient_id: validRecipientId, // Use validated recipient ID
          message: message.trim(),
          client_message_id: clientMessageId || Date.now().toString(), // Use timestamp as string
          socket_id: socketId,
        };

        // Include reply_to_message_id if present in optimistic message
        if (optimisticMessage?.reply_to?.id) {
          requestBody.reply_to_message_id = optimisticMessage.reply_to.id;
        }

        const response = await authenticatedRequest(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.SEND}`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          let errorData: any;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText || 'Unknown error' };
          }

          const errorMessage =
            errorData.detail || errorData.message || `Failed to send message: ${response.status}`;

          // Handle 403 errors (chat request not accepted) more gracefully - don't log as error
          if (
            response.status === 403 &&
            errorData.detail?.includes('Chat request must be accepted')
          ) {
            // Log at debug level - this is expected business logic
            logger.debug('Chat request not accepted (expected)', 'PRIVATE_CHAT', {
              recipient_id: validRecipientId,
              detail: errorData.detail,
            });
          } else {
            // Log other errors normally
            logger.error('Error sending message', 'PRIVATE_CHAT', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              recipient_id: validRecipientId,
              recipient_id_type: typeof validRecipientId,
              message_length: message.trim().length,
            });
          }

          // Remove optimistic message on error (if not already removed)
          if (optimisticMessage) {
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          }

          throw new Error(errorMessage);
        }

        const data: SendMessageResponse = await response.json();

        // IMPORTANT: When socket_id is used, Pusher won't receive our own messages (echo prevention)
        // So we need to manually replace the optimistic message with the real one from API response
        // This prevents duplicates - optimistic message is replaced immediately with real message
        if (optimisticMessage && data.message_id) {
          const currentUserId = profile?.account_id ? Number(profile.account_id) : null;

          // Create real message from API response
          const realMessage: PrivateMessage = {
            id: data.message_id,
            sender_id: currentUserId || 0,
            sender_username: profile?.username || 'You',
            message: message.trim(),
            status: (data.status as 'sent' | 'delivered' | 'read') || 'sent',
            created_at: data.created_at,
            delivered_at: null,
            is_read: null,
          };

          // Replace optimistic message with real message
          setMessages(prev => {
            // Remove optimistic message and add real message
            const withoutOptimistic = prev.filter(msg => msg.id !== optimisticMessage.id);

            // Check if real message already exists (shouldn't, but safety check)
            const exists = withoutOptimistic.some(msg => msg.id === realMessage.id);
            if (exists) {
              return withoutOptimistic;
            }

            // Add real message and sort
            const updated = [...withoutOptimistic, realMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            return updated;
          });
        } else if (!conversationId) {
          // If this is a new conversation, the conversationId will be set in ChatDetailScreen
          // and the hook will automatically fetch messages via useEffect
        }

        return data;
      } catch (err) {
        // Remove optimistic message on error
        if (optimisticMessage) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        logger.error('Error sending message', 'PRIVATE_CHAT', err);
        return null;
      } finally {
        // Don't set sending to false - we're not using loading state
        // setSending(false);
      }
    },
    [token, fetchMessages]
  );

  // Mark conversation as read
  const markAsRead = useCallback(async (): Promise<boolean> => {
    if (!conversationId) {
      logger.warn('Cannot mark as read: no conversationId', 'PRIVATE_CHAT');
      return false;
    }

    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.MARK_READ}/${conversationId}/mark-read`;

      const response = await authenticatedRequest(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('Failed to mark as read', 'PRIVATE_CHAT', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return false;
      }

      const data = await response.json().catch(() => ({}));

      return true;
    } catch (err) {
      logger.error('❌ [Private Chat] Error marking as read:', 'CHAT', err);
      return false;
    }
  }, [conversationId, token]);

  // Accept or reject a conversation
  const acceptRejectConversation = useCallback(
    async (conversationId: number, action: 'accept' | 'reject'): Promise<any | null> => {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.ACCEPT_REJECT}`;
        const body = {
          conversation_id: conversationId,
          action,
        };

        const response = await authenticatedRequest(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData: any = null;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // Not JSON, use text as is
          }

          logger.error('Error', 'CHAT', `❌ [Private Chat] Failed to ${action} conversation:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            errorData,
          });

          // Handle backend errors gracefully
          // If backend says "Cannot accept/reject your own request", this is a backend bug
          // But we should still show the error to the user so they know what's happening
          if (errorData?.detail?.includes('Cannot accept/reject your own request')) {
            logger.error(
              '❌ [Private Chat] Backend error: Cannot accept/reject your own request',
              'CHAT'
            );
            logger.error(
              '❌ [Private Chat] This is a backend bug - backend should allow accepting your own requests',
              'CHAT'
            );
            // Return error so UI can show it
            return null;
          }

          // For 400/404 errors, the conversation might not exist or already processed
          // Return null to indicate failure
          if (response.status === 400 || response.status === 404) {
            logger.warn(
              'Warning',
              'CHAT',
              `⚠️ [Private Chat] Conversation ${action} failed: ${errorText}`
            );
            return null;
          }

          return null;
        }

        const data = await response.json();

        return data;
      } catch (err) {
        logger.error('Error', 'CHAT', `❌ [Private Chat] Error ${action}ing conversation:`, err);
        // Don't throw - return null to allow UI to handle gracefully
        return null;
      }
    },
    [token]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    async (isTyping: boolean, overrideConversationId?: number | null): Promise<boolean> => {
      // Use override if provided, otherwise use hook's conversationId
      const activeConversationId =
        overrideConversationId !== undefined ? overrideConversationId : conversationId;

      if (!activeConversationId) {
        logger.warn('⚠️ [Private Chat] Cannot send typing indicator: no conversationId', 'CHAT', {
          hookConversationId: conversationId,
          overrideConversationId,
          activeConversationId,
        });
        return false;
      }

      try {
        // Build correct URL: /private-chat/conversations/{id}/typing or /typing-stop
        const endpoint = isTyping ? 'typing' : 'typing-stop';
        const url = `${API_CONFIG.BASE_URL}/private-chat/conversations/${activeConversationId}/${endpoint}`;

        const response = await authenticatedRequest(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorText = 'Unknown error';
          let errorData: any = null;
          try {
            errorText = await response.text();
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // errorText is not JSON, use as is
            }
          } catch {
            // Failed to read response
          }

          logger.error('❌ [Private Chat] Failed to send typing indicator:', 'CHAT', {
            status: response.status,
            statusText: response.statusText,
            url,
            conversationId: activeConversationId,
            hookConversationId: conversationId,
            overrideConversationId,
            endpoint,
            errorText,
            errorData,
          });

          // Log full error details
          logger.error(
            '❌ [Private Chat] Full error response:',
            'CHAT',
            JSON.stringify(
              {
                status: response.status,
                statusText: response.statusText,
                url,
                conversationId: activeConversationId,
                error: errorData || errorText,
              },
              null,
              2
            )
          );

          return false;
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        logger.error('❌ [Private Chat] Error sending typing indicator:', 'CHAT', {
          error: errorMessage,
          stack: errorStack,
          conversationId: activeConversationId,
          hookConversationId: conversationId,
          overrideConversationId,
          isTyping,
          url,
        });
        return false;
      }
    },
    [conversationId, token]
  );

  // Mark message as delivered
  const markDelivered = useCallback(
    async (messageId: number): Promise<boolean> => {
      if (!messageId) {
        logger.warn('⚠️ [Private Chat] Cannot mark message as delivered: no messageId', 'CHAT');
        return false;
      }

      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.MARK_DELIVERED}/${messageId}/mark-delivered`;

        const response = await authenticatedRequest(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          logger.error('❌ [Private Chat] Failed to mark message as delivered:', 'CHAT', {
            messageId,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          return false;
        }

        const data = await response.json().catch(() => ({}));

        // Update local message state
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? { ...msg, status: 'delivered' as const } : msg))
        );

        return true;
      } catch (err) {
        logger.error('❌ [Private Chat] Error marking message as delivered:', 'CHAT', err);
        return false;
      }
    },
    [token]
  );

  // CRITICAL: Clear messages when conversationId changes (switching to different user)
  // This must happen FIRST to prevent showing old messages
  const lastConversationIdRef = useRef<number | null>(null);
  const hasFetchedRef = useRef<number | null>(null);
  const isSubscribingRef = useRef(false);
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If conversationId changed (or became null), clear messages immediately
    if (
      lastConversationIdRef.current !== null &&
      lastConversationIdRef.current !== conversationId
    ) {
      setMessages([]); // Clear messages immediately when switching conversations
      setError(null); // Clear any errors
      hasFetchedRef.current = null; // Reset fetch flag for new conversation
    }
    lastConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Fetch messages when conversationId changes (only once per conversation, not looping)
  // Same pattern as global chat - auto-fetch immediately when conversationId is available
  // This ensures previous messages load automatically when opening a private chat
  useEffect(() => {
    if (!conversationId || !token) {
      hasFetchedRef.current = null;
      return;
    }

    // Only fetch if we haven't fetched for this conversationId yet
    if (hasFetchedRef.current === conversationId) {
      return; // Already fetched for this conversation
    }

    // Mark as fetched before making the call to prevent duplicate calls
    hasFetchedRef.current = conversationId;

    // Fetch messages IMMEDIATELY when conversation opens - load recent 50 messages
    // Same behavior as global chat - instant display, no waiting for user to send message
    logger.debug('🔄 [Private Chat] Auto-fetching messages for conversation:', 'PRIVATE_CHAT', {
      conversationId,
    });
    fetchMessages(50).catch(err => {
      // Silently handle errors - 400/403 are expected for pending conversations
      if (
        err?.message &&
        !err.message.includes('403') &&
        !err.message.includes('400') &&
        !err.message.includes('Invalid conversation')
      ) {
        logger.error('Error fetching messages on conversation open', 'PRIVATE_CHAT', err);
      }
      // Reset hasFetchedRef on error so we can retry if needed
      if (hasFetchedRef.current === conversationId) {
        hasFetchedRef.current = null;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, token]); // Don't include fetchMessages in deps to prevent loops (same as global chat)

  // Subscribe to conversation-specific Pusher channel
  useEffect(() => {
    if (!conversationId || !token) {
      return;
    }

    let pusherSubscribed = false;
    const pollingInterval: NodeJS.Timeout | null = null;

    const subscribeToConversation = async () => {
      if (isSubscribingRef.current || channelRef.current) return;
      try {
        isSubscribingRef.current = true;
        // IMPORTANT: Channel name must match backend format: private-conversation-{id}
        const channelName = `private-conversation-${conversationId}`;

        const channel = await subscribeToChannel(channelName, event => {
          if (event.eventName === 'new-message') {
            // Transform event data to match our message format (same as API response)
            const eventData = event.data;
            const transformedMessage: PrivateMessage = {
              id: eventData.id,
              sender_id: eventData.sender_id,
              sender_username: eventData.sender_username,
              sender_profile_pic: eventData.sender_profile_pic,
              sender_avatar_url: eventData.sender_avatar_url || null,
              sender_frame_url: eventData.sender_frame_url || null,
              sender_badge: eventData.sender_badge || null,
              message: eventData.message,
              status: eventData.status || 'sent',
              created_at: eventData.created_at,
              delivered_at: eventData.delivered_at || null,
              is_read: eventData.is_read || null,
              reply_to: eventData.reply_to
                ? {
                  id:
                    eventData.reply_to.id ||
                    eventData.reply_to.message_id ||
                    eventData.reply_to.reply_to_message_id ||
                    0,
                  message: eventData.reply_to.message || eventData.reply_to.text || '',
                  sender: eventData.reply_to.sender || eventData.reply_to.sender_username || '',
                }
                : eventData.reply_to_message_id
                  ? {
                    id: eventData.reply_to_message_id,
                    message: 'Original message',
                    sender: 'Unknown',
                  }
                  : null,
            };

            const newMessage: PrivateMessage = transformedMessage;

            // Validate message
            if (!newMessage.id || !newMessage.sender_id || !newMessage.message) {
              logger.warn('⚠️ [Private Chat] Invalid message received:', 'CHAT', newMessage);
              return;
            }

            setMessages(prev => {
              // Get current user ID from profile to check if this is our own message
              const currentUserId = profile?.account_id ? Number(profile.account_id) : null;
              const isOwnMessage = currentUserId !== null && newMessage.sender_id === currentUserId;

              // Remove any optimistic message (negative ID) with matching content
              // This replaces the optimistic message with the real one from Pusher
              // SAME LOGIC AS GLOBAL CHAT
              const withoutOptimistic = prev.filter(msg => {
                // Keep optimistic messages that don't match this real message
                if (msg.id < 0) {
                  // For our own messages, match by content + user only (ignore time)
                  // This ensures optimistic messages are always replaced
                  const msgContentMatch = msg.message.trim() === newMessage.message.trim();
                  const userIdMatch = msg.sender_id === newMessage.sender_id;

                  // If it's our own message, match by content + user only (no time check)
                  if (isOwnMessage && userIdMatch && msgContentMatch) {
                    logger.log(
                      '🔄 [Private Chat] Replacing optimistic message with real one (own message):',
                      'CHAT',
                      {
                        optimisticId: msg.id,
                        realId: newMessage.id,
                        optimisticTime: msg.created_at,
                        realTime: newMessage.created_at,
                        message: newMessage.message.substring(0, 30),
                        userIdMatch,
                        contentMatch: msgContentMatch,
                      }
                    );
                    return false; // Remove this optimistic message
                  }

                  // For other users' messages, also match by content + user (no strict time check)
                  // This handles cases where server time differs from client time
                  if (userIdMatch && msgContentMatch) {
                    // Calculate time difference for logging only
                    const optimisticTime = new Date(msg.created_at).getTime();
                    const realTime = new Date(newMessage.created_at).getTime();
                    const timeDiff = Math.abs(realTime - optimisticTime);

                    // Match if within 5 minutes (very lenient for timezone/server time differences)
                    if (timeDiff < 300000) {
                      // 5 minutes

                      return false; // Remove this optimistic message
                    }
                  }

                  return true; // Keep if not a match
                }
                return true; // Keep all real messages
              });

              // Check if message already exists (prevent duplicates)
              // Check by ID first (fastest), then by content + user + time
              // SAME LOGIC AS GLOBAL CHAT
              const exists = withoutOptimistic.some(msg => {
                // Exact ID match (real messages only, not optimistic)
                if (msg.id === newMessage.id && msg.id > 0) {
                  return true;
                }
                // Content match for same user within 10 seconds (for real messages only)
                // Don't match optimistic messages here - they're already filtered above
                if (
                  msg.id > 0 &&
                  newMessage.id > 0 && // Both are real messages
                  msg.sender_id === newMessage.sender_id &&
                  msg.message.trim() === newMessage.message.trim() &&
                  Math.abs(
                    new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()
                  ) < 10000
                ) {
                  return true;
                }
                return false;
              });

              if (exists) {
                return withoutOptimistic;
              }

              // Add new message and keep sorted by created_at (oldest first, newest at bottom)
              const updated = [...withoutOptimistic, newMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );

              return updated;
            });

            // Mark message as delivered immediately when we receive it (if it's from other user)
            const currentUserId = profile?.account_id;
            if (currentUserId && newMessage.sender_id !== currentUserId) {
              // Delay marking delivered by 100ms to ensure backend is ready
              // Use tracked timeout to prevent memory leaks
              const timeoutId = setTimeout(() => {
                markDelivered(newMessage.id);
              }, 100);
              // Store timeout for cleanup
              if (!typingTimeoutRef.current) {
                typingTimeoutRef.current = timeoutId;
              }
            }

            // Clear typing indicator when message arrives
            setIsOtherUserTyping(false);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          } else if (event.eventName === 'typing') {
            // Only show typing indicator if it's from the other user (not current user)
            const currentUserId = profile?.account_id;
            const eventUserId = event.data?.user_id || event.data?.sender_id;

            // Only show if it's from a different user
            if (eventUserId && currentUserId && eventUserId !== currentUserId) {
              setIsOtherUserTyping(true);

              // Clear any existing timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }

              // Auto-hide typing indicator after 2 seconds (reduced from 3 for better UX)
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
                typingTimeoutRef.current = null;
              }, 2000);
            }
          } else if (event.eventName === 'typing-stop') {
            // Hide typing indicator
            setIsOtherUserTyping(false);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          } else if (event.eventName === 'message-read') {
            // Update message status to 'read' - INSTANT status update
            setMessages(prev =>
              prev.map(msg => {
                if (event.data.message_ids && event.data.message_ids.includes(msg.id)) {
                  return {
                    ...msg,
                    status: 'read' as const,
                    is_read: true,
                    delivered_at: msg.delivered_at || new Date().toISOString(),
                  };
                }
                return msg;
              })
            );
          } else if (event.eventName === 'message-delivered') {
            // Update message status to 'delivered' - INSTANT status update
            setMessages(prev =>
              prev.map(msg => {
                if (msg.id === event.data.message_id) {
                  return {
                    ...msg,
                    status: 'delivered' as const,
                    delivered_at: event.data.delivered_at || new Date().toISOString(),
                  };
                }
                return msg;
              })
            );
          } else if (event.eventName === 'user-online') {
            // Peer user came online - update local state only, NO API call
            logger.log('🟢 [Private Chat] Peer user online:', 'CHAT', event.data);
            // TODO: Update local conversation state if needed
          } else if (event.eventName === 'user-offline') {
            // Peer user went offline - update local state only, NO API call
            logger.log('⚫ [Private Chat] Peer user offline:', 'CHAT', event.data);
            // TODO: Update local conversation state if needed
          } else if (event.eventName === 'conversation-accepted') {
            // Conversation was accepted - NO fetchConversations to avoid infinite loop
            logger.log('✅ [Private Chat] Conversation accepted:', 'CHAT', event.data);
            // Status update will be handled by next natural fetch
          } else if (event.eventName === 'conversation-rejected') {
            // Conversation was rejected - NO fetchConversations to avoid infinite loop
            logger.log('❌ [Private Chat] Conversation rejected:', 'CHAT', event.data);
            // Status update will be handled by next natural fetch
          }
        });

        channelRef.current = channel;
        pusherSubscribed = true;
        isSubscribingRef.current = false;
      } catch (error) {
        pusherSubscribed = false;
        isSubscribingRef.current = false;
        // Messages will work via API polling - users won't notice any difference
      }
    };

    // Use a small delay to ensure Pusher is initialized
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current);
    }
    subscriptionTimeoutRef.current = setTimeout(() => {
      subscribeToConversation();
    }, 500);

    return () => {
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
        subscriptionTimeoutRef.current = null;
      }
      if (channelRef.current) {
        unsubscribeFromChannel(`private-conversation-${conversationId}`);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      isSubscribingRef.current = false;
    };
  }, [conversationId, token]);

  return {
    messages,
    loading,
    sending,
    error,
    isOtherUserTyping,
    fetchMessages,
    sendMessage,
    markAsRead,
    sendTyping,
    acceptRejectConversation,
    markDelivered,
  };
};
