export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  encrypted?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  participants: string[];
  lastMessage?: Message;
}
