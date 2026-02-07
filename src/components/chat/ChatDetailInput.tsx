/**
 * Chat Detail Input Component
 * Ported from TriviaPay to TriviaCoin with enhanced features
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';

export interface ChatDetailInputProps {
  message: string;
  setMessage: (message: string) => void;
  needsAcceptance?: boolean;
  shouldBlockSending?: boolean;
  isPeerBlocked?: boolean;
  isGroupChat?: boolean;
  groupMessagesSending?: boolean;
  inputRef?: React.RefObject<TextInput>;
  onSendMessage: () => void;
  onTypingChange: (text: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  replyingTo?: { id: number; message: string; sender: string } | null;
  onCancelReply?: () => void;
  styles: any;
  currentUserId?: number | string | null;
  profile?: any;
}

const ChatDetailInput: React.FC<ChatDetailInputProps> = ({
  message,
  setMessage,
  needsAcceptance,
  shouldBlockSending,
  isPeerBlocked,
  isGroupChat,
  groupMessagesSending,
  inputRef,
  onSendMessage,
  onTypingChange,
  onBlur,
  onSubmitEditing,
  replyingTo,
  onCancelReply,
  styles: parentStyles,
  currentUserId,
  profile,
}) => {
  // Merge parent styles with default styles
  const localStyles = {
    ...styles,
    ...(parentStyles || {}),
  };
  
  // Determine if replying to own message - check if sender is exactly 'You'
  const isReplyingToOwnMessage = replyingTo?.sender === 'You';
  const replySenderName = isReplyingToOwnMessage ? 'You' : (replyingTo?.sender || '');

  const handleChangeText = (text: string) => {
    setMessage(text);
    if (onTypingChange) {
      onTypingChange(text);
    }
  };

  const handleSend = () => {
    if (message.trim().length === 0 || needsAcceptance || shouldBlockSending || isPeerBlocked) {
      return;
    }
    onSendMessage();
  };

  // Determine placeholder
  const getPlaceholder = () => {
    if (isPeerBlocked) return 'This user is blocked';
    if (shouldBlockSending) return 'Waiting for response...';
    if (needsAcceptance) return 'Accept request to reply';
    return isGroupChat ? 'Send a message' : 'Type a message...';
  };

  const isDisabled = !!(needsAcceptance || shouldBlockSending || isPeerBlocked);

  return (
    <View style={localStyles.messageInputContainer}>
      {/* Reply Preview - matching global chat style */}
      {replyingTo && (
        <View style={localStyles.replyPreviewContainer}>
          <View style={localStyles.replyPreviewContent}>
            <Text style={[
              localStyles.replyPreviewSender,
              isReplyingToOwnMessage 
                ? localStyles.replyPreviewSenderUser
                : localStyles.replyPreviewSenderOther
            ]}>
              {replySenderName}
            </Text>
            <Text style={localStyles.replyPreviewMessage} numberOfLines={1}>
              {replyingTo.message}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={localStyles.replyCancelButton}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Row - matching global chat style */}
      <View style={localStyles.inputRow}>
        <View style={localStyles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={localStyles.input}
            value={message}
            onChangeText={handleChangeText}
            placeholder={getPlaceholder()}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={onSubmitEditing}
            onBlur={onBlur}
            editable={!isDisabled}
            keyboardAppearance="dark"
            textAlignVertical="center"
          />
        </View>
        <SoundTouchableOpacity
          onPress={handleSend}
          disabled={isDisabled || message.trim().length === 0}
          style={[
            localStyles.sendButton,
            (isDisabled || message.trim().length === 0) && localStyles.sendButtonDisabled
          ]}
        >
          {groupMessagesSending ? (
            <Icon name="loading" size={20} color="#FFFFFF" />
          ) : (
            <Icon
              name="send"
              size={20}
              color="#FFFFFF"
            />
          )}
        </SoundTouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageInputContainer: {
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(12),
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(10),
    marginBottom: scaleSize(8),
    marginHorizontal: scaleSize(16),
    backgroundColor: '#2C2F33',
    borderRadius: scaleSize(6),
    borderLeftWidth: scaleSize(4),
    borderLeftColor: '#9333EA',
  },
  replyPreviewContent: {
    flex: 1,
    paddingLeft: scaleSize(8),
  },
  replyPreviewSender: {
    fontSize: scaleSize(13),
    fontWeight: '600',
    marginBottom: scaleSize(4),
  },
  replyPreviewSenderUser: {
    color: '#9333EA',
  },
  replyPreviewSenderOther: {
    color: '#9333EA',
  },
  replyPreviewMessage: {
    fontSize: scaleSize(13),
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: scaleSize(17),
  },
  replyCancelButton: {
    padding: scaleSize(6),
    marginLeft: scaleSize(8),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#40444B',
    borderRadius: scaleSize(24),
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(8),
    marginRight: scaleSize(8),
    maxHeight: scaleSize(100),
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: scaleSize(15),
    lineHeight: scaleSize(20),
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(4),
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(147, 51, 234, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatDetailInput;
