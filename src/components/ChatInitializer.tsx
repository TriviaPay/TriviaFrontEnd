/**
 * Chat Initializer Component
 * Initializes Pusher chat system when user is authenticated
 * Uses Pusher channels for real-time chat (SSE removed - using Pusher instead)
 */
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { initPusher } from '../pusherClient';
import { initChatHandlers } from '../services/pusherChatHandlers';
import { logger } from '../lib/utils/logger';

const ChatInitializer: React.FC = () => {
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && token) {
      // Initialize Pusher for chat
      initPusher(token)
        .then(() => {
          // Initialize chat handlers with Pusher
          if (user.id) {
            initChatHandlers(token, user.id);
            logger.log('Chat system initialized with Pusher', 'CHAT');
          }
        })
        .catch(error => {
          logger.error('Failed to initialize Pusher for chat', 'CHAT', error);
        });
    }
  }, [isAuthenticated, user, token]);

  // This component doesn't render anything
  return null;
};

export default ChatInitializer;
