/**
 * FramesModal - TypeScript Implementation
 * Modal for selecting profile picture frames
 */

import React from 'react';
import { Modal, Pressable, Text, View, FlatList, Platform } from 'react-native';
import OptimizedImage from '../../OptimizedImage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { store } from '../../../store/store';
import { fetchOwnedFrames } from '../../../store/profileSlice';
import { getOptimizedFlatListProps } from '../../../utils/flatListOptimization';

interface Frame {
  id: string;
  name: string;
  image_url: string; // This should be the 'url' field from backend API, mapped to image_url for component usage
}

interface FramesModalProps {
  visible: boolean;
  onClose: () => void;
  frames: Frame[];
  loading: boolean;
  navigation: any;
  onSelectFrame?: (frame: Frame) => void;
}

const FramesModal: React.FC<FramesModalProps> = ({
  visible,
  onClose,
  frames,
  loading,
  navigation,
  onSelectFrame,
}) => {
  const [loadingLottie, setLoadingLottie] = React.useState<Record<string, boolean>>({});
  const [refreshedFrames, setRefreshedFrames] = React.useState<Frame[]>(frames);
  const [refreshing, setRefreshing] = React.useState(false);

  // Refetch frames when modal opens to get fresh URLs (S3 signed URLs expire after 15 minutes)
  React.useEffect(() => {
    let isMounted = true;

    if (visible) {
      setRefreshing(true);
      // Fetch fresh frames using imported store
      const fetchFreshFrames = async () => {
        try {
          const result = await store.dispatch(fetchOwnedFrames());
          if (isMounted && result.type === 'profile/fetchOwnedFrames/fulfilled') {
            const freshFrames = result.payload || [];
            // Map to Frame format - USE URL FIELD EXACTLY AS PROVIDED FROM BACKEND
            // DO NOT generate URLs from name or description - use the 'url' field directly
            const mappedFrames = freshFrames.map((f: any) => ({
              id: f.id || '',
              name: f.name || '',
              image_url: f.url || '', // Use 'url' field from backend exactly as provided
            }));
            setRefreshedFrames(mappedFrames);
          }
        } catch (error) {
          if (isMounted) {
            logger.warn(
              '⚠️ [FramesModal] Failed to refresh frames, using cached:',
              'PROFILE',
              error
            );
            setRefreshedFrames(frames);
          }
        } finally {
          if (isMounted) {
            setRefreshing(false);
          }
        }
      };
      fetchFreshFrames();
    }

    return () => {
      isMounted = false;
    };
  }, [visible, frames]);

  // Use refreshed frames if available, otherwise use props
  const displayFrames = refreshedFrames.length > 0 ? refreshedFrames : frames;

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

  const handleSelectFrame = (frame: Frame) => {
    if (onSelectFrame) {
      onSelectFrame(frame);
    }
    onClose();
  };

  // Initialize loading states for Lottie files when frames change
  React.useEffect(() => {
    const initialLoading: Record<string, boolean> = {};
    displayFrames.forEach(frame => {
      if (isLottieFile(frame.image_url)) {
        const key = frame.id || frame.name;
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
  }, [displayFrames]);

  const renderFrameItem = ({ item }: { item: Frame }) => {
    const isLottie = isLottieFile(item.image_url);

    const itemKey = item.id || item.name;
    const isLoading = loadingLottie[itemKey] === true;

    const isDotLottie = isDotLottieFile(item.image_url);

    // FIXED: Consistent frame size for all items - maintain height same
    const FRAME_PREVIEW_SIZE = 90; // Fixed size for all frames - ensures consistent height (increased by 10px)

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
          minHeight: 150, // FIXED: Ensure consistent minimum height for all items
        }}
        onPress={() => handleSelectFrame(item)}
      >
        <View
          style={{
            width: FRAME_PREVIEW_SIZE,
            height: FRAME_PREVIEW_SIZE, // FIXED: Consistent height same as width
            borderRadius: 8,
            marginBottom: 8,
            backgroundColor: '#f3f4f6',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden', // FIXED: Changed from 'visible' to 'hidden' for proper clipping
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
              <View
                style={{
                  width: FRAME_PREVIEW_SIZE,
                  height: FRAME_PREVIEW_SIZE, // FIXED: Consistent height same as width
                  borderRadius: 8,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LottieView
                  key={`frame-${itemKey}-${isDotLottie ? 'dotlottie' : 'json'}`}
                  source={{ uri: item.image_url }}
                  autoPlay
                  loop
                  renderMode={isDotLottie ? 'HARDWARE' : 'SOFTWARE'}
                  hardwareAccelerationAndroid={isDotLottie ? true : false}
                  cacheStrategy="strong"
                  cacheComposition={true}
                  enableMergePathsAndroidForKitKatAndAbove={true}
                  useNativeLooping={false}
                  speed={1}
                  style={{
                    width: FRAME_PREVIEW_SIZE,
                    height: FRAME_PREVIEW_SIZE, // FIXED: Consistent height same as width
                  }}
                  resizeMode="contain" // FIXED: Maintain aspect ratio, align dynamically
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

                    // If URL expired (403), fetch fresh frame data from backend
                    if (isExpiredUrl) {
                      try {
                        const result = await store.dispatch(fetchOwnedFrames());
                        if (result.type === 'profile/fetchOwnedFrames/fulfilled') {
                          const freshFrames = result.payload || [];
                          const freshFrame = freshFrames.find((f: any) => (f.id || '') === item.id);
                          if (freshFrame && freshFrame.url) {
                            // Update the frame URL using backend 'url' field exactly as provided
                            const updatedFrames = displayFrames.map(f =>
                              f.id === item.id ? { ...f, image_url: freshFrame.url } : f
                            );
                            setRefreshedFrames(updatedFrames);
                            setLoadingLottie(prev => ({ ...prev, [itemKey]: true })); // Retry loading
                            return;
                          }
                        }
                      } catch (refreshError) {
                        logger.warn(
                          '⚠️ [FramesModal] Failed to refresh expired frame URL:',
                          'PROFILE',
                          refreshError
                        );
                      }
                    }

                    // For 404 or other errors, just log and stop loading
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
            <OptimizedImage
              source={{ uri: item.image_url }}
              style={{
                width: FRAME_PREVIEW_SIZE,
                height: FRAME_PREVIEW_SIZE, // FIXED: Consistent height same as width
              }}
              resizeMode="contain" // FIXED: Maintain aspect ratio, align dynamically
              onError={() => logger.warn('⚠️ Failed to load frame image:', 'PROFILE', item.name)}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#1f2937',
            textAlign: 'center',
            minHeight: 20, // FIXED: Ensure consistent text height
          }}
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
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Choose Frame</Text>
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
                {refreshing ? 'Refreshing frames...' : 'Loading frames...'}
              </Text>
            </View>
          ) : displayFrames && displayFrames.length > 0 ? (
            <FlatList
              data={displayFrames}
              renderItem={renderFrameItem}
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
              <Text style={{ color: '#4b5563', fontSize: 16 }}>No frames available</Text>
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

export default FramesModal;
