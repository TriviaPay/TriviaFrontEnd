/**
 * Referral Modal Component
 * Displays referral code and sharing information
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
  Share,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from './SoundTouchableOpacity';
import { apiService } from '../../services/apiService';
import { scaleSize } from '../../utils/scaleSize';

interface ReferralModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

interface ReferralData {
  referral_code: string;
  share_text: string;
  app_link: string;
}

const ReferralModal = ({ isVisible, onClose, isDarkMode }: ReferralModalProps) => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Button animation for close button
  const closeButtonScale = useRef(new Animated.Value(1)).current;

  const animateClosePress = () => {
    Animated.sequence([
      Animated.timing(closeButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(closeButtonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClosePress = () => {
    animateClosePress();
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleCopyCode = async () => {
    if (referralData?.referral_code) {
      try {
        await Clipboard.setString(referralData.referral_code);
        Alert.alert('Copied!', 'Referral code copied to clipboard');
      } catch (error) {
        Alert.alert('Error', 'Failed to copy code');
      }
    }
  };

  const handleCopyLink = async () => {
    if (referralData?.app_link) {
      try {
        await Clipboard.setString(referralData.app_link);
        Alert.alert('Copied!', 'Link copied to clipboard');
      } catch (error) {
        Alert.alert('Error', 'Failed to copy link');
      }
    }
  };

  const handleShareCode = async () => {
    if (referralData?.referral_code) {
      try {
        const result = await Share.share({
          message: `Use my referral code: ${referralData.referral_code}\n${referralData.share_text}\n${referralData.app_link}`,
          title: 'Referral Code',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  const handleShareLink = async () => {
    if (referralData?.app_link) {
      try {
        const result = await Share.share({
          message: `${referralData.share_text}\n${referralData.app_link}`,
          title: 'App Link',
          url: referralData.app_link,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  const fetchReferralData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[ReferralModal] Fetching referral data...');
      const response = await apiService.sendReferral();
      console.log('[ReferralModal] API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle nested response structure: { status: "success", data: {...} }
        let referralInfo = response.data;

        // Check if data is nested
        if ((response.data as any).data) {
          referralInfo = (response.data as any).data;
        }

        // Also check if response.data itself has the structure
        if ((response.data as any).referral_code || (referralInfo as any).referral_code) {
          const finalData = (referralInfo as any).referral_code ? referralInfo : response.data;

          if (finalData.referral_code && finalData.share_text && finalData.app_link) {
            console.log('[ReferralModal] Setting referral data:', finalData);
            setReferralData(finalData);
          } else {
            console.error('[ReferralModal] Missing required fields:', finalData);
            setError('Invalid referral data received');
          }
        } else {
          console.error('[ReferralModal] No referral_code found in response');
          setError('Invalid referral data received');
        }
      } else {
        console.error('[ReferralModal] API call failed:', response.error);
        setError(response.error || 'Failed to load referral code');
      }
    } catch (err) {
      console.error('[ReferralModal] Error fetching referral:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch referral data when modal opens
  useEffect(() => {
    if (isVisible) {
      fetchReferralData();
    } else {
      // Reset state when modal closes
      setReferralData(null);
      setError(null);
    }
  }, [isVisible]);

  // Colors based on theme
  const bgColor = isDarkMode ? '#1F2937' : '#F3F0FF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937';
  const secondaryTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const cardBgColor = isDarkMode ? '#1E293B' : '#F3F4F6';

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: bgColor, borderWidth: 2, borderColor: '#FFD700' },
          ]}
          onPress={e => e.stopPropagation()}
        >
          {/* Header with close button */}
          <View style={styles.closeButtonContainer}>
            <SoundTouchableOpacity
              onPress={handleClosePress}
              soundType="button"
              style={styles.closeButton}
            >
              <Animated.View
                style={[
                  styles.closeButtonInner,
                  {
                    transform: [{ scale: closeButtonScale }],
                  },
                ]}
              >
                <Image
                  source={require('../../../assets/common/closeIcon.png')}
                  style={styles.closeIcon}
                  resizeMode="contain"
                />
              </Animated.View>
            </SoundTouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <LottieView
                  source={require('../../../assets/animations/LoadingBar.json')}
                  autoPlay
                  loop
                  style={{ width: scaleSize(100), height: scaleSize(100) }}
                />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                  Loading referral code...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                <SoundTouchableOpacity
                  onPress={fetchReferralData}
                  soundType="button"
                  style={[
                    styles.retryButton,
                    { backgroundColor: isDarkMode ? '#13b7e3' : '#603A7C' },
                  ]}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </SoundTouchableOpacity>
              </View>
            ) : referralData ? (
              <>
                {/* Title */}
                <Text
                  style={[
                    styles.title,
                    {
                      color: '#007AFF', // Vibrant Blue
                      fontFamily: 'LuckiestGuy-Regular',
                      fontSize: scaleSize(26),
                      fontWeight: 'normal',
                      fontStyle: 'normal',
                    },
                  ]}
                >
                  Refer a Friend
                </Text>

                {/* Referral Code */}
                <View style={[styles.codeContainer, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: isDarkMode ? '#0d1829ff' : '#8b9dc0ff' }]}>
                  <Text style={[styles.codeLabel, { color: secondaryTextColor }]}>
                    Your Referral Code
                  </Text>
                  <View style={styles.codeRow}>
                    <Text style={[styles.codeValue, { color: textColor }]} numberOfLines={1}>
                      {referralData.referral_code}
                    </Text>
                    <View style={styles.actionButtons}>
                      <SoundTouchableOpacity
                        onPress={handleCopyCode}
                        soundType="button"
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="content-copy"
                          size={scaleSize(18)}
                          color={isDarkMode ? '#13b7e3' : '#603A7C'}
                        />
                      </SoundTouchableOpacity>
                      <SoundTouchableOpacity
                        onPress={handleShareCode}
                        soundType="button"
                        style={[styles.actionButton, styles.actionButtonSpacing]}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="share-variant"
                          size={scaleSize(18)}
                          color={isDarkMode ? '#13b7e3' : '#603A7C'}
                        />
                      </SoundTouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Share Text */}
                <View style={styles.shareTextContainer}>
                  <Text style={[styles.shareText, { color: textColor }]}>
                    {referralData.share_text}
                  </Text>
                </View>

                {/* App Link */}
                <View style={[styles.linkContainer, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: isDarkMode ? '#374151' : '#8c9bb9ff' }]}>
                  <Text style={[styles.linkLabel, { color: secondaryTextColor }]}>App Link</Text>
                  <View style={styles.linkRow}>
                    <Text
                      style={[styles.linkValue, { color: textColor, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {referralData.app_link}
                    </Text>
                    <View style={styles.actionButtons}>
                      <SoundTouchableOpacity
                        onPress={handleCopyLink}
                        soundType="button"
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="content-copy"
                          size={scaleSize(18)}
                          color={isDarkMode ? '#13b7e3' : '#603A7C'}
                        />
                      </SoundTouchableOpacity>
                      <SoundTouchableOpacity
                        onPress={handleShareLink}
                        soundType="button"
                        style={[styles.actionButton, styles.actionButtonSpacing]}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="share-variant"
                          size={scaleSize(18)}
                          color={isDarkMode ? '#13b7e3' : '#603A7C'}
                        />
                      </SoundTouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: scaleSize(8),
    justifyContent: 'center',
    minHeight: scaleSize(36),
    minWidth: scaleSize(36),
    padding: scaleSize(10),
  },
  actionButtonSpacing: {
    marginLeft: scaleSize(8),
  },
  actionButtons: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 4,
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  closeButtonInner: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  closeIcon: {
    height: 26,
    width: 26,
  },
  codeContainer: {
    borderRadius: scaleSize(12),
    marginBottom: scaleSize(20),
    padding: scaleSize(20),
  },
  codeLabel: {
    fontSize: scaleSize(14),
    marginBottom: scaleSize(8),
  },
  codeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(12),
    justifyContent: 'space-between',
    width: '100%',
  },
  codeValue: {
    flexShrink: 1,
    fontSize: scaleSize(28),
    fontWeight: 'bold',
    letterSpacing: scaleSize(2),
    textAlign: 'left',
  },
  contentContainer: {
    padding: scaleSize(24),
    paddingTop: scaleSize(40),
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: scaleSize(20),
  },
  errorText: {
    fontSize: scaleSize(16),
    marginBottom: scaleSize(20),
    textAlign: 'center',
  },
  linkContainer: {
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
  },
  linkLabel: {
    fontSize: scaleSize(12),
    marginBottom: scaleSize(8),
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: scaleSize(8),
  },
  linkValue: {
    fontSize: scaleSize(14),
    textAlign: 'left',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: scaleSize(40),
  },
  loadingText: {
    fontSize: scaleSize(14),
    marginTop: scaleSize(16),
    textAlign: 'center',
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 2,
    maxWidth: scaleSize(400),
    overflow: 'hidden',
    width: '85%',
  },
  retryButton: {
    borderRadius: scaleSize(8),
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(10),
  },
  retryButtonText: {
    color: 'white',
    fontSize: scaleSize(14),
    fontWeight: '600',
  },
  shareText: {
    fontSize: scaleSize(16),
    lineHeight: scaleSize(24),
    textAlign: 'center',
  },
  shareTextContainer: {
    marginBottom: scaleSize(20),
  },
  title: {
    fontSize: scaleSize(22),
    fontWeight: 'bold',
    marginBottom: scaleSize(24),
    textAlign: 'center',
  },
});

export default ReferralModal;
