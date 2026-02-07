/**
 * AvatarsModal - TypeScript Implementation
 * Modal for selecting profile picture avatars
 */

import React from 'react';
import { Modal, Pressable, Text, View, FlatList, Platform, Image } from 'react-native';
import OptimizedImage from '../../OptimizedImage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { store } from '../../../store/store';
import { fetchOwnedAvatars } from '../../../store/profileSlice';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

interface Avatar {
  id: string;
  name: string;
  image_url: string;
}

interface AvatarsModalProps {
  visible: boolean;
  onClose: () => void;
  avatars: Avatar[];
  loading: boolean;
  navigation: any;
  onSelectAvatar?: (avatar: Avatar) => void;
}

const AvatarsModal: React.FC<AvatarsModalProps> = ({
  visible,
  onClose,
  avatars,
  loading,
  navigation,
  onSelectAvatar,
}) => {
  const [loadingLottie, setLoadingLottie] = React.useState<Record<string, boolean>>({});
  const [refreshedAvatars, setRefreshedAvatars] = React.useState<Avatar[]>(avatars);
  const [refreshing, setRefreshing] = React.useState(false);

  // Refetch avatars when modal opens to get fresh URLs (S3 signed URLs expire after 15 minutes)
  React.useEffect(() => {
    let isMounted = true;

    if (visible) {
      setRefreshing(true);
      // Fetch fresh avatars using imported store
      const fetchFreshAvatars = async () => {
        try {
          const result = await store.dispatch(fetchOwnedAvatars());
          if (isMounted && result.type === 'profile/fetchOwnedAvatars/fulfilled') {
            const freshAvatars = result.payload || [];
            // Map to Avatar format - USE URL FIELD EXACTLY AS PROVIDED FROM BACKEND
            // DO NOT generate URLs from name or description - use the 'url' field directly
            const mappedAvatars = freshAvatars.map((a: any) => ({
              id: a.id || '',
              name: a.name || '',
              image_url: a.url || '', // Use 'url' field from backend exactly as provided
            }));
            setRefreshedAvatars(mappedAvatars);
          }
        } catch (error) {
          if (isMounted) {
            logger.warn(
              '⚠️ [AvatarsModal] Failed to refresh avatars, using cached:',
              'PROFILE',
              error
            );
            setRefreshedAvatars(avatars);
          }
        } finally {
          if (isMounted) {
            setRefreshing(false);
          }
        }
      };
      fetchFreshAvatars();
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Use refreshed avatars if available, otherwise use props
  const displayAvatars = refreshedAvatars.length > 0 ? refreshedAvatars : avatars;

  // Check if URL is a Lottie file (JSON or dotlottie format)
  const isLottieFile = (url: string, mimeType?: string): boolean => {
    if (!url) return false;
    // Check mime_type first (most reliable)
    if (mimeType === 'application/json' || mimeType === 'application/octet-stream') return true;
    // Fallback to URL check - more comprehensive
    const lowerUrl = url.toLowerCase();
    const cleanUrl = lowerUrl.split('?')[0]; // Remove query params
    return (
      cleanUrl.endsWith('.json') ||
      cleanUrl.endsWith('.lottie') ||
      cleanUrl.endsWith('.dotlottie') ||
      lowerUrl.includes('.json?') ||
      lowerUrl.includes('.json&') ||
      lowerUrl.includes('.lottie?') ||
      lowerUrl.includes('.lottie&') ||
      lowerUrl.includes('.dotlottie?') ||
      lowerUrl.includes('.dotlottie&') ||
      lowerUrl.includes('lottie') ||
      lowerUrl.includes('animation') ||
      lowerUrl.includes('lottiefiles.com')
    );
  };

  // Check if URL is a dotlottie file (.lottie format)
  const isDotLottieFile = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const cleanUrl = lowerUrl.split('?')[0]; // Remove query params
    return (
      cleanUrl.endsWith('.lottie') ||
      cleanUrl.endsWith('.dotlottie') ||
      lowerUrl.includes('.lottie?') ||
      lowerUrl.includes('.lottie&') ||
      lowerUrl.includes('.dotlottie?') ||
      lowerUrl.includes('.dotlottie&')
    );
  };

  const handleSelectAvatar = (avatar: Avatar) => {
    if (onSelectAvatar) {
      onSelectAvatar(avatar);
    }
    onClose();
  };

  // Initialize loading states for Lottie files when avatars change
  React.useEffect(() => {
    const initialLoading: Record<string, boolean> = {};
    displayAvatars.forEach(avatar => {
      if (isLottieFile(avatar.image_url)) {
        const key = avatar.id || avatar.name;
        if (loadingLottie[key] === undefined) {
          initialLoading[key] = true;
        }
      }
    });
    if (Object.keys(initialLoading).length > 0) {
      setLoadingLottie(prev => ({ ...prev, ...initialLoading }));
    }

    return () => {
      // Cleanup: no specific cleanup needed for this effect
    };
  }, [displayAvatars]);

  const renderAvatarItem = ({ item }: { item: Avatar }) => {
    const isLottie = isLottieFile(item.image_url);
    const isDotLottie = isDotLottieFile(item.image_url);

    const itemKey = item.id || item.name;
    const isLoading = loadingLottie[itemKey] === true;

    return (
      <SoundTouchableOpacity
        style={{
          margin: 8,
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          flex: 1,
        }}
        onPress={() => handleSelectAvatar(item)}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            marginBottom: 8,
            backgroundColor: '#f3f4f6',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'visible',
          }}
        >
          {isLottie ? (
            <>
              {isLoading && (
                <LottieView
                  source={require('../../../../assets/signup/DogParachute.json')}
                  autoPlay
                  loop
                  style={{ position: 'absolute', zIndex: 1, width: 24, height: 24 }}
                />
              )}
              <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}>
                <LottieView
                  key={`avatar-${itemKey}-${isDotLottie ? 'dotlottie' : 'json'}`}
                  source={{ uri: item.image_url }}
                  autoPlay
                  loop
                  renderMode="SOFTWARE"
                  cacheStrategy="strong"
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                  onLayout={() => {
                    // Force play when layout is ready - ensures rendering for dotlottie
                    try {
                      // This will be handled by LottieView automatically
                    } catch (e) {
                      // Silent fail
                    }
                  }}
                  onAnimationFailure={async error => {
                    const errorMsg = error?.toString() || '';
                    const errorString = JSON.stringify(error || {});

                    // ONLY handle expired URLs (403) - refresh from backend
                    // DO NOT try to fix 404 errors by modifying URLs - use backend URL exactly as provided
                    const isExpiredUrl =
                      errorMsg.includes('403') ||
                      errorMsg.includes('InvalidAccessKeyId') ||
                      errorMsg.includes('AWS Access Key Id') ||
                      errorMsg.includes('Request has expired') ||
                      errorString.includes('403');

                    // If URL expired (403), fetch fresh avatar data from backend
                    if (isExpiredUrl) {
                      try {
                        const result = await store.dispatch(fetchOwnedAvatars());
                        if (result.type === 'profile/fetchOwnedAvatars/fulfilled') {
                          const freshAvatars = result.payload || [];
                          const freshAvatar = freshAvatars.find(
                            (a: any) => (a.id || '') === item.id
                          );
                          if (freshAvatar && freshAvatar.url) {
                            // Update the avatar URL using backend 'url' field exactly as provided
                            const updatedAvatars = displayAvatars.map(a =>
                              a.id === item.id ? { ...a, image_url: freshAvatar.url } : a
                            );
                            setRefreshedAvatars(updatedAvatars);
                            setLoadingLottie(prev => ({ ...prev, [itemKey]: true })); // Retry loading
                            return;
                          }
                        }
                      } catch (refreshError) {
                        logger.warn(
                          '⚠️ [AvatarsModal] Failed to refresh expired avatar URL:',
                          'PROFILE',
                          refreshError
                        );
                      }
                    }

                    // For 404 or other errors, just stop loading
                    // DO NOT try to modify URLs or extract S3 keys - backend URL is the source of truth
                    setLoadingLottie(prev => ({ ...prev, [itemKey]: false }));
                  }}
                  onAnimationLoaded={() => {
                    setLoadingLottie(prev => ({ ...prev, [itemKey]: false }));
                  }}
                />
              </View>
            </>
          ) : (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
              onError={() => logger.warn('⚠️ Failed to load avatar image:', 'PROFILE', item.name)}
            />
          )}
        </View>
        <Text
          style={{ fontSize: 14, fontWeight: '500', color: '#1f2937', textAlign: 'center' }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </SoundTouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end',
          zIndex: 100000,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10000,
            zIndex: 100001,
            maxHeight: '80%',
          }}
          onPress={e => e.stopPropagation()}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>
              Choose Avatar
            </Text>
            <SoundTouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </SoundTouchableOpacity>
          </View>

          {loading || refreshing ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <LottieView
                source={require('../../../../assets/signup/DogParachute.json')}
                autoPlay
                loop
                style={{ width: 100, height: 100 }}
              />
              <Text style={{ marginTop: 8, color: '#4b5563' }}>
                {refreshing ? 'Refreshing avatars...' : 'Loading avatars...'}
              </Text>
            </View>
          ) : displayAvatars && displayAvatars.length > 0 ? (
            <FlatList
              data={displayAvatars}
              renderItem={renderAvatarItem}
              keyExtractor={item => item.id || item.name}
              numColumns={2}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
              {...getOptimizedFlatListProps(150, {
                numColumns: 2,
                initialNumToRender: 15,
                maxToRenderPerBatch: 10,
                windowSize: 21,
                removeClippedSubviews: Platform.OS === 'android',
              })}
            />
          ) : (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontSize: 16 }}>No avatars available</Text>
            </View>
          )}

          <SoundTouchableOpacity
            style={{
              paddingVertical: 14,
              borderRadius: 8,
              marginTop: 16,
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
            }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#4b5563' }}>Cancel</Text>
          </SoundTouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AvatarsModal;
