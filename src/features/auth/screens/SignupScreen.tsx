import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Descope SDK
import { useDescope } from '@descope/react-native-sdk';

// Debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Keyboard,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import type { RootNavigationProp } from '../../navigation/types';
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
import PasswordPolicy from '../../../core/components/PasswordPolicy';
import UsernameRequirements from '../../../core/components/UsernameRequirements';
import CountryPicker from '../../../core/components/CountryPicker';
import DatePicker from '../../../core/components/DatePicker';
import OtpInput from '../../../components/OtpInput';
import ExistingUserPopup from '../../../core/components/ExistingUserPopup';

// Services
import { descopeAuthService } from '../../../services/descopeAuthService';
import { keychainStorage } from '../../../services/keychainStorage';
import { apiService } from '../../../services/apiService';
import { logger } from '../../../lib/utils/logger';
import { prefetchCriticalData } from '../../../services/prefetchService';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import {
  verifyOTP,
  checkUsernameAvailability,
  bindPassword,
  setUser,
  setToken,
} from '../../../store/authSlice';
import { RootState } from '../../../store/store';
import { showGlobalLoader, hideGlobalLoader } from '../../../store/slices/appSlice';
import GlobalLoader from '../../../components/GlobalLoader';

// Theme
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { responsiveScale } from '../../../theme/responsive';

// Assets
const flirtingDogAnimation = require('../../../../assets/signup/FlirtingDog.json');
const createAccountButton = require('../../../../assets/signup/createAccount.png');

// Real Authentication Services - No more mocks!

const bindPasswordAndUsername = async (
  dispatch: any,
  email: string,
  password: string,
  username: string,
  sessionToken: string,
  country: string,
  dateOfBirth: string,
  descope: any
) => {
  try {
    logger.debug('🔐 Starting bindPasswordAndUsername with data:', {
      email,
      username,
      country,
      dateOfBirth,
      sessionToken: sessionToken ? 'present' : 'missing',
    });

    // Use real Descope service to bind password
    const result = await descopeAuthService.bindPassword(
      email,
      password,
      username,
      descope,
      country,
      dateOfBirth
    );

    if (result.success) {
      return {
        success: true,
        message: 'Account created successfully',
        user: result.user,
      };
    } else {
      return {
        success: false,
        message: result.error || 'Failed to create account',
        error: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create account',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Helper to evaluate password policy
const meetsPasswordPolicy = (pwd: string): boolean => {
  return (
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^a-zA-Z0-9]/.test(pwd) &&
    pwd.length >= 8
  );
};

// Mock Auth Steps
const AUTH_STEPS = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  OTP_VERIFICATION: 'OTP_VERIFICATION',
  PASSWORD_SETUP: 'PASSWORD_SETUP',
  COMPLETED: 'COMPLETED',
};

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();
  useAndroidBackButton(() => {
    // Allow default navigation back behavior
    return false;
  });

  // Descope SDK
  const descope = useDescope();

  // Wait for descope to be ready
  const [descopeReady, setDescopeReady] = useState(false);

  useEffect(() => {
    if (descope) {
      setDescopeReady(true);
    } else {
      setDescopeReady(false);
    }
  }, [descope]);
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

  // Redux
  const dispatch = useDispatch();
  const {
    isLoading: authLoading,
    error: authError,
    token: sessionJwt,
  } = useSelector((state: any) => state.auth);
  const animationRef = useRef<LottieView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [authStep, setAuthStep] = useState(AUTH_STEPS.EMAIL_VERIFICATION);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const clearError = () => {
    // Clear local errors
    setErrors({});
  };
  const resetFlow = () => {
    setAuthStep(AUTH_STEPS.EMAIL_VERIFICATION);
    setVerifiedEmail(null);
    setErrors({});
    setIsVerifyingOtp(false);
  };

  // Form state
  const [email, setEmail] = useState(route.params?.email || '');
  const [prevEmail, setPrevEmail] = useState(route.params?.email || '');
  const [emailVerified, setEmailVerified] = useState(route.params?.emailVerified || false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralCodeChecking, setReferralCodeChecking] = useState(false);
  const [showInvalidReferralPopup, setShowInvalidReferralPopup] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [showExistingUserPopup, setShowExistingUserPopup] = useState(false);
  const [existingUserIdentifier, setExistingUserIdentifier] = useState('');
  const [existingUserType, setExistingUserType] = useState<'email' | 'username'>('email');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Debug: Log keyboard visibility changes
  useEffect(() => { }, [keyboardVisible]);

  // Auto-dismiss verification banner after a short delay
  useEffect(() => {
    if (verificationMessage) {
      const timer = setTimeout(() => {
        setVerificationMessage('');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [verificationMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [emailCheckTimeout, usernameCheckTimeout]);

  // Step visibility states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showUsernameField, setShowUsernameField] = useState(false);
  const [showCountryField, setShowCountryField] = useState(false);
  const [showDateOfBirthField, setShowDateOfBirthField] = useState(false);
  const [showNextPasswordButton, setShowNextPasswordButton] = useState(true);
  const [showNextUsernameButton, setShowNextUsernameButton] = useState(true);

  // Animation states
  const animationScale = useRef(new Animated.Value(1)).current;
  const fadeInVerified = useRef(new Animated.Value(0)).current;
  const slideInPassword = useRef(new Animated.Value(100)).current;
  const slideInConfirmPassword = useRef(new Animated.Value(100)).current;
  const slideInUsername = useRef(new Animated.Value(100)).current;
  const slideInCountry = useRef(new Animated.Value(100)).current;
  const slideInDateOfBirth = useRef(new Animated.Value(100)).current;

  // Password policy visibility - show only when typing and not satisfied
  const showPasswordPolicy = useMemo(() => {
    const shouldShow =
      (activeField === 'password' || activeField === 'confirmPassword') &&
      password.length > 0 &&
      !meetsPasswordPolicy(password);
    return shouldShow;
  }, [activeField, password]);

  // Username requirements visibility - show when typing username
  const showUsernameRequirements = useMemo(() => {
    return activeField === 'username' && username.length > 0;
  }, [activeField, username]);

  // Resend countdown timer
  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    if (resendCountdown > 0) {
      interval = setInterval(() => {
        // Only update if component is still mounted
        if (isMounted) {
          setResendCountdown(prev => {
            // Prevent going below 0
            if (prev <= 1) {
              if (interval) clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [resendCountdown]);

  // Handle authentication step changes
  useEffect(() => {
    switch (authStep) {
      case AUTH_STEPS.OTP_VERIFICATION:
        setShowOtpVerification(true);
        setEmailVerified(false);
        setResendCountdown(60); // Start 60 second countdown
        break;
      case AUTH_STEPS.PASSWORD_SETUP:
        setEmailVerified(true);
        setShowOtpVerification(false);
        setShowPasswordFields(true);
        // Animate verified icon
        Animated.timing(fadeInVerified, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        break;
      case AUTH_STEPS.COMPLETED:
        // Don't navigate here - let AppNavigator handle it based on Redux auth state

        break;
    }
  }, [authStep, navigation, fadeInVerified]);

  // Add keyboard listeners with improved handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardVisible(true);
      const keyboardHeight = event.endCoordinates.height;

      // Scroll to active field when keyboard shows with better positioning
      if (activeField && scrollViewRef.current) {
        setTimeout(() => {
          let yOffset = 0;
          const screenHeight = event.endCoordinates.screenY;
          const fieldHeight = 60; // Approximate field height
          const footerHeight = 120; // Approximate footer height

          // Calculate better scroll positions based on field position
          if (activeField === 'email') yOffset = 0;
          else if (activeField === 'otp') yOffset = 120;
          else if (activeField === 'password') yOffset = 200;
          else if (activeField === 'confirmPassword') yOffset = 280;
          else if (activeField === 'username') yOffset = 360;
          else if (activeField === 'country') yOffset = 440;
          else if (activeField === 'dateOfBirth') yOffset = 520;

          // Ensure the field is visible above the keyboard
          const maxScrollY = Math.max(0, yOffset - (screenHeight - keyboardHeight - footerHeight));
          scrollViewRef.current?.scrollTo({ y: maxScrollY, animated: true });
        }, 150);
      }
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [activeField]);

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

  // Scroll to active field when it changes
  useEffect(() => {
    if (activeField && scrollViewRef.current && keyboardVisible) {
      // Add a slight delay to ensure the field is rendered
      setTimeout(() => {
        // Find the Y position of the active field
        let yOffset = 0;

        if (activeField === 'email') yOffset = 0;
        else if (activeField === 'otp') yOffset = 100;
        else if (activeField === 'password') yOffset = 80;
        else if (activeField === 'confirmPassword') yOffset = 160;
        else if (activeField === 'username') yOffset = 240;
        else if (activeField === 'country') yOffset = 320;
        else if (activeField === 'dateOfBirth') yOffset = 400;

        scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
      }, 100);
    }
  }, [activeField, keyboardVisible]);

  // Scroll to OTP when verification appears
  useEffect(() => {
    if (showOtpVerification && scrollViewRef.current) {
      // Scroll to OTP input area - calculate approximate position
      setTimeout(() => {
        // Scroll to a position that shows the OTP input (around 200-250px from top)
        scrollViewRef.current?.scrollTo({ y: 200, animated: true });
      }, 100);
    }
  }, [showOtpVerification]);

  const verifyOTPCode = useCallback(
    async (code: string) => {
      try {
        if (!code || code.length !== 6) {
          throw new Error('Please enter a valid 6-digit code');
        }

        const emailToVerify = verifiedEmail || email;
        if (!emailToVerify) {
          throw new Error('Email not found. Please restart the verification process.');
        }

        if (!descope || !descopeReady) {
          throw new Error('Descope SDK not ready. Please wait and try again.');
        }

        // Use Descope SDK directly like old code
        const response = await descope.otp.verify.email(emailToVerify, code);

        const result = {
          success: response.ok,
          token: response.data?.sessionJwt,
          refreshToken: response.data?.refreshJwt,
          sessionJwt: response.data?.sessionJwt,
          refreshJwt: response.data?.refreshJwt,
          user: response.data?.user,
          message: response.ok ? 'Email verified successfully' : 'Invalid verification code',
          error: response.error?.errorMessage || response.error?.errorDescription,
        };

        if (result.success) {
          // Store session token for later use
          const token = result.token || result.sessionJwt;
          const refreshToken = result.refreshToken || result.refreshJwt;
          setSessionToken(token || null);
          setRefreshToken(refreshToken || null);

          // Email verified successfully - show password fields
          setShowOtpVerification(false);
          setEmailVerified(true);
          setVerificationMessage('Email verified successfully! Please set your password.');

          // Always proceed to password setup for new signup flow
          setAuthStep(AUTH_STEPS.PASSWORD_SETUP);
          setShowPasswordFields(true);
          setShowNextPasswordButton(true); // Enable Next button for password step

          // Animate verified icon and password fields
          Animated.timing(fadeInVerified, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();

          Animated.sequence([
            Animated.timing(slideInPassword, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(slideInConfirmPassword, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
              delay: 100,
            }),
          ]).start();

          return { success: true, isExistingUser: false };
        }

        throw new Error(result.error || 'Invalid verification code');
      } catch (error) {
        setErrors({ otp: error instanceof Error ? error.message : 'Invalid verification code' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid verification code',
        };
      }
    },
    [verifiedEmail, email, descope, descopeReady]
  );

  // Handle completion of OTP input component
  const handleOtpComplete = useCallback(
    async (code: string) => {
      if (isVerifyingOtp) {
        return;
      }

      if (!verifiedEmail && !email) {
        setErrors(prev => ({
          ...prev,
          otp: 'Email not found. Please restart the verification process.',
        }));
        return;
      }

      setIsVerifyingOtp(true);
      try {
        const result = await verifyOTPCode(code);
        if (!result.success) {
          const errorMessage =
            'error' in result
              ? (result.error as string)
              : 'message' in result
                ? (result.message as string)
                : 'Invalid verification code';
          setErrors(prev => ({ ...prev, otp: errorMessage }));
        }
      } finally {
        setIsVerifyingOtp(false);
      }
    },
    [verifyOTPCode, isVerifyingOtp, verifiedEmail, email]
  );

  // Check for deep link verification code from Gmail redirect
  useEffect(() => {
    const pendingCode = (global as any).pendingVerificationCode;
    if (pendingCode && typeof pendingCode === 'string' && handleOtpComplete) {
      // Clear the global code
      delete (global as any).pendingVerificationCode;
      // Auto-verify with the code from deep link
      setTimeout(() => {
        handleOtpComplete(pendingCode);
      }, 500); // Small delay to ensure component is ready
    }
  }, [handleOtpComplete]);

  // Check email availability with debouncing
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (!validateEmail(emailToCheck)) {
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }

    try {
      setEmailChecking(true);

      const response = await apiService.checkEmailAvailability(emailToCheck);

      if (response.success) {
        const available = response.data?.available ?? null;
        setEmailAvailable(available);

        if (available === false) {
          // Email exists - show message below field, disable verify button
          // Clear any previous verification state
          setEmailVerified(false);
          setShowOtpVerification(false);
          setMagicLinkSent(false);
        } else if (available === true) {
          // Reset verification state for new email
          setEmailVerified(false);
          setShowOtpVerification(false);
          setMagicLinkSent(false);
        }
      } else {
        setEmailAvailable(null);
      }
    } catch (error) {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // Verify email function - following exact flow
  const verifyEmail = async () => {
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    // Check email availability first - if not available, don't proceed
    if (emailAvailable === false) {
      return;
    }

    clearError();
    setErrors({});
    setVerificationMessage('');
    setIsVerifyingOtp(false);

    try {
      // STEP 1: Send OTP via Descope (using real service - no more mocks!)

      if (!descope || !descopeReady) {
        throw new Error('Descope SDK not ready. Please wait and try again.');
      }

      // Call Descope SDK directly like old code
      const response = await descope.otp.signUpOrIn.email(email);

      const result = {
        success: response.ok,
        maskedEmail: email,
        message: response.ok ? 'OTP sent to your email' : 'Failed to send OTP',
        error: response.error?.errorMessage || response.error?.errorDescription,
      };

      if (result.success) {
        // OTP sent successfully
        setVerifiedEmail(email);
        setVerificationMessage(`Verification code sent to ${email}. Enter the 6-digit code below.`);
        setShowOtpVerification(true);
        setResendCountdown(60);
        setEmailVerified(false);
        setAuthStep(AUTH_STEPS.OTP_VERIFICATION);
      } else {
        // OTP send failed - check if user already exists
        const errorMsg = result.error || '';

        if (errorMsg.includes('already exists') || errorMsg.includes('User already exists')) {
          // User already exists - show "Go to Login?" popup
          setExistingUserIdentifier(email);
          setExistingUserType('email');
          setShowExistingUserPopup(true);
        } else {
          setErrors({ email: errorMsg || 'Failed to send verification code' });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send verification code';
      setErrors({ email: errorMsg });
    } finally {
    }
  };

  // Handle resend verification - use Descope SDK directly like verifyEmail
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    const emailToResend = verifiedEmail || email;
    if (!emailToResend) {
      setErrors(prev => ({
        ...prev,
        otp: 'Email not found. Please restart the verification process.',
      }));
      return;
    }

    if (!descope || !descopeReady) {
      setErrors(prev => ({ ...prev, otp: 'Descope SDK not ready. Please wait and try again.' }));
      return;
    }

    try {
      // Use Descope SDK directly - same as verifyEmail function
      const response = await descope.otp.signUpOrIn.email(emailToResend);

      if (response.ok) {
        setResendCountdown(60);
        setVerificationMessage('New verification code sent! Check your email.');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.otp; // Clear OTP errors on successful resend
          return newErrors;
        });
      } else {
        const errorMsg =
          response.error?.errorMessage ||
          response.error?.errorDescription ||
          'Failed to resend verification code';
        setErrors(prev => ({ ...prev, otp: errorMsg }));
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to resend verification code';
      setErrors(prev => ({ ...prev, otp: errorMsg }));
    }
  };

  // Handle password fields next button
  const handlePasswordNext = () => {
    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters long' });
      return;
    }

    // Check for at least one non-alphanumeric character (special character)
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    if (!hasSpecialChar) {
      setErrors({ password: 'Password must contain at least one special character (!@#$%^&*)' });
      return;
    }

    // Clear errors and proceed
    setErrors({});
    setShowNextPasswordButton(false);
    setShowUsernameField(true);
    setShowNextUsernameButton(true); // Enable Next button for username step

    // Animate username field
    Animated.timing(slideInUsername, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Handle username field next button - ONLY checks on Next click
  const handleUsernameNext = async () => {
    const trimmedUsername = username.trim(); // Trim spaces from username

    if (!trimmedUsername) {
      setErrors({ username: 'Username is required' });
      return;
    }

    // Validate username format and length
    if (trimmedUsername.length < 3) {
      setErrors({ username: 'Username must be at least 3 characters long' });
      return;
    }

    if (trimmedUsername.length > 12) {
      setErrors({ username: 'Username must be 12 characters or less' });
      return;
    }

    // Only allow letters, numbers, period (.), and underscore (_)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrors({
        username: 'Username can only contain letters, numbers, . (period), and _ (underscore)',
      });
      return;
    }

    // Update username state with trimmed value
    setUsername(trimmedUsername);

    // Check username availability when clicking Next
    setUsernameChecking(true);

    try {
      // Get access token from session or Redux state
      const token = sessionToken || sessionJwt || (await keychainStorage.getAccessToken());

      const response = await apiService.checkUsernameAvailability(
        trimmedUsername,
        token || undefined
      );

      if (response.success) {
        // API returns available: true if username is AVAILABLE, available: false if username is TAKEN
        const isAvailable = response.data?.available === true; // true = available to use
        const isTaken = response.data?.available === false; // false = already exists

        // Set state: true = available, false = taken, null = unknown
        setUsernameAvailable(isAvailable ? true : isTaken ? false : null);

        if (isTaken) {
          // Username taken (available: false) - STOP progression
          // Status is displayed via professional UI messages, no red error text
          setUsernameChecking(false);
          return; // Don't proceed
        } else if (isAvailable) {
          // Username available (available: true) - proceed to next field
          // Clear any previous errors
          setErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors.username) {
              delete newErrors.username;
            }
            return newErrors;
          });
        }
      } else {
        setUsernameAvailable(null);
        setUsernameChecking(false);
        return;
      }

      // ✅ USERNAME AVAILABLE - Proceed to next field
    } catch (error) {
      setUsernameAvailable(null);
      setErrors({ username: 'Failed to check username availability' });
      setUsernameChecking(false);
      return;
    } finally {
      setUsernameChecking(false);
    }

    // Clear errors and proceed to country field
    setErrors({});
    setShowNextUsernameButton(false);
    setShowCountryField(true);

    // Animate country field
    Animated.timing(slideInCountry, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Handle existing user popup actions
  const handleExistingUserLogin = () => {
    setShowExistingUserPopup(false);
    navigation.navigate('Login');
  };

  const handleExistingUserForgotPassword = async () => {
    setShowExistingUserPopup(false);
    // Navigate to login with forgot password flow
    navigation.navigate('Login');
  };

  // Handle country selection
  const handleCountrySelect = (selectedCountry: string) => {
    setCountry(selectedCountry);

    if (errors.country) {
      setErrors(prev => ({ ...prev, country: '' }));
    }

    // Show date of birth field
    setShowDateOfBirthField(true);

    // Animate date of birth field
    Animated.timing(slideInDateOfBirth, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Handle password validation (for final validation)
  const validatePassword = () => {
    if (!password) {
      setErrors({ password: 'Password is required' });
      return false;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return false;
    }

    if (password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters long' });
      return false;
    }

    // Check for at least one non-alphanumeric character (special character)
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    if (!hasSpecialChar) {
      setErrors({ password: 'Password must contain at least one special character (!@#$%^&*)' });
      return false;
    }

    return true;
  };

  // Handle username validation (for final validation)
  const validateUsername = () => {
    if (!username) {
      setErrors({ username: 'Username is required' });
      return false;
    }

    if (username.length < 3) {
      setErrors({ username: 'Username must be at least 3 characters long' });
      return false;
    }

    if (username.length > 12) {
      setErrors({ username: 'Username must be 12 characters or less' });
      return false;
    }

    // Only allow letters, numbers, period (.), and underscore (_)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      setErrors({
        username: 'Username can only contain letters, numbers, . (period), and _ (underscore)',
      });
      return false;
    }

    return true;
  };

  // Check username availability - instant API call
  const checkUsernameAvailability = async (usernameToCheck: string) => {
    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(usernameToCheck)) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    if (usernameToCheck.length < 3 || usernameToCheck.length > 12) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    try {
      setUsernameChecking(true);

      // Get access token from session or Redux state
      const token = sessionToken || sessionJwt || (await keychainStorage.getAccessToken());

      // Call API immediately with Authorization header
      const response = await apiService.checkUsernameAvailability(
        usernameToCheck,
        token || undefined
      );

      if (response.success) {
        // API returns available: true if username is AVAILABLE, available: false if username is TAKEN
        const isAvailable = response.data?.available === true; // true = available to use
        const isTaken = response.data?.available === false; // false = already exists

        // Set state: true = available, false = taken, null = unknown
        setUsernameAvailable(isAvailable ? true : isTaken ? false : null);

        // Status is displayed via usernameAvailable state and professional UI messages
        // No need to set errors here - UI handles display professionally
      } else {
        setUsernameAvailable(null);
      }
    } catch (error) {
      setUsernameAvailable(null);
      // Don't set error on API failure, just reset state
    } finally {
      setUsernameChecking(false);
    }
  };

  // Validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Helper function to create account (extracted for reuse)
  const createAccount = async (skipReferralValidation: boolean = false) => {
    // Get token from local state or Redux
    const token = sessionToken || sessionJwt;

    if (!token) {
      throw new Error('Session expired. Please verify your email again.');
    }

    if (!descope || !descopeReady) {
      throw new Error('Descope SDK not ready. Please wait and try again.');
    }

    // Store the session token in keychain storage (must be completed before bindPassword)
    logger.debug('🔑 Storing session token in keychain storage...');
    try {
      await keychainStorage.storeAccessToken(token);
      logger.debug('✅ Session token stored successfully in keychain');
    } catch (err) {
      logger.debug('❌ Failed to store session token:', err);
      throw new Error('Failed to store session token. Please try again.');
    }

    // Determine referral code to send
    let finalReferralCode: string | null = null;
    if (
      !skipReferralValidation &&
      referralCode &&
      referralCode.trim().length > 0 &&
      referralCodeValid === true
    ) {
      finalReferralCode = referralCode.trim();
    }

    // Call the actual bindPassword API via Redux thunk
    const bindPasswordResult = await dispatch(
      bindPassword({
        email: verifiedEmail || email,
        password,
        username: username.trim(), // Trim spaces from username
        country: country || '',
        date_of_birth: dateOfBirth,
        referral_code: finalReferralCode,
      }) as any
    );

    if (bindPasswordResult.type.endsWith('/rejected')) {
      throw new Error((bindPasswordResult.payload as string) || 'Failed to bind password');
    }

    // Store user data locally
    const userData = {
      id: username, // Use username as ID for now
      email: verifiedEmail || email,
      username,
      country: country || '',
      date_of_birth: dateOfBirth,
    };

    // Log tokens during signup
    logger.debug('🔑 [SIGNUP] Access Token:', token);
    if (refreshToken) {
      logger.debug('🔑 [SIGNUP] Refresh Token:', refreshToken);
    }

    // Parallelize all keychain operations for better performance
    const storagePromises = [
      keychainStorage.storeUserData(userData),
      keychainStorage.storeAccessToken(token),
    ];

    if (refreshToken) {
      storagePromises.push(keychainStorage.storeRefreshToken(refreshToken));
    }

    storagePromises.push(
      keychainStorage.storeAuthState({
        isAuthenticated: true,
        loginMethod: 'signup',
        timestamp: new Date().toISOString(),
      })
    );

    // Wait for all storage operations to complete
    await Promise.all(storagePromises);

    // Update Redux state directly since user is already authenticated via OTP
    dispatch(
      setUser({
        id: username.trim(),
        email: verifiedEmail || email,
        username: username.trim(), // Trim spaces from username
        country: country || '',
        date_of_birth: dateOfBirth,
      })
    );

    dispatch(setToken(token || ''));

    // Trigger aggressive prefetch immediately after signup
    // WAIT for data to be ready before navigating (Zero Loading requirement)
    try {
      const prefetchPromise = prefetchCriticalData();
      await Promise.race([prefetchPromise, new Promise(resolve => setTimeout(resolve, 2000))]);
      logger.debug('Post-signup prefetch completed', 'SIGNUP');
    } catch (err) {
      logger.warn('Post-signup prefetch failed (non-critical)', 'SIGNUP', err);
    }

    setAuthStep(AUTH_STEPS.COMPLETED);
  };

  // Final account creation
  const handleSignup = async () => {
    try {
      setErrors({});
      // Removed blocking global loader to allow immediate interaction as requested
      // dispatch(showGlobalLoader({ message: '', operation: 'signup' }));

      // Validate all fields before creating account
      const newErrors: Record<string, string> = {};
      if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address';
      if (!validatePassword()) newErrors.password = 'Password validation failed';
      if (!validateUsername()) newErrors.username = 'Username validation failed';
      if (!country) newErrors.country = 'Please select your country';
      if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

      // Validate age (minimum 13 years)
      if (dateOfBirth) {
        const selectedDate = new Date(dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - selectedDate.getFullYear();
        const monthDiff = today.getMonth() - selectedDate.getMonth();
        const dayDiff = today.getDate() - selectedDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

        if (actualAge < 13) {
          newErrors.dateOfBirth = 'Minimum 13 years old required';
        }
      }

      // Validate referral code if provided
      if (referralCode && referralCode.trim().length > 0) {
        if (referralCodeValid === false) {
          // Show popup to proceed without referral code
          setShowInvalidReferralPopup(true);
          return;
        } else if (referralCodeValid === null && referralCodeChecking) {
          // Still checking, wait a bit
          newErrors.referralCode = 'Please wait while we validate your referral code';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Create account
      await createAccount(false);
    } catch (error) {
      let errorMessage = 'Failed to create account. Please try again.';

      // Handle specific errors with user-friendly messages
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();

        if (errorText.includes('session') || errorText.includes('expired')) {
          errorMessage = 'Session expired. Please verify your email again.';
        } else if (errorText.includes('password')) {
          errorMessage = 'Password does not meet requirements.';
        } else if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          // Existing user tried to sign up → suggest login
          setExistingUserIdentifier(verifiedEmail || email);
          setExistingUserType('email');
          setShowExistingUserPopup(true);
          errorMessage = '';
        } else if (errorText.includes('network') || errorText.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorText.includes('username')) {
          errorMessage = 'Username is not available. Please choose a different one.';
        }
      }

      if (errorMessage) {
        setErrors({ general: errorMessage });
      }
    } finally {
      dispatch(hideGlobalLoader('signup'));
    }
  };

  // Navigate to login screen
  const goToLogin = () => {
    navigation.navigate('Login', { email });
  };

  // Handle date selection with age validation
  const handleDateSelect = (date: string) => {
    setDateOfBirth(date);
    if (errors.dateOfBirth) {
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }

    // Validate age (minimum 13 years)
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - selectedDate.getFullYear();
      const monthDiff = today.getMonth() - selectedDate.getMonth();
      const dayDiff = today.getDate() - selectedDate.getDate();

      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 13) {
        setErrors(prev => ({ ...prev, dateOfBirth: 'Minimum 13 years old required' }));
      }
    }
  };

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      setReferralCodeValid(null);
      setReferralCodeChecking(false);
      return;
    }

    setReferralCodeChecking(true);
    try {
      const result = await apiService.validateReferralCode(code.trim());
      if (result.success && result.data) {
        setReferralCodeValid(result.data.valid);
        if (!result.data.valid) {
          setErrors(prev => ({ ...prev, referralCode: 'Invalid referral code' }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.referralCode;
            return newErrors;
          });
        }
      } else {
        setReferralCodeValid(false);
        setErrors(prev => ({ ...prev, referralCode: 'Failed to validate referral code' }));
      }
    } catch (error) {
      setReferralCodeValid(false);
      setErrors(prev => ({ ...prev, referralCode: 'Failed to validate referral code' }));
    } finally {
      setReferralCodeChecking(false);
    }
  };

  // Debounced referral code validation
  const checkReferralCodeDebounced = useMemo(
    () =>
      debounce((code: string) => {
        validateReferralCode(code);
      }, 500),
    []
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
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                  marginTop: getVerticalSpacing(1) + 20,
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
                  Create Account
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
                    {showOtpVerification ? 'Verify your email' : 'Sign up to get started'}
                  </Text>
                )}
              </View>

              {/* Lottie Animation - Always visible but smaller when keyboard is open */}
              <Animated.View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: keyboardVisible ? getVerticalSpacing(0.5) : getVerticalSpacing(1),
                  transform: [{ scale: animationScale }],
                  opacity: keyboardShown ? 0.7 : 1,
                  height: keyboardVisible
                    ? scaleHeight(isTablet ? 40 : isSmallDevice ? 30 : 35)
                    : scaleHeight(isTablet ? 80 : isSmallDevice ? 40 : 70),
                }}
              >
                <LottieView
                  ref={animationRef}
                  source={flirtingDogAnimation}
                  style={{
                    width: keyboardVisible
                      ? scaleWidth(isTablet ? 40 : isSmallDevice ? 30 : 35)
                      : scaleWidth(isTablet ? 80 : isSmallDevice ? 40 : 70),
                    height: keyboardVisible
                      ? scaleHeight(isTablet ? 40 : isSmallDevice ? 30 : 35)
                      : scaleHeight(isTablet ? 80 : isSmallDevice ? 40 : 70),
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
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  decelerationRate="normal"
                  scrollEventThrottle={16}
                  removeClippedSubviews={false}
                  alwaysBounceVertical={false}
                  keyboardDismissMode="none"
                  contentContainerStyle={{
                    paddingBottom: keyboardVisible ? getVerticalSpacing(2) : getVerticalSpacing(2),
                    paddingTop: 0,
                    flexGrow: 1,
                  }}
                  keyboardShouldPersistTaps="handled"
                  style={{
                    flex: 1,
                  }}
                  scrollEnabled={true}
                >
                  {/* Email Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: scaleSize(12),
                            paddingHorizontal: getHorizontalSpacing(2),
                            paddingVertical: getVerticalSpacing(1),
                            // Removed conditional marginBottom to keep alignment perfect
                            marginBottom: 0,
                            minHeight: scaleHeight(44), // Ensure consistent height with button
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
                              setEmailVerified(false);
                              setEmailAvailable(null);
                              if (errors.email) {
                                setErrors(prev => ({ ...prev, email: '' }));
                              }

                              // Clear previous timeout
                              if (emailCheckTimeout) {
                                clearTimeout(emailCheckTimeout);
                              }

                              // Instant debounced email availability check (optimized)
                              if (finalText && validateEmail(finalText)) {
                                const timeout = setTimeout(async () => {
                                  await checkEmailAvailability(finalText);
                                }, 300); // 300ms delay for better response
                                setEmailCheckTimeout(timeout);
                              } else {
                                // Clear availability if email is invalid
                                setEmailAvailable(null);
                                setEmailChecking(false);
                              }
                            }}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            editable={!emailVerified}
                            onFocus={() => setActiveField('email')}
                            onBlur={() => {
                              setActiveField(null);
                            }}
                            selectionColor="#FF6B35"
                            cursorColor="#FF6B35"
                          />
                        </View>
                      </View>

                      {!emailVerified && !showOtpVerification && !magicLinkSent && (
                        <TouchableOpacity
                          onPress={verifyEmail}
                          disabled={
                            authLoading || !validateEmail(email) || emailAvailable === false
                          }
                          style={{
                            marginLeft: getHorizontalSpacing(1),
                            backgroundColor:
                              authLoading || !validateEmail(email) || emailAvailable === false
                                ? '#999999'
                                : '#FF6B35',
                            paddingVertical: getVerticalSpacing(1), // Matches input container
                            paddingHorizontal: getHorizontalSpacing(1.5),
                            borderRadius: scaleSize(12), // Match input container radius
                            marginBottom: 0,
                            opacity:
                              authLoading || !validateEmail(email) || emailAvailable === false
                                ? 0.5
                                : 1,
                            justifyContent: 'center', // Center content
                            alignItems: 'center',
                            minHeight: scaleHeight(44), // Ensure consistent height
                          }}
                        >
                          {authLoading || emailChecking ? (
                            <Text
                              style={[
                                typography.button,
                                { color: 'white', fontSize: scaleFont(14) },
                              ]}
                            >
                              ...
                            </Text>
                          ) : (
                            <Text
                              style={[
                                typography.button,
                                { color: 'white', fontSize: scaleFont(14) },
                              ]}
                            >
                              Verify
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {magicLinkSent && !emailVerified && (
                        <View
                          style={{
                            marginLeft: getHorizontalSpacing(1),
                            alignItems: 'center',
                          }}
                        >
                          <Icon name="mail" size={scaleSize(24)} color="#FF6B35" />
                          <Text
                            style={[
                              typography.caption,
                              {
                                color: '#FF6B35',
                                fontSize: scaleFont(10),
                                textAlign: 'center',
                                marginTop: 2,
                              },
                            ]}
                          >
                            Code Sent
                          </Text>
                        </View>
                      )}

                      {emailVerified && (
                        <Animated.View
                          style={{
                            opacity: fadeInVerified,
                            marginLeft: getHorizontalSpacing(1),
                          }}
                        >
                          <Icon name="check-circle" size={scaleSize(24)} color="#FFD700" />
                        </Animated.View>
                      )}
                    </View>

                    {/* Email availability status & Errors - Moved OUTSIDE the row for alignment */}
                    <View style={{ paddingHorizontal: getHorizontalSpacing(0.5) }}>
                      {errors.email && (
                        <Text
                          style={{
                            color: '#FF6B6B',
                            fontSize: scaleFont(12),
                            marginTop: getVerticalSpacing(0.5),
                          }}
                        >
                          {errors.email}
                        </Text>
                      )}

                      {email && validateEmail(email) && emailAvailable !== null && (
                        <View
                          style={{
                            marginTop: getVerticalSpacing(0.5),
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          {emailAvailable === true ? (
                            <Text
                              style={[
                                typography.bodySmall,
                                {
                                  color: 'white',
                                  fontSize: scaleFont(12),
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              ✓ Email Available - You can sign up
                            </Text>
                          ) : emailAvailable === false ? (
                            <Text
                              style={[
                                typography.bodySmall,
                                {
                                  color: 'white',
                                  fontSize: scaleFont(12),
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              ✗ Email Already Exists - Please login instead
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* OTP Verification - Show inline when verification is needed */}
                  {showOtpVerification && (
                    <View
                      style={{
                        alignItems: 'center',
                        marginVertical: getVerticalSpacing(2),
                        marginBottom: getVerticalSpacing(2),
                      }}
                    >
                      <OtpInput
                        length={6}
                        onComplete={handleOtpComplete}
                        onResend={handleResendOtp}
                        error={errors.otp}
                        disabled={authLoading || isVerifyingOtp}
                        resendCountdown={resendCountdown}
                        email={email}
                        style={{ alignSelf: 'center' }}
                      />
                    </View>
                  )}

                  {/* Password Field */}
                  <>
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
                          }}
                          placeholder="Password"
                          placeholderTextColor="#999"
                          secureTextEntry={!showPassword}
                          onFocus={() => setActiveField('password')}
                          onBlur={() => {
                            setActiveField(null);
                          }}
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
                      {/* Password Requirements - Display below password field */}
                      {showPasswordPolicy && (
                        <View style={{ marginTop: getVerticalSpacing(1) }}>
                          <PasswordPolicy password={password} />
                        </View>
                      )}
                    </View>

                    <View style={{ marginBottom: getVerticalSpacing(2) }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          borderRadius: scaleSize(12),
                          paddingHorizontal: getHorizontalSpacing(2),
                          paddingVertical: getVerticalSpacing(1),
                          marginBottom: errors.confirmPassword ? getVerticalSpacing(0.5) : 0,
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
                          value={confirmPassword}
                          onChangeText={text => {
                            setConfirmPassword(text);
                          }}
                          placeholder="Confirm Password"
                          placeholderTextColor="#999"
                          secureTextEntry={!showConfirmPassword}
                          onFocus={() => setActiveField('confirmPassword')}
                          onBlur={() => {
                            setActiveField(null);
                          }}
                          selectionColor="#FF6B35"
                          cursorColor="#FF6B35"
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ padding: getHorizontalSpacing(0.5) }}
                        >
                          <Icon
                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                            size={scaleSize(20)}
                            color="#FF6B35"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && (
                        <Text
                          style={{
                            color: '#FF6B6B',
                            fontSize: scaleFont(12),
                            marginTop: getVerticalSpacing(0.5),
                            marginLeft: getHorizontalSpacing(0.5),
                          }}
                        >
                          {errors.confirmPassword}
                        </Text>
                      )}
                    </View>
                  </>

                  {/* Username Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: scaleSize(12),
                            paddingHorizontal: getHorizontalSpacing(2),
                            paddingVertical: getVerticalSpacing(1),
                            marginBottom: errors.username ? getVerticalSpacing(0.5) : 0,
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
                            value={username}
                            onChangeText={text => {
                              // Filter out invalid characters - only allow letters, numbers, . and _
                              const filteredText = text.replace(/[^a-zA-Z0-9._]/g, '');

                              // Limit to 12 characters
                              const limitedText =
                                filteredText.length > 12
                                  ? filteredText.substring(0, 12)
                                  : filteredText;

                              setUsername(limitedText);
                              setUsernameAvailable(null);

                              // Clear ALL username errors when typing a new username
                              const usernameRegex = /^[a-zA-Z0-9._]+$/;
                              if (
                                limitedText.length === 0 ||
                                (usernameRegex.test(limitedText) &&
                                  limitedText.length >= 3 &&
                                  limitedText.length <= 12)
                              ) {
                                // Clear all username errors including "already exists" errors
                                setErrors(prev => {
                                  const newErrors = { ...prev };
                                  if (newErrors.username) {
                                    delete newErrors.username;
                                  }
                                  return newErrors;
                                });
                              } else {
                                // Set format error if invalid
                                if (limitedText.length > 0 && !usernameRegex.test(limitedText)) {
                                  setErrors(prev => ({
                                    ...prev,
                                    username:
                                      'Only letters, numbers, . (period), and _ (underscore) allowed',
                                  }));
                                } else if (limitedText.length > 12) {
                                  setErrors(prev => ({
                                    ...prev,
                                    username: 'Username must be 12 characters or less',
                                  }));
                                }
                              }

                              // Clear previous timeout
                              if (usernameCheckTimeout) {
                                clearTimeout(usernameCheckTimeout);
                              }

                              // Instant username availability check - only if valid format and length
                              if (
                                limitedText.length >= 3 &&
                                limitedText.length <= 12 &&
                                usernameRegex.test(limitedText)
                              ) {
                                // Call immediately with very minimal delay for instant feedback
                                const timeout = setTimeout(async () => {
                                  await checkUsernameAvailability(limitedText);
                                }, 150); // Reduced to 150ms for near-instant response
                                setUsernameCheckTimeout(timeout);
                              } else if (limitedText.length === 0) {
                                // Reset state when field is empty
                                setUsernameAvailable(null);
                                setUsernameChecking(false);
                                setErrors(prev => {
                                  const newErrors = { ...prev };
                                  if (
                                    newErrors.username === 'Username already exists' ||
                                    newErrors.username === 'Username is already taken'
                                  ) {
                                    delete newErrors.username;
                                  }
                                  return newErrors;
                                });
                              }
                            }}
                            placeholder="Username"
                            placeholderTextColor="#999"
                            maxLength={12}
                            onFocus={() => setActiveField('username')}
                            onBlur={() => {
                              setActiveField(null);
                            }}
                            autoFocus={activeField === 'username'}
                            selectionColor="#FF6B35"
                            cursorColor="#FF6B35"
                          />
                        </View>
                        {/* Username Requirements - Display below username field */}
                        {showUsernameRequirements && (
                          <View style={{ marginTop: getVerticalSpacing(1) }}>
                            <UsernameRequirements username={username} />
                          </View>
                        )}
                        {/* Username availability status - Instant display - Always show when username is valid */}
                        {username && username.length >= 3 && username.length <= 12 && (
                          <View
                            style={{
                              marginTop: getVerticalSpacing(0.5),
                              marginLeft: getHorizontalSpacing(0.5),
                            }}
                          >
                            {usernameChecking ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text
                                  style={[
                                    typography.bodySmall,
                                    {
                                      color: 'rgba(255,255,255,0.8)',
                                      marginLeft: 0,
                                      fontSize: scaleFont(12),
                                    },
                                  ]}
                                >
                                  Checking availability…
                                </Text>
                              </View>
                            ) : usernameAvailable === false ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="x-circle" size={16} color="#FF6B35" />
                                <Text
                                  style={[
                                    typography.bodySmall,
                                    {
                                      color: '#FFA366',
                                      marginLeft: 6,
                                      fontSize: scaleFont(12),
                                    },
                                  ]}
                                >
                                  Username already exists
                                </Text>
                              </View>
                            ) : usernameAvailable === true ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="check-circle" size={16} color="#FFD700" />
                                <Text
                                  style={[
                                    typography.bodySmall,
                                    {
                                      color: '#FFE55C',
                                      marginLeft: 6,
                                      fontSize: scaleFont(12),
                                    },
                                  ]}
                                >
                                  Username is available
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Country Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <TouchableOpacity
                      onPress={() => {
                        setCountryModalVisible(true);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: scaleSize(12),
                        paddingHorizontal: getHorizontalSpacing(2),
                        paddingVertical: getVerticalSpacing(1),
                        marginBottom: errors.country ? getVerticalSpacing(0.5) : 0,
                      }}
                    >
                      <Icon
                        name="globe"
                        size={scaleSize(20)}
                        color="#FF6B35"
                        style={{ marginRight: getHorizontalSpacing(1) }}
                      />
                      <Text
                        style={[
                          {
                            flex: 1,
                            color: country ? '#000' : '#999',
                            fontSize: scaleFont(16),
                            paddingVertical: getVerticalSpacing(0.5),
                          },
                        ]}
                      >
                        {country || 'Country'}
                      </Text>
                      <Icon name="chevron-down" size={scaleSize(18)} color="#FF6B35" />
                    </TouchableOpacity>
                    {errors.country && (
                      <Text
                        style={{
                          color: '#FF6B6B',
                          fontSize: scaleFont(12),
                          marginTop: getVerticalSpacing(0.5),
                          marginLeft: getHorizontalSpacing(0.5),
                        }}
                      >
                        {errors.country}
                      </Text>
                    )}
                  </View>

                  {/* Date of Birth Field */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(true);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: scaleSize(12),
                        paddingHorizontal: getHorizontalSpacing(2),
                        paddingVertical: getVerticalSpacing(1),
                        marginBottom: errors.dateOfBirth ? getVerticalSpacing(0.5) : 0,
                        minHeight: scaleHeight(44), // Ensure minimum touch target
                      }}
                    >
                      <Icon
                        name="calendar"
                        size={scaleSize(20)}
                        color="#FF6B35"
                        style={{ marginRight: getHorizontalSpacing(1) }}
                      />
                      <Text
                        style={[
                          {
                            flex: 1,
                            color: dateOfBirth ? '#000' : '#999',
                            fontSize: scaleFont(16),
                            paddingVertical: getVerticalSpacing(0.5),
                          },
                        ]}
                      >
                        {dateOfBirth || 'Date of Birth'}
                      </Text>
                      <Icon name="chevron-down" size={scaleSize(18)} color="#FF6B35" />
                    </TouchableOpacity>
                    {errors.dateOfBirth && (
                      <Text
                        style={{
                          color: '#FF6B6B',
                          fontSize: scaleFont(12),
                          marginTop: getVerticalSpacing(0.5),
                          marginLeft: getHorizontalSpacing(0.5),
                        }}
                      >
                        {errors.dateOfBirth}
                      </Text>
                    )}
                  </View>

                  {/* Referral Code Field (Optional) */}
                  <View style={{ marginBottom: getVerticalSpacing(2) }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: scaleSize(12),
                        paddingHorizontal: getHorizontalSpacing(2),
                        paddingVertical: getVerticalSpacing(1),
                        marginBottom: errors.referralCode ? getVerticalSpacing(0.5) : 0,
                      }}
                    >
                      <Icon
                        name="gift"
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
                        value={referralCode}
                        onChangeText={text => {
                          setReferralCode(text);
                          setReferralCodeValid(null);
                          if (errors.referralCode) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.referralCode;
                              return newErrors;
                            });
                          }
                          // Debounced validation
                          if (text.trim().length > 0) {
                            checkReferralCodeDebounced(text);
                          } else {
                            setReferralCodeValid(null);
                            setReferralCodeChecking(false);
                          }
                        }}
                        placeholder="Referral Code (Optional)"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                        onFocus={() => setActiveField('referralCode')}
                        onBlur={() => {
                          setActiveField(null);
                        }}
                        selectionColor="#FF6B35"
                        cursorColor="#FF6B35"
                      />
                      {referralCodeChecking && (
                        <LottieView
                          source={require('../../../../assets/animations/LoadingBar.json')}
                          autoPlay
                          loop
                          style={{
                            width: scaleSize(24),
                            height: scaleSize(24),
                            marginLeft: getHorizontalSpacing(1),
                          }}
                        />
                      )}
                      {referralCode && !referralCodeChecking && referralCodeValid === true && (
                        <Icon
                          name="check-circle"
                          size={scaleSize(20)}
                          color="#4CAF50"
                          style={{ marginLeft: getHorizontalSpacing(1) }}
                        />
                      )}
                      {referralCode && !referralCodeChecking && referralCodeValid === false && (
                        <Icon
                          name="x-circle"
                          size={scaleSize(20)}
                          color="#FF6B6B"
                          style={{ marginLeft: getHorizontalSpacing(1) }}
                        />
                      )}
                    </View>
                    {errors.referralCode && (
                      <Text
                        style={{
                          color: '#FF6B6B',
                          fontSize: scaleFont(12),
                          marginTop: getVerticalSpacing(0.5),
                          marginLeft: getHorizontalSpacing(0.5),
                        }}
                      >
                        {errors.referralCode}
                      </Text>
                    )}
                  </View>

                  {/* Create Account Button - Show above keyboard when keyboard is open */}
                  {keyboardVisible && !showOtpVerification && (
                    <>
                      <View
                        style={{
                          paddingTop: getVerticalSpacing(0.5),
                          paddingBottom: 0,
                        }}
                      >
                        <TouchableOpacity
                          onPress={handleSignup}
                          disabled={authLoading}
                          style={{
                            width: '100%',
                            alignItems: 'center',
                            opacity: authLoading ? 0.5 : 1,
                          }}
                        >
                          <Image
                            source={createAccountButton}
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

                      {/* Sign In Link - Show below button when keyboard is open */}
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
                            Already have an account?{' '}
                          </Text>
                          <TouchableOpacity onPress={goToLogin}>
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
                              Sign In
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
                  {/* General Error Display */}
                  {errors.general && (
                    <View
                      style={{
                        backgroundColor: '#fef2f2',
                        padding: getSpacing(1.5),
                        borderRadius: scaleSize(8),
                        marginBottom: getVerticalSpacing(2),
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
                        {errors.general}
                      </Text>
                    </View>
                  )}

                  {/* Show Create Account button */}
                  {!showOtpVerification && (
                    <View
                      style={{
                        marginBottom: getVerticalSpacing(1.5),
                      }}
                    >
                      <TouchableOpacity
                        onPress={handleSignup}
                        disabled={authLoading}
                        style={{
                          width: '100%',
                          alignItems: 'center',
                          opacity: authLoading ? 0.5 : 1,
                        }}
                      >
                        <Image
                          source={createAccountButton}
                          style={{
                            width: '100%',
                            height: scaleHeight(50),
                            maxHeight: scaleHeight(60),
                          }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Sign In Link - Always visible at bottom */}
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
                      Already have an account?
                    </Text>
                    <TouchableOpacity
                      onPress={goToLogin}
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
                        Sign In
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeScreenWrapper>

      {/* Existing User Popup */}
      <ExistingUserPopup
        visible={showExistingUserPopup}
        onClose={() => setShowExistingUserPopup(false)}
        onLogin={handleExistingUserLogin}
        onForgotPassword={handleExistingUserForgotPassword}
        identifier={existingUserIdentifier}
        identifierType={existingUserType}
      />

      {/* Country Picker Modal */}
      <CountryPicker
        visible={countryModalVisible}
        onClose={() => {
          setCountryModalVisible(false);
        }}
        onSelect={handleCountrySelect}
        selectedCountry={country || undefined}
      />

      {/* Date Picker Modal */}
      <DatePicker
        visible={showDatePicker}
        onClose={() => {
          setShowDatePicker(false);
        }}
        onSelect={handleDateSelect}
        selectedDate={dateOfBirth || undefined}
      />

      {/* Invalid Referral Code Popup */}
      <Modal
        visible={showInvalidReferralPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInvalidReferralPopup(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: getHorizontalSpacing(4),
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: scaleSize(16),
              padding: getHorizontalSpacing(3),
              width: '100%',
              maxWidth: scaleWidth(400),
            }}
          >
            <Text
              style={{
                fontSize: scaleFont(20),
                fontWeight: 'bold',
                color: '#000',
                marginBottom: getVerticalSpacing(2),
                textAlign: 'center',
              }}
            >
              Invalid Referral Code
            </Text>
            <Text
              style={{
                fontSize: scaleFont(16),
                color: '#666',
                marginBottom: getVerticalSpacing(3),
                textAlign: 'center',
                lineHeight: scaleFont(22),
              }}
            >
              The referral code you entered is invalid. Would you like to continue without a
              referral code?
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: getHorizontalSpacing(2),
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowInvalidReferralPopup(false);
                  setReferralCode('');
                  setReferralCodeValid(null);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  paddingVertical: getVerticalSpacing(1.5),
                  borderRadius: scaleSize(8),
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: scaleFont(16),
                    fontWeight: '600',
                    color: '#666',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowInvalidReferralPopup(false);
                  setReferralCode('');
                  setReferralCodeValid(null);
                  // Proceed with account creation without referral code
                  try {
                    setErrors({});
                    await createAccount(true);
                  } catch (error) {
                    let errorMessage = 'Failed to create account. Please try again.';
                    if (error instanceof Error) {
                      errorMessage = error.message;
                    }
                    setErrors({ general: errorMessage });
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#FF6B35',
                  paddingVertical: getVerticalSpacing(1.5),
                  borderRadius: scaleSize(8),
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: scaleFont(16),
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {(authLoading || isVerifyingOtp) && <GlobalLoader forceShow={true} />}
    </GradientBackground>
  );
};

export default SignupScreen;
