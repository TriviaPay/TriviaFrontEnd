/**
 * Winners Carousel Component
 * Displays recent winners in a horizontal scrollable list
 */

import React from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Text, Card, SoundTouchableOpacity } from '@ui/components';
import { colors, spacing } from '@ui/tokens';
import { formatCurrency } from '@core/utils';

import LottieView from 'lottie-react-native';

interface WinnersCarouselProps {
  winners: any[]; // Using any to match the dynamic response format
  onWinnerPress?: (winner: any) => void;
}

export const WinnersCarousel: React.FC<WinnersCarouselProps> = ({ winners, onWinnerPress }) => {
  const isLottieFile = (url: string | null | undefined) => {
    if (!url) return false;
    return url.includes('.json') || url.includes('lottie');
  };

  const renderWinner = ({ item }: { item: any }) => {
    const avatar = item.avatar_url || item.profile_pic;
    const isLottie = isLottieFile(avatar);

    return (
      <SoundTouchableOpacity
        onPress={() => onWinnerPress?.(item)}
        style={styles.winnerCardContainer}
      >
        <Card style={styles.winnerCard} elevated>
          <View style={styles.winnerContent}>
            {/* Avatar Section */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {avatar ? (
                  isLottie ? (
                    <LottieView
                      source={{ uri: avatar }}
                      autoPlay
                      loop
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <FastImage
                      source={{
                        uri: avatar,
                        priority: FastImage.priority.normal
                      }}
                      style={styles.avatar}
                      resizeMode={FastImage.resizeMode.cover}
                    />
                  )
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text variant="h3" color={colors.white}>
                      {item.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Level Star - Matching Home Header Aesthetic */}
              {item.level !== undefined && (
                <View style={styles.levelStarContainer}>
                  <Image
                    source={require('../../../../assets/home/star.png')}
                    style={styles.starIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.levelTextWrapper}>
                    <Text style={styles.levelText}>{item.level}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.winnerInfo}>
              <Text variant="body" style={styles.username}>
                {item.username}
              </Text>
              <Text variant="caption" color={colors.success[500]} style={styles.prizeText}>
                Won {formatCurrency(item.money_awarded)}
              </Text>

              {/* Subscription Badges List */}
              {item.subscription_badges && Array.isArray(item.subscription_badges) && (
                <View style={styles.badgesList}>
                  {item.subscription_badges.map((badge: any, index: number) => (
                    <Image
                      key={`${item.user_id}-badge-${index}`}
                      source={{ uri: badge.image_url }}
                      style={styles.miniBadge}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </Card>
      </SoundTouchableOpacity>
    );
  };

  if (winners.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text variant="body" align="center" color={colors.textSecondary}>
          No recent winners yet
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="h3" style={styles.title}>
        🏆 Recent Winners
      </Text>
      <FlatList
        data={winners}
        renderItem={renderWinner}
        keyExtractor={(item, index) => `${item.user_id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    color: colors.text,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    fontFamily: 'Baloo2-Bold',
  },
  winnerCardContainer: {
    marginRight: spacing.sm,
  },
  winnerCard: {
    width: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  winnerContent: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
  },
  levelStarContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  starIcon: {
    width: 28,
    height: 28,
  },
  levelTextWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  winnerInfo: {
    alignItems: 'center',
    width: '100%',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.white,
    fontFamily: 'Baloo2',
    marginBottom: 2,
  },
  prizeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  badgesList: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  miniBadge: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  badge: {
    height: 24,
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 24,
  },
  emptyCard: {
    marginHorizontal: spacing.md,
    padding: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
});
