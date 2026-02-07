import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Chat {
  id: number;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: number;
  status: 'online' | 'offline' | 'read' | 'unread';
  backgroundColor?: string;
  isGroup?: boolean;
  members?: User[];
  createdBy?: string;
  createdAt?: string;
  pendingRequest?: boolean;
}

export interface User {
  id: number;
  name: string;
  avatar: string;
  message: string;
  time: string;
  status: 'online' | 'offline' | 'read' | 'unread';
  backgroundColor?: string;
}

export interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isUser: boolean;
  isSystem?: boolean;
  isNotification?: boolean;
  pending?: boolean;
  image?: string;
  level?: number;
}

export interface Story {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  image: string;
  time: string;
  viewed: boolean;
  isAdd?: boolean;
}

interface ChatState {
  chats: Chat[];
  messages: { [chatId: number]: Message[] };
  stories: Story[];
  currentChat: Chat | null;
  isTyping: boolean;
  showAttachments: boolean;
  selectedImage: string | null;
  showImagePreview: boolean;
  showGroupOptions: boolean;
  pendingInvites: User[];
  inviteResponses: { [inviteId: number]: string };
  showChatRequestBanner: boolean;
}

const initialState: ChatState = {
  chats: [],
  messages: {},
  stories: [],
  currentChat: null,
  isTyping: false,
  showAttachments: false,
  selectedImage: null,
  showImagePreview: false,
  showGroupOptions: false,
  pendingInvites: [],
  inviteResponses: {},
  showChatRequestBanner: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = action.payload;
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      state.chats.unshift(action.payload);
    },
    updateChat: (state, action: PayloadAction<{ id: number; updates: Partial<Chat> }>) => {
      const chat = state.chats.find(c => c.id === action.payload.id);
      if (chat) {
        Object.assign(chat, action.payload.updates);
      }
    },
    setMessages: (state, action: PayloadAction<{ chatId: number; messages: Message[] }>) => {
      state.messages[action.payload.chatId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ chatId: number; message: Message }>) => {
      if (!state.messages[action.payload.chatId]) {
        state.messages[action.payload.chatId] = [];
      }
      state.messages[action.payload.chatId].push(action.payload.message);
    },
    setStories: (state, action: PayloadAction<Story[]>) => {
      state.stories = action.payload;
    },
    addStory: (state, action: PayloadAction<Story>) => {
      state.stories.unshift(action.payload);
    },
    setCurrentChat: (state, action: PayloadAction<Chat | null>) => {
      state.currentChat = action.payload;
    },
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setShowAttachments: (state, action: PayloadAction<boolean>) => {
      state.showAttachments = action.payload;
    },
    setSelectedImage: (state, action: PayloadAction<string | null>) => {
      state.selectedImage = action.payload;
    },
    setShowImagePreview: (state, action: PayloadAction<boolean>) => {
      state.showImagePreview = action.payload;
    },
    setShowGroupOptions: (state, action: PayloadAction<boolean>) => {
      state.showGroupOptions = action.payload;
    },
    setPendingInvites: (state, action: PayloadAction<User[]>) => {
      state.pendingInvites = action.payload;
    },
    updateInviteResponse: (
      state,
      action: PayloadAction<{ inviteId: number; response: string }>
    ) => {
      state.inviteResponses[action.payload.inviteId] = action.payload.response;
    },
    setShowChatRequestBanner: (state, action: PayloadAction<boolean>) => {
      state.showChatRequestBanner = action.payload;
    },
    acceptChatRequest: state => {
      if (state.currentChat) {
        state.currentChat.pendingRequest = false;
        state.showChatRequestBanner = false;
      }
    },
    declineChatRequest: state => {
      state.showChatRequestBanner = false;
    },
  },
});

export const {
  setChats,
  addChat,
  updateChat,
  setMessages,
  addMessage,
  setStories,
  addStory,
  setCurrentChat,
  setIsTyping,
  setShowAttachments,
  setSelectedImage,
  setShowImagePreview,
  setShowGroupOptions,
  setPendingInvites,
  updateInviteResponse,
  setShowChatRequestBanner,
  acceptChatRequest,
  declineChatRequest,
} = chatSlice.actions;

export default chatSlice.reducer;
