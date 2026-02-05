/**
 * Chat Input Component
 * Input field for composing and sending messages with reply and image support
 * Ported from legacy TriviaPay design
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
  onTyping: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  placeholder?: string;
  isSending?: boolean;
  replyTo?: {
    id: number;
    message: string;
    sender: string;
  } | null;
  onCancelReply?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  onTypingStop,
  disabled = false,
  placeholder = 'Message...',
  isSending = false,
  replyTo,
  onCancelReply,
}) => {
  const [message, setMessage] = useState('');
  const [typingTimeoutId, setTypingTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Focus input when replyTo changes
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleChangeText = useCallback(
    (text: string) => {
      setMessage(text);

      if (!disabled && text.length > 0) {
        onTyping();
        if (typingTimeoutId) clearTimeout(typingTimeoutId);
        const timeoutId = setTimeout(() => {
          onTypingStop();
        }, 1500);
        setTypingTimeoutId(timeoutId);
      } else if (text.length === 0) {
        if (typingTimeoutId) clearTimeout(typingTimeoutId);
        onTypingStop();
      }
    },
    [disabled, onTyping, onTypingStop, typingTimeoutId]
  );

  const handleSend = useCallback(() => {
    if (message.trim().length === 0 || disabled) return;

    if (typingTimeoutId) clearTimeout(typingTimeoutId);
    onTypingStop();

    onSend(message.trim());
    setMessage('');
    if (onCancelReply) onCancelReply();
  }, [message, disabled, typingTimeoutId, onTypingStop, onSend, onCancelReply]);

  return (
    <View style={styles.container}>
      {replyTo && (
        <View style={styles.replyPreviewContainer}>
          <View style={styles.replyIndicator} />
          <View style={styles.replyContent}>
            <Text style={styles.replySender}>{replyTo.sender}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{replyTo.message}</Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReplyButton}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={message}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            maxLength={1000}
            editable={!disabled}
            keyboardAppearance="dark"
            textAlignVertical="center"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (message.trim().length > 0 && !disabled) ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
          onPress={handleSend}
          disabled={message.trim().length === 0 || disabled || isSending}
        >
          <Icon
            name="send"
            size={20}
            color={message.trim().length > 0 && !disabled ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
    backgroundColor: '#2C2F33',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#9333EA',
  },
  replyIndicator: {
    width: 0,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    lineHeight: 17,
  },
  cancelReplyButton: {
    padding: 6,
    marginLeft: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#40444B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
    marginRight: 8,
    justifyContent: 'center',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
    minHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#9333EA',
  },
  sendButtonInactive: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
  },
});

export default memo(ChatInput);
