/**
 * App Initialization Hook
 * Handles E2EE key generation and chat initialization
 * Uses Pusher channels for real-time chat (SSE removed)
 */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
// E2EE and conversation APIs removed - imports commented out
// import { generateAndUploadKeyBundle } from '../store/slices/e2eeSlice';
// import { fetchConversations } from '../store/slices/conversationSlice';
import { logger } from '../lib/utils/logger';

export const useAppInit = () => {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  // E2EE state removed
  // const { keysUploaded } = useSelector((state: RootState) => state.e2ee);

  // Chat is now handled via Pusher channels (no SSE needed)

  // Initialize E2EE keys and fetch conversations
  useEffect(() => {
    const initialize = async () => {
      if (!isAuthenticated || !user) {
        return;
      }

      try {
        // E2EE and conversation APIs removed - skip initialization
        logger.log('Chat system initialization skipped (APIs removed)', 'CHAT');
        setIsInitialized(true);
      } catch (error) {
        logger.error('Error initializing chat system', 'CHAT', error);
        // Still mark as initialized to prevent blocking
        setIsInitialized(true);
      }
    };

    initialize();
  }, [isAuthenticated, user, dispatch]);

  return {
    isInitialized,
    isAuthenticated,
  };
};
