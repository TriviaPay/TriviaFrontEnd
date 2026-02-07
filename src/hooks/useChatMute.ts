/**
 * Chat Mute Hook
 * Manages chat mute preferences for global, trivia live, and private chats
 * Fetches preferences once and caches them to avoid multiple API calls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';

export interface ChatMutePreferences {
  global_chat_muted: boolean;
  trivia_live_chat_muted: boolean;
  private_chat_muted_users: number[];
}

export interface UseChatMuteOptions {
  autoFetch?: boolean;
}

export const useChatMute = (options: UseChatMuteOptions = {}) => {
  const { autoFetch = true } = options;

  const [preferences, setPreferences] = useState<ChatMutePreferences>({
    global_chat_muted: false,
    trivia_live_chat_muted: false,
    private_chat_muted_users: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if preferences have been fetched to avoid multiple calls
  const hasFetched = useRef(false);

  /**
   * Fetch chat mute preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    // Only fetch if not already fetched
    if (hasFetched.current && autoFetch) {
      return preferences;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getChatMutePreferences();

      if (response.success && response.data) {
        setPreferences(response.data);
        hasFetched.current = true;
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch chat mute preferences');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      logger.error('❌ [useChatMute] Error fetching preferences:', 'CHAT', err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [preferences, autoFetch]);

  /**
   * Mute/unmute global chat
   */
  const muteGlobalChat = useCallback(async (muted: boolean) => {
    try {
      setError(null);

      const response = await apiService.muteGlobalChat(muted);

      if (response.success && response.data) {
        // Update local state immediately
        setPreferences(prev => ({
          ...prev,
          global_chat_muted: response.data!.global_chat_muted,
        }));
        return true;
      } else {
        throw new Error(response.error || 'Failed to update global chat mute');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mute global chat';
      logger.error('❌ [useChatMute] Error muting global chat:', 'CHAT', err);
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Mute/unmute trivia live chat
   */
  const muteTriviaLiveChat = useCallback(async (muted: boolean) => {
    try {
      setError(null);

      const response = await apiService.muteTriviaLiveChat(muted);

      if (response.success && response.data) {
        // Update local state immediately
        setPreferences(prev => ({
          ...prev,
          trivia_live_chat_muted: response.data!.trivia_live_chat_muted,
        }));
        return true;
      } else {
        throw new Error(response.error || 'Failed to update trivia live chat mute');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mute trivia live chat';
      logger.error('❌ [useChatMute] Error muting trivia live chat:', 'CHAT', err);
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Mute/unmute private chat with specific user
   */
  const mutePrivateChat = useCallback(async (userId: number, muted: boolean) => {
    try {
      setError(null);

      const response = await apiService.mutePrivateChat(userId, muted);

      if (response.success && response.data) {
        // Update local state immediately
        setPreferences(prev => {
          const mutedUsers = [...prev.private_chat_muted_users];
          if (muted && !mutedUsers.includes(userId)) {
            mutedUsers.push(userId);
          } else if (!muted) {
            const index = mutedUsers.indexOf(userId);
            if (index > -1) {
              mutedUsers.splice(index, 1);
            }
          }
          return {
            ...prev,
            private_chat_muted_users: mutedUsers,
          };
        });
        return true;
      } else {
        throw new Error(response.error || 'Failed to update private chat mute');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mute private chat';
      logger.error('❌ [useChatMute] Error muting private chat:', 'CHAT', err);
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Check if a specific private chat is muted
   */
  const isPrivateChatMuted = useCallback(
    (userId: number): boolean => {
      return preferences.private_chat_muted_users.includes(userId);
    },
    [preferences.private_chat_muted_users]
  );

  /**
   * Toggle global chat mute
   */
  const toggleGlobalChat = useCallback(async () => {
    return muteGlobalChat(!preferences.global_chat_muted);
  }, [preferences.global_chat_muted, muteGlobalChat]);

  /**
   * Toggle trivia live chat mute
   */
  const toggleTriviaLiveChat = useCallback(async () => {
    return muteTriviaLiveChat(!preferences.trivia_live_chat_muted);
  }, [preferences.trivia_live_chat_muted, muteTriviaLiveChat]);

  /**
   * Toggle private chat mute
   */
  const togglePrivateChat = useCallback(
    async (userId: number) => {
      const currentlyMuted = isPrivateChatMuted(userId);
      return mutePrivateChat(userId, !currentlyMuted);
    },
    [isPrivateChatMuted, mutePrivateChat]
  );

  // Auto-fetch preferences on mount if enabled
  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      fetchPreferences();
    }
  }, [autoFetch, fetchPreferences]);

  return {
    // State
    preferences,
    loading,
    error,

    // Getters
    isGlobalChatMuted: preferences.global_chat_muted,
    isTriviaLiveChatMuted: preferences.trivia_live_chat_muted,
    mutedPrivateChatUsers: preferences.private_chat_muted_users,

    // Actions
    fetchPreferences,
    muteGlobalChat,
    muteTriviaLiveChat,
    mutePrivateChat,
    isPrivateChatMuted,
    toggleGlobalChat,
    toggleTriviaLiveChat,
    togglePrivateChat,
  };
};
