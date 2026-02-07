/**
 * useChatMessages Hook - TypeScript Implementation
 * Professional chat messages hook with comprehensive features
 */

import { useState } from 'react';

interface ChatMessage {
  id: number;
  username: string;
  isHost: boolean;
  text: string;
  avatar: string;
  isWinner?: boolean;
  winnerPosition?: number;
}

interface UseChatMessagesReturn {
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}

export const useChatMessages = (): UseChatMessagesReturn => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      username: 'Host',
      isHost: true,
      text: "Welcome to today's winners announcement!",
      avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
    },
    {
      id: 2,
      username: 'User123',
      isHost: false,
      isWinner: true,
      winnerPosition: 1,
      text: "Wow! I can't believe I won! 🎉",
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    },
    {
      id: 3,
      username: 'GameFan',
      isHost: false,
      text: 'I was so close!',
      avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
    },
    {
      id: 4,
      username: 'TopPlayer',
      isHost: false,
      isWinner: true,
      winnerPosition: 2,
      text: "Second place! I'll get first next time!",
      avatar: 'https://randomuser.me/api/portraits/women/24.jpg',
    },
    {
      id: 5,
      username: 'Host',
      isHost: true,
      text: "Don't forget to join tomorrow's game!",
      avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
    },
    {
      id: 6,
      username: 'BronzeWinner',
      isHost: false,
      isWinner: true,
      winnerPosition: 3,
      text: 'Bronze is still a win! Thanks everyone!',
      avatar: 'https://randomuser.me/api/portraits/men/25.jpg',
    },
  ]);

  return {
    chatMessages,
    setChatMessages,
  };
};
