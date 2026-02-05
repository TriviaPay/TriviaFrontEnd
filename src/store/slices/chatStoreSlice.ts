/**
 * Chat Store Redux Slice
 * Replaces Zustand store with Redux Toolkit for consistency
 * Acts as a local cache and UI state manager for chat features
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    Conversation,
    Message,
    MessageStatus,
    User,
} from '../../types/chat.types';

// Extend MessageStatus to include 'sending' and 'failed' for UI states
type ExtendedMessageStatus = MessageStatus | 'sending' | 'failed';

interface TypingState {
    [conversationId: number]: {
        isTyping: boolean;
        user?: User;
    };
}

interface ChatStoreState {
    // Conversations
    conversations: Conversation[];
    currentConversation: Conversation | null;

    // Messages
    messages: { [conversationId: number]: Message[] };

    // Typing indicators
    typingStates: TypingState;

    // UI State
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
}

const initialState: ChatStoreState = {
    conversations: [],
    currentConversation: null,
    messages: {},
    typingStates: {},
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,
};

const chatStoreSlice = createSlice({
    name: 'chatStore',
    initialState,
    reducers: {
        // Conversations Actions
        setConversations: (state, action: PayloadAction<Conversation[]>) => {
            state.conversations = action.payload;
        },

        addConversation: (state, action: PayloadAction<Conversation>) => {
            const conversation = action.payload;
            // Remove if exists, then add to front
            state.conversations = [
                conversation,
                ...state.conversations.filter(c => c.conversation_id !== conversation.conversation_id),
            ];
        },

        updateConversation: (state, action: PayloadAction<Conversation>) => {
            const conversation = action.payload;
            state.conversations = state.conversations.map((c) =>
                c.conversation_id === conversation.conversation_id ? { ...c, ...conversation } : c
            );

            if (state.currentConversation?.conversation_id === conversation.conversation_id) {
                state.currentConversation = { ...state.currentConversation, ...conversation };
            }
        },

        setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
            state.currentConversation = action.payload;
        },

        removeConversation: (state, action: PayloadAction<number>) => {
            const conversationId = action.payload;
            state.conversations = state.conversations.filter(c => c.conversation_id !== conversationId);

            if (state.currentConversation?.conversation_id === conversationId) {
                state.currentConversation = null;
            }
        },

        // Messages Actions
        setMessages: (state, action: PayloadAction<{ conversationId: number; messages: Message[] }>) => {
            const { conversationId, messages } = action.payload;
            state.messages[conversationId] = messages;
        },

        addMessage: (state, action: PayloadAction<{ conversationId: number; message: Message }>) => {
            const { conversationId, message } = action.payload;
            const existingMessages = state.messages[conversationId] || [];

            // Check if message already exists (avoid duplicates)
            const messageExists = existingMessages.some((m) => m.id === message.id);

            if (messageExists) {
                // Update existing message
                state.messages[conversationId] = existingMessages.map((m) =>
                    m.id === message.id ? message : m
                );
            } else {
                // Add new message
                state.messages[conversationId] = [...existingMessages, message];
            }
        },

        updateMessage: (state, action: PayloadAction<{ conversationId: number; messageId: number; updates: Partial<Message> }>) => {
            const { conversationId, messageId, updates } = action.payload;
            const messages = state.messages[conversationId] || [];
            state.messages[conversationId] = messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
            );
        },

        prependMessages: (state, action: PayloadAction<{ conversationId: number; messages: Message[] }>) => {
            const { conversationId, messages } = action.payload;
            const existingMessages = state.messages[conversationId] || [];

            // Filter out duplicates
            const newMessages = messages.filter(
                (newMsg) => !existingMessages.some((existMsg) => existMsg.id === newMsg.id)
            );

            state.messages[conversationId] = [...newMessages, ...existingMessages];
        },

        clearMessages: (state, action: PayloadAction<number>) => {
            const conversationId = action.payload;
            delete state.messages[conversationId];
        },

        // Typing Actions
        setTypingState: (state, action: PayloadAction<{ conversationId: number; isTyping: boolean; user?: User }>) => {
            const { conversationId, isTyping, user } = action.payload;
            state.typingStates[conversationId] = { isTyping, user };
        },

        clearTypingState: (state, action: PayloadAction<number>) => {
            const conversationId = action.payload;
            delete state.typingStates[conversationId];
        },

        // Message Status Actions
        markMessageAsDelivered: (state, action: PayloadAction<{ conversationId: number; messageId: number }>) => {
            const { conversationId, messageId } = action.payload;
            const messages = state.messages[conversationId] || [];
            state.messages[conversationId] = messages.map((m) =>
                m.id === messageId && (m.status === 'sent' || m.status === 'pending')
                    ? { ...m, status: 'delivered' as ExtendedMessageStatus }
                    : m
            );
        },

        markAllMessagesAsRead: (state, action: PayloadAction<number>) => {
            const conversationId = action.payload;
            const messages = state.messages[conversationId] || [];
            state.messages[conversationId] = messages.map((m) =>
                m.status !== 'read' ? { ...m, status: 'read' as ExtendedMessageStatus } : m
            );
        },

        // Loading States
        setLoadingConversations: (state, action: PayloadAction<boolean>) => {
            state.isLoadingConversations = action.payload;
        },

        setLoadingMessages: (state, action: PayloadAction<boolean>) => {
            state.isLoadingMessages = action.payload;
        },

        setSendingMessage: (state, action: PayloadAction<boolean>) => {
            state.isSendingMessage = action.payload;
        },

        // Utilities
        reset: (state) => {
            state.conversations = [];
            state.currentConversation = null;
            state.messages = {};
            state.typingStates = {};
            state.isLoadingConversations = false;
            state.isLoadingMessages = false;
            state.isSendingMessage = false;
        },
    },
});

export const {
    setConversations,
    addConversation,
    updateConversation,
    setCurrentConversation,
    removeConversation,
    setMessages,
    addMessage,
    updateMessage,
    prependMessages,
    clearMessages,
    setTypingState,
    clearTypingState,
    markMessageAsDelivered,
    markAllMessagesAsRead,
    setLoadingConversations,
    setLoadingMessages,
    setSendingMessage,
    reset,
} = chatStoreSlice.actions;

export default chatStoreSlice.reducer;
