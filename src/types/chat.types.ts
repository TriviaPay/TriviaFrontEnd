export type MessageStatus = 'sent' | 'delivered' | 'read' | 'pending';

export interface User {
  id: number;
  username: string;
  profile_pic_url?: string;
  avatar_url?: string | null;
  frame_url?: string | null;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_profile_pic?: string;
  sender_avatar_url?: string | null;
  sender_frame_url?: string | null;
  sender_level?: number | null;
  sender_badge?: {
    image_url?: string;
    name?: string;
  } | null;
  message: string;
  status: MessageStatus;
  created_at: string;
  delivered_at: string | null;
  is_read: boolean | null;
  image?: string | null;
  reply_to?: {
    id: number;
    message: string;
    sender: string;
  } | null;
}

export interface Conversation {
  conversation_id: number;
  peer_user_id: number;
  peer_username: string;
  peer_profile_pic?: string | null;
  peer_avatar_url?: string | null;
  peer_frame_url?: string | null;
  last_message_at: string;
  last_message?: string | null;
  last_message_text?: string | null;
  unread_count: number;
  status?: string;
  peer_online?: boolean;
  peer_last_seen?: string | null;
  peer_level?: number | null;
  peer_badge?: {
    image_url?: string;
    name?: string;
  } | null;
  initiated_by?: number;
  is_muted?: boolean;
  other_user?: {
    id: number;
    username: string;
    profile_pic_url?: string;
  };
}

export interface SendMessagePayload {
  recipient_id: number;
  message: string;
  conversation_id?: number;
  reply_to_message_id?: number;
  image?: string;
  client_message_id?: string;
  socket_id?: string | null;
}

export interface SendMessageResponse {
  message_id: number;
  created_at: string;
  conversation_id?: number;
  status?: string;
  message?: Message; // Backend sometimes returns full message object
}

export interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
}

export interface ConversationResponse {
  success: boolean;
  conversation: Conversation;
}

export interface MessagesResponse {
  success: boolean;
  messages: Message[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AcceptRejectPayload {
  conversation_id: number;
  action: 'accept' | 'reject';
}

export interface GlobalChatMessage {
  id: number;
  user_id: number;
  username: string;
  profile_pic: string;
  avatar_url?: string | null;
  frame_url?: string | null;
  level?: number | null;
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
  } | null;
}

export interface PusherMessageSentEvent {
  conversation_id: number;
  message: Message;
}

export interface PusherMessageDeliveredEvent {
  conversation_id: number;
  message_id: number;
  user_id: number;
}

export interface PusherMessageReadEvent {
  conversation_id: number;
  user_id: number;
}

export interface MarkReadPayload {
  conversation_id: number;
}

export interface MarkDeliveredPayload {
  message_id: number;
}

export interface TypingPayload {
  conversation_id: number;
  is_typing: boolean;
}
