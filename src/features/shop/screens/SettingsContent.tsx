import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTheme, useSound } from '../../../hooks/useReduxHooks';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchFAQs } from '../../../store/slices/faqSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { BREAKPOINTS } from '../../constants/uiConstants';
import {
  disableOneSignalNotifications,
  enableOneSignalNotifications,
} from '../../../services/oneSignalService';



const SettingsContent: React.FC = () => {
  const {
    width: screenWidth,
    height: screenHeight,
    isSmallDevice,
    scaleSize,
  } = useStandardResponsive();

  // Ensure screenWidth is defined for styles
  const safeScreenWidth = screenWidth || 375;
  const dispatch = useDispatch<AppDispatch>();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [allFAQsExpanded, setAllFAQsExpanded] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const currentVersion = '1.0.5';

  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  // Dynamic FAQs from Redux
  const { items: faqItems, loading: faqLoading, error: faqError } = useSelector((state: RootState) => state.faq || { items: [], loading: false, error: null });

  // Get sound settings from Redux store
  const {
    soundEnabled: reduxSoundEnabled,
    notificationsEnabled: reduxNotificationsEnabled,
    isInitialized,
    initializeAudio,
    toggleSound,
    toggleNotifications,
  } = useSound();

  // Get state directly from Redux selector for reliability
  const reduxState = useSelector((state: RootState) => state.sound);

  // Use Redux state directly - this ensures we always have the latest state
  // Prefer direct selector values over hook values for consistency
  const soundEnabled = reduxState?.soundEnabled ?? reduxSoundEnabled ?? true;
  const notificationsEnabled =
    reduxState?.notificationsEnabled ?? reduxNotificationsEnabled ?? true;

  // Initialize audio settings on mount if not already initialized (only once)
  useEffect(() => {
    if (!isInitialized) {
      console.log('🔧 Initializing audio settings...');
      initializeAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch FAQs on mount
  useEffect(() => {
    dispatch(fetchFAQs());
  }, [dispatch]);

  // Initialize email from user data
  useEffect(() => {
    if (user?.email) {
      setSupportEmail(user.email);
    }
  }, [user?.email]);

  // Check for new version (simulated - in production, this would call an API)
  useEffect(() => {
    // Simulate version check - in production, fetch from API
    const checkVersion = async () => {
      try {
        // Example: const response = await fetch('https://api.example.com/version');
        // const data = await response.json();
        // if (data.version > currentVersion) {
        //   setNewVersionAvailable(true);
        //   setNewVersion(data.version);
        // }
        // For testing, enable version check:
        setNewVersionAvailable(true);
        setNewVersion('1.0.6');
      } catch (error) {
        // Silent fail
      }
    };
    checkVersion();
  }, []);

  // Sync OneSignal with notification setting - use ref to prevent loops
  const lastNotificationStateRef = React.useRef(notificationsEnabled);
  useEffect(() => {
    // Only sync if state actually changed
    if (lastNotificationStateRef.current !== notificationsEnabled) {
      lastNotificationStateRef.current = notificationsEnabled;

      const syncOneSignalNotifications = async () => {
        try {
          if (notificationsEnabled) {
            await enableOneSignalNotifications();
          } else {
            await disableOneSignalNotifications();
          }
        } catch (error) {
          // Silent fail - OneSignal may not be initialized yet
        }
      };

      // Sync after a short delay to ensure OneSignal is initialized
      const timeoutId = setTimeout(() => {
        syncOneSignalNotifications();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [notificationsEnabled]);

  // Handle sound toggle - simplified and immediate
  const handleToggleSound = React.useCallback(() => {
    console.log('🔊 Toggling sound, current state:', soundEnabled);
    // Call toggle immediately - Redux optimistic update will handle UI
    toggleSound().catch(error => {
      console.error('❌ Failed to toggle sound:', error);
      Alert.alert('Error', 'Failed to toggle sound setting. Please try again.');
    });
  }, [soundEnabled, toggleSound]);

  // Handle notifications toggle - simplified and immediate
  // Handle notifications toggle - simplified and immediate
  const handleToggleNotifications = React.useCallback(() => {
    console.log('🔔 Toggling notifications, current state:', notificationsEnabled);
    // Call toggle immediately - Redux optimistic update will handle UI
    toggleNotifications().catch(error => {
      console.error('❌ Failed to toggle notifications:', error);
      Alert.alert('Error', 'Failed to toggle notification setting. Please try again.');
    });
  }, [toggleNotifications]);

  // Safely extract values with fallbacks
  // Safely extract values with fallbacks - Ensure theme and theme.colors exist
  const colors = theme?.colors || {
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    accent: '#2563EB', // Added missing accent color fallback
    inputBackground: '#FFFFFF', // Added missing input background fallback
  };

  const ToggleSwitch: React.FC<{ value: boolean; onToggle: () => void }> = ({
    value,
    onToggle,
  }) => {
    console.log('🔄 ToggleSwitch render, value:', value);
    return (
      <TouchableOpacity
        style={[styles.toggleSwitch, { backgroundColor: value ? '#10B981' : '#6B7280' }]}
        onPress={e => {
          e.stopPropagation();
          console.log('👆 ToggleSwitch pressed, current value:', value);
          onToggle();
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View
          style={[
            styles.toggleThumb,
            value ? styles.toggleThumbActive : styles.toggleThumbInactive,
          ]}
        />
      </TouchableOpacity>
    );
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const toggleAllFAQs = () => {
    setAllFAQsExpanded(!allFAQsExpanded);
    // Clear individual FAQ selection when toggling all
    if (allFAQsExpanded) {
      setExpandedFAQ(null);
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportSubject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!supportDescription.trim()) {
      Alert.alert('Error', 'Please enter a description of your request');
      return;
    }

    if (supportDescription.trim().length < 10) {
      Alert.alert('Error', 'Please enter at least 10 characters in the description');
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would typically send the support request to your backend
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      // Close support modal and show success modal
      setShowSupportModal(false);
      setSupportDescription('');
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSupportModal = () => {
    setSupportSubject('');
    setShowSupportModal(true);
  };

  const handleCloseSupportModal = () => {
    setShowSupportModal(false);
    setSupportDescription('');
  };

  const handleUpdate = async () => {
    try {
      const packageName = 'com.triviacoin'; // Replace with your actual package name
      let url = '';

      if (Platform.OS === 'android') {
        // Open Play Store
        url = `market://details?id=${packageName}`;
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          // Fallback to web Play Store
          url = `https://play.google.com/store/apps/details?id=${packageName}`;
        }
      } else if (Platform.OS === 'ios') {
        // Open App Store - replace with your actual app ID
        const appId = 'YOUR_APP_ID'; // Replace with your iOS App Store ID
        url = `itms-apps://itunes.apple.com/app/id${appId}`;
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          // Fallback to web App Store
          url = `https://apps.apple.com/app/id${appId}`;
        }
      }

      if (url) {
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open app store. Please update manually.');
    }
  };

  const styles = createStyles(screenHeight, isSmallDevice, scaleSize, safeScreenWidth);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors?.background || '#FFFFFF' }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >

      <View style={[styles.settingsCard, { backgroundColor: colors?.cardBackground || '#FFFFFF' }]}>
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors?.border || '#E0E0E0' }]}
          onPress={handleToggleNotifications}
          activeOpacity={0.7}
        >
          <Text style={[styles.settingLabel, { color: colors?.text || '#000000' }]}>
            Notifications
          </Text>
          <ToggleSwitch value={notificationsEnabled ?? true} onToggle={handleToggleNotifications} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleToggleSound} activeOpacity={0.7}>
          <Text style={[styles.settingLabel, { color: colors?.text || '#000000' }]}>Sound</Text>
          <ToggleSwitch value={soundEnabled ?? true} onToggle={handleToggleSound} />
        </TouchableOpacity>
      </View>

      {/* FAQs Section */}
      <View style={[styles.faqCard, { backgroundColor: colors?.cardBackground || '#FFFFFF' }]}>
        <TouchableOpacity
          style={styles.faqTitleContainer}
          onPress={toggleAllFAQs}
          activeOpacity={0.7}
        >
          <Text style={[styles.faqTitle, { color: colors?.accent || '#2563EB' }]}>
            Frequently Asked Questions
          </Text>
          <Icon
            name={allFAQsExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors?.accent || '#2563EB'}
          />
        </TouchableOpacity>

        {/* Loading State */}
        {faqLoading && allFAQsExpanded && (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors?.accent || '#2563EB'} />
            <Text style={{ marginTop: 8, color: colors?.textSecondary }}>Loading FAQs...</Text>
          </View>
        )}

        {/* Error State */}
        {!faqLoading && faqError && allFAQsExpanded && (
          <View style={{ padding: 16 }}>
            <Text style={{ color: 'red', textAlign: 'center' }}>{faqError}</Text>
          </View>
        )}

        {allFAQsExpanded && !faqLoading && !faqError &&
          faqItems.map((faq, index) => {
            const isExpanded = expandedFAQ === index;
            return (
              <View key={faq.id || index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestionContainer}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, { color: colors?.text || '#000000' }]}>
                    {faq.question}
                  </Text>
                  <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors?.textSecondary || '#666666'}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={[styles.faqAnswer, { color: colors?.textSecondary || '#666666' }]}>
                      {faq.answer}
                    </Text>
                  </View>
                )}
                {index < faqItems.length - 1 && (
                  <View
                    style={[styles.faqDivider, { backgroundColor: colors?.border || '#E0E0E0' }]}
                  />
                )}
              </View>
            );
          })}
      </View>



      {/* About Section - At the end */}
      <View style={[styles.aboutCard, { backgroundColor: colors?.cardBackground || '#FFFFFF' }]}>
        <Text style={[styles.aboutTitle, { color: colors?.text || '#000000' }]}>About</Text>
        <Text style={[styles.aboutText, { color: colors?.textSecondary || '#666666' }]}>
          Version {currentVersion}
        </Text>
        <Text style={[styles.aboutDescription, { color: colors?.textSecondary || '#666666' }]}>
          This app is designed to provide a fun and engaging experience for users to earn rewards
          and play games.
        </Text>
        <Text style={[styles.aboutEmail, { color: colors?.textSecondary || '#666666' }]}>
          admin@miragaming.com
        </Text>

        {/* Version Update Section */}
        {newVersionAvailable && newVersion && (
          <View style={[styles.updateSection, { borderTopColor: colors?.border || '#E0E0E0' }]}>
            <Text style={[styles.updateText, { color: colors?.text || '#000000' }]}>
              A new version available
            </Text>
            <Text style={[styles.versionText, { color: colors?.textSecondary || '#666666' }]}>
              Version {newVersion}
            </Text>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors?.accent || '#2563EB' }]}
              onPress={handleUpdate}
              activeOpacity={0.7}
            >
              <Text style={styles.updateButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>


    </ScrollView>
  );
};

const createStyles = (
  screenHeight: number,
  isSmallDevice: boolean,
  scaleSize: (size: number) => number,
  screenWidth: number = 375
) =>
  StyleSheet.create({
    aboutCard: {
      borderRadius: isSmallDevice ? scaleSize(8) : scaleSize(12),
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
    },
    aboutDescription: {
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      marginTop: 8,
    },
    aboutEmail: {
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      marginTop: 8,
    },
    updateSection: {
      marginTop: screenHeight < 600 ? scaleSize(16) : scaleSize(20),
      paddingTop: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
    },
    updateText: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '600',
      marginBottom: 8,
    },
    versionText: {
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      marginBottom: 4,
    },
    updateButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: isSmallDevice ? scaleSize(6) : scaleSize(8),
      justifyContent: 'center',
      marginTop: screenHeight < 600 ? scaleSize(8) : scaleSize(12),
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(10),
      paddingHorizontal: isSmallDevice ? scaleSize(12) : scaleSize(16),
      maxWidth: isSmallDevice ? scaleSize(120) : scaleSize(150),
    },
    updateButtonText: {
      color: '#FFFFFF',
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      fontWeight: '600',
    },
    aboutText: {
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
    },
    aboutTitle: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '500',
      marginBottom: 8,
    },
    charCount: {
      fontSize: screenWidth < 375 ? 11 : 12,
      marginTop: 4,
      textAlign: 'right',
    },
    container: {
      flex: 1,
    },
    faqAnswer: {
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      lineHeight: isSmallDevice ? scaleSize(18) : scaleSize(20),
    },
    faqAnswerContainer: {
      paddingBottom: screenHeight < 600 ? scaleSize(10) : scaleSize(14),
      paddingTop: 4,
    },
    faqCard: {
      borderRadius: isSmallDevice ? scaleSize(8) : scaleSize(12),
      marginBottom: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
    },
    faqDivider: {
      height: 1,
      marginTop: screenHeight < 600 ? scaleSize(4) : scaleSize(8),
    },
    faqItem: {
      marginBottom: 0,
    },
    faqQuestion: {
      flex: 1,
      fontSize: isSmallDevice ? scaleSize(13) : scaleSize(15),
      fontWeight: '500',
      marginRight: 8,
    },
    faqQuestionContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: screenHeight < 600 ? scaleSize(10) : scaleSize(14),
    },
    faqTitle: {
      flex: 1,
      fontSize: isSmallDevice ? scaleSize(16) : scaleSize(18),
      fontWeight: 'bold',
    },
    faqTitleContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(10),
    },
    inputContainer: {
      marginBottom: screenHeight < 600 ? scaleSize(8) : scaleSize(12),
    },
    inputLabel: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '500',
      marginBottom: 8,
    },
    keyboardView: {
      maxWidth: 500,
      width: '100%',
    },
    modalBody: {
      // gap not supported in older RN versions, using marginBottom in inputContainer instead
    },
    modalContent: {
      borderRadius: screenWidth < 375 ? 12 : 16,
      maxHeight: screenHeight * 0.8,
      padding: screenWidth < 375 ? 16 : 20,
      width: '100%',
    },
    modalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: screenHeight < 600 ? scaleSize(16) : scaleSize(20),
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      flex: 1,
      justifyContent: 'center',
      padding: screenWidth < 375 ? 16 : 20,
    },
    modalTitle: {
      fontSize: screenWidth < 375 ? 18 : 20,
      fontWeight: 'bold',
    },
    required: {
      color: '#B00020',
    },
    scrollContent: {
      flexGrow: 1,
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
      paddingBottom: screenHeight < 600 ? scaleSize(20) : scaleSize(40),
    },
    settingLabel: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '500',
    },
    settingRow: {
      alignItems: 'center',
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(12),
    },
    settingsCard: {
      borderRadius: isSmallDevice ? scaleSize(8) : scaleSize(12),
      marginBottom: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
    },
    submitButton: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: screenWidth < 375 ? 8 : 10,
      justifyContent: 'center',
      marginTop: screenHeight < 600 ? scaleSize(8) : scaleSize(12),
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(10),
      paddingHorizontal: screenWidth < 375 ? 32 : 40,
      minWidth: screenWidth < 375 ? 200 : 250,
      width: '80%',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      fontWeight: '600',
    },
    supportButton: {
      alignItems: 'center',
      borderRadius: isSmallDevice ? scaleSize(8) : scaleSize(12),
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      paddingHorizontal: isSmallDevice ? scaleSize(12) : scaleSize(16),
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(12),
    },
    supportButtonText: {
      color: '#FFFFFF',
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '600',
    },
    supportIcon: {
      marginRight: 8,
    },
    textArea: {
      borderRadius: screenWidth < 375 ? 8 : 10,
      borderWidth: 1,
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      maxHeight: 200,
      minHeight: 120,
      padding: screenWidth < 375 ? 10 : 12,
    },
    textInput: {
      borderRadius: screenWidth < 375 ? 8 : 10,
      borderWidth: 1,
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      minHeight: 44,
      padding: screenWidth < 375 ? 10 : 12,
    },
    titleContainer: {
      backgroundColor: '#F3F4F6',
      borderRadius: isSmallDevice ? scaleSize(8) : scaleSize(12),
      marginBottom: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    title: {
      fontSize: screenWidth < 375 ? 18 : 20,
      fontWeight: 'bold',
    },
    toggleSwitch: {
      borderRadius: 12,
      height: 24,
      position: 'relative',
      width: 48,
    },
    toggleThumb: {
      backgroundColor: 'white',
      borderRadius: 10,
      height: 20,
      position: 'absolute',
      top: 2,
      width: 20,
    },
    toggleThumbActive: {
      right: 2,
    },
    toggleThumbInactive: {
      left: 2,
    },
    successModalContent: {
      borderRadius: screenWidth < 375 ? 12 : 16,
      padding: screenWidth < 375 ? 20 : 24,
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
    },
    successModalHeader: {
      alignItems: 'center',
      marginBottom: screenHeight < 600 ? scaleSize(16) : scaleSize(20),
    },
    successModalTitle: {
      fontSize: screenWidth < 375 ? 20 : 24,
      fontWeight: 'bold',
      marginTop: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
    },
    successModalText: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      lineHeight: isSmallDevice ? scaleSize(20) : scaleSize(24),
      textAlign: 'center',
      marginBottom: screenHeight < 600 ? scaleSize(20) : scaleSize(24),
    },
    successModalButton: {
      alignItems: 'center',
      borderRadius: screenWidth < 375 ? 8 : 10,
      justifyContent: 'center',
      paddingVertical: screenHeight < 600 ? scaleSize(12) : scaleSize(16),
      paddingHorizontal: screenWidth < 375 ? 24 : 32,
      width: '100%',
    },
    successModalButtonText: {
      color: '#FFFFFF',
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      fontWeight: '600',
    },
  });

export default SettingsContent;
