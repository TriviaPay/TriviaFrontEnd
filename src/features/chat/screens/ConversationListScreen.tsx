/**
 * Conversation List Screen
 * Displays all chat conversations
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTrackScreenView, useAnalytics } from '../../../hooks/useAnalytics';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useChatStore } from '../../../store/chatStore';
import { fetchConversations } from '../../../services/chatService';
import { Conversation } from '../types';
import moment from 'moment';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { usePlatformOptimization, useHapticFeedback } from '../../../hooks/usePlatformOptimization';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

const ConversationListScreen: React.FC = () => {
  // Analytics tracking
  useTrackScreenView('ConversationListScreen');
  const { trackEvent } = useAnalytics();

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  const navigation = useNavigation();

  // Get user token from your auth store/context
  const [userToken, setUserToken] = useState<string>('YOUR_USER_TOKEN');
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Zustand store
  const { conversations, setConversations, setLoadingConversations } = useChatStore();

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const username = conv.other_user?.username?.toLowerCase() || '';
    const fullName = conv.other_user?.full_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return username.includes(query) || fullName.includes(query);
  });

  // Aggressive prefetching: Show cached data immediately, fetch in background
  useFocusEffect(
    useCallback(() => {
      // Show cached conversations immediately (no loading state)
      setIsLoading(false);

      // Fetch in background (non-blocking)
      loadConversations(false).catch(() => { });
    }, [])
  );

  const loadConversations = async (isRefresh = false) => {
    try {
      // Don't show loading state - fetch in background
      if (isRefresh) {
        setIsRefreshing(true);
      }

      const response = await fetchConversations(userToken);

      if (response.success) {
        setConversations(response.conversations);

        // Prefetch messages for all conversations in background
        response.conversations.forEach(conv => {
          if (conv.id) {
            const { prefetchService } = require('../../services/prefetchService');
            prefetchService.prefetchConversationMessages(conv.id).catch(() => { });
          }
        });
      }
    } catch (error) {
      // Silent fail - don't block UI
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadConversations(true);
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Messages already prefetched on touch (onPressIn)
    // Navigate immediately - messages ready instantly
    navigation.navigate(
      'ChatScreen' as never,
      {
        conversationId: conversation.id,
        receiverId: conversation.other_user?.id,
        receiverName: conversation.other_user?.username,
        receiverAvatar: conversation.other_user?.avatar,
      } as never
    );
  };

  // Prefetch messages when user touches conversation (before press)
  const handleConversationPressIn = (conversation: Conversation) => {
    try {
      const { prefetchService } = require('../../services/prefetchService');
      if (conversation.id) {
        prefetchService.prefetchConversationMessages(conversation.id);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isUnread = (item.unread_count || 0) > 0;
    const isPending = item.status === 'pending';
    const isInitiatedByMe = item.initiated_by === currentUserId;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.conversationItemUnread]}
        onPressIn={() => handleConversationPressIn(item)}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.other_user?.avatar ? (
            <Image source={{ uri: item.other_user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={24} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.username, isUnread && styles.usernameUnread]} numberOfLines={1}>
              {item.other_user?.username || item.other_user?.full_name || 'Unknown User'}
            </Text>
            <Text style={styles.timestamp}>
              {item.last_message_at
                ? moment(item.last_message_at).format('MMM D')
                : moment(item.created_at).format('MMM D')}
            </Text>
          </View>

          <View style={styles.conversationFooter}>
            {isPending && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>
                  {isInitiatedByMe ? 'Pending' : 'New Request'}
                </Text>
              </View>
            )}
            {!isPending && item.last_message && (
              <Text
                style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.last_message.sender_id === currentUserId && 'You: '}
                {item.last_message.message}
              </Text>
            )}
            {!isPending && !item.last_message && (
              <Text style={styles.lastMessage}>Start a conversation</Text>
            )}
          </View>
        </View>

        {/* Unread Badge */}
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Always show UI immediately - no loading screen
  // Show cached conversations or empty state while fetching in background

  return (
    <ScreenErrorBoundary screenName="ConversationListScreen">
      <ScreenBackButtonHandler>
        <SafeScreenWrapper
          statusBarStyle="light-content"
          backgroundColor="#FFFFFF"
          edges={['top', 'bottom', 'left', 'right']}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Icon name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Icon name="search" size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search chats..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#8E8E93"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={item => item.id.toString()}
            {...getOptimizedFlatListProps(80, {
              initialNumToRender: 15,
              maxToRenderPerBatch: 10,
              windowSize: 21,
              removeClippedSubviews: Platform.OS === 'android',
              updateCellsBatchingPeriod: 50,
            })}
            contentContainerStyle={[
              styles.listContent,
              filteredConversations.length === 0 && styles.listContentEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={80} color="#E5E5E5" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No results found' : 'No conversations yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `We couldn't find any chats matching "${searchQuery}"`
                    : 'Start a conversation by sending a message to someone'}
                </Text>
              </View>
            }
          />
        </SafeScreenWrapper>
      </ScreenBackButtonHandler>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  conversationContent: {
    flex: 1,
  },
  conversationFooter: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  conversationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  conversationItemUnread: {
    backgroundColor: '#F8F8F8',
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '700',
  },
  lastMessage: {
    color: '#8E8E93',
    flex: 1,
    fontSize: 15,
  },
  lastMessageUnread: {
    color: '#000000',
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 12,
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  timestamp: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 8,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginLeft: 8,
    width: 24,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  username: {
    color: '#000000',
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  usernameUnread: {
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
});

export default ConversationListScreen;
