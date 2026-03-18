import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message, GlobalChatMessage, Conversation } from '../types/chat.types';

// Updated: 2026-02-27T19:08:00Z - Force cache bust for Redux rename fix

interface TypingState {
  [conversationId: number]: {
    isTyping: boolean;
    user?: any;
  };
}

interface ChatState {
  // Global chat state
  globalMessages: GlobalChatMessage[];

  // Private chat state
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Record<number, Message[]>; // conversationId -> messages
  typingStates: TypingState;

  // App-wide chat state
  isMuted: boolean;
  loading: boolean;
  error: string | null;
  soundEnabled: boolean;

  // UI State
  selectedImage: string | null;
  showImagePreview: boolean;
}

const initialState: ChatState = {
  globalMessages: [],
  conversations: [],
  currentConversation: null,
  messages: {},
  typingStates: {},
  isMuted: false,
  loading: false,
  error: null,
  soundEnabled: true,
  selectedImage: null,
  showImagePreview: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Global Chat Reducers
    setGlobalMessages: (state, action: PayloadAction<GlobalChatMessage[]>) => {
      state.globalMessages = action.payload;
      state.loading = false;
    },

    addGlobalMessage: (state, action: PayloadAction<GlobalChatMessage>) => {
      const message = action.payload;
      // Check for duplicates by ID
      const exists = state.globalMessages.some(m => m.id === message.id);
      if (exists) return;

      // Filter out matching optimistic messages
      if (message.id > 0) {
        state.globalMessages = state.globalMessages.filter(m => {
          if (m.id >= 0) return true;
          const isOwn = m.user_id === message.user_id;
          const isMatch = m.message.trim() === message.message.trim();
          return !(isOwn && isMatch);
        });
      }

      state.globalMessages.push(message);
      // Keep sorted by time
      state.globalMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    // Private Chat Reducers
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
      state.loading = false;
    },

    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
    },

    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find(c => c.conversation_id === action.payload.conversation_id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    updateConversation: (state, action: PayloadAction<Conversation>) => {
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
      if (exists) return;

      // Filter out matching optimistic messages if this is a real message
      if (message.id > 0) {
        state.messages[conversationId] = state.messages[conversationId].filter(m => {
          if (m.id >= 0) return true;
          const isOwn = m.sender_id === message.sender_id;
          const isMatch = m.message.trim() === message.message.trim();
          return !(isOwn && isMatch);
        });
      }

      state.messages[conversationId].push(message);
      // Keep sorted
      state.messages[conversationId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    markMessageAsDelivered: (state, action: PayloadAction<{ conversationId: number; messageId: number }>) => {
      const { conversationId, messageId } = action.payload;
      if (state.messages[conversationId]) {
        const msg = state.messages[conversationId].find(m => m.id === messageId);
        if (msg) msg.status = 'delivered';
      }
    },

    markAllMessagesAsRead: (state, action: PayloadAction<number>) => {
      const conversationId = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId].forEach(m => {
          m.status = 'read';
          m.is_read = true;
        });
      }
    },

    setTypingState: (state, action: PayloadAction<{ conversationId: number; isTyping: boolean; user?: any }>) => {
      const { conversationId, isTyping, user } = action.payload;
      state.typingStates[conversationId] = { isTyping, user };
    },

    clearTypingState: (state, action: PayloadAction<number>) => {
      delete state.typingStates[action.payload];
    },

    removeConversation: (state, action: PayloadAction<number>) => {
      state.conversations = state.conversations.filter(c => c.conversation_id !== action.payload);
      delete state.messages[action.payload];
    },

    // App Setting Reducers
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },

    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    toggleSound: state => {
      state.soundEnabled = !state.soundEnabled;
    },

    setSelectedImage: (state, action: PayloadAction<string | null>) => {
      state.selectedImage = action.payload;
    },

    setShowImagePreview: (state, action: PayloadAction<boolean>) => {
      state.showImagePreview = action.payload;
    },

    reset: () => initialState,
  },
});

export const {
  setGlobalMessages,
  addGlobalMessage,
  setConversations,
  setCurrentConversation,
  addConversation,
  updateConversation,
  setMessages,
  addMessage,
  markMessageAsDelivered,
  markAllMessagesAsRead,
  setTypingState,
  clearTypingState,
  removeConversation,
  setIsMuted,
  setChatLoading,
  setError,
  toggleSound,
  setSelectedImage,
  setShowImagePreview,
  reset,
} = chatSlice.actions;

export default chatSlice.reducer;
