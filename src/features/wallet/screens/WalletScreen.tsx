/**
 * Wallet Screen - Updated to match old PaymentScreen styling
 * Financial dashboard with secure transactions and responsive design
 */

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ImageBackground,
  Modal,
  Pressable,
  Switch,
  TextInput,
  Image,
  Animated,
  Easing,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Alert,
  InteractionManager,
  BackHandler,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Components
import StatisticsCard from '../../../components/StatisticsCard';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { spacing } from '../../../theme/spacing';
import {
  usePlatformOptimization,
  useHapticFeedback,
  useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { useIsMounted } from '../../../hooks/useIsMounted';
import dayjs from 'dayjs';

// Types
import { RootState } from '../../../store/store';

// Services
// import { paymentService } from '../../../services/paymentService'; // Replaced by RTK Query
// import { walletService } from '../../../services/walletService'; // Replaced by RTK Query
import { logger } from '../../../lib/utils/logger';
import {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useRequestWithdrawalMutation,
  useCreateStripeConnectAccountLinkMutation,
  useGetPaymentConfigQuery,
  useInitPaymentSheetMutation,
} from '../../../store/api/walletApi';

// Stripe (conditional import - will be available after package installation)
let StripeProvider: any;
let useStripe: any;
let usePaymentSheet: any;
let isStripeInstalled = false;

// Try to import Stripe SDK - use direct path to compiled version for reliability
try {
  // Use the compiled CommonJS version directly - this is more reliable than source files
  // The package.json "main" field points to lib/commonjs/index
  const stripeModulePath = '@stripe/stripe-react-native/lib/commonjs/index';
  const stripeModule = require(stripeModulePath);

  // Verify all required exports are present
  if (
    stripeModule &&
    stripeModule.StripeProvider &&
    stripeModule.useStripe &&
    stripeModule.usePaymentSheet
  ) {
    StripeProvider = stripeModule.StripeProvider;
    useStripe = stripeModule.useStripe;
    usePaymentSheet = stripeModule.usePaymentSheet;
    isStripeInstalled = true;
    logger.debug('Stripe SDK loaded successfully', 'WALLET');
  } else {
    // Module loaded but missing exports
    const missingExports = [];
    if (!stripeModule?.StripeProvider) missingExports.push('StripeProvider');
    if (!stripeModule?.useStripe) missingExports.push('useStripe');
    if (!stripeModule?.usePaymentSheet) missingExports.push('usePaymentSheet');
    throw new Error(`Stripe module loaded but missing exports: ${missingExports.join(', ')}`);
  }
} catch (e: any) {
  // Stripe SDK not available - try fallback to main entry
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    if (
      stripeModule &&
      stripeModule.StripeProvider &&
      stripeModule.useStripe &&
      stripeModule.usePaymentSheet
    ) {
      StripeProvider = stripeModule.StripeProvider;
      useStripe = stripeModule.useStripe;
      usePaymentSheet = stripeModule.usePaymentSheet;
      isStripeInstalled = true;
      if (__DEV__) {
        logger.info('Stripe SDK loaded from main entry', 'WALLET');
      }
    } else {
      throw new Error('Stripe module missing required exports');
    }
  } catch (e2: any) {
    // Stripe SDK not available
    isStripeInstalled = false;
    if (__DEV__) {
      logger.warn('Stripe SDK not available. Payment features will be limited.', 'WALLET');
      if (e2?.message && !e2.message.includes('Cannot find module')) {
        logger.warn('Stripe SDK import error', 'WALLET', e2.message);
      }
    }
  }
}

// Transaction interface (for display)
interface Transaction {
  id: number;
  date: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
}

// Theme interface
interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  tabActive: string;
  accent: string;
  border: string;
}

// Wallet screen component
const WalletScreen: React.FC = () => {
  // Platform-specific optimizations
  const insets = useSafeAreaInsets();
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Refs for preventing infinite loops
  const isMountedRef = useRef<boolean>(true);
  const hasFetchedRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Responsive design hooks - single source of truth
  const {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    deviceType,
    width: screenWidth,
    height: screenHeight,
    width,
    height,
  } = useStandardResponsive();

  // Redux state
  const { user } = useSelector((state: RootState) => state.auth, shallowEqual);

  // Local state - declare ALL state before using in hooks
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [tpAmount, setTpAmount] = useState('');
  // const [balance, setBalance] = useState(0); // Replaced by RTK Query
  // const [refreshing, setRefreshing] = useState(false); // Replaced by RTK Query
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Stripe state
  const [stripeInitialized, setStripeInitialized] = useState(false);
  // const [publishableKey, setPublishableKey] = useState<string | null>(null); // Replaced by RTK Query
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState<'instant' | 'standard'>('standard');
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  // const [transactions, setTransactions] = useState<Transaction[]>([]); // Replaced by RTK Query
  // const [loadingTransactions, setLoadingTransactions] = useState(false); // Replaced by RTK Query

  // RTK Query Hooks
  const {
    data: walletData,
    isLoading: isWalletLoading,
    isFetching: isWalletFetching,
    refetch: refetchWallet,
  } = useGetWalletBalanceQuery(true, {
    pollingInterval: 30000,
    refetchOnFocus: true,
  });

  const { data: paymentConfig } = useGetPaymentConfigQuery();
  const [initPaymentSheetMutation] = useInitPaymentSheetMutation();
  const [requestWithdrawalMutation] = useRequestWithdrawalMutation();
  const [createStripeConnectAccountLinkMutation] = useCreateStripeConnectAccountLinkMutation();

  // Derived state
  const balance = walletData?.balance_minor || 0;
  const transactionsRaw = walletData?.recent_transactions || [];
  const refreshing = isWalletFetching;
  const publishableKey = paymentConfig?.publishable_key || null;

  // Process transactions for display
  const transactions = useMemo(() => {
    if (!transactionsRaw) return [];

    return transactionsRaw
      .map((tx: any) => {
        if (!tx) return null;
        const formattedDate = dayjs(tx.created_at).format('MMM D, YYYY');
        let title = '';
        let type: 'credit' | 'debit' = 'credit';
        const amountDollars = tx.amount_minor / 100;

        switch (tx.kind) {
          case 'deposit':
            title = 'Wallet Top-up';
            type = 'credit';
            break;
          case 'withdraw':
            title = 'Withdrawal';
            type = 'debit';
            break;
          case 'refund':
            title = tx.description || 'Refund';
            type = 'credit';
            break;
          case 'fee':
            title = 'Transaction Fee';
            type = 'debit';
            break;
          case 'adjustment':
            title = tx.description || 'Balance Adjustment';
            type = amountDollars >= 0 ? 'credit' : 'debit';
            break;
          case 'product_purchase_credit':
            title = 'Product Purchase';
            type = 'credit';
            break;
          case 'dispute_hold':
            title = 'Dispute Hold';
            type = 'debit';
            break;
          default:
            title =
              tx.description ||
              tx.kind?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
              'Transaction';
            type = amountDollars >= 0 ? 'credit' : 'debit';
        }

        return {
          id: tx.id,
          date: formattedDate,
          title,
          amount: Math.abs(amountDollars),
          type,
        };
      })
      .filter(Boolean) as Transaction[];
  }, [transactionsRaw]);

  const loadingTransactions = isWalletLoading;

  // Update onboarding status effect
  useEffect(() => {
    if (walletData) {
      setStripeOnboarded(walletData.stripe_onboarded || false);
    }
  }, [walletData]);

  // Android back button handler - now state is declared
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showTopupModal) {
          if (!loadingPayment) {
            setShowTopupModal(false);
          }
          return true;
        }
        if (showWithdrawModal) {
          if (!loadingPayment) {
            setShowWithdrawModal(false);
          }
          return true;
        }
        if (showTooltip) {
          setShowTooltip(false);
          return true;
        }
        if (showPaymentOptions) {
          setShowPaymentOptions(false);
          return true;
        }
        return false;
      };

      if (Platform.OS === 'android') {
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
      }
    }, [showTopupModal, showWithdrawModal, showTooltip, showPaymentOptions, loadingPayment])
  );

  useAndroidBackButton(() => {
    // Allow default navigation back behavior if no modals are open
    return false;
  });

  // Simple keyboard visibility handler - just track state, no animations
  // DISABLED when modals are open to prevent flickering
  useEffect(() => {
    // Don't listen to keyboard events when modals are open - prevents flickering
    if (showTopupModal || showWithdrawModal) {
      return;
    }

    let keyboardShowListener: any;
    let keyboardHideListener: any;

    const handleKeyboardShow = () => {
      if (isMountedRef.current) {
        setKeyboardVisible(true);
      }
    };

    const handleKeyboardHide = () => {
      if (isMountedRef.current) {
        setKeyboardVisible(false);
      }
    };

    if (Platform.OS === 'ios') {
      keyboardShowListener = Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      keyboardHideListener = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    } else {
      keyboardShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
      keyboardHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    }

    return () => {
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, [showTopupModal, showWithdrawModal]);

  // Note: Removed auto-focus useEffect hooks to prevent keyboard flickering
  // Using autoFocus prop on TextInput instead for stable keyboard behavior

  // Stripe hooks - use refs to store functions from inner component (only available when StripeProvider wraps component)
  const stripeRef = useRef<any>(null);
  const initPaymentSheetRef = useRef<any>(null);
  const presentPaymentSheetRef = useRef<any>(null);

  // Animation refs
  const coinRotation = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const topupInputRef = useRef<TextInput>(null);
  const withdrawInputRef = useRef<TextInput>(null);

  // Mount tracking to prevent state updates after unmount
  const isMounted = useIsMounted();

  // Animation cleanup refs
  const coinRotationAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const coinScaleAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Track last wallet fetch time to prevent excessive calls
  // const lastWalletFetchRef = useRef<number>(0); // Handled by RTK Query cache
  // const WALLET_FETCH_COOLDOWN = 30000; // Handled by RTK Query pollingInterval

  // Constants
  const conversionRate = 1; // 1 TP = $1 (1 cent = 1 TriviaCoin)

  // Initialize Stripe and fetch wallet balance on mount - prevent infinite loops
  // Removed manual fetch logic, handled by RTK Query hooks above
  // Stripe initialization now handled via useGetPaymentConfigQuery results

  useEffect(() => {
    if (publishableKey && !stripeInitialized) {
      setStripeInitialized(true);
      logger.debug('Stripe initialized with key', 'WALLET');
    }
  }, [publishableKey, stripeInitialized]);

  // Refresh wallet balance and transactions when screen is focused
  // Refresh wallet balance when screen is focused is handled by refetchOnFocus in query hook

  // Initialize Stripe SDK - handled by useGetPaymentConfigQuery
  // const initializeStripe = async () => { ... } // Removed

  // processTransactionsFromBalance removed (logic moved to useMemo)
  // fetchWalletBalance removed (handled by RTK Query)

  // Start onboarding process (extracted for reuse)
  const startOnboarding = async (isRefresh: boolean = false) => {
    try {
      const accountLink = await createStripeConnectAccountLinkMutation({
        return_url: 'triviacoin://wallet', // Provide deep link if needed, or backend handles defaults
        refresh_url: 'triviacoin://wallet',
      }).unwrap();
      // Note: Backend might handle defaults if params are missing, but API requires body/params usually.
      // Based on original service, it took optional params. Mutation sends what we provide.
      // Original service: createStripeConnectAccountLink(returnUrl, refreshUrl)
      // We should probably check if backend needs specific URLs.
      // Assuming backend defaults are sufficient if not provided, or passing empty object.
      // But wait, the mutation expects { return_url, refresh_url }.
      // Let's rely on backend defaults if we don't have deeply linked navigation set up yet,
      // or pass dumb strings if required. Service passed undefined mostly.

      // Open the onboarding URL in browser
      const canOpen = await Linking.canOpenURL(accountLink.url);
      if (canOpen) {
        await Linking.openURL(accountLink.url);
        Alert.alert(
          isRefresh ? 'Update Account Information' : 'Stripe Onboarding',
          isRefresh
            ? 'Please update your account information in your browser. Once complete, you can return to the app.'
            : 'Please complete the Stripe onboarding process in your browser. Once complete, you can return to the app and withdraw funds.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Unable to open onboarding URL');
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error.message || 'Failed to start onboarding';

      // Check if Stripe Connect is not enabled - improved detection
      const isConnectNotEnabled =
        errorMessage.includes('Connect') &&
        (errorMessage.includes('signed up') ||
          errorMessage.includes('not enabled') ||
          errorMessage.includes('You can only create new accounts') ||
          errorMessage.includes('signed up for Connect'));

      if (isConnectNotEnabled) {
        Alert.alert(
          'Withdrawals Currently Unavailable',
          'Withdrawal features require Stripe Connect to be enabled on your account. This is a backend configuration that needs to be set up by your administrator.\n\nWhat is Stripe Connect?\nStripe Connect allows users to receive payouts directly to their bank accounts. It requires:\n1. Stripe Connect enabled on the platform account\n2. User onboarding to link their bank account\n\nFor now, you can still:\n• Add funds to your wallet\n• Use your balance for purchases\n• View transaction history\n\nContact support to enable withdrawals.',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Learn More',
              onPress: () => Linking.openURL('https://stripe.com/docs/connect'),
              style: 'default',
            },
          ]
        );
      } else {
        // Show a more user-friendly error message
        Alert.alert(
          'Onboarding Error',
          errorMessage.length > 100
            ? 'Unable to start onboarding. Please try again later or contact support.'
            : errorMessage
        );
      }
    }
  };

  // Handle wallet top-up
  const handleTopup = async () => {
    // CRITICAL: Wrap entire function in try-catch to prevent native crashes
    // This function must NEVER crash the screen
    try {
      logger.debug('handleTopup called', 'WALLET');

      // CRITICAL: Check if component is still mounted before proceeding
      if (!isMounted() || !isMountedRef.current) {
        logger.warn('Component unmounted, aborting handleTopup', 'WALLET');
        return;
      }
      logger.debug('Checking Stripe installation', 'WALLET', { isStripeInstalled });

      if (!isStripeInstalled) {
        Alert.alert(
          'Payment Feature Unavailable',
          'Stripe payment SDK is not installed. Wallet top-up features require the Stripe SDK.\n\nTo enable payments:\n1. Install: npm install @stripe/stripe-react-native\n2. For iOS: cd ios && pod install\n3. For Android: Rebuild the app\n4. Restart the app\n\nFor now, you can still view your balance and transaction history.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if publishable key is available (StripeProvider must be initialized)
      if (!publishableKey || !stripeInitialized) {
        Alert.alert(
          'Payment Configuration Error',
          'Stripe is not properly configured. Please wait a moment and try again, or restart the app.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get Stripe functions from refs (set by inner component when StripeProvider is available)
      const initPaymentSheet = initPaymentSheetRef.current;
      const presentPaymentSheet = presentPaymentSheetRef.current;
      const stripe = stripeRef.current;

      logger.debug('Stripe functions from refs', 'WALLET', {
        hasInitPaymentSheet: !!initPaymentSheet,
        hasPresentPaymentSheet: !!presentPaymentSheet,
        hasStripe: !!stripe,
        initType: typeof initPaymentSheet,
        presentType: typeof presentPaymentSheet,
        stripeType: typeof stripe,
      });

      if (!initPaymentSheet || !presentPaymentSheet) {
        Alert.alert(
          'Payment Initialization Error',
          'Stripe SDK is installed but not properly initialized. This usually means:\n\n1. The app needs to be rebuilt (not just reloaded)\n2. For Android: Run "npx react-native run-android"\n3. For iOS: Run "cd ios && pod install" then rebuild\n\nPlease rebuild the app and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Double-check functions are actually callable
      if (typeof initPaymentSheet !== 'function' || typeof presentPaymentSheet !== 'function') {
        Alert.alert(
          'Payment Function Error',
          'Stripe payment functions are not available. Please rebuild the app to properly link the Stripe SDK.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verify Stripe instance is available (some SDKs require this)
      if (!stripe) {
        logger.warn('Stripe instance not available, but continuing...', 'WALLET');
      }

      const amount = parseFloat(topupAmount);
      if (!amount || amount <= 0 || isNaN(amount)) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount');
        return;
      }

      const amountMinor = Math.round(amount * 100); // Convert dollars to cents

      // CRITICAL: Safely set loading state
      try {
        if (isMounted() && isMountedRef.current) {
          setLoadingPayment(true);
        } else {
          logger.warn('Component unmounted, cannot set loading state', 'WALLET');
          return;
        }
      } catch (stateError: any) {
        logger.error('Error setting loading state', 'WALLET', stateError);
        // Continue anyway - payment might still work
      }

      // Initialize payment sheet - wrap in try-catch for network errors
      let paymentSheetData;
      try {
        logger.debug('Calling initPaymentSheetMutation', 'WALLET', {
          amountMinor,
          currency: 'usd',
        });
        // Use mutation instead of service
        paymentSheetData = await initPaymentSheetMutation({
          topup_type: 'wallet_topup',
          amount_minor: amountMinor,
          currency: 'usd',
        }).unwrap();

        logger.debug('Payment sheet data received', 'WALLET', {
          hasData: !!paymentSheetData,
          hasClientSecret: !!paymentSheetData?.paymentIntentClientSecret,
          // hasCustomerId: !!paymentSheetData?.customerId, // Using normalized keys from API slice
          // hasEphemeralKey: !!paymentSheetData?.ephemeralKeySecret,
          keys: paymentSheetData ? Object.keys(paymentSheetData) : [],
        });
      } catch (networkError: any) {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state after network error', 'WALLET', stateError);
        }
        logger.error('Payment service error', 'WALLET', networkError);
        const errorMsg =
          networkError?.data?.message ||
          networkError?.message ||
          'Failed to connect to payment server';
        if (isMounted() && isMountedRef.current) {
          Alert.alert('Network Error', errorMsg);
        }
        return;
      }

      // Validate payment sheet data with strict checks
      if (!paymentSheetData) {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state', 'WALLET', stateError);
        }
        logger.error('Payment sheet data is null/undefined', 'WALLET');
        if (isMounted() && isMountedRef.current) {
          Alert.alert('Payment Error', 'Invalid response from payment service. Please try again.');
        }
        return;
      }

      // Strict validation - check for null, undefined, and empty strings
      // Handle both camelCase and snake_case from backend
      const clientSecret =
        paymentSheetData.paymentIntentClientSecret ||
        (paymentSheetData as any).payment_intent_client_secret;
      const customerId = paymentSheetData.customerId || (paymentSheetData as any).customer_id;
      const ephemeralKey =
        paymentSheetData.ephemeralKeySecret || (paymentSheetData as any).ephemeral_key_secret;

      logger.debug('Extracted values', 'WALLET', {
        hasClientSecret: !!clientSecret,
        hasCustomerId: !!customerId,
        hasEphemeralKey: !!ephemeralKey,
        clientSecretType: typeof clientSecret,
        customerIdType: typeof customerId,
        ephemeralKeyType: typeof ephemeralKey,
      });

      if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state', 'WALLET', stateError);
        }
        logger.error('Invalid paymentIntentClientSecret', 'WALLET', {
          exists: !!clientSecret,
          type: typeof clientSecret,
          value: clientSecret,
        });
        if (isMounted() && isMountedRef.current) {
          Alert.alert(
            'Payment Error',
            'Payment intent is missing or invalid from server response. Please contact support.'
          );
        }
        return;
      }

      if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state', 'WALLET', stateError);
        }
        logger.error('Invalid customerId', 'WALLET', {
          exists: !!customerId,
          type: typeof customerId,
          value: customerId,
        });
        if (isMounted() && isMountedRef.current) {
          Alert.alert(
            'Payment Error',
            'Customer ID is missing or invalid from server response. Please contact support.'
          );
        }
        return;
      }

      if (!ephemeralKey || typeof ephemeralKey !== 'string' || ephemeralKey.trim() === '') {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state', 'WALLET', stateError);
        }
        logger.error('Invalid ephemeralKeySecret', 'WALLET', {
          exists: !!ephemeralKey,
          type: typeof ephemeralKey,
          value: ephemeralKey,
        });
        if (isMounted() && isMountedRef.current) {
          Alert.alert(
            'Payment Error',
            'Ephemeral key is missing or invalid from server response. Please contact support.'
          );
        }
        return;
      }

      // Debug log before calling native function
      logger.debug('About to call initPaymentSheet', 'WALLET', {
        hasClientSecret: !!clientSecret && clientSecret.length > 0,
        hasCustomerId: !!customerId && customerId.length > 0,
        hasEphemeralKey: !!ephemeralKey && ephemeralKey.length > 0,
        clientSecretLength: clientSecret?.length || 0,
        customerIdLength: customerId?.length || 0,
        ephemeralKeyLength: ephemeralKey?.length || 0,
      });

      // CRITICAL: Wrap native Stripe calls in try-catch to prevent crashes
      let initResult;
      try {
        // Validate initPaymentSheet function one more time before calling
        if (!initPaymentSheet || typeof initPaymentSheet !== 'function') {
          throw new Error('initPaymentSheet is not a function');
        }

        // Final validation - ensure all strings are valid and not empty
        const sanitizedClientSecret = String(clientSecret || '').trim();
        const sanitizedCustomerId = String(customerId || '').trim();
        const sanitizedEphemeralKey = String(ephemeralKey || '').trim();

        if (!sanitizedClientSecret || sanitizedClientSecret.length < 10) {
          throw new Error('Invalid payment intent client secret');
        }
        if (!sanitizedCustomerId || sanitizedCustomerId.length < 5) {
          throw new Error('Invalid customer ID');
        }
        if (!sanitizedEphemeralKey || sanitizedEphemeralKey.length < 10) {
          throw new Error('Invalid ephemeral key');
        }

        // CRITICAL: DO NOT close modal before payment - keep it open to prevent crashes
        // The payment sheet will overlay the modal, and we'll close the modal after payment completes
        // Setting loadingPayment to true prevents modal from closing via onRequestClose

        // Use InteractionManager correctly - it requires a callback
        await new Promise<void>(resolve => {
          try {
            InteractionManager.runAfterInteractions(() => {
              resolve();
            });
          } catch (interactionError) {
            // If InteractionManager fails, just wait a bit longer
            logger.warn(
              '[WALLET] InteractionManager failed, using delay instead:',
              'WALLET',
              interactionError
            );
            setTimeout(() => resolve(), 200);
          }
        });

        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize Stripe PaymentSheet - this is a native call that can crash
        // Make absolutely sure we're not passing null/undefined
        // Focus only on Stripe card payments - Apple Pay/Google Pay controlled by backend
        const initParams = {
          merchantDisplayName: 'TriviaPay',
          paymentIntentClientSecret: sanitizedClientSecret,
          customerId: sanitizedCustomerId,
          customerEphemeralKeySecret: sanitizedEphemeralKey,
          // Note: Apple Pay and Google Pay are controlled by backend PaymentIntent
          // If backend has automatic_payment_methods enabled, they may appear
          // For now, we focus on card payments only
        };

        logger.log('[WALLET] Calling initPaymentSheet now with params:', 'WALLET', {
          merchantDisplayName: initParams.merchantDisplayName,
          hasClientSecret: !!initParams.paymentIntentClientSecret,
          hasCustomerId: !!initParams.customerId,
          hasEphemeralKey: !!initParams.customerEphemeralKeySecret,
        });

        // Wrap in requestAnimationFrame to ensure we're on the right thread
        await new Promise(resolve => {
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => resolve(undefined));
          } else {
            setTimeout(() => resolve(undefined), 16);
          }
        });

        // Final check before calling native function
        logger.log('[WALLET] Final check before initPaymentSheet:', 'WALLET', {
          initPaymentSheetType: typeof initPaymentSheet,
          isFunction: typeof initPaymentSheet === 'function',
          params: {
            merchantDisplayName: initParams.merchantDisplayName,
            clientSecretLength: initParams.paymentIntentClientSecret?.length || 0,
            customerIdLength: initParams.customerId?.length || 0,
            ephemeralKeyLength: initParams.customerEphemeralKeySecret?.length || 0,
          },
        });

        // Use a promise with timeout to prevent hanging
        const initPromise = new Promise(async (resolve, reject) => {
          try {
            // CRITICAL: Check mounted state before native call
            if (!isMounted() || !isMountedRef.current) {
              reject(new Error('Component unmounted before initPaymentSheet'));
              return;
            }

            // Double-check function is still valid
            if (!initPaymentSheet || typeof initPaymentSheet !== 'function') {
              reject(new Error('initPaymentSheet became invalid'));
              return;
            }

            logger.log('[WALLET] Actually calling initPaymentSheet now...', 'WALLET');

            // CRITICAL: Wrap native call in additional try-catch to prevent crashes
            let result: any = null;
            try {
              result = await initPaymentSheet(initParams);
              logger.log('[WALLET] initPaymentSheet returned:', 'WALLET', {
                hasError: !!result?.error,
              });
            } catch (nativeCallError: any) {
              // Native call crashed - catch it here
              logger.error('[WALLET] initPaymentSheet native call crashed:', 'WALLET', {
                message:
                  nativeCallError?.message || String(nativeCallError) || 'Unknown native error',
                name: nativeCallError?.name || 'Error',
                stack: nativeCallError?.stack,
              });
              reject(
                new Error(
                  `Payment initialization failed: ${nativeCallError?.message || 'Native error'}`
                )
              );
              return;
            }

            resolve(result);
          } catch (error: any) {
            logger.error('[WALLET] initPaymentSheet promise error:', 'WALLET', error);
            reject(error);
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Payment initialization timeout')), 10000)
        );

        try {
          initResult = (await Promise.race([initPromise, timeoutPromise])) as any;
        } catch (raceError: any) {
          // Promise.race failed - catch it
          logger.error('[WALLET] Promise.race error in initPaymentSheet:', 'WALLET', raceError);
          throw raceError;
        }

        logger.log('[WALLET] initPaymentSheet completed:', 'WALLET', {
          hasError: !!initResult?.error,
          errorMessage: initResult?.error?.message,
        });
      } catch (nativeError: any) {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state after native error', 'WALLET', stateError);
        }

        // Safely serialize error to prevent Redux serialization errors
        const safeError = {
          message: nativeError?.message || String(nativeError) || 'Unknown error',
          name: nativeError?.name || 'Error',
          code: nativeError?.code || undefined,
          stack: nativeError?.stack,
        };
        logger.error('Stripe initPaymentSheet native crash', 'WALLET', safeError);

        // Show detailed error to user only if mounted
        if (isMounted() && isMountedRef.current) {
          const errorDetails =
            nativeError?.message || String(nativeError) || 'Unknown error occurred';
          Alert.alert(
            'Payment Initialization Failed',
            `Failed to initialize payment:\n\n${errorDetails}\n\nThis may be due to:\n1. Stripe SDK not properly linked - please rebuild the app\n2. Invalid payment configuration\n3. Network connectivity issues\n\nPlease check the console logs for more details.`,
            [{ text: 'OK' }]
          );
        }
        return;
      }

      if (initResult?.error) {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state', 'WALLET', stateError);
        }
        if (isMounted() && isMountedRef.current) {
          Alert.alert(
            'Payment Error',
            initResult.error.message || 'Failed to initialize payment sheet'
          );
        }
        return;
      }

      // CRITICAL: Keep modal open during payment presentation
      // Ensure loadingPayment is true so modal can't be closed
      // Don't close modal until payment completes (success or cancel)
      await new Promise(resolve => setTimeout(resolve, 200));

      let presentResult;
      try {
        // Validate presentPaymentSheet function one more time before calling
        if (!presentPaymentSheet || typeof presentPaymentSheet !== 'function') {
          throw new Error('presentPaymentSheet is not a function');
        }

        logger.log('[WALLET] About to call presentPaymentSheet - modal should stay open', 'WALLET');

        // CRITICAL: Ensure loadingPayment is true to prevent modal from closing
        // The modal's onRequestClose checks loadingPayment, so this keeps it open
        try {
          if (!loadingPayment && isMounted() && isMountedRef.current) {
            setLoadingPayment(true);
          }
        } catch (stateError: any) {
          logger.error('Error setting loading state before present', 'WALLET', stateError);
          // Continue anyway
        }

        // Small delay to ensure UI is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // CRITICAL: Modal MUST stay open - payment sheet overlays it
        // Present PaymentSheet - this is a native call
        // The modal will stay open because loadingPayment is true

        // CRITICAL: Check mounted state before native call
        if (!isMounted() || !isMountedRef.current) {
          throw new Error('Component unmounted before presentPaymentSheet');
        }

        logger.log('[WALLET] Presenting payment sheet now - modal will stay open', 'WALLET');

        // CRITICAL: Wrap native call in promise with error handling
        const presentPromise = new Promise(async (resolve, reject) => {
          try {
            // Double-check function is still valid
            if (!presentPaymentSheet || typeof presentPaymentSheet !== 'function') {
              reject(new Error('presentPaymentSheet became invalid'));
              return;
            }

            // CRITICAL: Wrap native call in try-catch to prevent crashes
            try {
              const result = await presentPaymentSheet();
              resolve(result);
            } catch (nativeCallError: any) {
              // Native call crashed - catch it here
              logger.error('[WALLET] presentPaymentSheet native call crashed:', 'WALLET', {
                message:
                  nativeCallError?.message || String(nativeCallError) || 'Unknown native error',
                name: nativeCallError?.name || 'Error',
                stack: nativeCallError?.stack,
              });
              reject(
                new Error(
                  `Payment presentation failed: ${nativeCallError?.message || 'Native error'}`
                )
              );
            }
          } catch (error: any) {
            logger.error('[WALLET] presentPaymentSheet promise error:', 'WALLET', error);
            reject(error);
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Payment sheet presentation timeout')), 20000)
        );

        try {
          presentResult = (await Promise.race([presentPromise, timeoutPromise])) as any;
        } catch (raceError: any) {
          // Promise.race failed - catch it
          logger.error('[WALLET] Promise.race error in presentPaymentSheet:', 'WALLET', raceError);
          throw raceError;
        }

        logger.log('[WALLET] presentPaymentSheet result:', 'WALLET', {
          hasError: !!presentResult?.error,
          errorCode: presentResult?.error?.code,
          errorMessage: presentResult?.error?.message,
        });
      } catch (nativeError: any) {
        // CRITICAL: Safely reset loading state
        try {
          if (isMounted() && isMountedRef.current) {
            setLoadingPayment(false);
          }
        } catch (stateError: any) {
          logger.error('Error resetting loading state after present error', 'WALLET', stateError);
        }

        // Safely serialize error
        const safeError = {
          message: nativeError?.message || String(nativeError) || 'Unknown error',
          name: nativeError?.name || 'Error',
          code: nativeError?.code || undefined,
        };
        logger.error('Stripe presentPaymentSheet error', 'WALLET', safeError);

        // Close modal on error - with safety check
        if (isMounted() && isMountedRef.current) {
          try {
            setShowTopupModal(false);
            setTopupAmount('');
          } catch (modalError: any) {
            logger.error('Error closing modal', 'WALLET', modalError);
          }

          // Show error to user
          try {
            const errorDetails =
              nativeError?.message || String(nativeError) || 'Unknown error occurred';
            Alert.alert('Payment Error', `Failed to show payment screen:\n\n${errorDetails}`, [
              { text: 'OK' },
            ]);
          } catch (alertError: any) {
            logger.error('Error showing alert', 'WALLET', alertError);
          }
        }
        return;
      }

      // Handle payment result
      // CRITICAL: Safely reset loading state
      try {
        if (isMounted() && isMountedRef.current) {
          setLoadingPayment(false);
        }
      } catch (stateError: any) {
        logger.error('Error resetting loading state after present', 'WALLET', stateError);
      }

      if (presentResult?.error) {
        // Close modal after payment sheet interaction - with safety check
        if (isMounted()) {
          setShowTopupModal(false);
          setTopupAmount('');

          // Check if user canceled
          if (presentResult.error.code === 'Canceled' || presentResult.error.code === 'Failed') {
            // User canceled or payment failed - no alert needed for cancel
            if (presentResult.error.code !== 'Canceled') {
              Alert.alert(
                'Payment Failed',
                presentResult.error.message || 'Payment could not be completed'
              );
            }
          } else {
            Alert.alert(
              'Payment Error',
              presentResult.error.message || 'Payment presentation failed'
            );
          }
        }
        return;
      }

      // Payment successful - refresh wallet and close modal
      try {
        // Close modal first - with safety check
        if (isMounted()) {
          setShowTopupModal(false);
          setTopupAmount('');
        }

        // Refresh wallet balance
        if (isMounted()) {
          await fetchWalletBalance();
        }

        // Show success message
        if (isMounted()) {
          Alert.alert('Success', 'Payment successful! Your wallet has been updated.');
        }
      } catch (refreshError: any) {
        logger.error('Failed to refresh after payment', 'WALLET', {
          message: refreshError?.message || String(refreshError) || 'Unknown error',
        });
        // Still show success since payment went through
        if (isMounted()) {
          Alert.alert('Success', 'Payment successful! Your wallet has been updated.');
        }
      }
    } catch (error: any) {
      // CRITICAL: Catch-all for any unexpected errors - MUST prevent crash
      // Safely serialize error to prevent Redux serialization errors
      const safeError = {
        message: error?.message || String(error) || 'Unknown error',
        name: error?.name || 'Error',
        code: error?.code || undefined,
      };
      logger.error('[WALLET] Unexpected payment error:', 'WALLET', safeError);

      // CRITICAL: Ensure loading state is reset safely
      try {
        if (isMounted() && isMountedRef.current) {
          setLoadingPayment(false);
        }
      } catch (stateError: any) {
        logger.error('Error resetting loading state', 'WALLET', stateError);
        // Continue - state might already be reset
      }

      // Safely extract error message
      let errorMessage = 'Payment failed. Please try again.';
      try {
        if (error?.message) {
          errorMessage = String(error.message);
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.toString) {
          errorMessage = error.toString();
        }
      } catch (e) {
        // If error extraction fails, use default message
        errorMessage = 'An unexpected error occurred during payment.';
      }

      // CRITICAL: Only show alert if component is still mounted
      if (!isMounted() || !isMountedRef.current) {
        logger.warn('Component unmounted, skipping error alert', 'WALLET');
        return;
      }

      // Check for specific error types and provide helpful messages
      try {
        const lowerMessage = errorMessage.toLowerCase();
        if (
          lowerMessage.includes('not found') ||
          lowerMessage.includes('404') ||
          lowerMessage.includes('endpoint not available') ||
          lowerMessage.includes('may not be implemented')
        ) {
          Alert.alert(
            'Payment Feature Not Available',
            'The payment endpoint (/api/v1/payments/payment-sheet) is not available on the backend yet.\n\nThis endpoint needs to be implemented on your backend to enable wallet top-ups.\n\nExpected endpoint:\nPOST /api/v1/payments/payment-sheet\n\nBody: {\n  "topup_type": "wallet_topup",\n  "amount_minor": 1000,\n  "currency": "usd"\n}\n\nPlease contact your backend team to implement this endpoint.',
            [{ text: 'OK' }]
          );
        } else if (
          lowerMessage.includes('not implemented') ||
          lowerMessage.includes('coming soon')
        ) {
          Alert.alert(
            'Feature Coming Soon',
            'Wallet top-up feature is coming soon. Please check back later or contact support for updates.',
            [{ text: 'OK' }]
          );
        } else {
          // Truncate very long error messages for better UX
          const displayMessage =
            errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage;
          Alert.alert('Payment Error', displayMessage);
        }
      } catch (alertError: any) {
        // Even showing alert failed - log it but don't crash
        logger.error('Error showing error alert', 'WALLET', alertError);
      }
    } finally {
      // CRITICAL: Always reset loading state, even if there was an error
      try {
        if (isMounted() && isMountedRef.current) {
          setLoadingPayment(false);
        }
      } catch (finallyError: any) {
        // If even this fails, log it but don't throw
        logger.error('Error in finally block', 'WALLET', finallyError);
      }
    }
  };

  // Handle withdrawal button press (checks onboarding first)
  const handleWithdrawPress = async () => {
    // Check if user needs to onboard first
    if (!stripeOnboarded) {
      await startOnboarding();
      return;
    }

    // If onboarded, show withdrawal modal
    setShowWithdrawModal(true);
  };

  // Handle actual withdrawal submission
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount * 100 > balance) {
      Alert.alert('Insufficient Funds', `You only have $${(balance / 100).toFixed(2)} available.`);
      return;
    }

    try {
      setLoadingPayment(true);

      const amountMinor = Math.round(amount * 100);
      const result = await requestWithdrawalMutation({
        amount_minor: amountMinor,
        type: withdrawType,
      }).unwrap();

      if (!isMounted() || !result) return;

      // Balance update handled by tag invalidation automatically
      // setBalance(result.new_balance_minor || balance);
      // await fetchWalletBalance();

      if (isMounted()) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      }

      if (result.status === 'paid') {
        Alert.alert('Success', 'Withdrawal successful! Funds have been sent to your account.');
      } else if (result.status === 'pending_review') {
        Alert.alert('Pending Review', 'Withdrawal requested. It is pending admin review.');
      } else {
        Alert.alert('Withdrawal Status', `Status: ${result.status}`);
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || String(error) || 'Unknown error';
      // Logs moved to RTK Query middleware usually, but keeping specific logic

      const displayErrorMessage = errorMessage || 'Withdrawal failed. Please try again.';

      // Check if user needs to complete onboarding
      if (
        displayErrorMessage.includes('not set up') ||
        displayErrorMessage.includes('complete onboarding') ||
        displayErrorMessage.includes('onboarding first')
      ) {
        setShowWithdrawModal(false);
        // Try to start onboarding process
        handleWithdrawPress();
        return;
      }

      Alert.alert('Withdrawal Error', displayErrorMessage);
    } finally {
      if (isMounted()) {
        setLoadingPayment(false);
      }
    }
  };

  // Theme colors (matching old PaymentScreen)
  const isDarkMode = false; // You can make this dynamic based on your theme
  const colors: ThemeColors = {
    background: isDarkMode ? '#121212' : '#EFF6FF',
    cardBackground: isDarkMode ? '#1E1E1E' : 'white',
    text: isDarkMode ? '#FFFFFF' : '#333',
    textSecondary: isDarkMode ? '#B0B0B0' : '#666',
    tabActive: isDarkMode ? '#FFEB3B' : '#1E3A8A',
    accent: isDarkMode ? '#13b7e3' : '#3B82F6',
    border: isDarkMode ? '#333' : '#EEE',
  };

  // REMOVED: fetchTransactions function - we don't call /api/v1/wallet/transactions endpoint
  // Transactions only come from wallet balance response if included

  // Animation effects
  useEffect(() => {
    // Start coin rotation animation
    coinRotationAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(coinRotation, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(coinRotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    coinRotationAnimation.current.start();

    // Start coin pulse animation
    coinScaleAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(coinScale, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(coinScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    coinScaleAnimation.current.start();

    return () => {
      // Cleanup animations on unmount
      if (coinRotationAnimation.current) {
        coinRotationAnimation.current.stop();
        coinRotationAnimation.current = null;
      }
      if (coinScaleAnimation.current) {
        coinScaleAnimation.current.stop();
        coinScaleAnimation.current = null;
      }
    };
  }, []);

  // Handle input focus with smooth scrolling
  // Removed handleInputFocus - using inline onFocus handler for better control

  // Calculate dollar equivalent
  const calculateDollars = () => {
    const tp = Number.parseFloat(tpAmount) || 0;
    return (tp * conversionRate).toFixed(2);
  };

  const handleBackToHome = () => {
    // Navigate back to Home screen
    navigation.navigate('Home' as never);
  };

  // Button press animation handlers
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isMounted()) return;

    // setRefreshing(true); // managed by RTK Query derived state, but we trigger refetch

    try {
      await refetchWallet();
    } catch (error: any) {
      logger.error('Refresh error', 'WALLET', { message: error?.message });
    }
  }, [isMounted, refetchWallet]);

  // Memoized styles
  const styles = useMemo(
    () => createStyles(colors, scaleFont, scaleSizeFunc, getHorizontalSpacing, getVerticalSpacing),
    [colors, scaleFont, scaleSizeFunc, getHorizontalSpacing, getVerticalSpacing]
  );

  // Memoized coin rotation style - ensure coinRotation is valid before interpolating
  const coinRotateStyle = useMemo(() => {
    if (!coinRotation || typeof coinRotation.interpolate !== 'function') {
      // Fallback if coinRotation is not properly initialized
      return {
        transform: [{ rotateY: '0deg' }, { scale: coinScale }],
      };
    }
    return {
      transform: [
        {
          rotateY: coinRotation.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          }),
        },
        {
          scale: coinScale,
        },
      ],
    };
  }, [coinRotation, coinScale]);

  // Status bar is handled by SafeScreenWrapper
  const content = (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleWrapper}>
            {/* Blue border text - rendered 8 times around the white text */}
            {(() => {
              const strokeWidth = scaleSizeFunc(2);
              const fontSize = scaleFont(28);
              return [
                { x: -strokeWidth, y: -strokeWidth },
                { x: 0, y: -strokeWidth },
                { x: strokeWidth, y: -strokeWidth },
                { x: -strokeWidth, y: 0 },
                { x: strokeWidth, y: 0 },
                { x: -strokeWidth, y: strokeWidth },
                { x: 0, y: strokeWidth },
                { x: strokeWidth, y: strokeWidth },
              ].map((offset, index) => (
                <Text
                  key={index}
                  style={[
                    typography.h2,
                    {
                      position: 'absolute',
                      color: '#1E3A8A',
                      fontSize,
                      fontWeight: 'normal',
                      fontFamily:
                        Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                      textAlign: 'center',
                      left: offset.x,
                      top: offset.y,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  PAYMENT
                </Text>
              ));
            })()}
            {/* White text on top */}
            <Text style={styles.headerTitle}>PAYMENT</Text>
          </View>
        </View>
        <SoundTouchableOpacity
          soundType="button"
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Icon name="account" size={scaleSizeFunc(24)} color="#FFFFFF" />
        </SoundTouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={useMemo(() => ({ flex: 1 }), [])}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0} // STABILIZED: Fixed offset to prevent jumping
        enabled={!showTopupModal && !showWithdrawModal} // Disable when modals open
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Optimized scrolling for smoothness
          bounces={Platform.OS === 'ios'}
          alwaysBounceVertical={false}
          overScrollMode={Platform.OS === 'android' ? 'never' : 'auto'}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* Payment Methods Section */}
          <View style={styles.paymentMethodsCard}>
            <SoundTouchableOpacity
              soundType="button"
              style={styles.paymentMethodsHeader}
              onPress={() => setShowPaymentOptions(!showPaymentOptions)}
            >
              <View style={styles.paymentMethodsTitleRow}>
                <Icon name="credit-card" size={scaleSize(24)} color={colors.accent} />
                <Text style={styles.paymentMethodsTitle}>Payment Methods</Text>
              </View>
              <Icon
                name={showPaymentOptions ? 'chevron-down' : 'chevron-up'}
                size={scaleSize(16)}
                color={colors.accent}
              />
            </SoundTouchableOpacity>

            {showPaymentOptions && (
              <>
                <SoundTouchableOpacity soundType="button" style={styles.paymentMethodItem}>
                  <View style={styles.paymentMethodRow}>
                    <View
                      style={[styles.paymentMethodIcon, { backgroundColor: colors.tabActive }]}
                    >
                      <Text style={styles.paymentMethodIconText}>V</Text>
                    </View>
                    <View>
                      <Text style={styles.paymentMethodTitle}>Visa ending in 4242</Text>
                      <Text style={styles.paymentMethodSubtitle}>Expires 12/25</Text>
                    </View>
                  </View>
                </SoundTouchableOpacity>

                <SoundTouchableOpacity soundType="button" style={styles.paymentMethodItem}>
                  <View style={styles.paymentMethodRow}>
                    <View style={[styles.paymentMethodIcon, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.paymentMethodIconText}>B</Text>
                    </View>
                    <View>
                      <Text style={styles.paymentMethodTitle}>Bank Account</Text>
                      <Text style={styles.paymentMethodSubtitle}>**** 5678</Text>
                    </View>
                  </View>
                </SoundTouchableOpacity>

                <SoundTouchableOpacity
                  soundType="button"
                  style={styles.addPaymentButton}
                  onPress={() => {
                    if (!isStripeInstalled) {
                      Alert.alert(
                        'Payment Feature Unavailable',
                        'Stripe payment SDK is not installed. Please install @stripe/stripe-react-native to enable wallet top-ups.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    setShowTopupModal(true);
                  }}
                >
                  <Text style={styles.addPaymentText}>
                    {isStripeInstalled
                      ? '+ Add Payment Method / Top Up'
                      : '+ Top Up (SDK Required)'}
                  </Text>
                </SoundTouchableOpacity>
              </>
            )}
          </View>

          {/* Auto-Pay Section */}
          <View style={styles.autoPayCard}>
            <SoundTouchableOpacity
              soundType="button"
              style={styles.autoPayHeader}
              onPress={() => setAutoPayEnabled(!autoPayEnabled)}
            >
              <View style={styles.autoPayTitleRow}>
                <Icon name="swap-horizontal" size={scaleSize(24)} color={colors.accent} />
                <View style={styles.autoPayTextContainer}>
                  <Text style={styles.autoPayTitle}>Auto-Pay</Text>
                  <Text style={styles.autoPaySubtitle}>
                    Auto pay subscription for every month
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{
                  false: isDarkMode ? '#555' : '#E0E0E0',
                  true: colors.accent,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDarkMode ? '#555' : '#E0E0E0'}
                onValueChange={() => setAutoPayEnabled(!autoPayEnabled)}
                value={autoPayEnabled}
              />
            </SoundTouchableOpacity>
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={
              isDarkMode ? ['#121212', '#1E1E1E', '#2D2D2D'] : ['#93C5FD', '#60A5FA', '#1E40AF']
            }
            style={styles.balanceCard}
          >
            <View style={styles.balanceContent}>
              <Text style={styles.balanceTitle}>Your Balance</Text>

              <View style={styles.coinContainer}>
                <Animated.View style={coinRotateStyle}>
                  <Image
                    source={require('../../../../assets/icons/Tpcoin.png')}
                    style={styles.coinImage}
                    defaultSource={require('../../../../assets/icons/Tpcoin.png')}
                  />
                </Animated.View>
                <Text style={styles.balanceAmount}>{(balance / 100).toFixed(2)}</Text>
                <Text style={styles.balanceLabel}>USD Balance</Text>
                <Text style={styles.balanceSubLabel}>
                  {balance.toLocaleString()} cents / TriviaCoins
                </Text>
              </View>

              <View style={styles.convertCard}>
                <Text style={styles.convertTitle}>Convert TriviaCoins</Text>
                <View style={styles.conversionRateContainer}>
                  <Text style={styles.convertSubtitle}>1 TriviaCoin = $1.00 USD</Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.tpInput}
                    placeholder="Enter TriviaCoins"
                    placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                    keyboardType="numeric"
                    value={tpAmount}
                    onChangeText={setTpAmount}
                    returnKeyType="done"
                    onFocus={() => {
                      // Smooth focus - scroll to input if needed
                      setTimeout(() => {
                        inputRef.current?.measureLayout(
                          scrollViewRef.current as any,
                          (x, y) => {
                            scrollViewRef.current?.scrollTo({
                              y: y - 20,
                              animated: true,
                            });
                          },
                          () => { }
                        );
                      }, 100);
                    }}
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                <Text style={styles.dollarAmount}>${calculateDollars()}</Text>

                <SoundTouchableOpacity
                  soundType="button"
                  onPress={handleWithdrawPress}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.9}
                  disabled={!stripeOnboarded && false} // Allow clicking to show message
                >
                  <Animated.View
                    style={[
                      styles.withdrawButton,
                      !stripeOnboarded && styles.withdrawButtonDisabled,
                      {
                        transform: [{ scale: buttonScale }],
                      },
                    ]}
                  >
                    <ImageBackground
                      source={require('../../../../assets/payment/withdraw.png')}
                      style={[
                        styles.withdrawGradient,
                        !stripeOnboarded && styles.withdrawGradientDisabled,
                      ]}
                      resizeMode="cover"
                    >
                      {!stripeOnboarded && (
                        <View style={styles.withdrawDisabledOverlay}>
                          <Text style={styles.withdrawDisabledText}>Setup Required</Text>
                        </View>
                      )}
                    </ImageBackground>
                  </Animated.View>
                </SoundTouchableOpacity>

                <SoundTouchableOpacity
                  soundType="button"
                  onPress={() => {
                    if (!isStripeInstalled) {
                      Alert.alert(
                        'Payment Feature Unavailable',
                        'Stripe payment SDK is not installed. Please install @stripe/stripe-react-native to enable wallet top-ups.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    setShowTopupModal(true);
                  }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.9}
                  style={[styles.topupButton, !isStripeInstalled && styles.topupButtonDisabled]}
                >
                  <Text style={styles.topupButtonText}>
                    {isStripeInstalled ? 'Top Up Wallet' : 'Top Up (SDK Required)'}
                  </Text>
                </SoundTouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Transaction History Section */}
          <View style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Icon name="swap-horizontal" size={scaleSize(24)} color={colors.tabActive} />
              <Text style={styles.transactionTitle}>Transaction history</Text>
            </View>

            {loadingTransactions ? (
              <View style={styles.transactionLoadingContainer}>
                <Text style={styles.transactionLoadingText}>Loading transactions...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.transactionEmptyContainer}>
                <Text style={styles.transactionEmptyText}>No transactions yet</Text>
              </View>
            ) : (
              <>
                {transactions.slice(0, 5).map(transaction => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                    <View style={styles.transactionRow}>
                      <Text style={styles.transactionDescription}>{transaction.title}</Text>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.type === 'credit'
                            ? styles.creditAmount
                            : styles.debitAmount,
                        ]}
                      >
                        {transaction.type === 'credit' ? '+' : '-'}$
                        {transaction.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}

                {transactions.length > 5 && (
                  <SoundTouchableOpacity soundType="button" style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>
                      View All Transactions ({transactions.length})
                    </Text>
                  </SoundTouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      {/* Tooltip Modal */}
      < Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTooltip(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdrawal Information</Text>
            <Text style={styles.modalText}>• Minimum withdrawal amount is $5.00</Text>
            <Text style={styles.modalText}>• Instant withdrawals: 2% fee or $0.50 minimum</Text>
            <Text style={styles.modalText}>
              • Standard withdrawals: No fee, requires admin approval
            </Text>
            <Text style={styles.modalText}>
              • Withdrawals are processed within 1-3 business days
            </Text>
            <Text style={styles.modalText}>• Continue playing to earn more rewards!</Text>
            <SoundTouchableOpacity
              soundType="button"
              style={styles.modalButton}
              onPress={() => setShowTooltip(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </SoundTouchableOpacity>
          </View>
        </Pressable>
      </Modal >

      {/* Top-up Modal - Optimized for stable keyboard */}
      < Modal
        visible={showTopupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!loadingPayment) {
            setShowTopupModal(false);
            setTopupAmount('');
            Keyboard.dismiss();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => {
              if (!loadingPayment) {
                Keyboard.dismiss();
                setShowTopupModal(false);
                setTopupAmount('');
              }
            }}
          >
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
            enabled={Platform.OS === 'ios'}
          >
            <View
              style={[
                styles.modalContent,
                { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom + 20, 30) },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Top Up Wallet</Text>
                <SoundTouchableOpacity
                  soundType="button"
                  onPress={() => {
                    if (!loadingPayment) {
                      Keyboard.dismiss();
                      setShowTopupModal(false);
                      setTopupAmount('');
                    }
                  }}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={scaleSize(24)} color={colors.text} />
                </SoundTouchableOpacity>
              </View>

              <Text style={styles.modalText}>Enter amount in USD</Text>
              <TextInput
                ref={topupInputRef}
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={topupAmount}
                onChangeText={setTopupAmount}
                editable={!loadingPayment}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
                autoFocus={true}
              />
              <Text style={styles.modalSubtext}>
                Amount: ${parseFloat(topupAmount || '0').toFixed(2)} USD
              </Text>

              <SoundTouchableOpacity
                soundType="button"
                style={[styles.modalButton, loadingPayment && styles.modalButtonDisabled]}
                onPress={async () => {
                  // CRITICAL: Prevent any crashes - wrap everything in try-catch
                  try {
                    // Prevent double-clicks
                    if (loadingPayment) {
                      logger.debug('Payment already in progress, ignoring click', 'WALLET');
                      return;
                    }

                    // Prevent crashes by validating state
                    if (!isMounted() || !isMountedRef.current) {
                      logger.warn('Component unmounted, aborting payment', 'WALLET');
                      return;
                    }

                    // Validate input safely
                    try {
                      if (
                        !topupAmount ||
                        typeof topupAmount !== 'string' ||
                        topupAmount.trim() === ''
                      ) {
                        Alert.alert('Invalid Amount', 'Please enter an amount');
                        return;
                      }

                      const amount = parseFloat(topupAmount);
                      if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
                        Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
                        return;
                      }
                    } catch (validationError: any) {
                      logger.error('Input validation error', 'WALLET', validationError);
                      Alert.alert('Invalid Input', 'Please check the amount and try again');
                      return;
                    }

                    // Check Stripe installation safely
                    try {
                      if (!isStripeInstalled) {
                        Alert.alert(
                          'Payment Unavailable',
                          'Stripe SDK is not installed. Please rebuild the app with Stripe SDK properly linked.'
                        );
                        return;
                      }
                    } catch (stripeCheckError: any) {
                      logger.error('Stripe check error', 'WALLET', stripeCheckError);
                      Alert.alert(
                        'Payment Error',
                        'Unable to verify payment system. Please try again.'
                      );
                      return;
                    }

                    // Check if modal is still open
                    if (!showTopupModal) {
                      logger.warn('Modal closed before payment', 'WALLET');
                      return;
                    }

                    // Check Stripe functions availability safely
                    let initFunc: any = null;
                    let presentFunc: any = null;
                    try {
                      initFunc = initPaymentSheetRef?.current;
                      presentFunc = presentPaymentSheetRef?.current;
                    } catch (refError: any) {
                      logger.error('Error accessing Stripe refs', 'WALLET', refError);
                      Alert.alert('Payment Error', 'Payment system not ready. Please try again.');
                      return;
                    }

                    if (
                      !initFunc ||
                      !presentFunc ||
                      typeof initFunc !== 'function' ||
                      typeof presentFunc !== 'function'
                    ) {
                      Alert.alert(
                        'Payment Not Ready',
                        'Stripe payment functions are not available. Please wait a moment and try again, or restart the app.'
                      );
                      return;
                    }

                    // Ensure modal stays open during payment
                    try {
                      if (!showTopupModal && isMounted()) {
                        setShowTopupModal(true);
                      }
                    } catch (modalError: any) {
                      logger.error('Error setting modal state', 'WALLET', modalError);
                      // Continue anyway - modal might already be open
                    }

                    // Dismiss keyboard safely
                    try {
                      Keyboard.dismiss();
                    } catch (keyboardError: any) {
                      logger.warn('Error dismissing keyboard', 'WALLET', keyboardError);
                      // Continue anyway - keyboard dismissal is not critical
                    }

                    // Call handleTopup with comprehensive error protection
                    try {
                      await handleTopup();
                    } catch (topupError: any) {
                      // handleTopup should handle its own errors, but catch any unhandled ones
                      logger.error('Unhandled error in handleTopup', 'WALLET', topupError);

                      // Ensure we're still mounted before showing error
                      if (isMounted() && isMountedRef.current) {
                        setLoadingPayment(false);
                        const errorMsg =
                          topupError?.message || String(topupError) || 'Payment failed';
                        Alert.alert('Payment Error', `Payment failed: ${errorMsg}`);
                      }
                    }
                  } catch (error: any) {
                    // CRITICAL: Catch-all to prevent any crash
                    logger.error('[WALLET] Payment button crash prevented:', 'WALLET', {
                      message: error?.message || String(error) || 'Unknown error',
                      name: error?.name || 'Error',
                      stack: error?.stack,
                    });

                    // Ensure we're still mounted before showing error
                    if (isMounted() && isMountedRef.current) {
                      try {
                        setLoadingPayment(false);
                        const errorMsg =
                          error?.message || String(error) || 'An unexpected error occurred';
                        Alert.alert('Payment Error', `Payment failed: ${errorMsg}`);
                      } catch (alertError: any) {
                        // Even alert failed - log it but don't crash
                        logger.error('Error showing alert', 'WALLET', alertError);
                      }
                    }
                  }
                }}
                disabled={loadingPayment}
              >
                <Text style={styles.modalButtonText}>
                  {loadingPayment ? 'Processing...' : 'Pay with Stripe'}
                </Text>
              </SoundTouchableOpacity>

              <SoundTouchableOpacity
                soundType="button"
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  if (!loadingPayment) {
                    Keyboard.dismiss();
                    setShowTopupModal(false);
                    setTopupAmount('');
                  }
                }}
                disabled={loadingPayment}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </SoundTouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal >

      {/* Withdrawal Modal - Optimized for stable keyboard */}
      < Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!loadingPayment) {
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            // Don't force dismiss keyboard - let user control it
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => {
              if (!loadingPayment) {
                // Close modal but keep keyboard state - don't force dismiss
                setShowWithdrawModal(false);
                setWithdrawAmount('');
              }
            }}
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end', zIndex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
            enabled={Platform.OS === 'ios'}
          >
            <View
              style={[
                styles.modalContent,
                { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom + 20, 30) },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw Funds</Text>
                <SoundTouchableOpacity
                  soundType="button"
                  onPress={() => {
                    if (!loadingPayment) {
                      Keyboard.dismiss();
                      setShowWithdrawModal(false);
                      setWithdrawAmount('');
                    }
                  }}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={scaleSize(24)} color={colors.text} />
                </SoundTouchableOpacity>
              </View>

              <Text style={styles.modalText}>Enter amount in USD</Text>
              <TextInput
                ref={withdrawInputRef}
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                editable={!loadingPayment}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // Don't auto-dismiss keyboard on submit - let user control it
                }}
                autoFocus={true}
                onFocus={() => {
                  // Ensure keyboard stays open when focused
                }}
                onBlur={() => {
                  // Only blur if user explicitly dismisses keyboard
                }}
              />
              <Text style={styles.modalSubtext}>Available: ${(balance / 100).toFixed(2)} USD</Text>

              <Text style={styles.modalText}>Withdrawal Type:</Text>
              <View style={styles.withdrawTypeContainer}>
                <SoundTouchableOpacity
                  soundType="button"
                  style={[
                    styles.withdrawTypeButton,
                    withdrawType === 'instant' && styles.withdrawTypeButtonActive,
                  ]}
                  onPress={() => setWithdrawType('instant')}
                  disabled={loadingPayment}
                >
                  <Text
                    style={[
                      styles.withdrawTypeText,
                      withdrawType === 'instant' && styles.withdrawTypeTextActive,
                    ]}
                  >
                    Instant (2% fee)
                  </Text>
                </SoundTouchableOpacity>
                <SoundTouchableOpacity
                  soundType="button"
                  style={[
                    styles.withdrawTypeButton,
                    withdrawType === 'standard' && styles.withdrawTypeButtonActive,
                  ]}
                  onPress={() => setWithdrawType('standard')}
                  disabled={loadingPayment}
                >
                  <Text
                    style={[
                      styles.withdrawTypeText,
                      withdrawType === 'standard' && styles.withdrawTypeTextActive,
                    ]}
                  >
                    Standard (No fee)
                  </Text>
                </SoundTouchableOpacity>
              </View>

              <SoundTouchableOpacity
                soundType="button"
                style={[styles.modalButton, loadingPayment && styles.modalButtonDisabled]}
                onPress={() => {
                  try {
                    Keyboard.dismiss();
                    handleWithdraw();
                  } catch (error: any) {
                    const safeError = {
                      message: error?.message || String(error) || 'Unknown error',
                    };
                    logger.error('Modal button press error', 'WALLET', safeError);
                    Alert.alert('Error', 'Failed to process withdrawal. Please try again.');
                  }
                }}
                disabled={loadingPayment}
              >
                <Text style={styles.modalButtonText}>
                  {loadingPayment ? 'Processing...' : 'Request Withdrawal'}
                </Text>
              </SoundTouchableOpacity>

              <SoundTouchableOpacity
                soundType="button"
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  if (!loadingPayment) {
                    Keyboard.dismiss();
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }
                }}
                disabled={loadingPayment}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </SoundTouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal >
    </View >
  );

  // Inner component that uses Stripe hooks (only rendered when StripeProvider is available)
  const StripeEnabledContent: React.FC = () => {
    // Hooks must be called unconditionally at the top level (Rules of Hooks)
    // Since this component is only rendered when StripeProvider exists, hooks should be available
    // Call hooks unconditionally - if they fail, we'll handle it gracefully
    let stripe: any = null;
    let paymentSheetHook: any = null;

    try {
      // Always call useStripe unconditionally (required by Rules of Hooks)
      stripe = useStripe();
    } catch (e: any) {
      // Hook call failed - stripe will remain null
      logger.warn('useStripe hook failed', 'WALLET', { error: e?.message });
    }

    try {
      // Always call usePaymentSheet unconditionally (required by Rules of Hooks)
      paymentSheetHook = usePaymentSheet();
    } catch (e: any) {
      // Hook call failed - paymentSheetHook will remain null
      logger.warn('usePaymentSheet hook failed', 'WALLET', { error: e?.message });
    }

    // Extract functions from paymentSheetHook
    const initPaymentSheet = paymentSheetHook?.initPaymentSheet || null;
    const presentPaymentSheet = paymentSheetHook?.presentPaymentSheet || null;

    // Store in refs so parent component can access them
    // Use a small delay to ensure hooks are fully initialized before setting refs
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (initPaymentSheet && typeof initPaymentSheet === 'function') {
          initPaymentSheetRef.current = initPaymentSheet;
        } else {
          initPaymentSheetRef.current = null;
        }

        if (presentPaymentSheet && typeof presentPaymentSheet === 'function') {
          presentPaymentSheetRef.current = presentPaymentSheet;
        } else {
          presentPaymentSheetRef.current = null;
        }

        if (stripe) {
          stripeRef.current = stripe;
        } else {
          stripeRef.current = null;
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [initPaymentSheet, presentPaymentSheet, stripe]);

    // Return the content JSX - content is defined in parent scope
    return <>{content}</>;
  };

  // Wrap with SafeScreenWrapper for responsive layout
  return (
    <ScreenErrorBoundary screenName="WalletScreen">
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'left', 'right']}
      >
        <ScreenBackButtonHandler action="navigate" />
        {StripeProvider && publishableKey ? (
          <StripeProvider publishableKey={publishableKey}>
            <StripeEnabledContent />
          </StripeProvider>
        ) : (
          content
        )}
      </SafeScreenWrapper>
    </ScreenErrorBoundary>
  );
};

// Styles factory
const createStyles = (
  colors: ThemeColors,
  scaleFont: (size: number) => number,
  scaleSize: (size: number) => number,
  getHorizontalSpacing: (multiplier: number) => number,
  getVerticalSpacing: (multiplier: number) => number
) =>
  StyleSheet.create({
    addPaymentButton: {
      alignItems: 'center',
      marginTop: scaleSize(12),
    },
    addPaymentText: {
      color: colors.accent,
      fontSize: scaleFont(12),
      fontWeight: '600',
    },
    autoPayCard: {
      backgroundColor: colors.cardBackground,
      borderColor: '#2563EB',
      borderRadius: scaleSize(12),
      borderWidth: scaleSize(2),
      elevation: 2,
      marginBottom: scaleSize(8),
      marginHorizontal: scaleSize(20),
      overflow: 'hidden',
      padding: getHorizontalSpacing(2),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaleSize(1) },
      shadowOpacity: 0.1,
      shadowRadius: scaleSize(2),
    },
    autoPayHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    autoPaySubtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      marginTop: scaleSize(4),
    },
    autoPayTextContainer: {
      marginLeft: scaleSize(8),
    },
    autoPayTitle: {
      color: colors.text,
      fontSize: scaleFont(16),
      fontWeight: '600',
    },
    autoPayTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    balanceAmount: {
      color: '#FFEB3B',
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      marginBottom: scaleSize(4),
      marginTop: scaleSize(8),
      textAlign: 'center',
    },
    balanceCard: {
      borderColor: '#2563EB',
      borderRadius: scaleSize(24),
      borderWidth: scaleSize(2),
      elevation: 8,
      marginHorizontal: scaleSize(20),
      marginTop: scaleSize(8),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaleSize(4) },
      shadowOpacity: 0.3,
      shadowRadius: scaleSize(8),
    },
    balanceContent: {
      paddingBottom: scaleSize(8),
      paddingHorizontal: scaleSize(24),
      paddingTop: scaleSize(8),
    },
    balanceLabel: {
      color: '#FFEB3B',
      fontSize: scaleFont(12),
      fontWeight: 'bold',
      textAlign: 'center',
    },
    balanceSubLabel: {
      color: colors.textSecondary,
      fontSize: scaleFont(10),
      marginTop: scaleSize(4),
      textAlign: 'center',
    },
    balanceTitle: {
      color: colors.text,
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      marginBottom: scaleSize(8),
      textAlign: 'center',
    },
    coinContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scaleSize(16),
    },
    coinImage: {
      borderRadius: scaleSize(40),
      height: scaleSize(80),
      width: scaleSize(80),
    },
    conversionRateContainer: {
      minHeight: scaleSize(20),
    },
    convertCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: scaleSize(16),
      marginBottom: scaleSize(8),
      padding: getHorizontalSpacing(2),
    },
    convertSubtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      marginBottom: scaleSize(16),
    },
    convertTitle: {
      color: colors.text,
      fontSize: scaleFont(16),
      fontWeight: 'bold',
      marginBottom: scaleSize(8),
    },
    creditAmount: {
      color: '#10B981',
    },
    debitAmount: {
      color: '#EF4444',
    },
    dollarAmount: {
      color: colors.text,
      fontSize: scaleSize(18),
      fontWeight: 'bold',
      marginBottom: scaleSize(16),
    },
    header: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
      borderBottomWidth: 1,
      elevation: 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: scaleSize(12),
      paddingHorizontal: scaleSize(16),
      paddingTop: scaleSize(10),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      zIndex: 10,
    },
    headerTitle: {
      ...typography.h2,
      color: '#FFFFFF',
      fontFamily: Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
      fontSize: scaleFont(28),
      fontWeight: 'normal',
      includeFontPadding: false,
      textAlign: 'center',
      textShadowColor: '#000000',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    headerTitleContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    headerTitleWrapper: {
      alignItems: 'center',
      position: 'relative',
    },
    inputContainer: {
      marginBottom: scaleSize(8),
    },
    modalButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: scaleSize(8),
      marginBottom: scaleSize(8),
      marginTop: scaleSize(16),
      paddingVertical: scaleSize(12),
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    modalButtonSecondary: {
      backgroundColor: 'transparent',
      borderColor: colors.accent,
      borderWidth: scaleSize(1),
      marginTop: scaleSize(8),
    },
    modalButtonText: {
      color: 'white',
      fontSize: scaleFont(14),
      fontWeight: '600',
    },
    modalButtonTextSecondary: {
      color: colors.accent,
    },
    modalCloseButton: {
      backgroundColor: 'transparent',
      borderRadius: scaleSize(20),
      padding: scaleSize(4),
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: scaleSize(20),
      borderTopRightRadius: scaleSize(20),
      elevation: 5,
      maxHeight: '90%',
      minHeight: scaleSize(200),
      padding: scaleSize(24),
      paddingBottom: scaleSize(40),
      paddingHorizontal: scaleSize(24),
      paddingTop: scaleSize(24),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: scaleSize(3.84),
      width: '100%',
    },
    modalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: scaleSize(16),
      width: '100%',
    },
    modalInput: {
      backgroundColor: colors.background === '#EFF6FF' ? '#f3f4f6' : '#121212',
      borderColor: colors.border,
      borderRadius: scaleSize(12),
      borderWidth: scaleSize(1),
      color: colors.text,
      fontSize: scaleFont(16),
      marginBottom: scaleSize(8),
      marginTop: scaleSize(8),
      padding: scaleSize(12),
      paddingHorizontal: scaleSize(16),
      width: '100%',
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalSubtext: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      marginBottom: scaleSize(16),
    },
    modalText: {
      color: colors.text,
      fontSize: scaleFont(12),
      lineHeight: scaleSize(18),
      marginBottom: scaleSize(8),
    },
    modalTitle: {
      color: colors.text,
      flex: 1,
      fontSize: scaleFont(18),
      fontWeight: 'bold',
      textAlign: 'center',
    },
    paymentMethodIcon: {
      alignItems: 'center',
      borderRadius: scaleSize(20),
      height: scaleSize(40),
      justifyContent: 'center',
      marginRight: scaleSize(12),
      width: scaleSize(40),
    },
    paymentMethodIconText: {
      color: 'white',
      fontSize: scaleFont(16),
      fontWeight: 'bold',
    },
    paymentMethodItem: {
      borderBottomColor: colors.border,
      borderBottomWidth: scaleSize(1),
      paddingVertical: scaleSize(12),
    },
    paymentMethodRow: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    paymentMethodSubtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      marginTop: scaleSize(2),
    },
    paymentMethodTitle: {
      color: colors.text,
      fontSize: scaleFont(14),
      fontWeight: '500',
    },
    paymentMethodsCard: {
      backgroundColor: colors.cardBackground,
      borderColor: '#2563EB',
      borderRadius: scaleSize(12),
      borderWidth: scaleSize(2),
      elevation: 2,
      marginBottom: scaleSize(16),
      marginHorizontal: scaleSize(20),
      marginTop: scaleSize(24),
      overflow: 'hidden',
      padding: getHorizontalSpacing(2),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaleSize(1) },
      shadowOpacity: 0.1,
      shadowRadius: scaleSize(2),
    },
    paymentMethodsHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    paymentMethodsTitle: {
      color: colors.text,
      fontSize: scaleFont(16),
      fontWeight: '600',
      marginLeft: scaleSize(8),
    },
    paymentMethodsTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    profileButton: {
      alignItems: 'center',
      backgroundColor: 'rgba(123,104,238,0.1)',
      borderRadius: scaleSize(20),
      height: scaleSize(40),
      justifyContent: 'center',
      width: scaleSize(40),
    },
    safeArea: {
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: scaleSize(20),
    },
    topupButton: {
      alignSelf: 'center',
      backgroundColor: colors.accent,
      borderRadius: scaleSize(12),
      marginTop: scaleSize(12),
      paddingHorizontal: scaleSize(24),
      paddingVertical: scaleSize(12),
    },
    topupButtonDisabled: {
      backgroundColor: colors.textSecondary,
      opacity: 0.6,
    },
    topupButtonText: {
      color: 'white',
      fontSize: scaleFont(14),
      fontWeight: '600',
      textAlign: 'center',
    },
    tpInput: {
      backgroundColor: colors.background === '#EFF6FF' ? '#f3f4f6' : '#121212',
      borderRadius: scaleSize(12),
      color: colors.text,
      fontSize: scaleFont(12),
      padding: scaleSize(8),
      paddingHorizontal: scaleSize(16),
      width: '100%',
    },
    transactionAmount: {
      fontSize: scaleFont(14),
      fontWeight: '600',
    },
    transactionCard: {
      backgroundColor: colors.cardBackground,
      borderColor: '#2563EB',
      borderRadius: scaleSize(12),
      borderWidth: scaleSize(2),
      elevation: 2,
      marginBottom: scaleSize(16),
      marginHorizontal: scaleSize(20),
      marginTop: scaleSize(16),
      overflow: 'hidden',
      padding: getHorizontalSpacing(2),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaleSize(1) },
      shadowOpacity: 0.1,
      shadowRadius: scaleSize(2),
    },
    transactionDate: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      marginBottom: scaleSize(4),
    },
    transactionDescription: {
      color: colors.text,
      fontSize: scaleFont(14),
    },
    transactionEmptyContainer: {
      alignItems: 'center',
      paddingVertical: scaleSize(20),
    },
    transactionEmptyText: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      fontStyle: 'italic',
    },
    transactionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: scaleSize(16),
    },
    transactionItem: {
      marginBottom: scaleSize(12),
    },
    transactionLoadingContainer: {
      alignItems: 'center',
      paddingVertical: scaleSize(20),
    },
    transactionLoadingText: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
    },
    transactionRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    transactionTitle: {
      color: colors.text,
      fontSize: scaleFont(16),
      fontWeight: '600',
      marginLeft: scaleSize(8),
    },
    viewAllButton: {
      alignItems: 'center',
      marginTop: scaleSize(8),
    },
    viewAllText: {
      color: colors.tabActive,
      fontSize: scaleFont(12),
      fontWeight: '600',
    },
    withdrawButton: {
      alignSelf: 'center',
      borderRadius: scaleSize(12),
      height: scaleSize(40),
      overflow: 'hidden',
      width: scaleSize(120),
    },
    withdrawButtonDisabled: {
      opacity: 0.6,
    },
    withdrawButtonText: {
      color: 'white',
      fontSize: scaleFont(14),
      fontWeight: 'bold',
      textAlign: 'center',
    },
    withdrawDisabledOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: scaleSize(12),
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    withdrawDisabledText: {
      color: 'white',
      fontSize: scaleFont(10),
      fontWeight: '600',
      textAlign: 'center',
    },
    withdrawGradient: {
      alignItems: 'center',
      borderRadius: scaleSize(12),
      height: '100%',
      justifyContent: 'center',
      width: '100%',
    },
    withdrawGradientDisabled: {
      opacity: 0.7,
    },
    withdrawTypeButton: {
      alignItems: 'center',
      backgroundColor: colors.background === '#EFF6FF' ? '#f3f4f6' : '#121212',
      borderColor: colors.border,
      borderRadius: scaleSize(8),
      borderWidth: scaleSize(1),
      flex: 1,
      paddingHorizontal: scaleSize(12),
      paddingVertical: scaleSize(10),
    },
    withdrawTypeButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    withdrawTypeContainer: {
      flexDirection: 'row',
      gap: scaleSize(8),
      marginBottom: scaleSize(16),
      marginTop: scaleSize(8),
    },
    withdrawTypeText: {
      color: colors.text,
      fontSize: scaleFont(12),
      fontWeight: '500',
    },
    withdrawTypeTextActive: {
      color: 'white',
      fontWeight: '600',
    },
  });

export default WalletScreen;
