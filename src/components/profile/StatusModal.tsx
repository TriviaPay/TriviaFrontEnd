/**
 * StatusModal Component
 * Custom replacement for standard Alert popups
 */

import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';

interface StatusModalProps {
    visible: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    title: string;
    message: string;
}

const StatusModal: React.FC<StatusModalProps> = ({ visible, onClose, type, title, message }) => {
    const isSuccess = type === 'success';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content} onPress={e => e.stopPropagation()}>
                    <View style={[styles.iconContainer, isSuccess ? styles.successBg : styles.errorBg]}>
                        <Icon
                            name={isSuccess ? 'check-circle' : 'alert-circle'}
                            size={scaleSize(60)}
                            color={isSuccess ? '#10B981' : '#EF4444'}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <SoundTouchableOpacity
                        onPress={onClose}
                        style={[styles.button, isSuccess ? styles.successButton : styles.errorButton]}
                    >
                        <Text style={styles.buttonText}>OK</Text>
                    </SoundTouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: 'white',
        borderRadius: scaleSize(20),
        padding: scaleSize(30),
        width: '85%',
        maxWidth: scaleSize(340),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    iconContainer: {
        width: scaleSize(100),
        height: scaleSize(100),
        borderRadius: scaleSize(50),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleSize(24),
    },
    successBg: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    errorBg: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    title: {
        fontSize: scaleSize(22),
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: scaleSize(12),
        textAlign: 'center',
    },
    message: {
        fontSize: scaleSize(16),
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: scaleSize(24),
        lineHeight: scaleSize(22),
    },
    button: {
        width: '100%',
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(12),
        alignItems: 'center',
    },
    successButton: {
        backgroundColor: '#10B981',
    },
    errorButton: {
        backgroundColor: '#EF4444',
    },
    buttonText: {
        color: 'white',
        fontSize: scaleSize(16),
        fontWeight: 'bold',
    },
});

export default StatusModal;
