/**
 * Pusher Chat Event Handlers
 * Manages real-time chat events via Pusher
 */

import { subscribeToChannel, unsubscribeFromChannel } from '../pusherClient';
import { store } from '../store/store';
import {
  addMessage,
  updateConversation,
  markMessageAsDelivered as markDelivered,
  markAllMessagesAsRead as markRead,
  setTypingState,
  clearTypingState,
  removeConversation,
} from '../store/slices/chatSlice';
import {
  Message,
  PusherMessageSentEvent,
  PusherMessageDeliveredEvent,
  PusherMessageReadEvent,
  PusherTypingEvent,
  PusherConversationAcceptedEvent,
  PusherConversationRejectedEvent,
} from '../types/chat.types';
import { markMessageAsDelivered } from './chatService';

// Store active subscriptions
const activeSubscriptions = new Set<string>();

// Store user token for API calls
let userToken: string | null = null;
let currentUserId: number | null = null;

/**
 * Initialize chat handlers with user token
 */
export const initChatHandlers = (token: string, userId: number) => {
  userToken = token;
  currentUserId = userId;
};

/**
 * Subscribe to a conversation channel
 */
export const subscribeToConversation = async (conversationId: number) => {
  // Change to private-chat-{id} format which is more standard/safe
  // Use private-conversation.{id} as resource-based naming
  const channelName = `private-conversation-${conversationId}`;

  // Check if already subscribed
  if (activeSubscriptions.has(channelName)) {
    return;
  }

  try {
    await subscribeToChannel(channelName, event => {
      handlePusherEvent(conversationId, event.eventName, event.data);
    });

    activeSubscriptions.add(channelName);
  } catch (error) {
    logger.error('❌ [PusherChat] Error subscribing to conversation:', 'CHAT', error);
    throw error;
  }
};

/**
 * Unsubscribe from a conversation channel
 */
export const unsubscribeFromConversation = (conversationId: number) => {
  const channelName = `private-conversation-${conversationId}`;

  if (!activeSubscriptions.has(channelName)) {
    return;
  }

  try {
    unsubscribeFromChannel(channelName);
    activeSubscriptions.delete(channelName);
  } catch (error) {
    logger.error('❌ [PusherChat] Error unsubscribing from conversation:', 'CHAT', error);
  }
};

/**
 * Unsubscribe from all conversations
 */
export const unsubscribeFromAllConversations = () => {
  activeSubscriptions.forEach(channelName => {
    const conversationId = parseInt(channelName.split('-')[2]);
    if (!isNaN(conversationId)) {
      unsubscribeFromConversation(conversationId);
    }
  });
  activeSubscriptions.clear();
};

/**
 * Handle incoming Pusher events
 */
const handlePusherEvent = (conversationId: number, eventName: string, data: any) => {
  switch (eventName) {
    case 'message.sent':
      handleMessageSent(conversationId, data as PusherMessageSentEvent);
      break;

    case 'message.delivered':
      handleMessageDelivered(conversationId, data as PusherMessageDeliveredEvent);
      break;

    case 'message.read':
      handleMessageRead(conversationId, data as PusherMessageReadEvent);
      break;

    case 'typing.start':
      handleTypingStart(conversationId, data as PusherTypingEvent);
      break;

    case 'typing.stop':
      handleTypingStop(conversationId, data as PusherTypingEvent);
      break;

    case 'conversation.accepted':
      handleConversationAccepted(data as PusherConversationAcceptedEvent);
      break;

    case 'conversation.rejected':
      handleConversationRejected(data as PusherConversationRejectedEvent);
      break;

    default:
      logger.warn('⚠️ [PusherChat] Unknown event:', 'CHAT', eventName);
  }
};

/**
 * Handle new message received
 */
const handleMessageSent = async (conversationId: number, data: PusherMessageSentEvent) => {
  try {
    const { message, conversation } = data;

    // Add message to store
    store.dispatch(addMessage({ conversationId, message }));

    // Update conversation in list
    if (conversation) {
      store.dispatch(updateConversation(conversation));
    }

    // Mark as delivered if message is from other user
    if (message.sender_id !== currentUserId && userToken) {
      try {
        await markMessageAsDelivered(userToken, message.id);
      } catch (error) {
        logger.error('❌ [PusherChat] Error marking message as delivered:', 'CHAT', error);
      }
    }
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling message.sent:', 'CHAT', error);
  }
};

/**
 * Handle message delivered event
 */
const handleMessageDelivered = (conversationId: number, data: PusherMessageDeliveredEvent) => {
  try {
    const { message_id } = data;

    // Update message status in store
    store.dispatch(markDelivered({ conversationId, messageId: message_id }));
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling message.delivered:', 'CHAT', error);
  }
};

/**
 * Handle message read event
 */
const handleMessageRead = (conversationId: number, data: PusherMessageReadEvent) => {
  try {
    const { user_id } = data;

    // Only update if it's the other user who read (not us)
    if (user_id !== currentUserId) {
      store.dispatch(markRead(conversationId));
    }
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling message.read:', 'CHAT', error);
  }
};

/**
 * Handle typing started
 */
const handleTypingStart = (conversationId: number, data: PusherTypingEvent) => {
  try {
    const { user_id, user } = data;

    // Only show typing indicator if it's the other user
    if (user_id !== currentUserId) {
      store.dispatch(setTypingState({ conversationId, isTyping: true, user }));
    }
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling typing.start:', 'CHAT', error);
  }
};

/**
 * Handle typing stopped
 */
const handleTypingStop = (conversationId: number, data: PusherTypingEvent) => {
  try {
    const { user_id } = data;

    // Only clear typing indicator if it's the other user
    if (user_id !== currentUserId) {
      store.dispatch(clearTypingState(conversationId));
    }
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling typing.stop:', 'CHAT', error);
  }
};

/**
 * Handle conversation accepted
 */
const handleConversationAccepted = (data: PusherConversationAcceptedEvent) => {
  try {
    const { conversation } = data;

    // Update conversation status in store
    store.dispatch(updateConversation(conversation));
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling conversation.accepted:', 'CHAT', error);
  }
};

/**
 * Handle conversation rejected
 */
const handleConversationRejected = (data: PusherConversationRejectedEvent) => {
  try {
    const { conversation_id } = data;

    // Remove conversation from store
    store.dispatch(removeConversation(conversation_id));
  } catch (error) {
    logger.error('❌ [PusherChat] Error handling conversation.rejected:', 'CHAT', error);
  }
};

// Export all functions
export default {
  initChatHandlers,
  subscribeToConversation,
  unsubscribeFromConversation,
  unsubscribeFromAllConversations,
};
