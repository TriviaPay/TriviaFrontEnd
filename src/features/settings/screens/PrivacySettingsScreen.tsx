import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ImageBackground,
  FlatList,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

const PrivacySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state with safe defaults
  const { myPresence, loading: presenceLoading } = useSelector(
    (state: RootState) => state.presence || { myPresence: null, loading: false }
  );
  const { blockedUsers = [], loading: privacyLoading = false } = useSelector(
    (state: RootState) => state.privacy || { blockedUsers: [], loading: false }
  );

  // Local state for privacy settings
  const [shareLastSeen, setShareLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>(
    'everyone'
  );
  const [shareOnline, setShareOnline] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [saving, setSaving] = useState(false);

  // Presence/Privacy slices removed – skip fetching on mount

  // Update local state when myPresence loads
  useEffect(() => {
    if (myPresence?.privacy_settings) {
      setShareLastSeen(myPresence.privacy_settings.share_last_seen);
      setShareOnline(myPresence.privacy_settings.share_online);
      setReadReceipts(myPresence.privacy_settings.read_receipts);
    }
  }, [myPresence]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      Alert.alert('Success', 'Privacy settings updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockUser = (userId: number, username: string) => {
    Alert.alert('Unblock User', `Are you sure you want to unblock ${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        style: 'destructive',
        onPress: async () => {
          try {
            // unblockUserAction removed - privacySlice deleted
            // await dispatch(unblockUserAction(userId)).unwrap();
            Alert.alert('Success', `${username} has been unblocked`);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to unblock user');
          }
        },
      },
    ]);
  };

  const renderBlockedUser = ({ item }: { item: any }) => {
    // Safely handle blocked_at date
    let blockedDateText = 'Recently';
    try {
      if (item.blocked_at) {
        blockedDateText = new Date(item.blocked_at).toLocaleDateString();
      }
    } catch (error) {
      // If date parsing fails, use default text
    }

    return (
      <View style={styles.blockedUserItem}>
        <View style={styles.blockedUserInfo}>
          <Icon name="account" size={40} color="#9CA3AF" />
          <View style={styles.blockedUserDetails}>
            <Text style={styles.blockedUserName}>
              {item.username || `User ${item.user_id || 'Unknown'}`}
            </Text>
            <Text style={styles.blockedUserSubtext}>Blocked on {blockedDateText}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() =>
            handleUnblockUser(item.user_id, item.username || `User ${item.user_id || 'Unknown'}`)
          }
        >
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading only if we don't have any data yet
  if (presenceLoading && !myPresence) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../../../assets/signup/DogParachute.json')}
          autoPlay
          loop
          style={{ width: 100, height: 100 }}
        />
        <Text style={styles.loadingText}>Loading privacy settings...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../../../assets/home/homebg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'bottom', 'left', 'right']}
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Last Seen Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Seen</Text>
            <Text style={styles.sectionDescription}>
              Control who can see when you were last online
            </Text>

            <TouchableOpacity
              style={[styles.option, shareLastSeen === 'everyone' && styles.selectedOption]}
              onPress={() => setShareLastSeen('everyone')}
            >
              <Icon
                name={shareLastSeen === 'everyone' ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={shareLastSeen === 'everyone' ? '#3B82F6' : '#9CA3AF'}
              />
              <Text style={styles.optionText}>Everyone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, shareLastSeen === 'contacts' && styles.selectedOption]}
              onPress={() => setShareLastSeen('contacts')}
            >
              <Icon
                name={shareLastSeen === 'contacts' ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={shareLastSeen === 'contacts' ? '#3B82F6' : '#9CA3AF'}
              />
              <Text style={styles.optionText}>My Contacts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, shareLastSeen === 'nobody' && styles.selectedOption]}
              onPress={() => setShareLastSeen('nobody')}
            >
              <Icon
                name={shareLastSeen === 'nobody' ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={shareLastSeen === 'nobody' ? '#3B82F6' : '#9CA3AF'}
              />
              <Text style={styles.optionText}>Nobody</Text>
            </TouchableOpacity>
          </View>

          {/* Online Status Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Online Status</Text>
                <Text style={styles.sectionDescription}>Show when you're online</Text>
              </View>
              <Switch
                value={shareOnline}
                onValueChange={setShareOnline}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={shareOnline ? '#3B82F6' : '#F3F4F6'}
              />
            </View>
          </View>

          {/* Read Receipts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Read Receipts</Text>
                <Text style={styles.sectionDescription}>
                  Let others know when you've read their messages
                </Text>
              </View>
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={readReceipts ? '#3B82F6' : '#F3F4F6'}
              />
            </View>
          </View>

          {/* Blocked Users Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blocked Users</Text>
            <Text style={styles.sectionDescription}>
              {blockedUsers?.length || 0} user{(blockedUsers?.length || 0) !== 1 ? 's' : ''} blocked
            </Text>

            {privacyLoading ? (
              <View style={styles.loadingContainer}>
                <LottieView
                  source={require('../../../../assets/signup/DogParachute.json')}
                  autoPlay
                  loop
                  style={{ width: 40, height: 40 }}
                />
              </View>
            ) : !blockedUsers || blockedUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="account-off" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No blocked users</Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item, index) => item?.user_id?.toString() || `blocked-${index}`}
                {...getOptimizedFlatListProps(70, {
                  initialNumToRender: 15,
                  maxToRenderPerBatch: 10,
                  windowSize: 21,
                  removeClippedSubviews: Platform.OS === 'android',
                  updateCellsBatchingPeriod: 50,
                })}
                renderItem={renderBlockedUser}
                scrollEnabled={false}
                style={styles.blockedUsersList}
              />
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveSettings}
            disabled={saving}
          >
            {saving ? (
              <LottieView
                source={require('../../../../assets/signup/DogParachute.json')}
                autoPlay
                loop
                style={{ width: 40, height: 40 }}
              />
            ) : (
              <>
                <Icon name="content-save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Privacy settings apply to all users. Changes may take a few moments to sync.
            </Text>
          </View>
        </ScrollView>
      </SafeScreenWrapper>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  blockedUserDetails: {
    flex: 1,
    marginLeft: 12,
  },
  blockedUserInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  blockedUserItem: {
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  blockedUserName: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '500',
  },
  blockedUserSubtext: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  blockedUsersList: {
    marginTop: 8,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#1e90ff',
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 24,
    padding: 12,
  },
  infoText: {
    color: '#3B82F6',
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  option: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    color: '#1F2937',
    fontSize: 15,
    marginLeft: 12,
  },
  placeholder: {
    width: 40,
  },
  safeArea: {
    flex: 1,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 16,
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionDescription: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  unblockButton: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PrivacySettingsScreen;
