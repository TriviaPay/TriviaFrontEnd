/**
 * Comments Modal - Professional Implementation
 * Modal for displaying and managing comments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStandardResponsive } from '../../hooks/useStandardResponsive';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  likes: number;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  comment: string;
  setComment: (comment: string) => void;
  handleComment: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  comment,
  setComment,
  handleComment,
}) => {
  const { scaleFont, scaleSize, getSpacing } = useStandardResponsive();
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      user: 'John Doe',
      text: 'Great update! Looking forward to more features.',
      timestamp: '2 hours ago',
      likes: 5,
    },
    {
      id: '2',
      user: 'Jane Smith',
      text: 'This is amazing! Keep up the good work.',
      timestamp: '3 hours ago',
      likes: 3,
    },
    {
      id: '3',
      user: 'Mike Johnson',
      text: "Can't wait to see what's next!",
      timestamp: '4 hours ago',
      likes: 2,
    },
  ]);

  const handleSubmitComment = () => {
    if (comment.trim()) {
      const newComment: Comment = {
        id: Date.now().toString(),
        user: 'You',
        text: comment.trim(),
        timestamp: 'Just now',
        likes: 0,
      };
      setComments(prev => [newComment, ...prev]);
      setComment('');
      handleComment();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFont(18) }]}>Comments</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Comments List */}
          <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.map(comment => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentUser, { fontSize: scaleFont(14) }]}>
                    {comment.user}
                  </Text>
                  <Text style={[styles.commentTime, { fontSize: scaleFont(12) }]}>
                    {comment.timestamp}
                  </Text>
                </View>
                <Text style={[styles.commentText, { fontSize: scaleFont(14) }]}>
                  {comment.text}
                </Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.likeButton}>
                    <Icon name="heart" size={16} color="#666" />
                    <Text style={[styles.likeText, { fontSize: scaleFont(12) }]}>
                      {comment.likes}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.commentInput, { fontSize: scaleFont(14) }]}
              placeholder="Add a comment..."
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, { opacity: comment.trim() ? 1 : 0.5 }]}
              onPress={handleSubmitComment}
              disabled={!comment.trim()}
            >
              <Icon name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: 8,
  },
  commentActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentItem: {
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  commentText: {
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentTime: {
    color: '#666',
  },
  commentUser: {
    color: '#333',
    fontWeight: '600',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#333',
    fontWeight: '600',
  },
  inputContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#f8f8f8',
    borderTopColor: '#e0e0e0',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  keyboardAvoid: {
    flex: 1,
  },
  likeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likeText: {
    color: '#666',
    marginLeft: 4,
  },
  placeholder: {
    width: 40,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});

export default CommentsModal;
