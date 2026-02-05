import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Alert,
  Switch,
  TextInput,
  Modal,
  ImageBackground,
  StyleSheet,
  Clipboard,
  Platform,
} from 'react-native';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';
import { spacing } from '../../../theme/spacing';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
// groupInviteSlice removed - imports commented out
// import {
//   createInvite,
//   fetchGroupInvites,
//   joinGroupAction,
//   deleteInvite,
// } from '../../../store/slices/groupInviteSlice';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

interface GroupInfoScreenProps { }

interface User {
  id: number;
  name: string;
  avatar: string;
  message: string;
  time: string;
  status: 'online' | 'offline' | 'read' | 'unread';
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: number;
  status: 'online' | 'offline' | 'read' | 'unread';
  isGroup?: boolean;
  members?: User[];
  createdBy?: string;
  pendingRequest?: boolean;
}

const GroupInfoScreen: React.FC<GroupInfoScreenProps> = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { chat } = route.params as { chat: Chat & { groupId?: string } };

  // Responsive design hooks - single source of truth
  const {
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
  } = useStandardResponsive();

  const [members, setMembers] = useState<User[]>(chat.members || []);
  const [showAddMembers, setShowAddMembers] = useState<boolean>(false);
  const [showEditName, setShowEditName] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>(chat.name);
  const [muted, setMuted] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showInvites, setShowInvites] = useState<boolean>(false);
  const [showCreateInvite, setShowCreateInvite] = useState<boolean>(false);
  const [inviteExpiryHours, setInviteExpiryHours] = useState<string>('24');
  const [inviteMaxUses, setInviteMaxUses] = useState<string>('10');

  // Redux state
  const { user } = useSelector((state: RootState) => state.auth);
  // groupInvites state removed - groupInviteSlice deleted
  // const groupInvites = useSelector((state: RootState) =>
  //   chat.groupId ? state.groupInvites.invitesByGroup[chat.groupId] || [] : []
  // );
  // const { creating, loading } = useSelector((state: RootState) => state.groupInvites);
  const groupInvites: any[] = [];
  const creating = false;
  const loading = false;

  // Fetch invites when screen loads
  useEffect(() => {
    if (chat.groupId) {
      // fetchGroupInvites removed - groupInviteSlice deleted
      // dispatch(fetchGroupInvites(chat.groupId));
    }
  }, [chat.groupId, dispatch]);

  // All users for adding to group
  const allUsers: User[] = [
    {
      id: 9,
      name: 'Michael Brown',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      message: 'Last seen 2h ago',
      time: '13:45 PM',
      status: 'offline',
    },
    {
      id: 10,
      name: 'Sarah Miller',
      avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
      message: 'Last seen yesterday',
      time: 'Yesterday',
      status: 'offline',
    },
    {
      id: 11,
      name: 'David Wilson',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
      message: 'Online',
      time: 'Now',
      status: 'online',
    },
    {
      id: 12,
      name: 'Emma Johnson',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      message: 'Online',
      time: 'Now',
      status: 'online',
    },
  ];

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some(selectedUser => selectedUser.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(selectedUser => selectedUser.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      setMembers([...members, ...selectedUsers]);
      setSelectedUsers([]);
      setShowAddMembers(false);

      Alert.alert(
        'Members Added',
        `${selectedUsers.length} new members have been added to the group.`
      );
    }
  };

  const handleUpdateGroupName = () => {
    if (groupName.trim()) {
      setShowEditName(false);
      Alert.alert('Group Name Updated', `Group name has been updated to "${groupName}".`);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          navigation.goBack();
        },
      },
    ]);
  };

  const handleCreateInvite = async () => {
    if (!chat.groupId) {
      Alert.alert('Error', 'Group ID not found');
      return;
    }

    try {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + parseInt(inviteExpiryHours || '24'));

      // createInvite removed - groupInviteSlice deleted
      // const result = await dispatch(createInvite({
      //   groupId: chat.groupId,
      //   request: {
      //     type: 'link',
      //     expires_at: expiryDate.toISOString(),
      //     max_uses: parseInt(inviteMaxUses || '10'),
      //   },
      // })).unwrap();

      setShowCreateInvite(false);
      Alert.alert('Error', 'Invite creation is no longer available.');

      // Refresh invites list
      // dispatch(fetchGroupInvites(chat.groupId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite');
    }
  };

  const handleCopyInviteCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied', 'Invite code copied to clipboard');
  };

  const handleDeleteInvite = (inviteId: string) => {
    if (!chat.groupId) return;

    Alert.alert('Delete Invite', 'Are you sure you want to delete this invite link?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // deleteInvite removed - groupInviteSlice deleted
            // await dispatch(deleteInvite({ groupId: chat.groupId!, inviteId })).unwrap();
            Alert.alert('Error', 'Invite deletion is no longer available.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete invite');
          }
        },
      },
    ]);
  };

  const renderMemberItem = ({ item }: { item: User }) => {
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberStatus}>
              {item.status === 'online' ? 'Online' : 'Last seen ' + item.time}
            </Text>
          </View>
        </View>

        {item.id !== user?.id && (
          <TouchableOpacity
            style={styles.removeMemberButton}
            onPress={() => {
              Alert.alert(
                'Remove Member',
                `Are you sure you want to remove ${item.name} from the group?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                      setMembers(members.filter(member => member.id !== item.id));
                    },
                  },
                ]
              );
            }}
          >
            <Icon name="trash-can" size={scaleSize(18)} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);
    const isAlreadyMember = members.some(member => member.id === item.id);

    if (isAlreadyMember) return null;

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected ? styles.selectedUserItemStyle : null]}
        onPress={() => toggleUserSelection(item)}
        disabled={isAlreadyMember}
      >
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userMessage}>{item.message}</Text>
        </View>

        <View
          style={[
            styles.selectionIndicator,
            isSelected ? styles.selectedIndicator : styles.unselectedIndicator,
          ]}
        >
          {isSelected && <View style={styles.selectedDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  // Create responsive styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        addButton: {
          fontWeight: 'bold',
        },
        addButtonActive: {
          color: '#6366F1',
        },
        addButtonInactive: {
          color: '#D1D5DB',
        },
        addMembersButton: {
          alignItems: 'center',
          flexDirection: 'row',
          paddingVertical: getVerticalSpacing(1),
        },
        addMembersText: {
          color: '#1F2937',
          marginLeft: getHorizontalSpacing(1.5),
        },
        backButton: {
          marginRight: getHorizontalSpacing(1.5),
        },
        cameraButton: {
          backgroundColor: '#6366F1',
          borderRadius: scaleSize(16),
          bottom: 0,
          padding: getHorizontalSpacing(1),
          position: 'absolute',
          right: 0,
        },
        cancelButton: {
          marginRight: getHorizontalSpacing(1),
          paddingHorizontal: getHorizontalSpacing(2),
          paddingVertical: getVerticalSpacing(1),
        },
        cancelButtonText: {
          color: '#6B7280',
        },
        container: {
          flex: 1,
        },
        editNameButtons: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
        },
        editNameInput: {
          borderColor: '#D1D5DB',
          borderRadius: scaleSize(8),
          borderWidth: 1,
          color: '#1F2937',
          marginBottom: getVerticalSpacing(2),
          padding: getHorizontalSpacing(1.5),
        },
        editNameModal: {
          backgroundColor: '#FFFFFF',
          borderRadius: scaleSize(8),
          padding: getHorizontalSpacing(2),
          width: '80%',
        },
        editNameModalOverlay: {
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'center',
        },
        editNameTitle: {
          color: '#1F2937',
          fontSize: scaleFont(18),
          fontWeight: 'bold',
          marginBottom: getVerticalSpacing(2),
        },
        groupAvatar: {
          borderRadius: scaleSize(40),
          height: scaleSize(80),
          width: scaleSize(80),
        },
        groupAvatarContainer: {
          position: 'relative',
        },
        groupDetails: {
          alignItems: 'center',
          backgroundColor: '#F9FAFB',
          paddingVertical: getVerticalSpacing(3),
        },
        groupName: {
          color: '#1F2937',
          fontSize: scaleFont(20),
          fontWeight: 'bold',
          marginRight: getHorizontalSpacing(1),
        },
        groupNameContainer: {
          alignItems: 'center',
          flexDirection: 'row',
          marginTop: getVerticalSpacing(1.5),
        },
        header: {
          alignItems: 'center',
          borderBottomColor: '#E5E7EB',
          borderBottomWidth: 1,
          flexDirection: 'row',
          padding: getHorizontalSpacing(2),
          paddingTop: Platform.OS === 'ios' ? scaleSize(44) : scaleSize(24),
        },
        headerTitle: {
          color: '#1F2937',
          fontSize: scaleFont(18),
          fontWeight: '500',
        },
        leaveGroupButton: {
          alignItems: 'center',
          backgroundColor: '#EF4444',
          borderRadius: scaleSize(8),
          margin: getHorizontalSpacing(2),
          paddingVertical: getVerticalSpacing(1.5),
        },
        leaveGroupText: {
          color: '#FFFFFF',
          fontWeight: '500',
        },
        memberAvatar: {
          borderRadius: scaleSize(20),
          height: scaleSize(40),
          width: scaleSize(40),
        },
        memberCount: {
          color: '#6B7280',
          marginTop: getVerticalSpacing(0.5),
        },
        memberDetails: {
          marginLeft: getHorizontalSpacing(1.5),
        },
        memberInfo: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        memberItem: {
          alignItems: 'center',
          borderBottomColor: '#E5E7EB',
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: getHorizontalSpacing(2),
          paddingVertical: getVerticalSpacing(1.5),
        },
        memberName: {
          color: '#1F2937',
          fontWeight: '500',
        },
        memberStatus: {
          color: '#6B7280',
          fontSize: scaleFont(12),
        },
        membersSection: {
          flex: 1,
        },
        membersTitle: {
          backgroundColor: '#F9FAFB',
          color: '#1F2937',
          fontWeight: '500',
          padding: getHorizontalSpacing(2),
        },
        modalContainer: {
          backgroundColor: '#FFFFFF',
          flex: 1,
        },
        modalContent: {
          padding: getHorizontalSpacing(2),
        },
        modalHeader: {
          alignItems: 'center',
          borderBottomColor: '#E5E7EB',
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: getHorizontalSpacing(2),
        },
        modalTitle: {
          color: '#1F2937',
          fontSize: scaleFont(18),
          fontWeight: 'bold',
        },
        removeMemberButton: {
          padding: getHorizontalSpacing(1),
        },
        removeSelectedUserButton: {
          backgroundColor: '#F3F4F6',
          borderRadius: scaleSize(12),
          padding: getHorizontalSpacing(0.5),
          position: 'absolute',
          right: scaleSize(-4),
          top: scaleSize(-4),
        },
        safeArea: {
          flex: 1,
        },
        saveButton: {
          backgroundColor: '#6366F1',
          borderRadius: scaleSize(8),
          paddingHorizontal: getHorizontalSpacing(2),
          paddingVertical: getVerticalSpacing(1),
        },
        saveButtonText: {
          color: '#FFFFFF',
        },
        selectedCount: {
          color: '#6B7280',
          marginBottom: getVerticalSpacing(1),
        },
        selectedDot: {
          backgroundColor: '#FFFFFF',
          borderRadius: scaleSize(6),
          height: scaleSize(12),
          width: scaleSize(12),
        },
        selectedIndicator: {
          backgroundColor: '#6366F1',
          borderColor: '#6366F1',
        },
        selectedUserAvatar: {
          borderRadius: scaleSize(32),
          height: scaleSize(64),
          width: scaleSize(64),
        },
        selectedUserAvatarContainer: {
          position: 'relative',
        },
        selectedUserItem: {
          alignItems: 'center',
          marginRight: getHorizontalSpacing(1.5),
        },
        selectedUserItemStyle: {
          backgroundColor: '#F3F4F6',
        },
        selectedUserName: {
          color: '#1F2937',
          fontSize: scaleFont(12),
          marginTop: getVerticalSpacing(0.5),
        },
        selectedUsersList: {
          marginBottom: getVerticalSpacing(2),
        },
        selectionIndicator: {
          alignItems: 'center',
          borderRadius: scaleSize(12),
          borderWidth: scaleSize(2),
          height: scaleSize(24),
          justifyContent: 'center',
          width: scaleSize(24),
        },
        settingInfo: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        settingItem: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: getVerticalSpacing(2),
        },
        settingLabel: {
          color: '#1F2937',
          marginLeft: getHorizontalSpacing(1.5),
        },
        settingsContainer: {
          borderBottomColor: '#E5E7EB',
          borderBottomWidth: 1,
          padding: getHorizontalSpacing(2),
        },
        unselectedIndicator: {
          borderColor: '#D1D5DB',
        },
        userAvatar: {
          borderRadius: scaleSize(20),
          height: scaleSize(40),
          width: scaleSize(40),
        },
        userInfo: {
          flex: 1,
          marginLeft: getHorizontalSpacing(1.5),
        },
        userItem: {
          alignItems: 'center',
          flexDirection: 'row',
          paddingHorizontal: getHorizontalSpacing(2),
          paddingVertical: getVerticalSpacing(1.5),
        },
        userMessage: {
          color: '#6B7280',
          fontSize: scaleFont(12),
        },
        userName: {
          color: '#1F2937',
          fontWeight: '500',
        },
        usersList: {
          flex: 1,
        },
      }),
    [scaleFont, scaleSizeFunc, getHorizontalSpacing, getVerticalSpacing]
  );

  return (
    <ScreenErrorBoundary screenName="GroupInfoScreen">
      <ScreenBackButtonHandler>
        <View style={[styles.container, { backgroundColor: '#1e90ff' }]}>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
              <SoundTouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-left" size={scaleSize(24)} color="#4B5563" />
              </SoundTouchableOpacity>
              <Text style={styles.headerTitle}>Group Info</Text>
            </View>

            {/* Group details */}
            <View style={styles.groupDetails}>
              <View style={styles.groupAvatarContainer}>
                <Image source={{ uri: chat.avatar }} style={styles.groupAvatar} />
                <SoundTouchableOpacity style={styles.cameraButton}>
                  <Icon name="camera" size={scaleSize(16)} color="#FFFFFF" />
                </SoundTouchableOpacity>
              </View>

              <View style={styles.groupNameContainer}>
                <Text style={styles.groupName}>{groupName}</Text>
                <SoundTouchableOpacity onPress={() => setShowEditName(true)}>
                  <Icon name="pencil" size={scaleSize(16)} color="#6B7280" />
                </SoundTouchableOpacity>
              </View>

              <Text style={styles.memberCount}>{members.length} members</Text>
            </View>

            {/* Group settings */}
            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Icon name="bell" size={scaleSize(20)} color="#6B7280" />
                  <Text style={styles.settingLabel}>Mute notifications</Text>
                </View>
                <Switch
                  value={muted}
                  onValueChange={setMuted}
                  trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                  thumbColor={muted ? '#6366F1' : '#F9FAFB'}
                />
              </View>

              <SoundTouchableOpacity
                style={styles.addMembersButton}
                onPress={() => setShowAddMembers(true)}
              >
                <Icon name="account-plus" size={scaleSize(20)} color="#6B7280" />
                <Text style={styles.addMembersText}>Add members</Text>
              </SoundTouchableOpacity>
            </View>

            {/* Members list */}
            <View style={styles.membersSection}>
              <Text style={styles.membersTitle}>Members</Text>
              <FlatList
                data={members}
                renderItem={renderMemberItem}
                keyExtractor={item => item.id.toString()}
                {...getOptimizedFlatListProps(80, {
                  initialNumToRender: 15,
                  maxToRenderPerBatch: 10,
                  windowSize: 21,
                  removeClippedSubviews: Platform.OS === 'android',
                  updateCellsBatchingPeriod: 50,
                })}
              />
            </View>

            {/* Leave group button */}
            <SoundTouchableOpacity style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
              <Text style={styles.leaveGroupText}>Leave Group</Text>
            </SoundTouchableOpacity>

            {/* Add Members Modal */}
            <Modal
              visible={showAddMembers}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setShowAddMembers(false)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowAddMembers(false)}>
                    <Icon name="close" size={scaleSize(24)} color="#9CA3AF" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Add Members</Text>
                  <TouchableOpacity
                    onPress={handleAddMembers}
                    disabled={selectedUsers.length === 0}
                  >
                    <Text
                      style={[
                        styles.addButton,
                        selectedUsers.length > 0
                          ? styles.addButtonActive
                          : styles.addButtonInactive,
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <Text style={styles.selectedCount}>Selected: {selectedUsers.length}</Text>

                  {selectedUsers.length > 0 && (
                    <FlatList
                      data={selectedUsers}
                      horizontal
                      keyExtractor={item => item.id.toString()}
                      {...getOptimizedFlatListProps(60, {
                        initialNumToRender: 15,
                        maxToRenderPerBatch: 10,
                        windowSize: 21,
                        removeClippedSubviews: Platform.OS === 'android',
                        updateCellsBatchingPeriod: 50,
                      })}
                      renderItem={({ item }) => (
                        <View style={styles.selectedUserItem}>
                          <View style={styles.selectedUserAvatarContainer}>
                            <Image
                              source={{ uri: item.avatar }}
                              style={styles.selectedUserAvatar}
                            />
                            <TouchableOpacity
                              style={styles.removeSelectedUserButton}
                              onPress={() => toggleUserSelection(item)}
                            >
                              <Icon name="close" size={scaleSize(14)} color="#4B5563" />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.selectedUserName}>{item.name.split(' ')[0]}</Text>
                        </View>
                      )}
                      showsHorizontalScrollIndicator={false}
                      style={styles.selectedUsersList}
                    />
                  )}
                </View>

                <FlatList
                  data={allUsers}
                  renderItem={renderUserItem}
                  keyExtractor={item => item.id.toString()}
                  {...getOptimizedFlatListProps(80, {
                    initialNumToRender: 15,
                    maxToRenderPerBatch: 10,
                    windowSize: 21,
                    removeClippedSubviews: Platform.OS === 'android',
                    updateCellsBatchingPeriod: 50,
                  })}
                  showsVerticalScrollIndicator={false}
                  style={styles.usersList}
                />
              </SafeAreaView>
            </Modal>

            {/* Edit Group Name Modal */}
            <Modal
              visible={showEditName}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowEditName(false)}
            >
              <View style={styles.editNameModalOverlay}>
                <View style={styles.editNameModal}>
                  <Text style={styles.editNameTitle}>Edit Group Name</Text>

                  <TextInput
                    style={styles.editNameInput}
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Group name"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.editNameButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowEditName(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdateGroupName}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
        </View>
      </ScreenBackButtonHandler>
    </ScreenErrorBoundary>
  );
};

export default GroupInfoScreen;
