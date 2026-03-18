/**
 * ChatDetailModals Component
 * All modals for ChatDetailScreen (image preview, blocked users, group options)
 * Single Responsibility: Modal rendering and management
 */

import React, { memo } from 'react';
import { View, Text, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { FlatList, Platform } from 'react-native';
import { getOptimizedFlatListProps } from '../../utils/flatListOptimization';
import OptimizedImage from '../OptimizedImage';

interface ChatDetailModalsProps {
  // Image Preview Modal
  showImagePreview: boolean;
  selectedImage: string | null;
  onCloseImagePreview: () => void;

  // Blocked Users Modal
  showBlockedUsersModal: boolean;
  blockedUsers: any[];
  onCloseBlockedUsers: () => void;
  onUnblockUser: (userId: number) => Promise<void>;

  styles: any;
  logger: any;
}

const ChatDetailModals: React.FC<ChatDetailModalsProps> = memo(({
  showImagePreview,
  selectedImage,
  onCloseImagePreview,
  showBlockedUsersModal,
  blockedUsers,
  onCloseBlockedUsers,
  onUnblockUser,
  styles,
  logger,
}) => {
  return (
    <>
      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={onCloseImagePreview}
      >
        <View style={styles.imagePreviewModal}>
          <SafeAreaView style={styles.imagePreviewSafeArea}>
            <View style={styles.imagePreviewHeader}>
              <SoundTouchableOpacity onPress={onCloseImagePreview} style={{ alignSelf: 'flex-end', padding: 10 }}>
                <Image
                  source={require('../../../assets/common/closeIcon.png')}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </SoundTouchableOpacity>
            </View>

            <View style={styles.imagePreviewContent}>
              {selectedImage && typeof selectedImage === 'string' ? (
                <OptimizedImage
                  source={{ uri: selectedImage }}
                  style={styles.imagePreviewImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={onCloseBlockedUsers}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { justifyContent: 'flex-end', borderBottomWidth: 0, backgroundColor: 'transparent' }]}>
              <SoundTouchableOpacity
                onPress={onCloseBlockedUsers}
                style={styles.modalCloseButton}
              >
                <Image
                  source={require('../../../assets/common/closeIcon.png')}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </SoundTouchableOpacity>
            </View>

            {blockedUsers.length === 0 ? (
              <View style={styles.emptyBlockedUsers}>
                <Icon name="account-check" size={48} color="#9CA3AF" />
                <Text style={styles.emptyBlockedUsersText}>No blocked users</Text>
                <Text style={styles.emptyBlockedUsersSubtext}>You haven't blocked any users yet</Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item: any) => item.user_id?.toString() || Math.random().toString()}
                {...getOptimizedFlatListProps(70, {
                  initialNumToRender: 10,
                  maxToRenderPerBatch: 5,
                  windowSize: 10,
                  removeClippedSubviews: Platform.OS === 'android',
                })}
                renderItem={({ item }: { item: any }) => (
                  <View style={styles.blockedUserItem}>
                    <View style={styles.blockedUserInfo}>
                      <View style={styles.blockedUserAvatar}>
                        <Text style={styles.blockedUserAvatarText}>
                          {item.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.blockedUserDetails}>
                        <Text style={styles.blockedUserName}>{item.username || 'Unknown User'}</Text>
                        <Text style={styles.blockedUserId}>ID: {item.user_id}</Text>
                      </View>
                    </View>
                    <SoundTouchableOpacity
                      style={styles.unblockButton}
                      onPress={async () => {
                        try {
                          await onUnblockUser(item.user_id);
                        } catch (error: any) {
                          logger.error('Failed to unblock user', 'CHAT_DETAIL', error);
                        }
                      }}
                    >
                      <Icon name="lock-open" size={18} color="#059669" />
                      <Text style={styles.unblockButtonText}>Unblock</Text>
                    </SoundTouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

    </>
  );
});

ChatDetailModals.displayName = 'ChatDetailModals';

export default ChatDetailModals;
