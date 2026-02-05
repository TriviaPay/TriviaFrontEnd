/**
 * Chat Slice
 * Chat rooms and messages state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message, ChatRoom } from '@features/chat/types';
import { PrivateConversation } from '../../hooks/usePrivateChat';

interface TypingState {
  [conversationId: number]: {
    isTyping: boolean;
    user?: any;
  };
}

interface ChatState {
  rooms: ChatRoom[]; // Global chat rooms
  activeRoomId: string | null;
  // Private chat state
  conversations: PrivateConversation[];
  currentConversation: PrivateConversation | null;
  messages: Record<number, Message[]>; // conversationId -> messages
  typingStates: TypingState;
  isMuted: boolean;

  loading: boolean;
  error: string | null;
  soundEnabled: boolean;
}

const initialState: ChatState = {
  rooms: [],
  activeRoomId: null,
  conversations: [],
  currentConversation: null,
  messages: {},
  typingStates: {},
  isMuted: false,
  loading: false,
  error: null,
  soundEnabled: true,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = action.payload;
      state.loading = false;
    },

    setActiveRoom: (state, action: PayloadAction<string | null>) => {
      state.activeRoomId = action.payload;
    },

    // Private Chat Reducers
    setConversations: (state, action: PayloadAction<PrivateConversation[]>) => {
      state.conversations = action.payload;
      state.loading = false;
    },

    setCurrentConversation: (state, action: PayloadAction<PrivateConversation | null>) => {
      state.currentConversation = action.payload;
    },

    addConversation: (state, action: PayloadAction<PrivateConversation>) => {
      const exists = state.conversations.find(c => c.conversation_id === action.payload.conversation_id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    updateConversation: (state, action: PayloadAction<PrivateConversation>) => {
      const index = state.conversations.findIndex(c => c.conversation_id === action.payload.conversation_id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
      }
    },

    setMessages: (state, action: PayloadAction<{ conversationId: number; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    addMessage: (state, action: PayloadAction<{ conversationId: number; message: Message }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      // Check for duplicates
      const exists = state.messages[conversationId].some(m => m.id === message.id);
      if (!exists) {
        state.messages[conversationId].push(message);
      }
    },

    setTypingState: (state, action: PayloadAction<{ conversationId: number; isTyping: boolean; user?: any }>) => {
      const { conversationId, isTyping, user } = action.payload;
      state.typingStates[conversationId] = { isTyping, user };
    },

    clearTypingState: (state, action: PayloadAction<number>) => {
      delete state.typingStates[action.payload];
    },

    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    toggleSound: state => {
      state.soundEnabled = !state.soundEnabled;
    },

    reset: () => initialState,
  },
});

export const {
  setRooms,
  setActiveRoom,
  setConversations,
  setCurrentConversation,
  addConversation,
  updateConversation,
  setMessages,
  addMessage,
  setTypingState,
  clearTypingState,
  setIsMuted,
  setLoading,
  setError,
  toggleSound,
  reset,
} = chatSlice.actions;

export default chatSlice.reducer;
