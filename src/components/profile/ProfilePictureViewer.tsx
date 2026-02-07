/**
 * ProfilePictureViewer Component
 * Full screen profile picture viewer (WhatsApp style)
 */

import React from 'react';
import { View, Modal, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';

const { width } = Dimensions.get('window');

interface ProfilePictureViewerProps {
    visible: boolean;
    onClose: () => void;
    imageUrl: string;
    isLottie?: boolean;
}

const ProfilePictureViewer: React.FC<ProfilePictureViewerProps> = ({
    visible,
    onClose,
    imageUrl,
    isLottie = false,
}) => {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <Pressable style={styles.overlay} onPress={onClose} />

                <View style={styles.header}>
                    <SoundTouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={scaleSize(30)} color="white" />
                    </SoundTouchableOpacity>
                </View>

                <View style={styles.imageContainer}>
                    {isLottie ? (
                        <LottieView
                            source={{ uri: imageUrl }}
                            autoPlay
                            loop
                            style={styles.fullImage}
                            resizeMode="contain"
                            renderMode="SOFTWARE"
                        />
                    ) : (
                        <FastImage
                            source={{ uri: imageUrl }}
                            style={styles.fullImage}
                            resizeMode={FastImage.resizeMode.contain}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // Semi-transparent black
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? scaleSize(60) : scaleSize(40),
        right: scaleSize(20),
        zIndex: 10,
    },
    closeButton: {
        padding: scaleSize(10),
    },
    imageContainer: {
        width: width * 0.9,
        height: width * 0.9,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: scaleSize(20),
        padding: scaleSize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});

export default ProfilePictureViewer;
