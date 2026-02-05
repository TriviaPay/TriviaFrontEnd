import { apiClient } from '@core/services';
import type { Message, ChatRoom } from '../types';

export const fetchChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await apiClient.get<ChatRoom[]>('/global-chat');
  return response.data || [];
};

export const fetchMessages = async (limit: number = 50): Promise<Message[]> => {
  const response = await apiClient.get<{ messages: Message[] }>(`/global-chat?limit=${limit}`);
  return response.data?.messages || [];
};

export const sendMessage = async (content: string, replyToMessageId: number | null = null): Promise<void> => {
  await apiClient.post(`/global-chat/send`, {
    message: content,
    client_message_id: `${Date.now()}-${Math.random()}`,
    reply_to_message_id: replyToMessageId
  });
};

export const muteGlobalChat = async (muted: boolean): Promise<boolean> => {
  const response = await apiClient.post<{ global_chat_muted: boolean }>(`/chat-mute/global`, { muted });
  return response.data?.global_chat_muted || false;
};
