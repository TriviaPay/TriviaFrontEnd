import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Animated,
    ScrollView,
    Image,
    TextInput,
} from 'react-native';
import { useDispatch } from 'react-redux';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useDescope } from '@descope/react-native-sdk';
import Icon from 'react-native-vector-icons/Feather';

// Hooks
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import useKeyboardStatus from '../../../core/hooks/useKeyboardStatus';
import {
    usePlatformOptimization,
    useHapticFeedback,
    useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';

import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';

// Components
import GradientBackground from '../../../core/components/GradientBackground';
import OtpInput from '../../../components/OtpInput';
import PasswordPolicy from '../../../core/components/PasswordPolicy';

// Services
import { descopeAuthService } from '../../../services/descopeAuthService';
import { apiService } from '../../../services/apiService';
import { bindPassword } from '../../../store/authSlice';
import { fetchProfileSummary } from '../../../store/profileSlice';
import { logger } from '../../../lib/utils/logger';

// Theme
import { typography } from '../../../theme/typography';
import scaleSize from '../../../utils/scaleSize';

// Assets
const flirtingDogAnimation = require('../../../../assets/signup/Dog.json');
const submitButton = require('../../../../assets/signup/signIn.png'); // Reuse signin button style

const FORGOT_STEPS = {
    EMAIL_ENTRY: 'EMAIL_ENTRY',
    OTP_VERIFICATION: 'OTP_VERIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
};

const ForgotPasswordScreen = () => {
    const navigation = useNavigation<any>();
    const dispatch = useDispatch<any>();
    const descope = useDescope();

    // Platform-specific optimizations
    const { triggerHaptic } = useHapticFeedback();
    usePlatformOptimization();
    useAndroidBackButton(() => {
        handleBack();
        return true;
    });

    const {
        isSmallDevice,
        isTablet,
        scaleFont,
        scaleWidth,
        scaleHeight,
        getVerticalSpacing,
        getHorizontalSpacing,
    } = useStandardResponsive();
    const { keyboardShown } = useKeyboardStatus();
    const animationRef = useRef<LottieView>(null);
    const scrollViewRef = useRef<any>(null);

    // State
    const [step, setStep] = useState(FORGOT_STEPS.EMAIL_ENTRY);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    // Animation values
    const animationScale = useRef(new Animated.Value(1)).current;

    // Add keyboard listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Animation for keyboard show/hide
    useEffect(() => {
        if (animationRef.current) {
            animationRef.current.play();
        }

        Animated.timing(animationScale, {
            toValue: keyboardShown ? 0.6 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [keyboardShown, animationScale]);

    // Resend countdown timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendCountdown > 0) {
            interval = setInterval(() => {
                setResendCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCountdown]);

    const handleBack = () => {
        if (step === FORGOT_STEPS.OTP_VERIFICATION) {
            setStep(FORGOT_STEPS.EMAIL_ENTRY);
        } else if (step === FORGOT_STEPS.PASSWORD_RESET) {
            setStep(FORGOT_STEPS.OTP_VERIFICATION);
        } else {
            navigation.goBack();
        }
    };

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const handleSendOTP = async () => {
        if (!validateEmail(email)) {
            setErrors({ email: 'Please enter a valid email address' });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Check if user exists first using API
            const checkRes = await apiService.checkEmailAvailability(email);
            if (checkRes.success && checkRes.data?.available === true) {
                // available = true means user NOT found
                setErrors({ email: 'No account found with this email' });
                setLoading(false);
                return;
            }

            const result = await descopeAuthService.forgotPassword(email, descope);
            if (result.success) {
                setStep(FORGOT_STEPS.OTP_VERIFICATION);
                setResendCountdown(60);
                triggerHaptic('success');
            } else {
                setErrors({ email: result.error || 'Failed to send reset code' });
                triggerHaptic('error');
            }
        } catch (error) {
            setErrors({ email: 'An error occurred. Please try again.' });
            triggerHaptic('error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (code: string) => {
        if (code.length !== 6) return;

        setLoading(true);
        setErrors({});

        try {
            const result = await descopeAuthService.verifyOTP(email, code, descope);
            if (result.success) {
                // Try to fetch profile to get username/country etc for bindPassword
                try {
                    const profile = await dispatch(fetchProfileSummary({ forceFresh: true })).unwrap();
                    if (profile) {
                        setUserData(profile);
                    }
                } catch (profileError) {
                    logger.warn('Could not fetch profile for user during reset', 'AUTH', profileError);
                }

                setStep(FORGOT_STEPS.PASSWORD_RESET);
                triggerHaptic('success');
            } else {
                setErrors({ otp: result.error || 'Invalid verification code' });
                triggerHaptic('error');
            }
        } catch (error) {
            setErrors({ otp: 'An error occurred. Please try again.' });
            triggerHaptic('error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (password.length < 8) {
            setErrors({ password: 'Password must be at least 8 characters' });
            return;
        }
        if (password !== confirmPassword) {
            setErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }

        // Check for special character
        const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
        if (!hasSpecialChar) {
            setErrors({ password: 'Must contain at least one special character' });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Align with signup flow using bindPassword thunk
            const bindResult: any = await dispatch(
                bindPassword({
                    email,
                    password,
                    username: userData?.username || userData?.name || email.split('@')[0],
                    country: userData?.country || 'Unknown',
                    date_of_birth: userData?.date_of_birth || userData?.dateOfBirth || '2000-01-01',
                })
            );

            if (bindPassword.fulfilled.match(bindResult)) {
                // Success leads to automatic navigation via AppNavigator
                triggerHaptic('success');
            } else {
                setErrors({ form: bindResult.payload || 'Failed to reset password' });
                triggerHaptic('error');
            }
        } catch (error) {
            setErrors({ form: 'An error occurred. Please try again.' });
            triggerHaptic('error');
        } finally {
            setLoading(false);
        }
    };

    const renderEmailEntry = () => (
        <View>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    borderRadius: scaleSize(12),
                    paddingHorizontal: getHorizontalSpacing(2),
                    paddingVertical: getVerticalSpacing(1),
                    marginBottom: errors.email ? getVerticalSpacing(0.5) : 0,
                }}
            >
                <Icon
                    name="mail"
                    size={scaleSize(20)}
                    color="#FF6B35"
                    style={{ marginRight: getHorizontalSpacing(1) }}
                />
                <TextInput
                    style={{
                        flex: 1,
                        color: '#000',
                        fontSize: scaleFont(16),
                        paddingVertical: getVerticalSpacing(0.5),
                    }}
                    value={email}
                    onChangeText={text => {
                        setEmail(text);
                        if (errors.email) setErrors({});
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor="#FF6B35"
                />
            </View>
            {errors.email && (
                <Text style={{ color: '#FF6B6B', fontSize: scaleFont(12), marginTop: 4 }}>
                    {errors.email}
                </Text>
            )}

            <TouchableOpacity
                onPress={handleSendOTP}
                disabled={loading || !email}
                style={{ marginTop: getVerticalSpacing(2), alignItems: 'center' }}
            >
                <Image
                    source={submitButton}
                    style={{
                        width: '100%',
                        height: scaleHeight(50),
                        opacity: loading || !email ? 0.6 : 1,
                    }}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );

    const renderOTPVerification = () => (
        <View>
            <Text style={[typography.body, { color: 'white', textAlign: 'center', marginBottom: 20 }]}>
                Enter the 6-digit code sent to {email}
            </Text>
            <OtpInput
                onComplete={handleVerifyOTP}
                error={errors.otp || ''}
                disabled={loading}
            />
            {errors.otp && (
                <Text style={{ color: '#FF6B6B', fontSize: scaleFont(12), textAlign: 'center', marginTop: 10 }}>
                    {errors.otp}
                </Text>
            )}

            <TouchableOpacity
                onPress={() => resendCountdown === 0 && handleSendOTP()}
                disabled={resendCountdown > 0 || loading}
                style={{ marginTop: 20, alignItems: 'center' }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderPasswordReset = () => (
        <View>
            {/* New Password */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    borderRadius: scaleSize(12),
                    paddingHorizontal: getHorizontalSpacing(2),
                    paddingVertical: getVerticalSpacing(0.75),
                    marginBottom: getVerticalSpacing(2),
                }}
            >
                <Icon
                    name="lock"
                    size={scaleSize(20)}
                    color="#FF6B35"
                    style={{ marginRight: getHorizontalSpacing(1) }}
                />
                <TextInput
                    style={{
                        flex: 1,
                        color: '#000',
                        fontSize: scaleFont(16),
                        paddingVertical: getVerticalSpacing(0.5),
                    }}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="New Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    selectionColor="#FF6B35"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={scaleSize(20)} color="#FF6B35" />
                </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    borderRadius: scaleSize(12),
                    paddingHorizontal: getHorizontalSpacing(2),
                    paddingVertical: getVerticalSpacing(0.75),
                    marginBottom: getVerticalSpacing(2),
                }}
            >
                <Icon
                    name="check-circle"
                    size={scaleSize(20)}
                    color="#FF6B35"
                    style={{ marginRight: getHorizontalSpacing(1) }}
                />
                <TextInput
                    style={{
                        flex: 1,
                        color: '#000',
                        fontSize: scaleFont(16),
                        paddingVertical: getVerticalSpacing(0.5),
                    }}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    selectionColor="#FF6B35"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={scaleSize(20)} color="#FF6B35" />
                </TouchableOpacity>
            </View>

            <PasswordPolicy password={password} />

            {errors.password || errors.confirmPassword || errors.form ? (
                <Text style={{ color: '#FF6B6B', fontSize: scaleFont(12), marginBottom: 10 }}>
                    {errors.password || errors.confirmPassword || errors.form}
                </Text>
            ) : null}

            <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading || !password || !confirmPassword}
                style={{ marginTop: getVerticalSpacing(2), alignItems: 'center' }}
            >
                <Image
                    source={submitButton}
                    style={{
                        width: '100%',
                        height: scaleHeight(50),
                        opacity: loading || !password || !confirmPassword ? 0.6 : 1,
                    }}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );

    return (
        <GradientBackground>
            <SafeScreenWrapper
                statusBarStyle="light-content"
                backgroundColor="transparent"
                translucent={true}
                edges={['top', 'bottom', 'left', 'right']}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={{ flex: 1, paddingHorizontal: getHorizontalSpacing(2) }}>
                        {/* Header */}
                        <View style={{ marginTop: getVerticalSpacing(1) + 40, alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={handleBack}
                                style={{ position: 'absolute', left: 0, top: 0 }}
                            >
                                <Icon name="arrow-left" size={scaleSize(24)} color="white" />
                            </TouchableOpacity>
                            <Text
                                style={[
                                    typography.h2,
                                    {
                                        color: 'white',
                                        fontSize: keyboardVisible
                                            ? scaleFont(isTablet ? 24 : isSmallDevice ? 18 : 20)
                                            : scaleFont(isTablet ? 32 : isSmallDevice ? 24 : 28),
                                    },
                                ]}
                            >
                                Forgot Password
                            </Text>
                            {!keyboardVisible && (
                                <Text
                                    style={[
                                        typography.body,
                                        {
                                            color: 'white',
                                            marginTop: getVerticalSpacing(0.5),
                                            fontSize: scaleFont(isTablet ? 18 : isSmallDevice ? 14 : 16),
                                        },
                                    ]}
                                >
                                    {step === FORGOT_STEPS.EMAIL_ENTRY
                                        ? 'Reset your password via email'
                                        : step === FORGOT_STEPS.OTP_VERIFICATION
                                            ? 'Verify your identity'
                                            : 'Set your new password'}
                                </Text>
                            )}
                        </View>

                        {/* Animation */}
                        <Animated.View
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginVertical: keyboardVisible ? getVerticalSpacing(0.5) : getVerticalSpacing(1.5),
                                transform: [{ scale: animationScale }],
                                height: keyboardVisible
                                    ? scaleHeight(isTablet ? 120 : isSmallDevice ? 80 : 100)
                                    : scaleHeight(isTablet ? 300 : isSmallDevice ? 200 : 250),
                            }}
                        >
                            <LottieView
                                ref={animationRef}
                                source={flirtingDogAnimation}
                                style={{
                                    width: keyboardVisible
                                        ? scaleWidth(isTablet ? 120 : isSmallDevice ? 80 : 100)
                                        : scaleWidth(isTablet ? 300 : isSmallDevice ? 200 : 250),
                                    height: keyboardVisible
                                        ? scaleHeight(isTablet ? 120 : isSmallDevice ? 80 : 100)
                                        : scaleHeight(isTablet ? 300 : isSmallDevice ? 200 : 250),
                                }}
                                autoPlay
                                loop
                                resizeMode="contain"
                            />
                        </Animated.View>

                        <ScrollView
                            ref={scrollViewRef}
                            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {step === FORGOT_STEPS.EMAIL_ENTRY && renderEmailEntry()}
                            {step === FORGOT_STEPS.OTP_VERIFICATION && renderOTPVerification()}
                            {step === FORGOT_STEPS.PASSWORD_RESET && renderPasswordReset()}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </SafeScreenWrapper>
        </GradientBackground>
    );
};

export default ForgotPasswordScreen;
