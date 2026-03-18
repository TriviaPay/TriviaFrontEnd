import { subscribeToChannel, unsubscribeFromChannel } from '../pusherClient';
import { store } from '../store/store';
import {
  addMessage,
  addGlobalMessage,
  updateConversation,
  markMessageAsDelivered as markDelivered,
  markAllMessagesAsRead as markRead,
  setTypingState,
  clearTypingState,
  removeConversation,
} from '../store/chatSlice';
import {
  Message,
  GlobalChatMessage,
  PusherMessageSentEvent,
  PusherMessageDeliveredEvent,
  PusherMessageReadEvent,
  PusherTypingEvent,
  PusherConversationAcceptedEvent,
  PusherConversationRejectedEvent,
} from '../types/chat.types';
import { logger } from '../lib/utils/logger';

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

  // Ensure we are subscribed to global chat by default
  subscribeToGlobalChat();
};

/**
 * Subscribe to global chat channel
 */
export const subscribeToGlobalChat = async () => {
  const channelName = 'global-chat';
  if (activeSubscriptions.has(channelName)) return;

  try {
    await subscribeToChannel(channelName, event => {
      // Global chat events are usually 'new-message' or 'message'
      if (event.eventName === 'new-message' || event.eventName === 'message') {
        let data = event.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { return; }
        }
        handleGlobalMessage(data as GlobalChatMessage);
      }
    });
    activeSubscriptions.add(channelName);
  } catch (error) {
    logger.error('❌ [PusherChat] Global subscription error:', 'CHAT', error);
  }
};

/**
 * Subscribe to a conversation channel
 */
export const subscribeToConversation = async (conversationId: number) => {
  const channelName = `private-conversation-${conversationId}`;
  if (activeSubscriptions.has(channelName)) return;

  try {
    await subscribeToChannel(channelName, event => {
      handlePusherEvent(conversationId, event.eventName, event.data);
    });
    activeSubscriptions.add(channelName);
  } catch (error) {
    logger.error('❌ [PusherChat] Conversation subscription error:', 'CHAT', error);
  }
};

/**
 * Handle incoming Global message
 */
const handleGlobalMessage = (message: GlobalChatMessage) => {
  store.dispatch(addGlobalMessage(message));
};

/**
 * Handle incoming Pusher events
 */
const handlePusherEvent = (conversationId: number, eventName: string, data: any) => {
  // Parse data if needed
  let eventData = data;
  if (typeof eventData === 'string') {
    try { eventData = JSON.parse(eventData); } catch (e) { return; }
  }

  switch (eventName) {
    case 'new-message':
    case 'message.sent':
      handleMessageSent(conversationId, eventData as PusherMessageSentEvent);
      break;

    case 'message.delivered':
      handleMessageDelivered(conversationId, eventData as PusherMessageDeliveredEvent);
      break;

    case 'message.read':
      handleMessageRead(conversationId, eventData as PusherMessageReadEvent);
      break;

    case 'typing':
    case 'typing.start':
      handleTypingStart(conversationId, eventData as PusherTypingEvent);
      break;

    case 'typing-stop':
    case 'typing.stop':
      handleTypingStop(conversationId, eventData as PusherTypingEvent);
      break;

    case 'conversation.accepted':
      handleConversationAccepted(eventData as PusherConversationAcceptedEvent);
      break;

    case 'conversation.rejected':
      handleConversationRejected(eventData as PusherConversationRejectedEvent);
      break;

    default:
      logger.warn('⚠️ [PusherChat] Unknown event:', 'CHAT', eventName);
  }
};

/**
 * Handle new message received
 */
const handleMessageSent = (conversationId: number, data: any) => {
  // Data might be PusherMessageSentEvent { message, conversation } or just Message
  const message = data.message || data;
  if (!message || !message.id) return;

  store.dispatch(addMessage({ conversationId, message }));

  if (data.conversation) {
    store.dispatch(updateConversation(data.conversation));
  }
};

const handleMessageDelivered = (conversationId: number, data: any) => {
  const messageId = data.message_id || data.id;
  if (messageId) {
    store.dispatch(markDelivered({ conversationId, messageId }));
  }
};

const handleMessageRead = (conversationId: number, data: any) => {
  store.dispatch(markRead(conversationId));
};

const handleTypingStart = (conversationId: number, data: any) => {
  const userId = data.user_id || data.sender_id;
  if (userId !== currentUserId) {
    store.dispatch(setTypingState({ conversationId, isTyping: true, user: data.user || data }));
  }
};

const handleTypingStop = (conversationId: number, data: any) => {
  store.dispatch(clearTypingState(conversationId));
};

const handleConversationAccepted = (data: any) => {
  if (data.conversation) {
    store.dispatch(updateConversation(data.conversation));
  }
};

const handleConversationRejected = (data: any) => {
  const conversationId = data.conversation_id || data.id;
  if (conversationId) {
    store.dispatch(removeConversation(conversationId));
  }
};

export default {
  initChatHandlers,
  subscribeToGlobalChat,
  subscribeToConversation,
  unsubscribeFromConversation: (conversationId: number) => {
    const channelName = `private-conversation-${conversationId}`;
    unsubscribeFromChannel(channelName);
    activeSubscriptions.delete(channelName);
  },
  unsubscribeFromAllConversations: () => {
    activeSubscriptions.forEach(name => unsubscribeFromChannel(name));
    activeSubscriptions.clear();
  },
};
