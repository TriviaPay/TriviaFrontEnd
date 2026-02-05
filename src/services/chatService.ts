/**
 * Private Chat Service
 * Handles all API calls for private chat functionality
 */

import { API_CONFIG } from '../config/api';
import { authenticatedRequest } from './api/apiclient';
import { logger } from '../lib/utils/logger';
import {
  SendMessagePayload,
  SendMessageResponse,
  AcceptRejectPayload,
  ConversationsResponse,
  ConversationResponse,
  MessagesResponse,
  MarkReadPayload,
  MarkDeliveredPayload,
  TypingPayload,
} from '../types/chat.types';

// Base API URL
const BASE_URL = API_CONFIG.BASE_URL;

// Helper to handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  return response.json();
};

/**
 * Send a message to a user
 */
export const sendMessage = async (
  token: string,
  payload: SendMessagePayload
): Promise<SendMessageResponse> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/send`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error sending message:', 'CHAT', error);
    throw error;
  }
};

/**
 * Accept or reject a chat request
 */
export const acceptRejectChat = async (
  token: string,
  payload: AcceptRejectPayload
): Promise<{ success: boolean; conversation: any }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/accept-reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('Error', 'CHAT', `❌ [ChatService] Error ${payload.action}ing chat:`, error);
    throw error;
  }
};

/**
 * Fetch all conversations for the current user
 */
export const fetchConversations = async (token: string): Promise<ConversationsResponse> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/conversations`, {
      method: 'GET',
    });

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error fetching conversations:', 'CHAT', error);
    throw error;
  }
};

/**
 * Fetch a specific conversation by ID
 */
export const fetchConversation = async (
  token: string,
  conversationId: number
): Promise<ConversationResponse> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/conversations/${conversationId}`,
      {
        method: 'GET',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error fetching conversation:', 'CHAT', error);
    throw error;
  }
};

/**
 * Fetch messages for a conversation
 */
export const fetchMessages = async (
  token: string,
  conversationId: number,
  page: number = 1,
  perPage: number = 50
): Promise<MessagesResponse> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`,
      {
        method: 'GET',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error fetching messages:', 'CHAT', error);
    throw error;
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = async (
  token: string,
  conversationId: number
): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/conversations/${conversationId}/mark-read`,
      {
        method: 'POST',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error marking conversation as read:', 'CHAT', error);
    throw error;
  }
};

/**
 * Mark a specific message as delivered
 */
export const markMessageAsDelivered = async (
  token: string,
  messageId: number
): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/messages/${messageId}/mark-delivered`,
      {
        method: 'POST',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error marking message as delivered:', 'CHAT', error);
    throw error;
  }
};

/**
 * Send typing indicator (user started typing)
 */
export const sendTypingIndicator = async (
  token: string,
  conversationId: number
): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/conversations/${conversationId}/typing`,
      {
        method: 'POST',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error sending typing indicator:', 'CHAT', error);
    throw error;
  }
};

/**
 * Send typing stopped indicator
 */
export const sendTypingStopIndicator = async (
  token: string,
  conversationId: number
): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(
      `${BASE_URL}/private-chat/conversations/${conversationId}/typing-stop`,
      {
        method: 'POST',
      }
    );

    const data = await handleApiError(response);
    return data;
  } catch (error) {
    logger.error('❌ [ChatService] Error sending typing stop indicator:', 'CHAT', error);
    throw error;
  }
};

/**
 * Block a user
 */
export const blockUser = async (token: string, userId: number): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/users/block/${userId}`, {
      method: 'POST',
    });
    return await handleApiError(response);
  } catch (error) {
    logger.error('❌ [ChatService] Error blocking user:', 'CHAT', error);
    throw error;
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (token: string, userId: number): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/users/unblock/${userId}`, {
      method: 'POST',
    });
    return await handleApiError(response);
  } catch (error) {
    logger.error('❌ [ChatService] Error unblocking user:', 'CHAT', error);
    throw error;
  }
};

/**
 * Get blocked users
 */
export const getBlockedUsers = async (token: string): Promise<any[]> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/users/blocked`, {
      method: 'GET',
    });
    const data = await handleApiError(response);
    return data.blocked_users || [];
  } catch (error: any) {
    // Suppress 404 errors (endpoint might not exist yet)
    if (error.message && error.message.includes('404')) {
      logger.debug('⚠️ [ChatService] Blocked users endpoint not found (404), returning empty list');
      return [];
    }
    logger.error('❌ [ChatService] Error fetching blocked users:', 'CHAT', error);
    return [];
  }
};

/**
 * Mute a conversation (user)
 */
export const muteUser = async (token: string, userId: number): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/mute/${userId}`, {
      method: 'POST',
    });
    return await handleApiError(response);
  } catch (error) {
    logger.error('❌ [ChatService] Error muting user:', 'CHAT', error);
    throw error;
  }
};

/**
 * Unmute a conversation (user)
 */
export const unmuteUser = async (token: string, userId: number): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/unmute/${userId}`, {
      method: 'POST',
    });
    return await handleApiError(response);
  } catch (error) {
    logger.error('❌ [ChatService] Error unmuting user:', 'CHAT', error);
    throw error;
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (token: string, conversationId: number): Promise<{ success: boolean }> => {
  try {
    const response = await authenticatedRequest(`${BASE_URL}/private-chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return await handleApiError(response);
  } catch (error) {
    logger.error('❌ [ChatService] Error deleting conversation:', 'CHAT', error);
    throw error;
  }
};

// Export all functions
export default {
  sendMessage,
  acceptRejectChat,
  fetchConversations,
  fetchConversation,
  fetchMessages,
  markConversationAsRead,
  markMessageAsDelivered,
  sendTypingStopIndicator,
  blockUser,
  unblockUser,
  getBlockedUsers,
  muteUser,
  unmuteUser,
  deleteConversation,
};
