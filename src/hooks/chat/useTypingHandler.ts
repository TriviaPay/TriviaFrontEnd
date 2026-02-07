/**
 * useTypingHandler Hook
 * Handles typing indicator logic with throttling
 * Single Responsibility: Typing indicator management
 */

import { useRef, useCallback } from 'react';
import { useIsMounted } from '../useIsMounted';

const THROTTLE_INTERVAL = 1500; // 1.5 seconds

interface UseTypingHandlerProps {
  isPrivateChat: boolean;
  currentConversationId: number | null;
  needsAcceptance: boolean;
  currentConversationStatus: string;
  sendTyping: (isTyping: boolean, conversationId: number) => void;
  setLocalIsTyping: (isTyping: boolean) => void;
  localIsTyping: boolean;
}

export const useTypingHandler = ({
  isPrivateChat,
  currentConversationId,
  needsAcceptance,
  currentConversationStatus,
  sendTyping,
  setLocalIsTyping,
  localIsTyping,
}: UseTypingHandlerProps) => {
  const isMounted = useIsMounted();
  const lastTypingEventRef = useRef<number>(0);
  const lastStopTypingEventRef = useRef<number>(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTypingChange = useCallback(
    (text: string) => {
      const canSendTyping =
        isPrivateChat &&
        currentConversationId &&
        !needsAcceptance &&
        currentConversationStatus !== 'pending';

      if (!canSendTyping) return;

      const now = Date.now();

      if (text.length > 0) {
        const timeSinceLastTyping = now - lastTypingEventRef.current;

        if (!localIsTyping) {
          setLocalIsTyping(true);
          sendTyping(true, currentConversationId);
          lastTypingEventRef.current = now;
        } else if (timeSinceLastTyping >= THROTTLE_INTERVAL) {
          sendTyping(true, currentConversationId);
          lastTypingEventRef.current = now;
        }

        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }

        typingTimerRef.current = setTimeout(() => {
          if (isMounted()) {
            const timeSinceLastStop = Date.now() - lastStopTypingEventRef.current;

            if (timeSinceLastStop >= THROTTLE_INTERVAL) {
              setLocalIsTyping(false);
              sendTyping(false, currentConversationId);
              lastStopTypingEventRef.current = Date.now();
            } else {
              setLocalIsTyping(false);
            }
          }
          typingTimerRef.current = null;
        }, 2000);
      } else {
        if (localIsTyping && isMounted()) {
          const timeSinceLastStop = now - lastStopTypingEventRef.current;

          if (timeSinceLastStop >= THROTTLE_INTERVAL) {
            setLocalIsTyping(false);
            sendTyping(false, currentConversationId);
            lastStopTypingEventRef.current = now;
          } else {
            setLocalIsTyping(false);
          }

          if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
          }
        }
      }
    },
    [
      isPrivateChat,
      currentConversationId,
      needsAcceptance,
      currentConversationStatus,
      sendTyping,
      setLocalIsTyping,
      localIsTyping,
      isMounted,
    ]
  );

  const handleBlur = useCallback(() => {
    if (
      isPrivateChat &&
      currentConversationId &&
      localIsTyping &&
      !needsAcceptance &&
      currentConversationStatus !== 'pending' &&
      isMounted()
    ) {
      const now = Date.now();
      const timeSinceLastStop = now - lastStopTypingEventRef.current;

      if (timeSinceLastStop >= THROTTLE_INTERVAL) {
        setLocalIsTyping(false);
        sendTyping(false, currentConversationId);
        lastStopTypingEventRef.current = now;
      } else {
        setLocalIsTyping(false);
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  }, [
    isPrivateChat,
    currentConversationId,
    localIsTyping,
    needsAcceptance,
    currentConversationStatus,
    isMounted,
    sendTyping,
    setLocalIsTyping,
  ]);

  const handleSubmitEditing = useCallback(() => {
    if (
      isPrivateChat &&
      currentConversationId &&
      localIsTyping &&
      !needsAcceptance &&
      currentConversationStatus !== 'pending' &&
      isMounted()
    ) {
      const now = Date.now();
      const timeSinceLastStop = now - lastStopTypingEventRef.current;

      if (timeSinceLastStop >= THROTTLE_INTERVAL) {
        setLocalIsTyping(false);
        sendTyping(false, currentConversationId);
        lastStopTypingEventRef.current = now;
      } else {
        setLocalIsTyping(false);
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  }, [
    isPrivateChat,
    currentConversationId,
    localIsTyping,
    needsAcceptance,
    currentConversationStatus,
    isMounted,
    sendTyping,
    setLocalIsTyping,
  ]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  return {
    handleTypingChange,
    handleBlur,
    handleSubmitEditing,
    cleanup,
  };
};
