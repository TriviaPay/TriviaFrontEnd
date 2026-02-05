/**
 * ProfileInfo - TypeScript Implementation
 * Profile information component with editable name and username fields
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scaleSize } from '../../utils/scaleSize';
import { useStandardResponsive } from '../../hooks/useStandardResponsive';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';

interface SubscriptionBadge {
  id: string;
  name: string;
  image_url: string;
  subscription_type: string;
  price: number;
}

interface ProfileInfoProps {
  isEditing: boolean;
  fullName: string;
  onChangeName: (text: string) => void;
  username?: string;
  badgeImageUrl?: string;
  subscriptionBadges?: SubscriptionBadge[];
  totalGems?: number;
  totalTriviaCoins?: number;
  level?: number;
  levelProgress?: string;
  onCopyUsername?: (username: string) => void;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({
  isEditing,
  fullName,
  onChangeName,
  username,
  badgeImageUrl,
  subscriptionBadges = [],
  totalGems = 0,
  totalTriviaCoins = 0,
  level,
  levelProgress,
  onCopyUsername,
}) => {
  const { getResponsiveFontSize } = useStandardResponsive();
  const [copiedUsername, setCopiedUsername] = useState(false);

  useEffect(() => {
    if (copiedUsername) {
      const timer = setTimeout(() => setCopiedUsername(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedUsername]);

  const handleCopyUsername = () => {
    if (username) {
      Clipboard.setString(username);
      setCopiedUsername(true);
      if (onCopyUsername) {
        onCopyUsername(username);
      }
    }
  };

  // Parse level_progress (format: "3/100")
  const parseLevelProgress = (levelProgress?: string): { current: number; max: number } => {
    if (!levelProgress) return { current: 0, max: 100 };
    const parts = levelProgress.split('/');
    if (parts.length === 2) {
      const current = parseInt(parts[0], 10) || 0;
      const max = parseInt(parts[1], 10) || 100;
      return { current, max };
    }
    return { current: 0, max: 100 };
  };

  const levelProgressData = parseLevelProgress(levelProgress);
  const levelProgressPercentage =
    levelProgressData.max > 0 ? (levelProgressData.current / levelProgressData.max) * 100 : 0;

  return (
    <View style={{ width: '100%', maxWidth: 300, marginTop: 0, alignItems: 'center' }}>
      {isEditing ? (
        <TextInput
          style={[
            styles.usernameContainer,
            {
              width: '100%',
              fontSize: getResponsiveFontSize(scaleSize(16)),
              textAlign: 'center',
              color: '#FFFFFF',
              fontWeight: 'bold',
              backgroundColor: 'rgba(224, 231, 255, 0.2)',
              borderWidth: 1,
              borderColor: '#FFFFFF',
              borderRadius: scaleSize(24),
              paddingHorizontal: scaleSize(12),
              paddingVertical: scaleSize(6),
              marginBottom: scaleSize(4),
            }
          ]}
          value={fullName}
          onChangeText={onChangeName}
          placeholder="Name"
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          editable={true}
          selectTextOnFocus={true}
          maxLength={15}
        />
      ) : (
        fullName && fullName !== username && (
          <Text
            style={{
              fontSize: getResponsiveFontSize(scaleSize(18)),
              fontWeight: 'bold',
              marginBottom: 0,
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            {fullName}
          </Text>
        )
      )}
      {!isEditing && username && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={[
              styles.usernameContainer,
              {
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: fullName && fullName !== username ? scaleSize(2) : 0,
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FFFFFF',
                borderRadius: scaleSize(24),
                paddingHorizontal: scaleSize(12),
                paddingVertical: scaleSize(6),
              },
            ]}
          >
            <Text
              style={[
                styles.usernameText,
                {
                  fontSize: getResponsiveFontSize(scaleSize(14)),
                  textAlign: 'center',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                },
              ]}
            >
              {username}
            </Text>

            {/* Display subscription badges side by side */}
            {subscriptionBadges && subscriptionBadges.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: scaleSize(4),
                  gap: scaleSize(2),
                }}
              >
                {subscriptionBadges.map((badge, index) => (
                  <Image
                    key={badge.id || index}
                    source={{ uri: badge.image_url }}
                    style={{
                      width: scaleSize(20),
                      height: scaleSize(20),
                    }}
                    resizeMode="contain"
                  />
                ))}
              </View>
            )}
            {/* Fallback to single badge if no subscription badges */}
            {(!subscriptionBadges || subscriptionBadges.length === 0) && badgeImageUrl && (
              <Image
                source={{ uri: badgeImageUrl }}
                style={{
                  width: scaleSize(20),
                  height: scaleSize(20),
                  marginLeft: scaleSize(2),
                }}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Copy Icon for Username - OUTSIDE the box */}
          {!isEditing && (
            <SoundTouchableOpacity
              onPress={handleCopyUsername}
              style={{
                padding: scaleSize(4),
                marginLeft: scaleSize(4),
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: scaleSize(8),
              }}
            >
              <Icon
                name={copiedUsername ? 'check' : 'content-copy'}
                size={scaleSize(16)}
                color="#FFFFFF" // White color
              />
            </SoundTouchableOpacity>
          )}
        </View>
      )}

      {/* Level and Progress Bar - Same as UserProfileModal */}
      {(level !== undefined || levelProgress) && (
        <View style={styles.progressContainer}>
          {/* Level Display */}
          {level !== undefined && (
            <View style={styles.levelContainer}>
              <Text
                style={[styles.levelText, { fontSize: getResponsiveFontSize(scaleSize(16)) }]}
              >
                Level {level}
              </Text>
            </View>
          )}

          {/* Progress Bar with Star Icon */}
          {levelProgress && (
            <View>
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: '#FBBF24',
                        width: `${levelProgressPercentage}%`,
                      },
                    ]}
                  />
                </View>
                {/* Star icon at the end of progress bar - no gap */}
                <View style={styles.starIconContainer}>
                  <Image
                    source={require('../../../assets/home/star.png')}
                    style={styles.starIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Text below progress bar */}
              <View style={styles.progressStats}>
                <Text
                  style={[
                    styles.progressText,
                    { fontSize: getResponsiveFontSize(scaleSize(12)) },
                  ]}
                >
                  Questions Answered Correctly
                </Text>
                <View style={styles.progressBarWidth}>
                  <Text
                    style={[
                      styles.progressText,
                      { fontSize: getResponsiveFontSize(scaleSize(12)), textAlign: 'right' },
                    ]}
                  >
                    {levelProgressData.current}/{levelProgressData.max}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 300,
    width: '100%',
  },
  fullName: {
    flexWrap: 'wrap',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  levelContainer: {
    marginBottom: scaleSize(8),
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: scaleSize(16),
    fontWeight: '600',
  },
  nameInput: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(20),
    flex: 1,
    height: scaleSize(16),
    marginRight: 0,
    overflow: 'hidden',
  },
  progressBarWidth: {
    flex: 1,
  },
  progressBarWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  progressContainer: {
    marginTop: scaleSize(12),
    paddingHorizontal: scaleSize(24),
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleSize(4),
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: scaleSize(12),
  },
  starIcon: {
    height: scaleSize(30),
    width: scaleSize(30),
  },
  starIconContainer: {
    alignItems: 'center',
    height: scaleSize(24),
    justifyContent: 'center',
    marginLeft: scaleSize(4),
    marginTop: scaleSize(-4),
    width: scaleSize(24),
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    padding: 12,
  },
  usernameContainer: {
    backgroundColor: 'rgba(224, 231, 255, 0.2)',
    borderRadius: 20,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  usernameInput: {
    marginBottom: 8,
    width: '100%',
  },
  usernameText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ProfileInfo;
