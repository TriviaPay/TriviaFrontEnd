import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
} from 'react-native';
import { LogBox } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
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

// Services
import { authService } from '../../../services/authService';
import { apiService } from '../../../services/apiService';
import { DESCOPE_ERRORS } from '../../../config/descope';
import { API_CONFIG } from '../../../config/api';
import { logger } from '../../../lib/utils/logger';
import { prefetchCriticalData } from '../../../services/prefetchService';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPassword } from '../../../store/authSlice';
import { RootState } from '../../../store/store';
import { showGlobalLoader, hideGlobalLoader } from '../../../store/slices/appSlice';
import GlobalLoader from '../../../components/GlobalLoader';

// Theme
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { responsiveScale } from '../../../theme/responsive';

// Assets
const flirtingDogAnimation = require('../../../../assets/signup/Dog.json');
const signInButton = require('../../../../assets/signup/signIn.png');

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const screenHeight = Dimensions.get('window').height;

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();
  useAndroidBackButton(() => {
    // Allow default navigation back behavior
    return false;
  });

  const {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    getFullWidthSpacing,
    deviceType,
    width,
    height,
  } = useStandardResponsive();
  const { keyboardShown, keyboardHeight } = useKeyboardStatus();
  const descope = useDescope();
  const animationRef = useRef<LottieView>(null);
  const scrollViewRef = useRef<any>(null);

  // State
  const [email, setEmail] = useState(route.params?.email || '');
  const [prevEmail, setPrevEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);

  // Debug: Log keyboard visibility changes
  useEffect(() => {
    // Keyboard visibility tracking
  }, [keyboardVisible]);

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

  // Track emailAvailable state changes
  useEffect(() => { }, [emailAvailable]);

  // Validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Check email for login
  const checkEmailForLogin = async (emailToCheck: string) => {
    if (!validateEmail(emailToCheck)) {
      setEmailAvailable(null);
      return;
    }

    try {
      setEmailChecking(true);

      const response = await apiService.checkEmailAvailability(emailToCheck);

      if (response.success) {
        const available = response.data?.available ?? null;

        setEmailAvailable(available);
      } else {
        setEmailAvailable(null);
      }
    } catch (error) {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // Handle login - Professional implementation using Redux thunk
  const handleLogin = async () => {
    if (!password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLocalLoading(true);
    setErrors({});

    try {
      // Use Redux thunk which properly handles token storage and refresh timer initialization
      dispatch(showGlobalLoader({ message: '', operation: 'login' }));

      // Pass Descope instance to the thunk so authService can use it
      const result = await dispatch(
        loginWithPassword({
          identifier: email,
          password,
          descopeInstance: descope,
        }) as any
      );

      if (result.type === 'auth/loginWithPassword/fulfilled') {
        // Trigger aggressive prefetch immediately after login
        // WAIT for data to be ready before navigating (Zero Loading requirement)
        try {
          // Race against a timeout (2s) to prevent hanging the login screen
          const prefetchPromise = prefetchCriticalData();
          await Promise.race([prefetchPromise, new Promise(resolve => setTimeout(resolve, 2000))]);
          logger.debug('Post-login prefetch completed', 'AUTH');
        } catch (err) {
          logger.warn('Post-login prefetch failed (non-critical)', 'AUTH', err);
        }

        // Log token only once for development - token received confirmation
        logger.debug(`Token received: ${!!result.payload?.token}`, 'AUTH_TOKEN');

        // Log token information using production logger
        if (result.payload?.token) {
          logger.debug('🔑 [LoginScreen] Access Token received', 'AUTH_TOKEN');
          logger.debug(
            '🔑 [LoginScreen] Access Token Length:',
            'AUTH_TOKEN',
            result.payload.token.length
          );
        }

        if (result.payload?.refreshToken) {
          logger.debug('🔑 [LoginScreen] Refresh Token received', 'AUTH_TOKEN');
        }

        // Redux thunk handles all token storage and refresh timer initialization
        // Navigation will be handled by the auth state change
        logger.debug('Login completed - tokens stored and refresh timer started', 'AUTH_TOKEN');
      } else {
        // Extract error message from result
        let errorMessage = 'Login failed. Please try again.';

        if (result.error) {
          errorMessage = result.error.message || result.error;
        } else if (result.payload?.error) {
          errorMessage = result.payload.error;
        }

        setErrors({ form: String(errorMessage) });
      }
    } catch (error) {
      // Extract error message
      let errorMessage = 'Login failed. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setErrors({ form: String(errorMessage) });
    } finally {
      setLocalLoading(false);
      dispatch(hideGlobalLoader('login'));
    }
  };

  // Navigate to signup screen
  const goToSignup = () => {
    (navigation as any).navigate('Signup', { email });
  };

  // Test API endpoint directly
  const testEmailAPI = async () => {
    try {
      const testEmail = 'test@example.com';
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/email-available?email=${encodeURIComponent(testEmail)}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
      } else {
        const errorText = await response.text();
      }
    } catch (error) { }
  };



  return (
    <GradientBackground>
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
        edges={['top', 'left', 'right']}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              paddingBottom: 0,
            }}
          >
            <View
              style={{
                flex: 1,
                paddingHorizontal: getHorizontalSpacing(2),
                justifyContent: 'space-between',
              }}
            >
              {/* Responsive Header - Always visible but compact when keyboard is open */}
              <View
                style={{
                  alignItems: 'center',
                  marginTop: getVerticalSpacing(1) + 40,
                  marginBottom: keyboardVisible ? getVerticalSpacing(0.5) : getVerticalSpacing(1.5),
                }}
              >
                <Text
                  style={[
                    typography.h2,
                    {
                      color: 'white',
                      textAlign: 'center',
                      fontSize: keyboardVisible
                        ? scaleFont(isTablet ? 24 : isSmallDevice ? 18 : 20)
                        : scaleFont(isTablet ? 32 : isSmallDevice ? 24 : 28),
                    },
                  ]}
                  allowFontScaling={true}
                >
                  Welcome Back
                </Text>
                {!keyboardVisible && (
                  <Text
                    style={[
                      typography.body,
                      {
                        color: 'white',
                        textAlign: 'center',
                        marginTop: getVerticalSpacing(0.5),
                        fontSize: scaleFont(isTablet ? 18 : isSmallDevice ? 14 : 16),
                      },
                    ]}
                    allowFontScaling={true}
                  >
                    Sign in to your account
                  </Text>
                )}
              </View>

              {/* Lottie Animation - Always visible but smaller when keyboard is open */}
              <Animated.View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: keyboardVisible ? getVerticalSpacing(0.5) : getVerticalSpacing(1.5),
                  transform: [{ scale: animationScale }],
                  opacity: keyboardShown ? 0.7 : 1,
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

              {/* Form Fields Container - Only this area scrolls */}
              <View style={{ flex: 1, minHeight: 0 }}>
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={{
                    paddingBottom: keyboardVisible ? getVerticalSpacing(2) : getVerticalSpacing(2),
                    paddingTop: 0,
                    flexGrow: 1,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  decelerationRate="normal"
                  scrollEventThrottle={16}
                  removeClippedSubviews={false}
                  alwaysBounceVertical={false}
                  keyboardDismissMode="none"
                  style={{
                    flex: 1,
                  }}
                  scrollEnabled={keyboardVisible}
                >
                  {/* Email Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
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
                        name="user"
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
                          // Auto-append gmail.com only if user just typed @ (not deleting)
                          let finalText = text;
                          const wasTyping =
                            text.length > prevEmail.length ||
                            (text.length === prevEmail.length && text !== prevEmail);
                          const justTypedAt = text.endsWith('@') && !prevEmail.endsWith('@');

                          if (wasTyping && justTypedAt) {
                            // User just typed @, auto-append gmail.com
                            finalText = text + 'gmail.com';
                          }

                          setPrevEmail(finalText);
                          setEmail(finalText);

                          // Only clear emailAvailable if email format is invalid
                          if (!finalText || !validateEmail(finalText)) {
                            setEmailAvailable(null);
                          }

                          if (errors.email) {
                            setErrors(prev => ({ ...prev, email: '' }));
                          }

                          // Clear previous timeout
                          if (emailCheckTimeout) {
                            clearTimeout(emailCheckTimeout);
                            setEmailCheckTimeout(null);
                          }

                          // Debounced email availability check
                          if (finalText && validateEmail(finalText)) {
                            const timeout = setTimeout(async () => {
                              await checkEmailForLogin(finalText);
                            }, 500);
                            setEmailCheckTimeout(timeout);
                          } else {
                            setEmailAvailable(null);
                          }
                        }}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                        selectionColor="#FF6B35"
                        cursorColor="#FF6B35"
                      />
                    </View>
                    {errors.email && (
                      <Text
                        style={{
                          color: '#FF6B6B',
                          fontSize: scaleFont(12),
                          marginTop: getVerticalSpacing(0.5),
                          marginLeft: getHorizontalSpacing(0.5),
                        }}
                      >
                        {errors.email}
                      </Text>
                    )}

                    {/* Email availability status */}
                    {email && validateEmail(email) && emailAvailable !== null && (
                      <View
                        style={{
                          marginTop: getVerticalSpacing(0.5),
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        {emailAvailable === false ? (
                          <Text
                            style={[
                              typography.caption,
                              {
                                color: 'white',
                                fontSize: scaleFont(12),
                                fontWeight: '600',
                              },
                            ]}
                            allowFontScaling={true}
                          >
                            ✓ Account exists - you can login
                          </Text>
                        ) : emailAvailable === true ? (
                          <Text
                            style={[
                              typography.caption,
                              {
                                color: 'white',
                                fontSize: scaleFont(12),
                                fontWeight: '600',
                              },
                            ]}
                            allowFontScaling={true}
                          >
                            ✗ Account not found - please sign up
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* Password Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: scaleSize(12),
                        paddingHorizontal: getHorizontalSpacing(2),
                        paddingVertical: getVerticalSpacing(1),
                        marginBottom: errors.password ? getVerticalSpacing(0.5) : 0,
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
                        onChangeText={text => {
                          setPassword(text);
                          if (errors.password) {
                            setErrors(prev => ({ ...prev, password: '' }));
                          }
                        }}
                        placeholder="Password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        selectionColor="#FF6B35"
                        cursorColor="#FF6B35"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={{ padding: getHorizontalSpacing(0.5) }}
                      >
                        <Icon
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={scaleSize(20)}
                          color="#FF6B35"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text
                        style={{
                          color: '#FF6B6B',
                          fontSize: scaleFont(12),
                          marginTop: getVerticalSpacing(0.5),
                          marginLeft: getHorizontalSpacing(0.5),
                        }}
                      >
                        {errors.password}
                      </Text>
                    )}
                  </View>

                  {/* Forgot Password */}
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('ForgotPassword');
                    }}
                    style={{
                      alignItems: 'center',
                      marginTop: getVerticalSpacing(1),
                      marginBottom: getVerticalSpacing(1),
                    }}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        {
                          color: 'white',
                          fontSize: scaleFont(14),
                          textAlign: 'center',
                        },
                      ]}
                      allowFontScaling={true}
                    >
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  {/* General Error Display */}
                  {errors.form && (
                    <View
                      style={{
                        backgroundColor: '#fef2f2',
                        padding: getSpacing(1.5),
                        borderRadius: scaleSize(8),
                        marginTop: getVerticalSpacing(2),
                        borderWidth: 1,
                        borderColor: '#fecaca',
                      }}
                    >
                      <Text
                        style={[
                          typography.bodySmall,
                          {
                            color: '#dc2626',
                            fontSize: scaleFont(14),
                            textAlign: 'center',
                            lineHeight: scaleFont(20),
                          },
                        ]}
                        allowFontScaling={true}
                      >
                        {typeof errors.form === 'string' ? errors.form : 'An error occurred'}
                      </Text>
                    </View>
                  )}

                  {/* Sign In Button - Show above keyboard when keyboard is open */}
                  {keyboardVisible && (
                    <>
                      <View
                        style={{
                          paddingTop: getVerticalSpacing(0.5),
                          paddingBottom: 0,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            handleLogin();
                          }}
                          disabled={!password.trim() || localLoading || isLoading || !email.trim()}
                          style={{
                            width: '100%',
                            alignItems: 'center',
                          }}
                        >
                          <Image
                            source={signInButton}
                            style={{
                              width: '100%',
                              height: scaleHeight(50),
                              maxHeight: scaleHeight(60),
                            }}
                            resizeMode="contain"
                            pointerEvents="none"
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Sign Up Link - Show below button when keyboard is open */}
                      <View
                        style={{
                          alignItems: 'center',
                          paddingHorizontal: getHorizontalSpacing(2),
                          marginTop: getVerticalSpacing(0.5),
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={[
                              typography.bodySmall,
                              {
                                color: 'white',
                                fontSize: scaleFont(isSmallDevice ? 12 : 14),
                                textAlign: 'center',
                              },
                            ]}
                            allowFontScaling={true}
                          >
                            Don't have an account?{' '}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              goToSignup();
                            }}
                          >
                            <Text
                              style={[
                                typography.bodySmall,
                                {
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: scaleFont(isSmallDevice ? 12 : 14),
                                },
                              ]}
                              allowFontScaling={true}
                            >
                              Sign Up
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>

              {/* Footer - Show button at bottom when keyboard is closed */}
              {!keyboardVisible && (
                <View
                  style={{
                    paddingBottom: Math.max(insets.bottom, getVerticalSpacing(1)),
                    paddingTop: getVerticalSpacing(1),
                    backgroundColor: 'transparent',
                    width: '100%',
                  }}
                  onLayout={e => setFooterHeight(e.nativeEvent.layout.height)}
                >
                  {/* Sign In Button */}
                  <View
                    style={{
                      marginBottom: getVerticalSpacing(1.5),
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        handleLogin();
                      }}
                      disabled={!password.trim() || localLoading || isLoading || !email.trim()}
                      style={{
                        width: '100%',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={signInButton}
                        style={{
                          width: '100%',
                          height: scaleHeight(50),
                          maxHeight: scaleHeight(60),
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Sign Up Link - Always visible at bottom */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: getVerticalSpacing(1),
                      marginBottom: 0,
                      minHeight: scaleSize(24),
                      width: '100%',
                    }}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        {
                          color: 'white',
                          fontSize: scaleFont(14),
                        },
                      ]}
                      allowFontScaling={true}
                    >
                      Don't have an account?
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        goToSignup();
                      }}
                      style={{ marginLeft: getHorizontalSpacing(0.5) }}
                    >
                      <Text
                        style={[
                          typography.bodySmall,
                          {
                            color: 'white',
                            fontWeight: '700',
                            fontSize: scaleFont(14),
                          },
                        ]}
                        allowFontScaling={true}
                      >
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
        {(isLoading || localLoading) && <GlobalLoader forceShow={true} />}
      </SafeScreenWrapper>
    </GradientBackground>
  );
};

export default LoginScreen;
