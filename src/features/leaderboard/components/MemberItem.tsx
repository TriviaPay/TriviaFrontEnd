import React, { memo } from 'react';
import { View, Text, Image, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../../utils/scaleSize';

// Helper function to check if URL is a Lottie file
const isLottieFile = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.json') ||
    url.includes('.json?') ||
    url.includes('.json&') ||
    url.includes('lottiefiles.com')
  );
};

export interface Member {
  id: number;
  rank: number;
  name: string;
  image: string;
  amount: string;
  level?: number;
  level_progress?: string;
  color?: string;
  lastOnline?: string;
  isOnline?: boolean;
  badges?: any[];
  subscription_badges?: any[];
  isCurrentUser?: boolean;
  frame?: string;
  badgeImage?: any;
  userid?: number;
  user_id?: number;
  account_id?: number;
  peer_user_id?: number;
  countryCode?: string;
}

interface MemberItemProps {
  item: Member;
  onPress: (item: Member) => void;
  isSelected: boolean;
  isCurrentUser: boolean;
}

const MemberItem = memo(
  ({ item, onPress, isSelected, isCurrentUser }: MemberItemProps) => {
    // Ensure item is defined
    if (!item) return null;

    return (
      <SoundTouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 0,
          paddingHorizontal: 0,
          marginVertical: 0,
        }}
        onPress={() => onPress(item)}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: scaleSize(8), // Consistently 8px for all (was 12 for current user)
            paddingHorizontal: scaleSize(16),
            marginVertical: 0,
            backgroundColor: isCurrentUser ? 'rgba(180, 255, 57, 0.3)' : 'transparent',
            borderBottomLeftRadius: isCurrentUser ? scaleSize(15) : 0,
            borderBottomRightRadius: isCurrentUser ? scaleSize(15) : 0,
          }}
        >
          {/* Rank Number - Removed as per user request */}
          {/* <View style={{ width: scaleSize(30), alignItems: 'center' }}>
            <Text
              style={{
                color: 'white',
                fontSize: scaleSize(14),
                fontWeight: 'bold',
                fontFamily: 'Baloo2',
              }}
            >
              {item.rank}
            </Text>
          </View> */}

          <View
            style={{
              marginLeft: 0, // Removed numbering space, adjusted margin
              position: 'relative',
              overflow: 'visible',
              width: scaleSize(40),
              height: scaleSize(40),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Avatar Lottie or Image */}
            <View
              style={{
                width: scaleSize(40),
                height: scaleSize(40),
                borderRadius: scaleSize(20),
                overflow: 'hidden',
                borderWidth: 0,
                backgroundColor: 'transparent',
                zIndex: 5,
                position: 'relative',
              }}
            >
              {item.image ? (
                isLottieFile(item.image) ? (
                  <LottieView
                    source={{ uri: item.image }}
                    autoPlay
                    loop
                    renderMode={Platform.OS === 'android' ? 'HARDWARE' : undefined}
                    cacheComposition={true}
                    style={{
                      width: scaleSize(40),
                      height: scaleSize(40),
                    }}
                    onAnimationFailure={() => {
                      // Handle animation failure silently
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      width: scaleSize(40),
                      height: scaleSize(40),
                    }}
                    resizeMode="cover"
                  />
                )
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: scaleSize(14),
                      fontWeight: 'bold',
                      color: '#6B7280',
                    }}
                  >
                    {item.name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>

            {/* Star Icon at Top Right Corner of Profile with Level */}
            {item.level !== undefined && item.level !== null && (
              <View
                style={{
                  position: 'absolute',
                  top: -scaleSize(4),
                  right: -scaleSize(4),
                  zIndex: 10,
                }}
              >
                <Image
                  source={require('../../../../assets/home/star.png')}
                  style={{
                    width: scaleSize(20),
                    height: scaleSize(20),
                  }}
                  resizeMode="contain"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#000000',
                      fontSize: scaleSize(8),
                      fontWeight: 'bold',
                      fontFamily: 'Baloo2',
                    }}
                  >
                    {item.level}
                  </Text>
                </View>
              </View>
            )}
          </View>


          {/* Name */}
          <View style={{ flex: 1, marginLeft: scaleSize(12), flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: scaleSize(14),
                color: 'white',
                fontWeight: isSelected || isCurrentUser ? 'bold' : 'normal',
                fontFamily: 'Baloo2',
              }}
            >
              {item.name}
            </Text>
          </View>

          {/* Amount won */}
          <View style={{ marginLeft: scaleSize(8), flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../../assets/icons/Tpcoin.png')}
              style={{
                width: scaleSize(16),
                height: scaleSize(16),
                borderRadius: scaleSize(8),
                marginRight: scaleSize(4),
              }}
            />
            <Text
              style={{
                fontSize: scaleSize(14),
                color: 'white',
                fontWeight: 'bold',
                fontFamily: 'Baloo2',
              }}
            >
              {item.amount || 0}
            </Text>
          </View>
        </View>
      </SoundTouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for performance
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.rank === nextProps.item.rank &&
      prevProps.item.amount === nextProps.item.amount &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isCurrentUser === nextProps.isCurrentUser
    );
  }
);

export default MemberItem;
