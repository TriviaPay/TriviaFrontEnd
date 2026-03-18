/**
 * ChatMessageItem Component
 * Renders individual chat messages with avatar, frame, badge, and status indicators
 * Single Responsibility: Message rendering
 */

import React, { memo, useRef } from 'react';
import { View, Text, Image, PanResponder, Animated, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import OptimizedImage from '../OptimizedImage';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity'; // Fixed import path
import { useDispatch } from 'react-redux';
import { setSelectedImage, setShowImagePreview } from '../../store/chatSlice';
import { logger } from '../../lib/utils/logger';

// Helper function to check if URL is a Lottie file
const isLottieFile = (url: string | undefined | null): boolean => {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.json') || url.includes('.json?') || url.includes('.json&') || url.includes('lottiefiles.com');
};
import { scaleSize } from '../../utils/scaleSize';

export interface UIMessage {
    id: number;
    text?: string;
    sender: string;
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read' | 'pending';
    isUser: boolean;
    isSystem?: boolean;
    isNotification?: boolean;
    image?: string;
    profile_pic?: string | null;
    avatar_url?: string | null;
    frame_url?: string | null;
    badge?: {
        image_url?: string;
        name?: string;
    } | null;
    reply_to?: {
        id: number;
        message: string;
        sender: string;
    } | null;
    level?: number | null;
}

export interface ChatMessageItemProps {
    item: UIMessage;
    isPrivateChat: boolean;
    isGroupChat: boolean;
    styles: any;
    onLongPress?: (messageId: number, messageText: string, sender: string, isUser: boolean) => void;
    onSwipeReply?: (messageId: number, messageText: string, sender: string, isUser: boolean) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = memo(({
    item,
    isPrivateChat,
    isGroupChat,
    styles,
    onLongPress,
    onSwipeReply,
}) => {
    const dispatch = useDispatch();
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeThreshold = 50; // Minimum swipe distance

    // Check if message is encrypted (contains lock emoji or is placeholder)
    const isEncrypted = item.text?.includes('🔒') || item.text === '🔒 Encrypted message';
    const encryptedText = isEncrypted && item.text ? item.text.replace('🔒 ', '').replace('🔒', '') : item.text;

    if (item.isSystem) {
        return (
            <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.otherMessage]}>
                <View style={styles.systemMessage}>
                    <Text style={styles.systemMessageText}>{item.text}</Text>
                </View>
            </View>
        );
    }

    if (item.isNotification) {
        return (
            <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.otherMessage]}>
                <View style={styles.notificationMessage}>
                    <Text style={styles.notificationMessageText}>{item.text}</Text>
                </View>
            </View>
        );
    }

    const handleLongPress = () => {
        if (onLongPress && !item.isSystem && !item.isNotification && !isEncrypted) {
            onLongPress(item.id, item.text || '', item.sender, item.isUser || false);
        }
    };

    // PanResponder for swipe-to-reply (swipe right to reply)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to horizontal swipes (right swipe)
                // Swipe right is positive dx, and we want horizontal movement > vertical
                return !item.isSystem && !item.isNotification && !isEncrypted &&
                    gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
            },
            onPanResponderGrant: () => {
                translateX.setOffset((translateX as any)._value || 0);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow right swipe (positive dx)
                if (gestureState.dx > 0) {
                    translateX.setValue(Math.min(gestureState.dx, 100)); // Max swipe 100px
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                translateX.flattenOffset();

                // If swiped right more than threshold, trigger reply
                if (gestureState.dx > swipeThreshold && onSwipeReply && !item.isSystem && !item.isNotification && !isEncrypted) {
                    onSwipeReply(item.id, item.text || '', item.sender, item.isUser || false);
                }

                // Animate back to original position
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }).start();
            },
        })
    ).current;


    return (
        <Animated.View
            style={[
                styles.messageContainer,
                item.isUser ? styles.userMessage : styles.otherMessage,
                isEncrypted && styles.encryptedMessageContainer,
                {
                    transform: [{ translateX }],
                },
            ]}
            {...panResponder.panHandlers}
        >
            {/* Profile picture, avatar, frame, and badge for other users' messages */}
            {!item.isUser && !isEncrypted && (
                <View style={styles.messageSenderInfo}>
                    {/* PRIORITY: avatar_url first, then profile_pic fallback */}
                    {item.avatar_url && typeof item.avatar_url === 'string' && item.avatar_url.trim().length > 0 && item.avatar_url !== 'null' ? (
                        /* Show avatar_url with frame if available */
                        <View style={styles.messageProfileContainer}>
                            {/* Frame (outermost layer) - Display for received messages only */}
                            {item.frame_url && typeof item.frame_url === 'string' && item.frame_url.trim().length > 0 && item.frame_url !== 'null' && (
                                isLottieFile(item.frame_url) ? (
                                    <LottieView
                                        key={`frame-${item.id}-${item.frame_url}`}
                                        source={{ uri: item.frame_url }}
                                        autoPlay
                                        loop
                                        renderMode="SOFTWARE"
                                        cacheComposition={false}
                                        enableMergePathsAndroidForKitKatAndAbove={true}
                                        useNativeLooping={false}
                                        speed={1}
                                        style={styles.messageFrame}
                                        resizeMode="contain"
                                        onAnimationFailure={(error) => {
                                            logger.warn('Lottie frame animation failed', 'CHAT_MESSAGE', error);
                                        }}
                                    />
                                ) : (
                                    <OptimizedImage
                                        source={{ uri: item.frame_url }}
                                        style={styles.messageFrame}
                                        resizeMode="contain"
                                    />
                                )
                            )}
                            {/* Avatar (middle layer) - Display avatar_url */}
                            {isLottieFile(item.avatar_url) ? (
                                <LottieView
                                    key={`avatar-${item.id}-${item.avatar_url}`}
                                    source={{ uri: item.avatar_url }}
                                    autoPlay
                                    loop
                                    renderMode="SOFTWARE"
                                    cacheComposition={false}
                                    enableMergePathsAndroidForKitKatAndAbove={true}
                                    useNativeLooping={false}
                                    speed={1}
                                    style={styles.messageAvatar}
                                    resizeMode="contain"
                                    onAnimationFailure={(error) => {
                                        logger.warn('Lottie avatar animation failed', 'CHAT_MESSAGE', error);
                                    }}
                                />
                            ) : (
                                <OptimizedImage
                                    source={{ uri: item.avatar_url }}
                                    style={styles.messageAvatar}
                                    resizeMode="contain"
                                />
                            )}


                            {/* Level Star Overlay - Inside Container for correct positioning */}
                            {(item.level ?? 0) > 0 && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: scaleSize(-4),
                                        right: scaleSize(-4),
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Image
                                        source={require('../../../assets/home/star.png')}
                                        style={{
                                            width: scaleSize(18),
                                            height: scaleSize(18),
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
                                                marginTop: Platform.OS === 'ios' ? 1 : 0,
                                            }}
                                        >
                                            {item.level}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : item.profile_pic && typeof item.profile_pic === 'string' && item.profile_pic.trim().length > 0 && item.profile_pic !== 'null' ? (
                        /* Fallback to profile_pic if avatar_url doesn't exist */
                        <View style={styles.messageProfileContainer}>
                            <OptimizedImage
                                source={{ uri: item.profile_pic }}
                                style={styles.messageProfilePic}
                                resizeMode="cover"
                            />
                            {/* Level Star Overlay - Inside Container for correct positioning */}
                            {(item.level ?? 0) > 0 && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: scaleSize(-4),
                                        right: scaleSize(-4),
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Image
                                        source={require('../../../assets/home/star.png')}
                                        style={{
                                            width: scaleSize(18),
                                            height: scaleSize(18),
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
                                                marginTop: Platform.OS === 'ios' ? 1 : 0,
                                            }}
                                        >
                                            {item.level}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : null}


                    <View style={styles.messageSenderTextContainer}>
                        <View style={styles.messageSenderNameRow}>
                            <Text style={styles.senderName}>{item.sender}</Text>





                            {/* Badge - beside username */}
                            {item.badge?.image_url && typeof item.badge.image_url === 'string' && item.badge.image_url.trim().length > 0 && item.badge.image_url !== 'null' && (
                                <OptimizedImage
                                    source={{ uri: item.badge.image_url }}
                                    style={styles.messageBadge}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Message bubble with level overlay */}
            <View style={{ position: 'relative' }}>
                <SoundTouchableOpacity
                    style={[
                        isEncrypted ? styles.encryptedBubble : styles.messageBubble,
                        !isEncrypted && (item.isUser ? styles.userBubble : styles.otherBubble)
                    ]}
                    onLongPress={handleLongPress}
                    activeOpacity={0.9}
                    delayLongPress={500}
                >
                    {/* Show sender name in group chats ONLY if profile/avatar is missing, as fallback */}
                    {!item.isUser && isGroupChat && !isEncrypted && !item.profile_pic && !item.avatar_url && (
                        <Text style={styles.senderName}>{item.sender}</Text>
                    )}

                    {/* Reply preview - WhatsApp style */}
                    {item.reply_to && (
                        <View style={[
                            styles.replyPreview,
                            item.isUser ? styles.replyPreviewUser : styles.replyPreviewOther
                        ]}>
                            <View style={styles.replyPreviewBubbleContent}>
                                <Text style={[
                                    styles.replyPreviewBubbleSender,
                                    item.isUser ? styles.replyPreviewSenderUser : styles.replyPreviewSenderOther
                                ]}>
                                    {item.reply_to.sender}
                                </Text>
                                <Text style={styles.replyPreviewBubbleMessage} numberOfLines={2}>
                                    {item.reply_to.message}
                                </Text>
                            </View>
                        </View>
                    )}

                    {item.text ? (
                        <View style={[
                            styles.messageContentContainer,
                            isEncrypted && styles.encryptedTextContainer
                        ]}>
                            <Text style={[
                                styles.messageText,
                                isEncrypted ? styles.encryptedMessageText : (item.isUser ? styles.userMessageText : styles.otherMessageText)
                            ]}>
                                {encryptedText}
                            </Text>

                            {/* Tick marks BESIDE text inside bubble (WhatsApp style) - only for user messages in private chat */}
                            {item.isUser && isPrivateChat && !isEncrypted && (
                                <View style={styles.statusIconContainer}>
                                    {item.status === 'read' ? (
                                        <Icon name="check-all" size={14} color="#4FC3F7" />
                                    ) : item.status === 'delivered' ? (
                                        <Icon name="check-all" size={14} color="rgba(255, 255, 255, 0.7)" />
                                    ) : (
                                        <Icon name="check" size={14} color="rgba(255, 255, 255, 0.7)" />
                                    )}
                                </View>
                            )}

                            {isEncrypted && (
                                <View style={styles.encryptionIndicator}>
                                    <Icon name="lock" size={12} color="rgba(255, 255, 255, 0.7)" />
                                </View>
                            )}
                        </View>
                    ) : null}

                    {item.image && typeof item.image === 'string' && item.image.trim().length > 0 && item.image !== 'null' ? (
                        <SoundTouchableOpacity
                            onPress={() => {
                                dispatch(setSelectedImage(item.image!));
                                dispatch(setShowImagePreview(true));
                            }}
                            style={styles.messageImageContainer}
                        >
                            <OptimizedImage source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
                        </SoundTouchableOpacity>
                    ) : null}
                </SoundTouchableOpacity>

                {/* Level display for user's own messages - matching global chat style */}
                {item.isUser && !isEncrypted && (item.level ?? 0) > 0 && (
                    <View
                        style={{
                            position: 'absolute',
                            top: scaleSize(-4),
                            right: scaleSize(-4),
                            zIndex: 10,
                            pointerEvents: 'none',
                        }}
                    >
                        <Image
                            source={require('../../../assets/home/star.png')}
                            style={{
                                width: scaleSize(18),
                                height: scaleSize(18),
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
                                    marginTop: Platform.OS === 'ios' ? 1 : 0,
                                }}
                            >
                                {item.level}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Timestamp BELOW bubble */}
            <Text style={[styles.timestamp, item.isUser ? styles.userTimestamp : styles.otherTimestamp]}>
                {item.timestamp}
            </Text>
        </Animated.View>
    );
});

ChatMessageItem.displayName = 'ChatMessageItem';

export default ChatMessageItem;
