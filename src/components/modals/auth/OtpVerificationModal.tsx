import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import OtpInput from '../../OtpInput';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { typography } from '../../../theme/typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface OtpVerificationModalProps {
    visible: boolean;
    onClose: () => void;
    onComplete: (code: string) => void;
    onResend: () => void;
    email?: string;
    error?: string;
    resendCountdown?: number;
    isLoading?: boolean;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
    visible,
    onClose,
    onComplete,
    onResend,
    email,
    error,
    resendCountdown = 0,
    isLoading = false,
}) => {
    const {
        scaleFont,
        scaleSize,
        getVerticalSpacing,
        getHorizontalSpacing,
    } = useStandardResponsive();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon name="close" size={scaleSize(24)} color="#666" />
                        </TouchableOpacity>

                        <View style={styles.content}>
                            <View style={styles.iconContainer}>
                                <Icon name="email-check-outline" size={scaleSize(48)} color="#FF6B35" />
                            </View>

                            <Text style={[typography.h2, styles.title, { fontSize: scaleFont(22) }]}>
                                Verify Your Email
                            </Text>

                            <Text style={[typography.body, styles.subtitle, { fontSize: scaleFont(14) }]}>
                                We've sent a 6-digit verification code to
                            </Text>

                            <Text style={[typography.bodyBold, styles.emailText, { fontSize: scaleFont(15) }]}>
                                {email}
                            </Text>

                            <View style={styles.otpWrapper}>
                                <OtpInput
                                    length={6}
                                    onComplete={onComplete}
                                    onResend={onResend}
                                    error={error}
                                    disabled={isLoading}
                                    resendCountdown={resendCountdown}
                                    variant="profile"
                                    style={styles.otpInput}
                                />
                            </View>

                            {isLoading && (
                                <Text style={styles.loadingText}>Verifying code...</Text>
                            )}
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,107,53,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 4,
    },
    emailText: {
        color: '#374151',
        textAlign: 'center',
        marginBottom: 20,
    },
    otpWrapper: {
        width: '100%',
        marginBottom: 8,
    },
    otpInput: {
        paddingVertical: 0,
    },
    loadingText: {
        marginTop: 8,
        color: '#FF6B35',
        fontWeight: '600',
    },
});

export default OtpVerificationModal;
