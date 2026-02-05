/**
 * UpdateCard - TypeScript Implementation
 * Professional update card component with comprehensive features
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Interactions {
  likes: number;
  comments: number;
  shares: number;
}

interface UpdateCardProps {
  interactions: Interactions;
  handleInteraction: (type: string) => void;
}

const UpdateCard: React.FC<UpdateCardProps> = ({
  interactions: initialInteractions,
  handleInteraction,
}) => {
  const { isDarkMode, colors } = useTheme();
  const [interactions, setInteractions] = useState<Interactions>(initialInteractions);
  const [liked, setLiked] = useState<boolean>(false);
  const [commented, setCommented] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);

  const likeAnimation = useButtonAnimation();
  const commentAnimation = useButtonAnimation();
  const shareAnimation = useButtonAnimation();

  const handleLike = (): void => {
    setLiked(!liked);
    handleInteraction('likes');
    setInteractions(prev => ({
      ...prev,
      likes: liked ? prev.likes - 1 : prev.likes + 1,
    }));
  };

  const handleComment = (): void => {
    setCommented(!commented);
    handleInteraction('comments');
  };

  const handleShare = (): void => {
    setShared(!shared);
    handleInteraction('shares');
  };

  const horizontalMargin = Math.max(20, screenWidth * 0.05) * 2;
  const cardWidth = screenWidth - horizontalMargin;
  const imageHeight = (cardWidth * 9) / 16 + Math.max(20, screenHeight * 0.025);

  const iconSize = Math.max(46, screenWidth * 0.12);
  const interactionTextSize = Math.max(14, screenWidth * 0.035);
  const foregroundImageWidth = cardWidth * 0.74;
  const foregroundImageHeight = imageHeight * 0.8;
  const interactionCountSize = Math.max(14, screenWidth * 0.035);

  return (
    <View
      className="mx-5"
      style={{
        marginTop: -10,
        marginBottom: 0,
        overflow: 'visible',
        marginHorizontal: Math.max(20, screenWidth * 0.05),
      }}
    >
      <View
        style={{ width: cardWidth, height: imageHeight, position: 'relative', overflow: 'visible' }}
      >
        <Image
          source={require('../../../../assets/update.png')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: 12,
            zIndex: 2,
          }}
          resizeMode="cover"
        />

        <Image
          source={{
            uri: 'https://giftdonor.org/wp-content/uploads/2023/11/Trivia-Night-Featured-Image-Update-1-13-2024.jpg',
          }}
          style={{
            width: foregroundImageWidth,
            height: foregroundImageHeight,
            position: 'absolute',
            top: '10%',
            left: '12%',
            borderRadius: 12,
            zIndex: 0,
          }}
          resizeMode="contain"
        />

        <View
          style={{
            position: 'absolute',
            top: '80.5%',
            left: '28.5%',
            alignItems: 'center',
            zIndex: 20,
            width: Math.max(28, screenWidth * 0.07),
          }}
        >
          <Animated.View style={likeAnimation.animatedStyle}>
            <TouchableOpacity
              onPress={handleLike}
              onPressIn={likeAnimation.animatePress}
              onPressOut={likeAnimation.animateRelease}
              activeOpacity={1}
            >
              <Image
                source={require('../../../../assets/like.png')}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text
            style={{
              color: liked ? '#FF4081' : '#FFF',
              fontSize: interactionCountSize,
              fontWeight: '900',
              marginTop: -4,
              textAlign: 'center',
              textShadowColor: '#000',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {interactions.likes}
          </Text>
        </View>

        <View
          style={{
            position: 'absolute',
            top: '80.5%',
            left: '45.5%',
            alignItems: 'center',
            zIndex: 20,
            width: Math.max(28, screenWidth * 0.07),
          }}
        >
          <Animated.View style={commentAnimation.animatedStyle}>
            <TouchableOpacity
              onPress={handleComment}
              onPressIn={commentAnimation.animatePress}
              onPressOut={commentAnimation.animateRelease}
              activeOpacity={1}
            >
              <Image
                source={require('../../../../assets/comment.png')}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text
            style={{
              color: commented ? '#64B5F6' : '#FFF',
              fontSize: interactionCountSize,
              fontWeight: '900',
              marginTop: -4,
              textAlign: 'center',
              textShadowColor: '#000',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {interactions.comments}
          </Text>
        </View>

        <View
          style={{
            position: 'absolute',
            top: '80.5%',
            left: '62.8%',
            alignItems: 'center',
            zIndex: 20,
            width: Math.max(28, screenWidth * 0.07),
          }}
        >
          <Animated.View style={shareAnimation.animatedStyle}>
            <TouchableOpacity
              onPress={handleShare}
              onPressIn={shareAnimation.animatePress}
              onPressOut={shareAnimation.animateRelease}
              activeOpacity={1}
            >
              <Image
                source={require('../../../../assets/share.png')}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text
            style={{
              color: shared ? '#81C784' : '#FFF',
              fontSize: interactionCountSize,
              fontWeight: '900',
              marginTop: -4,
              textAlign: 'center',
              textShadowColor: '#000',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {interactions.shares}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default UpdateCard;
