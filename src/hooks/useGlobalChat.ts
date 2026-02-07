/**
 * Global Chat Hook
 * Handles fetching, sending, and real-time updates for global chat messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_CONFIG } from '../config/api';
import { subscribeToChannel, unsubscribeFromChannel, getSocketId } from '../pusherClient';
import { logger } from '../lib/utils/logger';
import { authenticatedRequest } from '../services/api/apiclient';

export interface GlobalChatMessage {
  id: number;
  user_id: number;
  username: string;
  profile_pic: string;
  avatar_url?: string | null;
  frame_url?: string | null;
  badge?: {
    image_url?: string;
    name?: string;
  } | null;
  message: string;
  created_at: string;
  is_from_trivia_live: boolean;
  reply_to?: {
    id: number;
    message: string;
    sender: string;
    level?: number | null;
  } | null;
}

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
  const { user, token } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track mount status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Cleanup all resources on unmount
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
        subscriptionTimeoutRef.current = null;
      }
      if (channelRef.current) {
        unsubscribeFromChannel('global-chat');
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, []);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      if (isMounted.current) setLoading(true);
      if (isMounted.current) setError(null);

      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GLOBAL_CHAT.MESSAGES}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ [Global Chat] GET request failed:', 'CHAT', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || !Array.isArray(data.messages)) {
        logger.error('❌ [Global Chat] Invalid response structure:', 'CHAT', data);
        throw new Error('Invalid response: messages array not found');
      }

      // Debug: Log messages with reply_to to see what backend returns
      const messagesWithReplies = data.messages.filter(
        (msg: any) => msg.reply_to !== null && msg.reply_to !== undefined
      );
      if (messagesWithReplies.length > 0) {
        logger.log('🔍 [Global Chat] Messages with reply_to from backend:', 'CHAT', {
          count: messagesWithReplies.length,
          examples: messagesWithReplies.slice(0, 3).map((msg: any) => ({
            id: msg.id,
            message: msg.message?.substring(0, 30),
            reply_to: msg.reply_to,
          })),
        });
      }

      // Transform API response to match our message format
      // First pass: create a map of message IDs to messages for reply lookup
      const messageMap = new Map<number, any>();
      data.messages.forEach((msg: any) => {
        messageMap.set(msg.id, msg);
      });

      // Transform API response to match our message format
      const transformedMessages: GlobalChatMessage[] = data.messages.map((msg: any) => {
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
                msg.reply_to.sender || msg.reply_to.sender_username || msg.reply_to.username || '',
            };
          }
          // Case 2: reply_to is just an ID (number) - look up the original message
          else if (typeof msg.reply_to === 'number') {
            const originalMessage = messageMap.get(msg.reply_to);
            if (originalMessage) {
              replyTo = {
                id: originalMessage.id,
                message: originalMessage.message || '',
                sender: originalMessage.username || '',
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
          // Case 3: reply_to_id field exists (separate field)
          else if (msg.reply_to_id) {
            const originalMessage = messageMap.get(msg.reply_to_id);
            if (originalMessage) {
              replyTo = {
                id: originalMessage.id,
                message: originalMessage.message || '',
                sender: originalMessage.username || '',
              };
            }
          }

          // Log if we're transforming a reply_to
          if (__DEV__ && replyTo) {
            logger.log('🔄 [Global Chat] Transforming reply_to:', 'CHAT', {
              original: msg.reply_to,
              reply_to_id: msg.reply_to_id,
              transformed: replyTo,
            });
          }
        }

        return {
          id: msg.id,
          user_id: msg.user_id,
          username: msg.username,
          profile_pic: msg.profile_pic,
          avatar_url: msg.avatar_url || null,
          frame_url: msg.frame_url || null,
          badge: msg.badge || null,
          message: msg.message,
          created_at: msg.created_at,
          is_from_trivia_live: msg.is_from_trivia_live || false,
          reply_to: replyTo,
          level: msg.level || null,
        };
      });

      // Sort by created_at (oldest first, newest at bottom) - no reverse needed
      const sortedMessages = transformedMessages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Merge with existing messages and remove optimistic duplicates
      if (isMounted.current) {
        setMessages(prev => {
          // Start with API messages (real messages)
          const merged = [...sortedMessages];

          // Add optimistic messages that don't match any real message
          for (const optimisticMsg of prev) {
            if (optimisticMsg.id < 0) {
              // Check if this optimistic message matches any real message from API
              const matchesReal = sortedMessages.some(realMsg => {
                const contentMatch = optimisticMsg.message.trim() === realMsg.message.trim();
                const optimisticUserId =
                  typeof optimisticMsg.user_id === 'number'
                    ? optimisticMsg.user_id
                    : typeof optimisticMsg.user_id === 'string'
                      ? parseInt(optimisticMsg.user_id, 10)
                      : null;
                const realUserId =
                  typeof realMsg.user_id === 'number'
                    ? realMsg.user_id
                    : typeof realMsg.user_id === 'string'
                      ? parseInt(realMsg.user_id, 10)
                      : null;
                const userIdMatch =
                  optimisticUserId !== null &&
                  realUserId !== null &&
                  optimisticUserId === realUserId;

                // If content and user match, this optimistic message is replaced by real one - don't add it
                return contentMatch && userIdMatch;
              });

              // Only keep optimistic messages that don't have a matching real message
              if (!matchesReal) {
                merged.push(optimisticMsg);
              }
            }
          }

          // Remove duplicates by ID (real messages take priority)
          const uniqueById = new Map<number, GlobalChatMessage>();
          merged.forEach(msg => {
            if (!uniqueById.has(msg.id)) {
              uniqueById.set(msg.id, msg);
            } else if (msg.id > 0) {
              // Real message takes priority over optimistic
              uniqueById.set(msg.id, msg);
            }
          });

          // Sort final list
          const final = Array.from(uniqueById.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return final;
        });
      }
    } catch (err) {
      if (!isMounted.current) return;

      // Suppress "No authentication token available" errors - expected when not logged in
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token')
      ) {
        // Silent - expected when user is not authenticated
        return;
      }
      // Silent error handling - don't show errors to user, use cached data if available
      // Only log in development
      if (__DEV__) {
        logger.error('❌ [Global Chat] Error fetching messages:', 'CHAT', err);
      }
      // Don't set error state - keep showing cached data
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [limit, token]);

  // Send message
  const sendMessage = useCallback(
    async (
      message: string,
      clientMessageId?: string,
      optimisticMessage?: GlobalChatMessage
    ): Promise<SendMessageResponse | null> => {
      // Add optimistic message IMMEDIATELY before API call for instant UI update
      if (optimisticMessage) {
        setMessages(prev => {
          // Check if optimistic message already exists
          const exists = prev.some(
            msg =>
              msg.id === optimisticMessage.id ||
              (msg.user_id === optimisticMessage.user_id &&
                msg.created_at === optimisticMessage.created_at &&
                msg.message === optimisticMessage.message)
          );
          if (exists) {
            return prev;
          }
          // Add optimistic message and sort - IMMEDIATE UI UPDATE
          const updated = [...prev, optimisticMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return updated;
        });

        // Force a microtask to ensure state update is processed before API call
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      try {
        setSending(true);
        setError(null);

        // Get socket ID to prevent duplicate messages
        const socketId = await getSocketId();

        // Prepare request body with reply_to if present
        const requestBody: any = {
          message: message.trim(),
          client_message_id: clientMessageId || Date.now().toString(), // Use timestamp as string
          socket_id: socketId, // Include socket_id to prevent echo
        };

        // Include reply_to_message_id if present in optimistic message
        if (optimisticMessage?.reply_to?.id) {
          requestBody.reply_to_message_id = optimisticMessage.reply_to.id;
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

        if (!response.ok) {
          // Remove optimistic message on error
          if (optimisticMessage) {
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          }
          const errorText = await response.text();
          throw new Error(
            `Failed to send message: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const data: SendMessageResponse = await response.json();

        // Handle duplicate message flag from API
        if (data.duplicate) {
          logger.log('⚠️ [Global Chat] Duplicate message detected by server', 'CHAT');
          // If it's a duplicate, we might want to remove the optimistic message 
          // to avoid confusion, or just let it be replaced by the "real" one if it ever comes via Pusher.
          // For now, let's just log it and return data.
        }

        // DON'T remove optimistic message here - let Pusher deliver the real message
        // The optimistic message will be replaced when Pusher event arrives
        // This ensures the message stays visible instantly until real one arrives

        return data;
      } catch (err) {
        // Remove optimistic message on error
        if (optimisticMessage) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        logger.error('❌ [Global Chat] Error sending message:', 'CHAT', err);
        return null;
      } finally {
        setSending(false);
      }
    },
    [token]
  );

  // Subscribe to Pusher channel for real-time updates
  useEffect(() => {
    if (!user || !token) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const attemptSubscribe = async (): Promise<void> => {
      if (!isMounted.current || isSubscribingRef.current || channelRef.current) {
        return;
      }

      try {
        isSubscribingRef.current = true;
        console.log(
          `🔵 [Global Chat] Attempting to subscribe to global-chat (attempt ${retryCount + 1}/${maxRetries})`
        );

        // Use public channel for global chat (not private-)
        const channelName = 'global-chat';

        // Check if Pusher is connected before subscribing
        const socketId = await getSocketId();

        if (!socketId) {
          throw new Error('Pusher not connected - socket ID unavailable');
        }

        console.log('🟢 [Global Chat] Pusher connected, socket ID:', socketId);

        const channel = await subscribeToChannel(channelName, event => {
          if (event.eventName === 'new-message' || event.eventName === 'message') {
            // Parse data if it's a string, otherwise use as-is
            let eventData = event.data;
            if (typeof eventData === 'string') {
              try {
                eventData = JSON.parse(eventData);
              } catch (e) {
                logger.error('❌ [Global Chat] Failed to parse event data:', 'CHAT', e);
                return;
              }
            }

            // Transform event data to match our message format (same as API response)
            const transformedMessage: GlobalChatMessage = {
              id: eventData.id,
              user_id: eventData.user_id,
              username: eventData.username,
              profile_pic: eventData.profile_pic,
              avatar_url: eventData.avatar_url || null,
              frame_url: eventData.frame_url || null,
              badge: eventData.badge || null,
              message: eventData.message,
              created_at: eventData.created_at,
              is_from_trivia_live: eventData.is_from_trivia_live || false,
              reply_to: eventData.reply_to
                ? {
                  id: eventData.reply_to.id || eventData.reply_to.message_id,
                  message: eventData.reply_to.message || eventData.reply_to.text || '',
                  sender: eventData.reply_to.sender || eventData.reply_to.sender_username || '',
                }
                : null,
              level: eventData.level || null,
            };

            const newMessage: GlobalChatMessage = transformedMessage;
            logger.log(
              '✅ [Global Chat] New message received:',
              'CHAT',
              JSON.stringify(newMessage, null, 2)
            );

            // Validate message has required fields - check for null/undefined specifically
            // Check if it's actually an object and has the required properties
            if (!newMessage || typeof newMessage !== 'object' || Array.isArray(newMessage)) {
              logger.warn('⚠️ [Global Chat] Invalid message: not a valid object', 'CHAT', {
                isNull: newMessage === null,
                isUndefined: newMessage === undefined,
                type: typeof newMessage,
                isArray: Array.isArray(newMessage),
                value: newMessage,
              });
              return;
            }

            // Validate message has required fields - use explicit checks
            const hasId = typeof newMessage.id === 'number' && !isNaN(newMessage.id);
            const hasUserId = typeof newMessage.user_id === 'number' && !isNaN(newMessage.user_id);
            const hasCreatedAt =
              typeof newMessage.created_at === 'string' && newMessage.created_at.length > 0;
            const hasMessage =
              typeof newMessage.message === 'string' && newMessage.message.trim().length > 0;

            if (!hasId || !hasUserId || !hasCreatedAt || !hasMessage) {
              logger.warn(
                '⚠️ [Global Chat] Invalid message received, missing required fields:',
                'CHAT',
                {
                  hasId,
                  hasUserId,
                  hasCreatedAt,
                  hasMessage,
                  id: newMessage.id,
                  user_id: newMessage.user_id,
                  created_at: newMessage.created_at,
                  message: newMessage.message,
                  messageType: typeof newMessage,
                  fullMessage: newMessage,
                }
              );
              return;
            }

            setMessages(prev => {
              // Get current user ID with fallback logic (same as in ChatsScreen)
              let currentUserId: number | null = null;
              if (profile?.account_id) {
                currentUserId =
                  typeof profile.account_id === 'number'
                    ? profile.account_id
                    : typeof profile.account_id === 'string'
                      ? parseInt(profile.account_id, 10)
                      : null;
                if (currentUserId !== null && isNaN(currentUserId)) {
                  currentUserId = null;
                }
              }
              // Fallback to user.id if profile.account_id not available
              if (!currentUserId && user?.id) {
                const userIdNum =
                  typeof user.id === 'number'
                    ? user.id
                    : typeof user.id === 'string'
                      ? parseInt(user.id, 10)
                      : null;
                if (userIdNum !== null && !isNaN(userIdNum)) {
                  currentUserId = userIdNum;
                }
              }

              const messageUserId =
                typeof newMessage.user_id === 'number'
                  ? newMessage.user_id
                  : typeof newMessage.user_id === 'string'
                    ? parseInt(newMessage.user_id, 10)
                    : null;

              // Remove any optimistic message (negative ID) with matching content
              // CRITICAL: Match by content + user, regardless of time - this ensures optimistic messages are ALWAYS replaced
              const withoutOptimistic = prev.filter(msg => {
                // Keep optimistic messages that don't match this real message
                if (msg.id < 0) {
                  // Match by content + user ID (strict comparison)
                  const msgContentMatch = msg.message.trim() === newMessage.message.trim();
                  const msgUserId =
                    typeof msg.user_id === 'number'
                      ? msg.user_id
                      : typeof msg.user_id === 'string'
                        ? parseInt(msg.user_id, 10)
                        : null;
                  const userIdMatch =
                    msgUserId !== null && messageUserId !== null && msgUserId === messageUserId;

                  // If content and user match, ALWAYS remove optimistic (no time check needed)
                  if (msgContentMatch && userIdMatch) {
                    logger.log(
                      '🔄 [Global Chat] Removing optimistic message (matched by content + user):',
                      'CHAT',
                      {
                        optimisticId: msg.id,
                        realId: newMessage.id,
                        message: newMessage.message.substring(0, 30),
                      }
                    );
                    return false; // Remove this optimistic message
                  }

                  return true; // Keep if not a match
                }
                return true; // Keep all real messages
              });

              // Check if message already exists (prevent duplicates)
              // Check by ID first (fastest), then by content + user + time
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
                  msg.user_id === newMessage.user_id &&
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
          }
        });

        channelRef.current = channel;
        isSubscribingRef.current = false;
        console.log('🟢 [Global Chat] Successfully subscribed to global-chat channel');
      } catch (error) {
        isSubscribingRef.current = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Suppress Pusher subscription errors - they're handled by retry logic and fallback to polling
        // These errors are expected during app startup and don't affect functionality
        const isExpectedError =
          errorMessage.includes('Failed to subscribe') ||
          errorMessage.includes('IllegalArgumentException') ||
          errorMessage.includes('not connected') ||
          errorMessage.includes('socket ID');

        // Only log unexpected errors in development
        if (!isExpectedError && __DEV__) {
          console.error(
            `🔴 [Global Chat] Unexpected error (attempt ${retryCount + 1}):`,
            errorMessage
          );
        }

        // Retry logic for connection issues
        const isRetryableError =
          errorMessage.includes('Failed to subscribe') ||
          errorMessage.includes('not connected') ||
          errorMessage.includes('socket ID') ||
          errorMessage.includes('IllegalArgumentException') ||
          errorMessage.includes('Channel not ready');

        if (isRetryableError && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(
            `🟡 [Global Chat] Retrying subscription in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})...`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptSubscribe();
        } else {
          // If all retries failed or error is not retryable, log and continue
          // App will still work with polling (fetchMessages)
          logger.warn(
            '⚠️ [Global Chat] Subscription failed after retries. App will use polling instead.',
            'CHAT'
          );
        }
      }
    };

    // Start subscription with initial delay to ensure Pusher is initialized
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current);
    }

    subscriptionTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        attemptSubscribe();
      }
    }, 500);

    return () => {
      // Cleanup: unsubscribe from channel
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
        subscriptionTimeoutRef.current = null;
      }
      if (channelRef.current) {
        unsubscribeFromChannel('global-chat');
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [user?.id, token]);

  // Track if initial fetch is done to prevent loops
  const initialFetchDoneRef = useRef(false);

  // Auto-fetch messages on mount - INSTANTLY without delay (only once)
  useEffect(() => {
    if (autoFetch && user && token && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      // Fetch immediately on mount for instant display - silent error handling
      fetchMessages().catch(() => {
        // Silent fail - don't show errors, use cached data if available
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, user, token]); // Remove fetchMessages from deps to prevent loops

  return {
    messages,
    loading,
    sending,
    error,
    fetchMessages,
    sendMessage,
  };
};
