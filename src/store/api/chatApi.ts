import { baseApi } from './baseApi';
import {
  SendMessagePayload,
  SendMessageResponse,
  AcceptRejectPayload,
  ConversationsResponse,
  ConversationResponse,
  MessagesResponse,
  Conversation,
  Message,
  PusherMessageSentEvent,
  PusherMessageDeliveredEvent,
  PusherMessageReadEvent,
  GlobalChatMessage,
} from '../../types/chat.types';
import { subscribeToChannel, unsubscribeFromChannel } from '../../pusherClient';

export const chatApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getConversations: builder.query<ConversationsResponse, void>({
      query: () => {
        console.log('🔵 [API] getConversations called');
        return '/private-chat/conversations';
      },
      providesTags: ['Conversations'],
    }),

    getConversation: builder.query<ConversationResponse, number>({
      query: conversationId => {
        console.log('🔵 [API] getConversation called with ID:', conversationId);
        return `/private-chat/conversations/${conversationId}`;
      },
      providesTags: (_result, _error, id) => [{ type: 'Conversation', id }],
    }),

    getMessages: builder.query<
      MessagesResponse,
      { conversationId: number; page?: number; perPage?: number }
    >({
      query: ({ conversationId, page = 1, perPage = 50 }) => {
        console.log(`🔵 [API] getMessages called for conversation ${conversationId}, page ${page}`);
        return `/private-chat/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`;
      },
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        { type: 'Conversation', id: conversationId },
      ],
      // Merge paging results if needed, or handle in component
      async onCacheEntryAdded(
        { conversationId },
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        try {
          await cacheDataLoaded;

          const channelName = `private-conversation-${conversationId}`;
          await subscribeToChannel(channelName, event => {
            const { eventName, data } = event;

            updateCachedData(draft => {
              if (eventName === 'message.sent') {
                const pusherEvent = data as PusherMessageSentEvent;
                // Add new message to list if it doesn't exist
                if (!draft.messages.some((m: Message) => m.id === pusherEvent.message.id)) {
                  draft.messages.push(pusherEvent.message);
                  // Sort by creation time
                  draft.messages.sort(
                    (a: Message, b: Message) =>
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
              } else if (eventName === 'message.delivered') {
                const pusherEvent = data as PusherMessageDeliveredEvent;
                const message = draft.messages.find(
                  (m: Message) => m.id === pusherEvent.message_id
                );
                if (message) {
                  message.status = 'delivered';
                }
              } else if (eventName === 'message.read') {
                const pusherEvent = data as PusherMessageReadEvent;
                // Mark all messages as read for this user
                draft.messages.forEach((m: Message) => {
                  if (m.sender_id !== pusherEvent.user_id) {
                    m.status = 'read';
                  }
                });
              }
            });
          });

          await cacheEntryRemoved;
          unsubscribeFromChannel(channelName);
        } catch (error) {
          // Silent fail or log
        }
      },
    }),

    getGlobalMessages: builder.query<{ messages: GlobalChatMessage[] }, { limit?: number }>({
      query: ({ limit = 50 } = {}) => `/global-chat?limit=${limit}`,
      providesTags: ['GlobalMessages'],
      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        try {
          await cacheDataLoaded;
          const channelName = 'global-chat';
          await subscribeToChannel(channelName, event => {
            const { eventName, data } = event;
            if (eventName === 'new-message' || eventName === 'message') {
              const message = (
                typeof data === 'string' ? JSON.parse(data) : data
              ) as GlobalChatMessage;
              updateCachedData(draft => {
                if (!draft.messages.some((m: GlobalChatMessage) => m.id === message.id)) {
                  draft.messages.push(message);
                  draft.messages.sort(
                    (a: GlobalChatMessage, b: GlobalChatMessage) =>
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
              });
            }
          });
          await cacheEntryRemoved;
          unsubscribeFromChannel(channelName);
        } catch (error) {
          // Silent fail
        }
      },
    }),

    sendGlobalMessage: builder.mutation<
      SendMessageResponse,
      { message: string; client_message_id?: string; reply_to_message_id?: number }
    >({
      query: body => ({
        url: '/global-chat/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GlobalMessages'],
    }),

    sendMessage: builder.mutation<SendMessageResponse, SendMessagePayload>({
      query: payload => {
        console.log('🔵 [API] sendMessage called with payload:', JSON.stringify(payload));
        return {
          url: '/private-chat/send',
          method: 'POST',
          body: payload,
        };
      },
      async onQueryStarted(payload, { dispatch, queryFulfilled, getState }) {
        const state = getState() as any;
        const currentUserId = state.auth?.user?.id;
        const currentUsername = state.auth?.user?.username;
        const tempId = -Date.now(); // Use negative ID for optimistic messages

        const optimisticMessage: Message = {
          id: tempId,
          conversation_id: payload.conversation_id || 0,
          sender_id: currentUserId || 0,
          sender_username: currentUsername || 'Me',
          message: payload.message,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image: payload.image,
        };

        const patchResult = dispatch(
          chatApi.util.updateQueryData(
            'getMessages',
            { conversationId: payload.conversation_id || 0 },
            draft => {
              if (!draft.messages.some(m => m.id === tempId)) {
                draft.messages.push(optimisticMessage);
                draft.messages.sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
            }
          )
        );

        try {
          const { data } = await queryFulfilled;
          // Replace optimistic message with actual message from server
          dispatch(
            chatApi.util.updateQueryData(
              'getMessages',
              { conversationId: payload.conversation_id || 0 },
              draft => {
                const index = draft.messages.findIndex(m => m.id === tempId);
                if (index !== -1) {
                  // Handle legacy response format (message_id, created_at)
                  if (data.message_id) {
                    draft.messages[index] = {
                      ...draft.messages[index],
                      id: data.message_id,
                      created_at: data.created_at || draft.messages[index].created_at,
                      status: (data.status as any) || 'sent',
                    };
                  } else if (data.message) {
                    // Fallback for full message object
                    draft.messages[index] = data.message;
                  }
                }
              }
            )
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { conversation_id }) => [
        { type: 'Messages', id: conversation_id },
        'Conversations',
      ],
    }),

    acceptRejectChat: builder.mutation<
      { success: boolean; conversation: any },
      AcceptRejectPayload
    >({
      query: payload => {
        console.log('🔵 [API] acceptRejectChat called:', payload);
        return {
          url: '/private-chat/accept-reject',
          method: 'POST',
          body: payload,
        };
      },
      invalidatesTags: ['Conversations'],
    }),

    markConversationAsRead: builder.mutation<{ success: boolean }, number>({
      query: conversationId => ({
        url: `/private-chat/conversations/${conversationId}/mark-read`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Conversation', id }, 'Conversations'],
    }),

    markMessageAsDelivered: builder.mutation<{ success: boolean }, number>({
      query: messageId => ({
        url: `/private-chat/messages/${messageId}/mark-delivered`,
        method: 'POST',
      }),
    }),

    sendTypingIndicator: builder.mutation<{ success: boolean }, number>({
      query: conversationId => ({
        url: `/private-chat/conversations/${conversationId}/typing`,
        method: 'POST',
      }),
    }),

    sendTypingStopIndicator: builder.mutation<{ success: boolean }, number>({
      query: conversationId => ({
        url: `/private-chat/conversations/${conversationId}/typing-stop`,
        method: 'POST',
      }),
    }),

    blockUser: builder.mutation<{ success: boolean }, { userId: number }>({
      query: ({ userId }) => ({
        url: '/private-chat/block',
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: ['Conversations', 'Messages'],
    }),

    unblockUser: builder.mutation<{ success: boolean }, number>({
      query: userId => ({
        url: `/private-chat/block/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Conversations', 'Messages'],
    }),

    mutePrivateChat: builder.mutation<{ success: boolean; muted: boolean }, { userId: number; muted: boolean }>({
      query: ({ userId, muted }) => ({
        url: `/chat-mute/private/${userId}`,
        method: 'POST',
        body: { muted },
      }),
      invalidatesTags: ['Conversations'],
    }),

    deleteConversation: builder.mutation<{ success: boolean }, number>({
      query: conversationId => ({
        url: `/private-chat/conversations/${conversationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Conversations'],
    }),

    getBlockedUsers: builder.query<{ blocked_users: any[] }, void>({
      query: () => '/private-chat/blocks',
      providesTags: ['Profile'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useGetMessagesQuery,
  useGetGlobalMessagesQuery,
  useSendGlobalMessageMutation,
  useSendMessageMutation,
  useAcceptRejectChatMutation,
  useMarkConversationAsReadMutation,
  useMarkMessageAsDeliveredMutation,
  useSendTypingIndicatorMutation,
  useSendTypingStopIndicatorMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useMutePrivateChatMutation,
  useDeleteConversationMutation,
  useGetBlockedUsersQuery,
} = chatApi;
