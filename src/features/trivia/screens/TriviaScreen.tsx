/**
 * TriviaScreen - TypeScript Implementation
 * Complete trivia game implementation with all functionality from old version
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  ImageBackground,
  Image,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { MainNavigationProp, MainStackParamList } from '../../../navigation/types';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AdBanner from '../../../components/AdBanner';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useSoundEffects } from '../../../hooks/use-sound-effects';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
// Use Safe Audio Manager (react-native-sound based)
import soundManager from '../../../lib/audio/AudioManagerSafe';
import { useTrackScreenView, useAnalytics } from '../../../hooks/useAnalytics';
import CongratsScreen from './CongratsScreen';
import FreeModeCompletionModal from './FreeModeCompletionModal';
import Confetti from '../../../components/modals/Trivia/Confetti';
import Tooltip from './Tooltip';
import GradientText from './GradientText';
import OptionButton from './OptionButton';
import GlassContainer from './GlassContainer';
import { useEntranceAnimations } from '../../../hooks/Trivia/useAnimations';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import {
  setSelectedAnswer,
  resetTrivia,
  setIsSubmitted,
  setCurrentFreeModeQuestion,
  fetchCurrentQuestion,
  submitAnswer,
  fetchFreeModeQuestions,
  fetchFreeModeStatus,
  submitFreeModeAnswer,
  fetchCurrentFreeQuestion,
  fetchBronzeModeQuestion,
  fetchBronzeModeStatus,
  submitBronzeModeAnswer,
  fetchSilverModeQuestion,
  fetchSilverModeStatus,
  submitSilverModeAnswer,
  setCurrentMode,
  checkQuestionStatus,
} from '../../../store/triviaSlice';
import { fetchUserGems } from '../../../store/slices/shopSlice';
import { useShop } from '../../../hooks/useReduxHooks';
import { RootState, AppDispatch } from '../../../store';
import { testApiConnectivity } from '../../../services/api/apiclient';
import { typography, FONTS } from '../../../theme/typography';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import {
  usePlatformOptimization,
  useHapticFeedback,
  useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { logger } from '../../../lib/utils/logger';

// Convert API question format to UI format
// CRITICAL: This function is now called via useMemo, so it only runs when apiQuestion changes
const convertQuestionToUIFormat = (apiQuestion: any) => {
  // Only log when apiQuestion changes (not on every render)
  if (!apiQuestion) {
    return null;
  }

  try {
    // CRITICAL: Add null checks to prevent crashes
    if (!apiQuestion.question || !apiQuestion.options) {
      logger.warn('convertQuestionToUIFormat - Missing required fields', 'TRIVIA', {
        hasQuestion: !!apiQuestion.question,
        hasOptions: !!apiQuestion.options,
      });
      return null;
    }

    // Safe access with fallbacks
    const options = Array.isArray(apiQuestion.options)
      ? apiQuestion.options.map((opt: any, index: number) => ({
        id: String.fromCharCode(97 + index), // a, b, c, d
        text: typeof opt === 'string' ? opt : opt.text || opt.option || '',
        disabled: false,
      }))
      : [
        { id: 'a', text: apiQuestion.options.a || '', disabled: false },
        { id: 'b', text: apiQuestion.options.b || '', disabled: false },
        { id: 'c', text: apiQuestion.options.c || '', disabled: false },
        { id: 'd', text: apiQuestion.options.d || '', disabled: false },
      ];

    const converted = {
      text: apiQuestion.question || '',
      options,
      correctAnswer: (apiQuestion.correct_answer || '').toLowerCase(),
      questionNumber: apiQuestion.question_number || 0,
      hint: apiQuestion.hint || '',
      category: apiQuestion.category || '',
      difficulty: apiQuestion.difficulty || '',
    };
    // Only log on successful conversion when question number changes
    logger.debug(`convertQuestionToUIFormat - Success for Q#${converted.questionNumber}`, 'TRIVIA');
    return converted;
  } catch (error) {
    logger.error('convertQuestionToUIFormat - ERROR', 'TRIVIA', error, apiQuestion);
    return null;
  }
};

interface Question {
  text: string;
  options: Array<{ id: string; text: string; disabled?: boolean }>;
  correctAnswer: string;
  questionNumber: number;
  hint: string;
  category: string;
  difficulty: string;
}

// Mock question data - replaces API integration
const MOCK_QUESTIONS = [
  {
    question_number: 1,
    question: 'What is the capital city of France?',
    options: {
      a: 'London',
      b: 'Berlin',
      c: 'Paris',
      d: 'Madrid',
    },
    correct_answer: 'c',
    hint: 'This city is known as the City of Light.',
    category: 'Geography',
    difficulty: 'Easy',
    total_gems: 100,
    order: 1,
    is_common: true,
    is_used: false,
    total_questions: 10,
    questions_answered: 0,
    daily_completed: false,
  },
  {
    question_number: 2,
    question: 'Which planet is known as the Red Planet?',
    options: {
      a: 'Venus',
      b: 'Mars',
      c: 'Jupiter',
      d: 'Saturn',
    },
    correct_answer: 'b',
    hint: "It's the fourth planet from the Sun.",
    category: 'Science',
    difficulty: 'Easy',
    total_gems: 100,
    order: 2,
    is_common: true,
    is_used: false,
    total_questions: 10,
    questions_answered: 0,
    daily_completed: false,
  },
  {
    question_number: 3,
    question: 'What is 2 + 2?',
    options: {
      a: '3',
      b: '4',
      c: '5',
      d: '6',
    },
    correct_answer: 'b',
    hint: 'Basic arithmetic.',
    category: 'Math',
    difficulty: 'Easy',
    total_gems: 100,
    order: 3,
    is_common: true,
    is_used: false,
    total_questions: 10,
    questions_answered: 0,
    daily_completed: false,
  },
];

// Get mock question by number (cycles through questions)
const getMockQuestion = (questionNumber?: number) => {
  const index = questionNumber ? (questionNumber - 1) % MOCK_QUESTIONS.length : 0;
  return MOCK_QUESTIONS[index];
};

// Mock submit answer - returns success/failure based on answer
const mockSubmitAnswer = (questionNumber: number, answer: string) => {
  const mockQuestion = getMockQuestion(questionNumber);
  const correctAnswerText =
    mockQuestion.options[mockQuestion.correct_answer as 'a' | 'b' | 'c' | 'd'];
  const correctAnswerId = mockQuestion.correct_answer.toLowerCase();

  // Check if answer matches either the text or the ID (a, b, c, d)
  const answerLower = answer.toLowerCase().trim();
  const isCorrect =
    answerLower === correctAnswerText.toLowerCase().trim() || answerLower === correctAnswerId;

  return {
    is_correct: isCorrect,
    correct_answer: correctAnswerText,
    explanation: isCorrect
      ? 'Great job! You got it right!'
      : `The correct answer is ${correctAnswerText}.`,
    daily_completed: false,
  };
};

const TriviaScreen: React.FC = () => {
  // 1. Core Hooks (External State & Context)
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'TriviaScreen'>>();
  const isFocused = useIsFocused();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const { isDarkMode, colors } = theme;
  const analytics = useAnalytics();
  const { trackEvent, trackAction } = analytics;
  const { handleError } = useErrorHandler({ component: 'TriviaScreen', category: 'TRIVIA' });
  const { userBalance, fetchUserGems: refreshGems } = useShop();
  const { triggerHaptic } = useHapticFeedback();
  const responsive = useStandardResponsive();
  const { playCorrect, playWrong, playWin, canPlaySounds, startScreenMusic, stopScreenMusic } =
    useSoundEffects();

  // 2. Redux State Selectors
  const triviaState = useSelector((state: RootState) => state.trivia, shallowEqual);
  const {
    selectedAnswer,
    isSubmitted,
    isCorrect,
    dailyCompleted,
    loading,
    error,
    submissionResult,
    totalGems,
    questionsList,
    questionStatus,
    currentFreeModeQuestion,
    freeModeQuestions,
    freeModeStatus,
    currentBronzeModeQuestion,
    bronzeModeStatus,
    currentSilverModeQuestion,
    silverModeStatus,
    currentMode,
    currentQuestionIndex,
  } = triviaState;
  const profileData = useSelector((state: RootState) => state.profile.profile, shallowEqual);

  // 3. Local UI State
  const [showCongratsScreen, setShowCongratsScreen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [confettiAnimationCompleted, setConfettiAnimationCompleted] = useState<boolean>(false);
  const [localIsSubmitted, setLocalIsSubmitted] = useState<boolean>(false);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState<boolean>(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState<boolean>(false);
  const [correctAnimationCompleted, setCorrectAnimationCompleted] = useState<boolean>(false);
  const [wrongAnimationCompleted, setWrongAnimationCompleted] = useState<boolean>(false);
  const [hintAnimationCompleted, setHintAnimationCompleted] = useState<boolean>(false);
  const [autoAnimationCompleted, setAutoAnimationCompleted] = useState<boolean>(false);
  const [changeQuestionAnimationCompleted, setChangeQuestionAnimationCompleted] =
    useState<boolean>(false);
  const [fiftyFiftyAnimationCompleted, setFiftyFiftyAnimationCompleted] = useState<boolean>(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [alreadyAnswered, setAlreadyAnswered] = useState<boolean>(false);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [hintTooltipText, setHintTooltipText] = useState<string>('');
  const [showChangeQuestionSuccessModal, setShowChangeQuestionSuccessModal] =
    useState<boolean>(false);
  const [hintButtonLayout, setHintButtonLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [previousAnswer, setPreviousAnswer] = useState<string | null>(null);
  const [previousAnswerCorrect, setPreviousAnswerCorrect] = useState<boolean>(false);
  const [apiCorrectAnswer, setApiCorrectAnswer] = useState<string | null>(null);
  const [showFreeModeCompletionModal, setShowFreeModeCompletionModal] = useState<boolean>(false);
  const [isFreeModeReviewMode, setIsFreeModeReviewMode] = useState<boolean>(false);
  const [freeModeReviewIndex, setFreeModeReviewIndex] = useState<number>(0);

  // 4. Refs
  const prevQuestionIdRef = useRef<number | undefined>(undefined);
  const prevIsSubmittedRef = useRef<boolean>(false);
  const lastAnsweredQuestionId = useRef<number | null>(null);
  const nextQuestionScheduled = useRef(false);
  const userManuallyClosedFreeModeModal = useRef<boolean>(false);
  const [isNavigatingWithArrows, setIsNavigatingWithArrows] = useState<boolean>(false);
  const arrowNavigationTimestamp = useRef<number>(0);
  const screenFocusTimestamp = useRef<number>(0);
  const hasFetchedOnFocus = useRef<boolean>(false);
  const fetchAttempted = useRef<boolean>(false);
  const previousQuestionNumber = useRef<number | null>(null);
  const previousApiQuestionNumber = useRef<number | null>(null);
  const confettiShownForQuestion = useRef<number | null>(null);
  const hasProcessedAlreadyAnswered = useRef<number | null>(null);
  const modalShownForQuestionOnFocus = useRef<number | null>(null);
  const hasProcessedError = useRef<string | null>(null);
  const isNavigatingWithArrowsRef = useRef<boolean>(false);
  const userManuallyClosedModal = useRef<boolean>(false);
  const hasShownCongratsOnEntry = useRef<boolean>(false);
  const infoIconRef = useRef<any>(null);
  const lottieRef = useRef<LottieView>(null);
  const correctAnimationRef = useRef<LottieView>(null);
  const wrongAnimationRef = useRef<LottieView>(null);
  const musicInitialized = useRef<boolean>(false);
  const lastFocusState = useRef<boolean | null>(null);
  const musicMonitorInterval = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedQuestionStatus = useRef<number | null>(null);
  const animationTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const hintButtonRef = useRef<any>(null);
  const previousApiQuestionRef = useRef<any>(null);
  const questionTextOpacity = useRef(new Animated.Value(1)).current;
  const lastSoundPlayed = useRef<{ name: string; time: number } | null>(null);
  const handleSubmitRef = useRef<(() => void) | null>(null);
  const isCorrectAnimationPlaying = useRef<boolean>(false);
  const isWrongAnimationPlaying = useRef<boolean>(false);
  const processedSubmission = useRef<string | null>(null);
  const confettiAnimationEndCalled = useRef<boolean>(false);

  // 5. Memos
  const profileGems = useMemo(() => (profileData as any)?.total_gems || 0, [profileData]);
  const profileCoins = useMemo(() => (profileData as any)?.total_trivia_coins || 0, [profileData]);

  const sortedFreeModeQuestionsForReview = useMemo(() => {
    const list = freeModeQuestions ?? [];
    return [...list].sort((a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0));
  }, [freeModeQuestions]);

  const currentQuestionData = useMemo(() => {
    const mode = route?.params?.mode || currentMode || 'free';
    if (mode === 'bronze' && currentBronzeModeQuestion) return currentBronzeModeQuestion;
    if (mode === 'silver' && currentSilverModeQuestion) return currentSilverModeQuestion;
    if (mode === 'free') {
      if (isFreeModeReviewMode && sortedFreeModeQuestionsForReview.length > 0) {
        const safeIndex = Math.max(
          0,
          Math.min(freeModeReviewIndex, sortedFreeModeQuestionsForReview.length - 1)
        );
        return sortedFreeModeQuestionsForReview[safeIndex] as any;
      }
      // CRITICAL: Always return currentFreeModeQuestion for free mode, even if navigating
      const question = currentFreeModeQuestion;
      console.log('🔵 [CURRENT QUESTION DATA] Free mode question:', {
        hasQuestion: !!question,
        questionId: question?.question_id,
        questionOrder: question?.question_order,
        questionText: question?.question?.substring(0, 50) + '...',
        isNavigating: isNavigatingWithArrows.current,
      });
      return question;
    }
    return null;
  }, [
    route?.params?.mode,
    currentMode,
    currentFreeModeQuestion,
    currentBronzeModeQuestion,
    currentSilverModeQuestion,
    isFreeModeReviewMode,
    freeModeReviewIndex,
    sortedFreeModeQuestionsForReview,
  ]);

  const apiQuestion = useMemo(() => {
    if (!currentQuestionData) return null;
    const q = currentQuestionData as any;

    // Normalize properties for consistent access
    const questionText = q.question || q.question_text;
    const options = q.options || { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
    const correctAnswer = q.correct_answer || q.correct_option;
    const fillInAnswer = q.fill_in_answer || q.user_answer || q.selected_option || q.answered_option_id;
    const isCorrect = q.is_correct === true || q.status === 'answered_correct';

    return {
      question_number: q.question_id,
      question: questionText,
      options: options,
      category: q.category,
      difficulty: q.difficulty_level,
      picture_url: q.picture_url,
      hint: q.hint,
      correct_answer: correctAnswer,
      total_gems: totalGems,
      user_answer: fillInAnswer || null,
      is_correct: isCorrect,
      answered_at: q.submitted_at || q.answered_at,
      explanation: q.explanation,
    };
  }, [currentQuestionData, totalGems]);

  // CRITICAL: Derive review-specific state instantaneously to avoid race conditions with useEffect
  const derivedReviewState = useMemo(() => {
    const mode = routeMode || currentMode || 'free';
    if (!apiQuestion) return { previousAnswer: null, previousAnswerCorrect: false, apiCorrectAnswer: null };

    // Get user's answer
    const userAnswer = apiQuestion.user_answer;
    const isCorrect = apiQuestion.is_correct;

    let previousAnswer: string | null = null;
    let previousAnswerCorrect = false;
    let apiCorrectAnswer: string | null = null;

    // Set the user's previous answer mapping
    if (userAnswer) {
      const userAnswerText = String(userAnswer ?? '').toLowerCase().trim();

      if (userAnswerText !== '') {
        // Map text to ID
        const matchingOption = Object.entries(apiQuestion.options || {}).find(
          ([_, text]) => text && text.toString().toLowerCase().trim() === userAnswerText
        );

        if (matchingOption) {
          previousAnswer = matchingOption[0].toLowerCase();
        } else if (['a', 'b', 'c', 'd'].includes(userAnswerText)) {
          previousAnswer = userAnswerText;
        } else {
          // Fallback: try to see if it's an index (some APIs send index)
          const index = parseInt(userAnswerText, 10);
          if (!isNaN(index) && index >= 0 && index < 4) {
            previousAnswer = String.fromCharCode(97 + index);
          }
        }
        // CRITICAL: previousAnswerCorrect tells if user's answer was right/wrong
        previousAnswerCorrect = isCorrect ?? false;
      }
    }

    // Set the correct answer mapping
    let correctAnswerText: string | null = null;

    // Priority for Bronze/Silver: submissionResult (freshest) > currentQuestion (direct from API) > apiQuestion
    if (mode === 'bronze' && currentBronzeModeQuestion) {
      correctAnswerText = String(submissionResult?.correct_answer || currentBronzeModeQuestion.correct_answer || apiQuestion.correct_answer || '').toLowerCase().trim();
    } else if (mode === 'silver' && currentSilverModeQuestion) {
      correctAnswerText = String(submissionResult?.correct_answer || currentSilverModeQuestion.correct_answer || apiQuestion.correct_answer || '').toLowerCase().trim();
    } else {
      correctAnswerText = String(apiQuestion.correct_answer ?? '').toLowerCase().trim();
    }

    if (correctAnswerText) {
      // Direct letter match first
      if (['a', 'b', 'c', 'd'].includes(correctAnswerText)) {
        apiCorrectAnswer = correctAnswerText;
      } else {
        // Try to map text to option
        const optionsMap = Array.isArray(apiQuestion.options)
          ? apiQuestion.options.map((opt: any, index: number) => [
            String.fromCharCode(97 + index),
            typeof opt === 'string' ? opt : opt.text || opt.option || '',
          ])
          : Object.entries(apiQuestion.options || {});

        const matchingOption = optionsMap.find(([id, text]) => {
          const optText = String(text ?? '').toLowerCase().trim();
          return optText === correctAnswerText;
        });

        if (matchingOption) {
          apiCorrectAnswer = matchingOption[0];
        }
      }
    }

    return { previousAnswer, previousAnswerCorrect, apiCorrectAnswer };
  }, [apiQuestion, routeMode, currentMode]);

  const question = useMemo(() => convertQuestionToUIFormat(apiQuestion), [apiQuestion]);

  const questionWithDisabledOptions = useMemo(() => {
    if (!question) return null;
    return {
      ...question,
      options: question.options.map(opt => ({
        ...opt,
        disabled:
          disabledOptions.some(disabledId => disabledId.toLowerCase() === opt.id.toLowerCase()) ||
          opt.disabled,
      })),
    };
  }, [question, disabledOptions]);

  const freeModeReviewTotal = sortedFreeModeQuestionsForReview.length;

  // CRITICAL: displayQuestion and questionForDisplay must be defined at the top level
  // This prevents hook violations and ensures consistent state across renders
  const displayQuestion = useMemo(
    () =>
      question ||
      (apiQuestion && apiQuestion.question
        ? {
          text: apiQuestion.question,
          options: apiQuestion.options
            ? [
              { id: 'a', text: apiQuestion.options.a || '', disabled: false },
              { id: 'b', text: apiQuestion.options.b || '', disabled: false },
              { id: 'c', text: apiQuestion.options.c || '', disabled: false },
              { id: 'd', text: apiQuestion.options.d || '', disabled: false },
            ]
            : [],
          correctAnswer: apiQuestion.correct_answer?.toLowerCase() || '',
          questionNumber: apiQuestion.question_number || 0,
          hint: apiQuestion.hint || '',
          category: apiQuestion.category || '',
          difficulty: apiQuestion.difficulty || '',
        }
        : null),
    [question, apiQuestion]
  );

  const placeholderLoadingQuestion = useMemo(
    () =>
      loading
        ? {
          text: 'Loading question...',
          options: [
            { id: 'a', text: '...', disabled: true },
            { id: 'b', text: '...', disabled: true },
            { id: 'c', text: '...', disabled: true },
            { id: 'd', text: '...', disabled: true },
          ],
          correctAnswer: '',
          questionNumber: 0,
          hint: '',
          category: '',
          difficulty: '',
        }
        : null,
    [loading]
  );

  const questionForDisplay = useMemo(
    () => displayQuestion || question || placeholderLoadingQuestion,
    [displayQuestion, question, placeholderLoadingQuestion]
  );

  // STABILIZED: Move style memo to top-level to prevent hook violation in JSX
  const containerStyle = useMemo(
    () => ({
      flex: 1,
      backgroundColor: 'transparent',
    }),
    []
  );

  // 6. Animation Hooks
  const { headerAnim, questionAnim, optionsAnim } = useEntranceAnimations(
    isFocused,
    question?.options || []
  );
  const shopButtonAnimation = useButtonAnimation();
  const infoButtonAnimation = useButtonAnimation();
  const option1Animation = useButtonAnimation();
  const option2Animation = useButtonAnimation();
  const option3Animation = useButtonAnimation();
  const option4Animation = useButtonAnimation();

  // 7. Lifecycle & Analytics Hooks
  useTrackScreenView('TriviaScreen');
  usePlatformOptimization();
  useAndroidBackButton(() => false);

  // 8. Callbacks moved to top
  const playSoundSafely = useCallback(async (soundName: string, fallbackName?: string) => {
    if (!soundManager.isSoundEnabled) return;
    const soundToPlay = soundName || fallbackName;
    if (soundToPlay) {
      const now = Date.now();
      if (
        lastSoundPlayed.current &&
        lastSoundPlayed.current.name === soundToPlay &&
        now - lastSoundPlayed.current.time < 200
      )
        return;
      lastSoundPlayed.current = { name: soundToPlay, time: now };
    }
    if (!(soundManager as any).isInitialized) {
      if (typeof (soundManager as any).initializeInBackground === 'function')
        (soundManager as any).initializeInBackground();
      else (soundManager as any).initialize().catch(() => { });
    }
    try {
      if (soundToPlay && soundManager && typeof soundManager.playSound === 'function') {
        await soundManager.playSound(soundToPlay).catch(() => { });
      }
    } catch (e) { }
  }, []);

  const handleFreeModeCompletionClose = useCallback(() => {
    userManuallyClosedFreeModeModal.current = true;
    setShowCongratsScreen(false);
    setIsFreeModeReviewMode(false);
  }, []);

  // ... (rest of the component logic)

  // Get mode from route params (passed from TriviaSelectionScreen)
  const routeMode = useMemo(() => route?.params?.mode ?? 'free', [route?.params?.mode]);
  const currentModeValue = routeMode || currentMode || 'free';

  // Ensure a mode param always exists to prevent runtime errors
  useEffect(() => {
    if (!route?.params?.mode) {
      navigation.setParams?.({ mode: 'free' } as any);
    }
  }, [navigation, route?.params?.mode]);

  // Priority: totalGems from trivia API (if > 0) > shop gems > 0
  const realGems = useMemo(
    () => (totalGems && totalGems > 0 ? totalGems : userBalance?.gems || 0),
    [totalGems, userBalance?.gems]
  );

  // Responsive values
  const {
    isSmallDevice,
    isTablet,
    scaleFont,
    scaleWidth,
    scaleHeight,
    scaleSize,
    scaleSize: scaleSizeFunc,
    getSpacing,
    getVerticalSpacing,
    getHorizontalSpacing,
    deviceType,
    width: screenWidth,
    height: screenHeight,
    width: rWidth,
    height: rHeight,
  } = responsive;

  // Fetch question and status based on mode on mount - STRICT API ISOLATION
  useEffect(() => {
    console.log('🔵 [TRIVIA SCREEN] useEffect - Screen focus check', {
      isFocused,
      routeMode,
      currentMode,
      hasFetchedOnFocus: hasFetchedOnFocus.current,
    });

    // CRITICAL: Only fetch if focused AND not already fetched to prevent unnecessary refreshes
    if (isFocused && !hasFetchedOnFocus.current) {
      const mode = routeMode || currentMode || 'free'; // Default to free mode
      console.log('🟢 [TRIVIA SCREEN] Screen focused, mode determined:', mode);
      dispatch(setCurrentMode(mode));
      hasFetchedOnFocus.current = true; // Mark as fetched to prevent refetch

      // STRICT API ISOLATION: Only call APIs for the selected mode
      if (mode === 'free') {
        // Optimization: If we already have data (preloaded), don't fetch again immediately
        // This ensures instant rendering without background network activity
        if (currentFreeModeQuestion && freeModeStatus) {
          console.log(
            '🟢 [TRIVIA SCREEN] Free mode data already available (preloaded), skipping initial fetch'
          );
          const isCompleted = freeModeStatus?.progress?.completed === true;
          const allQuestionsAnswered = freeModeStatus?.progress?.all_questions_answered === true;
          if (isCompleted || allQuestionsAnswered) {
            // Always fetch questions if completed/all answered, even if we have current question
            if (!freeModeQuestions || freeModeQuestions.length === 0) {
              console.log(
                '🟡 [TRIVIA SCREEN] Free mode completed/all answered but no questions, fetching...',
                {
                  completed: isCompleted,
                  allQuestionsAnswered,
                }
              );
              dispatch(fetchFreeModeQuestions());
              // Show CongratsScreen after status is available
              setTimeout(() => {
                console.log('🎯 [TRIVIA SCREEN] Showing CongratsScreen after status is available');
                userManuallyClosedFreeModeModal.current = false;
                setShowCongratsScreen(true);
              }, 200);
            } else {
              // Questions already available, show CongratsScreen immediately
              console.log(
                '🎯 [TRIVIA SCREEN] Showing CongratsScreen on screen open (status available)',
                {
                  completed: isCompleted,
                  allQuestionsAnswered,
                  hasShownOnEntry: hasShownCongratsOnEntry.current,
                }
              );
              if (!hasShownCongratsOnEntry.current) {
                userManuallyClosedFreeModeModal.current = false;
                setShowCongratsScreen(true);
                hasShownCongratsOnEntry.current = true;
              }
            }
            setIsFreeModeReviewMode(false);
            setFreeModeReviewIndex(0);
          }
          return;
        }

        console.log('🔵 [TRIVIA API] FREE MODE - Starting API calls');
        // Free mode: Status-first orchestration (backend is the only source of truth)
        let cancelled = false;
        const run = async () => {
          try {
            console.log('🔵 [TRIVIA API] Calling fetchFreeModeStatus()...');
            const status = await dispatch(fetchFreeModeStatus()).unwrap();
            console.log('🟢 [TRIVIA API] fetchFreeModeStatus() completed:', {
              completed: status?.progress?.completed,
              correctAnswers: status?.progress?.correct_answers,
              totalQuestions: status?.progress?.total_questions,
            });

            // If completed OR all questions answered, do NOT fetch current question; show completion summary instead
            const isCompleted = status?.progress?.completed === true;
            const allQuestionsAnswered = status?.progress?.all_questions_answered === true;
            if (!cancelled && (isCompleted || allQuestionsAnswered)) {
              console.log(
                '🟡 [TRIVIA API] Free mode completed/all answered, fetching questions list...',
                {
                  completed: isCompleted,
                  allQuestionsAnswered,
                }
              );
              dispatch(fetchFreeModeQuestions());
              setIsFreeModeReviewMode(false);
              setFreeModeReviewIndex(0);
              console.log(
                '🎯 [TRIVIA API] Free mode completed/all answered, showing CongratsScreen on screen open',
                {
                  hasShownOnEntry: hasShownCongratsOnEntry.current,
                }
              );
              if (!hasShownCongratsOnEntry.current) {
                userManuallyClosedFreeModeModal.current = false;
                // Show CongratsScreen immediately
                setShowCongratsScreen(true);
                hasShownCongratsOnEntry.current = true;
              }
              return;
            }

            // CRITICAL: Also fetch questions list even if not completed, for navigation
            if (!cancelled && !status?.progress?.completed) {
              console.log(
                '🟡 [TRIVIA API] Free mode not completed, but fetching questions list for navigation...'
              );
              dispatch(fetchFreeModeQuestions());
            }

            if (!cancelled) {
              console.log('🔵 [TRIVIA API] Free mode not completed, fetching current question...');
              // Only hide CongratsScreen if it's currently showing - don't force hide if user wants to see it
              if (showCongratsScreen) {
                setShowCongratsScreen(false);
              }
              setIsFreeModeReviewMode(false);
              setFreeModeReviewIndex(0);
              dispatch(fetchCurrentFreeQuestion());
            }
          } catch (e: any) {
            // Suppress "No authentication token available" errors - expected when not logged in
            const errorMessage = e?.message || String(e);
            if (
              errorMessage === 'No authentication token available' ||
              errorMessage.includes('No authentication token')
            ) {
              // Silent - expected when user is not authenticated
              // Don't log or show error, just return
              return;
            }
            console.error('🔴 [TRIVIA API] Error in free mode flow:', e);
            // Best-effort fallback: still load questions/current question
            console.log('🟡 [TRIVIA API] Fallback: fetching current question...');
            dispatch(fetchCurrentFreeQuestion());
          }
        };

        run();
        return () => {
          console.log('🟡 [TRIVIA SCREEN] Cleanup: cancelling free mode API calls');
          cancelled = true;
        };
      } else if (mode === 'bronze') {
        console.log('🔵 [TRIVIA API] BRONZE MODE - Starting API calls');
        // Bronze mode APIs only
        console.log('🔵 [TRIVIA API] Calling fetchBronzeModeQuestion()...');
        dispatch(fetchBronzeModeQuestion());
        console.log('🔵 [TRIVIA API] Calling fetchBronzeModeStatus()...');
        dispatch(fetchBronzeModeStatus());
      } else if (mode === 'silver') {
        console.log('🔵 [TRIVIA API] SILVER MODE - Starting API calls');
        // Silver mode APIs only
        console.log('🔵 [TRIVIA API] Calling fetchSilverModeQuestion()...');
        dispatch(fetchSilverModeQuestion());
        console.log('🔵 [TRIVIA API] Calling fetchSilverModeStatus()...');
        dispatch(fetchSilverModeStatus());
      }
    } else {
      console.log('🟡 [TRIVIA SCREEN] Screen not focused, skipping API calls');
    }
  }, [isFocused, dispatch, routeMode]); // DO NOT include currentMode - it's SET inside this effect, causing infinite loop

  // Reset fetch flag and manual close flags when screen loses/gains focus
  useEffect(() => {
    if (!isFocused) {
      hasFetchedOnFocus.current = false;
      hasShownCongratsOnEntry.current = false; // Reset when leaving screen
    } else {
      // CRITICAL: Reset manual close flags on focus so user sees modal again on re-entry
      userManuallyClosedModal.current = false;
      userManuallyClosedFreeModeModal.current = false;
      // Also reset navigation flag if somehow stuck
      setIsNavigatingWithArrows(false);
    }
  }, [isFocused]);

  // Set current question when questions are loaded
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode !== 'free') return;

    if (freeModeQuestions && freeModeQuestions.length > 0) {
      // If we don't have a current question, set the first one
      if (!currentFreeModeQuestion) {
        // Find first unlocked question or first question
        const sortedQuestions = [...freeModeQuestions].sort(
          (a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0)
        );
        const firstUnlocked = sortedQuestions.find(q => q.status !== 'locked');
        const questionToUse = firstUnlocked || sortedQuestions[0];

        if (questionToUse) {
          console.log('🟢 [TRIVIA SCREEN] Setting initial question from loaded questions:', {
            questionId: questionToUse.question_id,
            questionOrder: questionToUse.question_order,
          });
          dispatch(setCurrentFreeModeQuestion(questionToUse));
        }
      } else {
        // Ensure current question is in the questions list (for navigation)
        const sortedQuestions = [...freeModeQuestions].sort(
          (a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0)
        );
        const currentId = currentFreeModeQuestion.question_id;
        const existsInList = sortedQuestions.some(q => q.question_id === currentId);

        if (!existsInList && sortedQuestions.length > 0) {
          // Current question not in list, set to first question
          console.log('🟡 [TRIVIA SCREEN] Current question not in list, setting to first question');
          dispatch(setCurrentFreeModeQuestion(sortedQuestions[0]));
        }
      }
    }
  }, [freeModeQuestions, currentFreeModeQuestion, dispatch, routeMode, currentMode]);

  // Ref to track if we've scheduled next question fetch
  // nextQuestionScheduled and lastAnsweredQuestionId moved to top block

  // CRITICAL: Force state reset when new free mode question arrives
  // This ensures UI updates even if other useEffects have conditions that prevent them from running
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode !== 'free' || !currentFreeModeQuestion || isFreeModeReviewMode) {
      return;
    }

    const currentQuestionId = currentFreeModeQuestion.question_id;

    // Check if this is a NEW question (different from last answered)
    if (currentQuestionId && currentQuestionId !== lastAnsweredQuestionId.current) {
      console.log('🟢 [TRIVIA SCREEN] Free mode question changed:', {
        newQuestionId: currentQuestionId,
        lastAnsweredId: lastAnsweredQuestionId.current,
        isSubmitted,
        localIsSubmitted,
      });

      // If we just answered a question and now have a new question, reset submission state
      if (lastAnsweredQuestionId.current !== null && !currentFreeModeQuestion.answered_at) {
        console.log('🟢 [TRIVIA SCREEN] New question after submission - resetting UI state');
        setLocalIsSubmitted(false);
        setAlreadyAnswered(false);
        setShowCongratsScreen(false);
        setShowCorrectAnimation(false);
        setShowWrongAnimation(false);
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);
        setApiCorrectAnswer(null);
        dispatch(setSelectedAnswer(null));
      }
    }
  }, [
    currentFreeModeQuestion,
    routeMode,
    currentMode,
    isFreeModeReviewMode,
    lastAnsweredQuestionId,
    isSubmitted,
    localIsSubmitted,
    dispatch,
  ]);

  // After submission, immediately fetch next question
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    console.log('🔵 [TRIVIA SCREEN] useEffect - After submission check', {
      isSubmitted,
      hasSubmissionResult: !!submissionResult,
      mode,
      isFreeModeReviewMode,
      showFreeModeCompletionModal,
      nextQuestionScheduled: nextQuestionScheduled.current,
      freeModeAnswered: currentFreeModeQuestion?.answered_at,
    });

    // In Free Mode review/completion states, never auto-advance.
    if (mode === 'free' && (isFreeModeReviewMode || showFreeModeCompletionModal)) {
      console.log('🟡 [TRIVIA SCREEN] Skipping auto-advance (review/completion mode)');
      return;
    }

    // Determine if we should advance:
    // Only advance if we just submitted successfully.
    // Do NOT auto-advance on reload (answered_at check) - let the user see the result/marks first.
    // The user can then tap to proceed via TouchableWithoutFeedback logic.
    const shouldAdvance = isSubmitted && submissionResult;

    if (shouldAdvance && !nextQuestionScheduled.current) {
      const currentQuestionId =
        (mode === 'free' && currentFreeModeQuestion?.question_id) ||
        (mode === 'bronze' && currentBronzeModeQuestion?.question_id) ||
        (mode === 'silver' && currentSilverModeQuestion?.question_id);

      console.log(
        '🔵 [TRIVIA SCREEN] Submission/Stuck state detected, current question ID:',
        currentQuestionId
      );

      if (!currentQuestionId) {
        console.log('🟡 [TRIVIA SCREEN] No current question ID, skipping');
        return;
      }

      // Skip if we already processed this question
      if (lastAnsweredQuestionId.current === currentQuestionId) {
        console.log('🟡 [TRIVIA SCREEN] Already processed this question, skipping');
        return;
      }

      console.log('🟢 [TRIVIA SCREEN] Scheduling next question fetch...');
      nextQuestionScheduled.current = true;
      lastAnsweredQuestionId.current = currentQuestionId;

      // Fetch next question immediately after submission for free mode
      // Minimal delay just to allow UI animation to show briefly
      const delay = mode === 'free' && !submissionResult ? 1500 : 200; // Longer delay if just loading answered state so user can see it

      const timer = setTimeout(() => {
        const run = async () => {
          try {
            console.log(
              '🔵 [TRIVIA API] Fetching next question after submission (mode:',
              mode,
              ')'
            );
            if (mode === 'free') {
              // CRITICAL: Hide animations immediately before fetching next question
              setShowCorrectAnimation(false);
              setShowWrongAnimation(false);

              // Immediately fetch the next question by triggering the current question endpoint
              console.log('🔵 [TRIVIA API] Fetching next free mode question immediately...');
              try {
                await dispatch(fetchCurrentFreeQuestion()).unwrap();
              } catch (err) {
                console.log(
                  '🟡 [TRIVIA API] No next free-mode question returned, showing completion modal',
                  err
                );
                // Treat as completion: pull the full questions list for summary and open modal
                dispatch(fetchFreeModeQuestions());
                setIsFreeModeReviewMode(false);
                setFreeModeReviewIndex(0);
                // Only show CongratsScreen if user hasn't manually closed it and not shown on entry
                if (!userManuallyClosedFreeModeModal.current && !hasShownCongratsOnEntry.current) {
                  setShowCongratsScreen(true);
                  hasShownCongratsOnEntry.current = true;
                }
                nextQuestionScheduled.current = false;
                return;
              }

              // After fetching the question, refresh status to check if more questions remain
              let status: any = null;
              try {
                console.log(
                  '🔵 [TRIVIA API] Refreshing free mode status after fetching next question...'
                );
                status = await dispatch(fetchFreeModeStatus()).unwrap();
                console.log('🟢 [TRIVIA API] Free mode status:', {
                  completed: status?.progress?.completed,
                  correctAnswers: status?.progress?.correct_answers,
                  totalQuestions: status?.progress?.total_questions,
                });
              } catch (e: any) {
                // Suppress "No authentication token available" errors - expected when not logged in
                const errorMessage = e?.message || String(e);
                if (
                  errorMessage !== 'No authentication token available' &&
                  !errorMessage.includes('No authentication token')
                ) {
                  console.error('🔴 [TRIVIA API] Error fetching free mode status:', e);
                }
                status = null;
              }

              const isCompleted = status?.progress?.completed === true;
              const allQuestionsAnswered = status?.progress?.all_questions_answered === true;
              if (isCompleted || allQuestionsAnswered) {
                console.log(
                  '🟡 [TRIVIA API] Free mode completed/all answered, showing completion modal',
                  {
                    completed: isCompleted,
                    allQuestionsAnswered,
                  }
                );
                dispatch(fetchFreeModeQuestions());
                setIsFreeModeReviewMode(false);
                setFreeModeReviewIndex(0);
                // Only show CongratsScreen if user hasn't manually closed it and not shown on entry
                if (!userManuallyClosedFreeModeModal.current && !hasShownCongratsOnEntry.current) {
                  setShowCongratsScreen(true);
                  hasShownCongratsOnEntry.current = true;
                }
                return;
              }
            } else if (mode === 'bronze') {
              console.log('🔵 [TRIVIA API] Fetching bronze mode status after submission...');
              // Bronze is a single-question mode: do not refetch the question
              dispatch(fetchBronzeModeStatus());
            } else if (mode === 'silver') {
              console.log('🔵 [TRIVIA API] Fetching silver mode status after submission...');
              dispatch(fetchSilverModeStatus());
            }
          } catch (error) {
            console.error('Error in auto-advance:', error);
          } finally {
            // Reset schedule flag after fetch
            setTimeout(() => {
              nextQuestionScheduled.current = false;
            }, 1000);
          }
        };
        run();
      }, delay);
      animationTimersRef.current.add(timer);
    }
  }, [
    isSubmitted,
    submissionResult,
    routeMode,
    currentMode,
    dispatch,
    currentFreeModeQuestion,
    currentBronzeModeQuestion,
    currentSilverModeQuestion,
    isFreeModeReviewMode,
    showFreeModeCompletionModal,
  ]);

  // Display previously answered questions with correct/wrong indicators
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    let questionData: any = null;
    let statusData: any = null;

    if (mode === 'bronze' && currentBronzeModeQuestion) {
      questionData = currentBronzeModeQuestion;
      statusData = bronzeModeStatus;
    } else if (mode === 'silver' && currentSilverModeQuestion) {
      questionData = currentSilverModeQuestion;
      statusData = silverModeStatus;
    } else if (mode === 'free' && currentFreeModeQuestion) {
      questionData = currentFreeModeQuestion;
      statusData = freeModeStatus;
    }

    // CRITICAL: For free mode, check status first to determine if user can answer
    if (mode === 'free' && statusData) {
      const questionsAnswered = statusData.progress?.questions_answered || 0;
      const isCompleted = statusData.progress?.completed === true;
      const allQuestionsAnswered = statusData.progress?.all_questions_answered === true;

      // If no questions answered yet and not completed, allow answering
      if (questionsAnswered === 0 && !isCompleted && !allQuestionsAnswered) {
        // User can answer - COMPLETELY reset ALL historical states
        console.log(
          '🟢 [TRIVIA SCREEN] Free mode: No questions answered yet, allowing user to answer'
        );
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);
        setApiCorrectAnswer(null);
        setAlreadyAnswered(false);
        setLocalIsSubmitted(false);
        dispatch(setIsSubmitted(false));
        dispatch(setSelectedAnswer(null));
        hasProcessedAlreadyAnswered.current = null; // Reset processed flag
        return; // Exit early - don't show answered state
      }
    }

    // Check if question was already answered
    // CRITICAL: Status endpoint is the primary source of truth.
    // Prefer statusData.has_submitted / statusData.is_correct over questionData fields.
    const statusAnswered = !!(
      statusData &&
      (statusData.has_submitted ||
        (statusData.is_correct !== null && statusData.is_correct !== undefined))
    );

    // For free mode, check question status field and fill_in_answer
    // CRITICAL: "locked" status means NOT answered - allow user to answer
    // Only consider answered if status explicitly says "answered_wrong" or "answered_correct"
    const questionAnswered =
      mode === 'free'
        ? !!(
          questionData &&
          (questionData.answered_at ||
            questionData.submitted_at ||
            (questionData.fill_in_answer !== null &&
              questionData.fill_in_answer !== undefined &&
              questionData.fill_in_answer !== '') ||
            (typeof questionData.status === 'string' &&
              questionData.status.toLowerCase() !== 'locked' &&
              (questionData.status.toLowerCase() === 'answered_wrong' ||
                questionData.status.toLowerCase() === 'answered_correct')))
        )
        : !!(
          questionData &&
          (questionData.answered_at ||
            questionData.submitted_at ||
            (typeof questionData.status === 'string' &&
              questionData.status.toLowerCase().includes('answered')))
        );

    const isAnswered = statusAnswered || questionAnswered;

    if (questionData && isAnswered) {
      // Check if this is a question we just answered (don't re-trigger the display logic)
      if (lastAnsweredQuestionId.current === questionData.question_id) {
        logger.debug(
          `${mode.toUpperCase()} MODE - Skipping display logic for question just answered`,
          'TRIVIA',
          {
            question_id: questionData.question_id,
          }
        );
        return; // Skip - we already handled the display in submission result effect
      }

      // CRITICAL: Only process each question ONCE to prevent marks from flashing
      if (hasProcessedAlreadyAnswered.current === questionData.question_id) {
        return; // Already processed this question
      }

      // Question was already answered (in a previous session) - show the result
      logger.debug(`${mode.toUpperCase()} MODE - Loading previously answered question`, 'TRIVIA', {
        question_id: questionData.question_id,
        fill_in_answer: questionData.fill_in_answer || (statusData && statusData.fill_in_answer),
        is_correct: questionData.is_correct || (statusData && statusData.is_correct),
      });

      // Get user's answer
      // CRITICAL: Prioritize questionData over statusData because statusData.fill_in_answer 
      // might be an array of all answers for the session, whereas questionData is for this specific question.
      const userAnswer =
        questionData.fill_in_answer ||
        questionData.user_answer ||
        questionData.selected_option ||
        questionData.answered_option_id ||
        (statusData && !Array.isArray(statusData.fill_in_answer) ? statusData.fill_in_answer : null) ||
        (statusData && (statusData.user_answer || statusData.selected_option));

      // Determine correctness
      // CRITICAL: Prioritize individual questionData.is_correct
      let isCorrect = false;
      if (questionData && questionData.is_correct !== null && questionData.is_correct !== undefined) {
        isCorrect = Boolean(questionData.is_correct);
      } else if (statusData && statusData.is_correct !== null && statusData.is_correct !== undefined) {
        // Only use statusData if questionData doesn't have it (fallback)
        isCorrect = Boolean(statusData.is_correct);
      }

      console.log('🔍 [TRIVIA SCREEN] REVIEW DATA DETECTED:', {
        mode: routeMode || currentMode || 'free',
        questionId: apiQuestion?.question_id || (questionData as any)?.question_id,
        userAnswer,
        isCorrect,
        rawQuestion: apiQuestion,
        rawStatus: statusData
      });

      // IMPORTANT: Clear previous states first to avoid conflicts
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      setApiCorrectAnswer(null);

      // Set the user's previous answer from fill_in_answer
      if (userAnswer) {
        const userAnswerText = String(userAnswer ?? '')
          .toLowerCase()
          .trim();

        if (userAnswerText !== '') {
          const matchingOption = Object.entries(apiQuestion?.options || {}).find(
            ([_, text]) => text && text.toString().toLowerCase().trim() === userAnswerText
          );

          if (matchingOption) {
            const optionId = matchingOption[0].toLowerCase();
            dispatch(setSelectedAnswer(optionId));
            setPreviousAnswer(optionId);
            setPreviousAnswerCorrect(isCorrect);

            console.log('🟢 [TRIVIA SCREEN] Mapped user answer to option:', {
              optionId,
              isCorrect,
              userAnswerText
            });
          } else if (['a', 'b', 'c', 'd'].includes(userAnswerText)) {
            const optionId = userAnswerText;
            dispatch(setSelectedAnswer(optionId));
            setPreviousAnswer(optionId);
            setPreviousAnswerCorrect(isCorrect);

            console.log('🟢 [TRIVIA SCREEN] Used literal user answer as option:', {
              optionId,
              isCorrect
            });
          }

          // Ensure UI knows it's submitted to show feedback
          dispatch(setIsSubmitted(true));
        }
      }

      // Always set the correct answer (this will show checkmark)
      // CRITICAL: Prioritize individual questionData over aggregate session statusData
      const correctAnswerSource =
        questionData.correct_answer || (statusData && statusData.correct_answer);

      if (correctAnswerSource) {
        const correctAnswerText = String(correctAnswerSource).toLowerCase().trim();
        const optionsMap = apiQuestion?.options
          ? Array.isArray(apiQuestion.options)
            ? apiQuestion.options.map((opt: any, index: number) => [
              String.fromCharCode(97 + index),
              typeof opt === 'string' ? opt : opt.text || opt.option || '',
            ])
            : Object.entries(apiQuestion.options)
          : [];
        const matchingOption = optionsMap.find(([id, text]) => {
          const optText = String(text ?? '')
            .toLowerCase()
            .trim();
          return (
            optText === correctAnswerText
          );
        });

        if (matchingOption) {
          setApiCorrectAnswer(matchingOption[0]);
        } else if (['a', 'b', 'c', 'd'].includes(correctAnswerText)) {
          setApiCorrectAnswer(correctAnswerText);
        }
      }

      // Mark as already answered
      setAlreadyAnswered(true);
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // CRITICAL: Automatically show congrats screen for already answered questions
      // only if not navigating with arrows and the screen is focused
      if (!isNavigatingWithArrows && isFocused && !hasShownCongratsOnEntry.current) {
        setShowCongratsScreen(true);
        hasShownCongratsOnEntry.current = true;
      }
      setAlreadyAnswered(true);
      // Mark as processed to prevent re-processing
      hasProcessedAlreadyAnswered.current = questionData.question_id;
    } else {
      // Question is NOT answered - ensure all historical states are cleared
      if (!isAnswered && (apiQuestion as any)?.status !== 'already_answered') {
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);
        setApiCorrectAnswer(null);
        setAlreadyAnswered(false);
        setLocalIsSubmitted(false);
        dispatch(setIsSubmitted(false));
        hasProcessedAlreadyAnswered.current = null;
      }
    }
  }, [
    currentFreeModeQuestion,
    currentBronzeModeQuestion,
    currentSilverModeQuestion,
    bronzeModeStatus,
    silverModeStatus,
    freeModeStatus,
    routeMode,
    currentMode,
    dispatch,
    apiQuestion,
    isFocused,
    isNavigatingWithArrows,
  ]);

  // Memos moved to top block

  // Get gems from shop state (source of truth) - fetch from shop API
  // Shop and responsive hooks moved to top block

  // Fetch gems from shop API when screen loads - only once on mount
  // Removed focus-based refresh to prevent excessive API calls
  useEffect(() => {
    if (refreshGems && typeof refreshGems === 'function') {
      refreshGems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Local UI state
  // Local state and memoized question moved to top block

  const handleFreeModeReviewPrev = useCallback(() => {
    console.log('🔵 [NAVIGATION] Previous button pressed', {
      hasFreeModeQuestions: !!freeModeQuestions,
      questionsCount: freeModeQuestions?.length || 0,
      currentQuestionId: currentFreeModeQuestion?.question_id,
    });

    // CRITICAL: Close congrats screen and set navigation flag when navigating
    setIsNavigatingWithArrows(true);
    setShowCongratsScreen(false);
    arrowNavigationTimestamp.current = Date.now();

    // Navigate to previous question in freeModeQuestions list
    if (!freeModeQuestions || freeModeQuestions.length === 0) {
      console.log('⚠️ [NAVIGATION] No questions available, fetching...');
      // If no questions, try to fetch them
      dispatch(fetchFreeModeQuestions());
      return;
    }

    // Find current question index in sorted list
    const sortedQuestions = [...freeModeQuestions].sort(
      (a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0)
    );
    const currentQuestionId = currentFreeModeQuestion?.question_id;
    const currentIndex = sortedQuestions.findIndex((q: any) => q.question_id === currentQuestionId);

    console.log(
      '🔵 [NAVIGATION] Current index:',
      currentIndex,
      'Total questions:',
      sortedQuestions.length
    );

    // Get previous question (don't loop - stay at first if at start)
    const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
    const prevQuestion = sortedQuestions[prevIndex];

    if (prevQuestion) {
      console.log('🟢 [NAVIGATION] Navigating to previous question:', {
        prevQuestionId: prevQuestion.question_id,
        prevIndex,
        currentQuestionId,
      });

      // CRITICAL: Set flag FIRST, before ANY other operations
      // This ensures the flag is set before useEffect runs
      setIsNavigatingWithArrows(true);
      arrowNavigationTimestamp.current = Date.now();

      // Force close modal immediately - don't show modal when navigating
      setShowCongratsScreen(false);

      // CRITICAL: Reset processing refs so useEffect can re-process this question
      if (prevQuestion.question_id !== currentQuestionId) {
        hasProcessedAlreadyAnswered.current = null;
        lastAnsweredQuestionId.current = null; // CRITICAL: Reset to allow re-processing if it was the most recently answered
        modalShownForQuestionOnFocus.current = null;
      }

      // Set the previous question - the useEffect will handle showing marks if already answered
      dispatch(setCurrentFreeModeQuestion(prevQuestion));
      setFreeModeReviewIndex(prevIndex);

      // Reset flag after delay to ensure modal doesn't show during transition
      setTimeout(() => {
        setIsNavigatingWithArrows(false);
        arrowNavigationTimestamp.current = 0;
      }, 1000); // 1 second is enough to prevent modal during transition
    } else {
      console.log('⚠️ [NAVIGATION] No previous question found');
    }
  }, [dispatch, freeModeQuestions, currentFreeModeQuestion]);

  const handleFreeModeReviewNext = useCallback(() => {
    console.log('🔵 [NAVIGATION] Next button pressed', {
      hasFreeModeQuestions: !!freeModeQuestions,
      questionsCount: freeModeQuestions?.length || 0,
      currentQuestionId: currentFreeModeQuestion?.question_id,
    });

    // CRITICAL: Close congrats screen and set navigation flag when navigating
    setIsNavigatingWithArrows(true);
    setShowCongratsScreen(false);
    arrowNavigationTimestamp.current = Date.now();

    // Navigate to next question in freeModeQuestions list
    if (!freeModeQuestions || freeModeQuestions.length === 0) {
      console.log('⚠️ [NAVIGATION] No questions available, fetching...');
      // If no questions, try to fetch them
      dispatch(fetchFreeModeQuestions());
      return;
    }

    // Find current question index in sorted list
    const sortedQuestions = [...freeModeQuestions].sort(
      (a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0)
    );
    const currentQuestionId = currentFreeModeQuestion?.question_id;
    const currentIndex = sortedQuestions.findIndex((q: any) => q.question_id === currentQuestionId);

    console.log(
      '🔵 [NAVIGATION] Current index:',
      currentIndex,
      'Total questions:',
      sortedQuestions.length
    );

    // Get next question (don't loop - stay at last if at end)
    const nextIndex =
      currentIndex >= sortedQuestions.length - 1 ? sortedQuestions.length - 1 : currentIndex + 1;
    const nextQuestion = sortedQuestions[nextIndex];

    if (nextQuestion) {
      console.log('🟢 [NAVIGATION] Navigating to next question:', {
        nextQuestionId: nextQuestion.question_id,
        nextIndex,
        currentQuestionId,
      });

      // CRITICAL: Set flag FIRST, before ANY other operations
      // This ensures the flag is set before useEffect runs
      setIsNavigatingWithArrows(true);
      arrowNavigationTimestamp.current = Date.now();

      // Force close modal immediately - don't show modal when navigating
      setShowCongratsScreen(false);

      // CRITICAL: Reset processing refs so useEffect can re-process this question
      if (nextQuestion.question_id !== currentQuestionId) {
        hasProcessedAlreadyAnswered.current = null;
        lastAnsweredQuestionId.current = null; // CRITICAL: Reset to allow re-processing if it was the most recently answered
        modalShownForQuestionOnFocus.current = null;
      }

      // Set the next question - the useEffect will handle showing marks if already answered
      dispatch(setCurrentFreeModeQuestion(nextQuestion));
      setFreeModeReviewIndex(nextIndex);

      // Reset flag after delay to ensure modal doesn't show during transition
      setTimeout(() => {
        setIsNavigatingWithArrows(false);
        arrowNavigationTimestamp.current = 0;
      }, 1000);
    } else {
      console.log('⚠️ [NAVIGATION] No next question found');
    }
  }, [dispatch, freeModeQuestions, currentFreeModeQuestion]);

  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode !== 'free' || !isFreeModeReviewMode) return;

    if (freeModeReviewTotal > 0 && freeModeReviewIndex > freeModeReviewTotal - 1) {
      setFreeModeReviewIndex(0);
    }
  }, [routeMode, currentMode, isFreeModeReviewMode, freeModeReviewIndex, freeModeReviewTotal]);

  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode !== 'free' || !isFreeModeReviewMode) return;

    const reviewQuestion: any = sortedFreeModeQuestionsForReview[freeModeReviewIndex];
    if (!reviewQuestion) return;

    const mapAnswerToOptionId = (raw: any): string | null => {
      if (raw == null || raw === '') return null;
      const normalized = String(raw).toLowerCase().trim();
      if (['a', 'b', 'c', 'd'].includes(normalized)) return normalized;

      const optionsById: Record<string, any> = {
        a: reviewQuestion.option_a,
        b: reviewQuestion.option_b,
        c: reviewQuestion.option_c,
        d: reviewQuestion.option_d,
      };

      for (const [id, text] of Object.entries(optionsById)) {
        const optionText = String(text ?? '')
          .toLowerCase()
          .trim();
        if (!optionText) continue;
        if (optionText === normalized) return id;
        if (optionText.includes(normalized) || normalized.includes(optionText)) return id;
      }

      return null;
    };

    const mappedUserAnswer = mapAnswerToOptionId(reviewQuestion.fill_in_answer);
    const mappedCorrectAnswer = mapAnswerToOptionId(reviewQuestion.correct_answer);

    console.log('🔍 [TRIVIA SCREEN] MAPPING REVIEW QUESTION:', {
      index: freeModeReviewIndex,
      rawFillIn: reviewQuestion.fill_in_answer,
      rawCorrect: reviewQuestion.correct_answer,
      mappedUser: mappedUserAnswer,
      mappedCorrect: mappedCorrectAnswer
    });

    dispatch(setSelectedAnswer(mappedUserAnswer));
    setApiCorrectAnswer(mappedCorrectAnswer);

    const isCorrectValue =
      reviewQuestion.is_correct != null
        ? Boolean(reviewQuestion.is_correct)
        : Boolean(
          mappedUserAnswer && mappedCorrectAnswer && mappedUserAnswer === mappedCorrectAnswer
        );

    if (!isCorrectValue && mappedUserAnswer) {
      setPreviousAnswer(mappedUserAnswer);
      setPreviousAnswerCorrect(false);
    } else {
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(Boolean(isCorrectValue));
    }

    setAlreadyAnswered(true);
    setLocalIsSubmitted(true);
    setShowCongratsScreen(false);
    setShowCorrectAnimation(false);
    setShowWrongAnimation(false);
    setShowConfetti(false);
  }, [
    routeMode,
    currentMode,
    isFreeModeReviewMode,
    freeModeReviewIndex,
    sortedFreeModeQuestionsForReview,
    dispatch,
  ]);

  // Hooks (useSoundEffects, useEntranceAnimations, etc.) moved to top block

  // OLD CODE: No auto-checking question status - only check when needed (like old code)
  // Removed auto checkQuestionStatus to prevent auto-answer behavior

  // Clear selected answer when question changes or screen first loads - ensure no option is selected on open
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' && isFreeModeReviewMode) {
      return;
    }

    // CRITICAL: Don't reset state when navigating with arrows - let arrow navigation handle it
    if (isNavigatingWithArrows.current) {
      return;
    }

    const currentQuestionNumber = question?.questionNumber;

    // CRITICAL FIX: Check if this "new" question is actually already answered
    const isQuestionAlreadyAnswered = Boolean(
      apiQuestion?.answered_at ||
      apiQuestion?.fill_in_answer ||
      (apiQuestion?.is_correct !== null && apiQuestion?.is_correct !== undefined) ||
      (currentFreeModeQuestion as any)?.answered_at ||
      (currentFreeModeQuestion as any)?.fill_in_answer
    );

    console.log('🔍 [TRIVIA SCREEN] Checking question state:', {
      currentQuestionNumber,
      previousQuestionNumber: previousQuestionNumber.current,
      localIsSubmitted,
      isSubmitted,
      isQuestionAlreadyAnswered,
      answered_at: apiQuestion?.answered_at || (currentFreeModeQuestion as any)?.answered_at,
      fill_in_answer:
        apiQuestion?.fill_in_answer || (currentFreeModeQuestion as any)?.fill_in_answer,
      rawApiResponse: apiQuestion, // Added for full visibility
    });

    // Clear selected answer only when question number changes (new question) or first load
    // BUT DO NOT RESET if the question is already answered (answered_at exists)
    if (
      currentQuestionNumber &&
      currentQuestionNumber !== previousQuestionNumber.current &&
      !localIsSubmitted &&
      !isSubmitted &&
      !isQuestionAlreadyAnswered
    ) {
      // CRITICAL: Don't reset already-answered questions!

      // CRITICAL: Log when new question is detected
      console.log('🟢 [TRIVIA SCREEN] NEW UNANSWERED QUESTION DETECTED:', {
        newQuestionNumber: currentQuestionNumber,
        previousQuestionNumber: previousQuestionNumber.current,
        mode,
      });

      // Update the ref to track this question number
      previousQuestionNumber.current = currentQuestionNumber;

      // Also sync the API question number ref if available
      const apiQNum = apiQuestion?.question_number;
      if (apiQNum && apiQNum === currentQuestionNumber) {
        previousApiQuestionNumber.current = apiQNum;
      }

      // Reset question status check ref for new question
      hasCheckedQuestionStatus.current = null;

      // Clear selected answer immediately when question changes

      dispatch(setSelectedAnswer(null));

      // Reset previous answer state when question changes
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      setApiCorrectAnswer(null); // Reset API correct answer for new question

      // Reset all animation states for new question
      setShowCorrectAnimation(false);
      setShowWrongAnimation(false);
      setShowConfetti(false);
      setCorrectAnimationCompleted(false);
      setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state for new question
      setShowCongratsScreen(false); // Close modal when new question loads
      setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag for new question
      userManuallyClosedFreeModeModal.current = false; // Reset free mode modal close flag for new question
      processedSubmission.current = null; // Reset processed submission tracker
      confettiShownForQuestion.current = null; // Reset confetti tracking for new question
      hasProcessedAlreadyAnswered.current = null; // Reset already answered processing
      hasProcessedError.current = null; // Reset error processing
      confettiAnimationEndCalled.current = false; // Reset confetti animation end flag
      setHintTooltipText(''); // Reset hint tooltip text

      console.log(
        '🟢 [TRIVIA SCREEN] All state reset for new UNANSWERED question #' + currentQuestionNumber
      );
    } else if (
      currentQuestionNumber &&
      isQuestionAlreadyAnswered &&
      currentQuestionNumber !== previousQuestionNumber.current
    ) {
      // This is a new question NUMBER but it's already answered - just update ref, DON'T reset state
      console.log('⚠️ [TRIVIA SCREEN] Already-answered question loaded, NOT resetting state:', {
        questionNumber: currentQuestionNumber,
        answered_at: apiQuestion?.answered_at || (currentFreeModeQuestion as any)?.answered_at,
        fill_in_answer:
          apiQuestion?.fill_in_answer || (currentFreeModeQuestion as any)?.fill_in_answer,
      });
      previousQuestionNumber.current = currentQuestionNumber;
    } else if (currentQuestionNumber && previousQuestionNumber.current === null) {
      // First load - clear any selected answer and track the question number
      previousQuestionNumber.current = currentQuestionNumber;

      // Also sync the API question number ref if available
      const apiQNum = apiQuestion?.question_number;
      if (apiQNum && apiQNum === currentQuestionNumber) {
        previousApiQuestionNumber.current = apiQNum;
      }

      dispatch(setSelectedAnswer(null));

      // Reset previous answer state for extra_chance on first load
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      // Retry state removed

      // Reset all animation states on first load
      setShowCorrectAnimation(false);
      setShowWrongAnimation(false);
      setShowConfetti(false);
      setCorrectAnimationCompleted(false);
      setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state on first load
      setShowCongratsScreen(false); // Close modal on first load
      setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag on first load
      userManuallyClosedFreeModeModal.current = false; // Reset free mode modal close flag on first load
      processedSubmission.current = null; // Reset processed submission tracker
      confettiShownForQuestion.current = null; // Reset confetti tracking on first load
      hasProcessedAlreadyAnswered.current = null; // Reset already answered processing
      hasProcessedError.current = null; // Reset error processing
      confettiAnimationEndCalled.current = false; // Reset confetti animation end flag
      setHintTooltipText(''); // Reset hint tooltip text

      // Lifeline functionality removed
      // Lifeline functionality removed
    } else if (currentQuestionNumber && previousQuestionNumber.current === null) {
      // First load - clear any selected answer and track the question number
      previousQuestionNumber.current = currentQuestionNumber;

      // Also sync the API question number ref if available
      const apiQNum = apiQuestion?.question_number;
      if (apiQNum && apiQNum === currentQuestionNumber) {
        previousApiQuestionNumber.current = apiQNum;
      }

      dispatch(setSelectedAnswer(null));

      // Reset previous answer state for extra_chance on first load
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      // Retry state removed

      // Reset all animation states on first load
      setShowCorrectAnimation(false);
      setShowWrongAnimation(false);
      setShowConfetti(false);
      setCorrectAnimationCompleted(false);
      setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state on first load
      setShowCongratsScreen(false); // Close modal on first load
      setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag on first load
      userManuallyClosedFreeModeModal.current = false; // Reset free mode modal close flag on first load
      processedSubmission.current = null; // Reset processed submission tracker
      confettiShownForQuestion.current = null; // Reset confetti tracking on first load
      hasProcessedAlreadyAnswered.current = null; // Reset already answered processing
      hasProcessedError.current = null; // Reset error processing
      confettiAnimationEndCalled.current = false; // Reset confetti animation end flag
      setHintTooltipText(''); // Reset hint tooltip text

      // Lifeline functionality removed
      // Lifeline functionality removed
    }
  }, [
    question?.questionNumber,
    apiQuestion?.question_number,
    localIsSubmitted,
    isSubmitted,
    dispatch,
    routeMode,
    currentMode,
    isFreeModeReviewMode,
  ]);

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (localIsSubmitted || isSubmitted || alreadyAnswered || isFreeModeReviewMode) return;

      // CRITICAL: Set selected answer in Redux immediately for UI feedback
      dispatch(setSelectedAnswer(optionId));

      // Manual mode: DO NOT trigger submission automatically
      // handleSubmit(optionId);
    },
    [
      localIsSubmitted,
      isSubmitted,
      alreadyAnswered,
      isFreeModeReviewMode,
      // playSoundSafely, // Removed as per previous instruction
      // triggerHaptic, // Removed as per previous instruction
      dispatch,
    ]
  );

  // Handle submit - Simplified: immediate submit, no retry logic
  const handleSubmit = useCallback(
    (answerId?: string) => {
      // Use provide answerId or fall back to selectedAnswer from state
      const answerToProcess = answerId || selectedAnswer;

      console.log('🔵 [TRIVIA SCREEN] handleSubmit - CALLED', {
        answerToProcess,
        selectedAnswer,
        questionNumber: question?.questionNumber,
        hasQuestion: !!question,
        localIsSubmitted,
        isSubmitted,
        alreadyAnswered,
        mode: routeMode || currentMode || 'free',
      });

      // Track analytics
      trackAction('answer_submitted', {
        questionNumber: question?.questionNumber,
        answer: answerToProcess,
      });
      const currentQuestion = question;
      const mode = routeMode || currentMode || 'free';

      // CRITICAL: Prevent submission if already answered
      if (alreadyAnswered) {
        console.log('🟡 [TRIVIA SCREEN] handleSubmit - Already answered, skipping');
        if (mode !== 'free' && !showCongratsScreen) {
          setShowCongratsScreen(true);
        }
        return;
      }

      // Prevent duplicate submission
      if (!answerToProcess || !currentQuestion || localIsSubmitted || isSubmitted) {
        console.log('🟡 [TRIVIA SCREEN] handleSubmit - Duplicate submission prevented', {
          hasAnswer: !!answerToProcess,
          hasCurrentQuestion: !!currentQuestion,
          localIsSubmitted,
          isSubmitted,
        });
        return;
      }

      // Free Mode: backend completion is the single source of truth
      const isCompleted = freeModeStatus?.progress?.completed === true;
      const allQuestionsAnswered = freeModeStatus?.progress?.all_questions_answered === true;
      if (mode === 'free' && (isCompleted || allQuestionsAnswered)) {
        if (!userManuallyClosedFreeModeModal.current) {
          setShowFreeModeCompletionModal(true);
        }
        return;
      }

      // Prevent submission if daily_completed is true
      if (mode !== 'free' && mode !== 'bronze' && mode !== 'silver' && dailyCompleted) {
        Alert.alert(
          'Daily Completed',
          'You have already answered correctly today. Come back tomorrow for new questions!'
        );
        return;
      }

      // Check if question is already answered
      if (
        mode !== 'free' &&
        mode !== 'bronze' &&
        mode !== 'silver' &&
        questionStatus?.is_answered
      ) {
        setAlreadyAnswered(true);
        setShowCongratsScreen(true);
        return;
      }

      // CRITICAL: For free mode, send option ID (e.g., "c"); for other modes, send option text
      const selectedOption = currentQuestion.options.find(
        opt => opt.id.toLowerCase() === answerToProcess.toLowerCase()
      );
      // Free mode API expects option ID (a, b, c, d), not option text
      const answerToSubmit =
        mode === 'free'
          ? answerToProcess.toLowerCase() // Send option ID for free mode
          : selectedOption?.text || answerToProcess; // Send option text for other modes

      // Log the submission details for debugging
      logger.debug('handleSubmit - Submitting answer', 'TRIVIA', {
        selectedAnswerId: answerToProcess,
        selectedOptionText: selectedOption?.text,
        answerToSubmit,
        questionNumber: currentQuestion.questionNumber,
      });

      // CRITICAL: DO NOT set isSubmitted yet - wait for API response
      // Setting isSubmitted immediately causes marks to show before API responds
      // We'll set it in the submissionResult useEffect after API responds
      // For now, just disable options to prevent multiple submissions
      setLocalIsSubmitted(true);
      // DO NOT dispatch(setIsSubmitted(true)) here - wait for API response

      // CRITICAL: Don't check answer locally - wait for API response
      // API will return is_correct and correct_answer
      // DO NOT compare selectedAnswer with correctAnswer locally - API is the ONLY source of truth
      // Marks will ONLY show after API response in submissionResult useEffect
      // DO NOT trigger any animations here - wait for API response in useEffect

      // Reset processed submission to allow new processing
      processedSubmission.current = null;

      // Use real API based on mode (already derived above)
      if (mode === 'bronze' && currentBronzeModeQuestion) {
        console.log('🔵 [TRIVIA API] Submitting BRONZE mode answer:', {
          question_id: currentBronzeModeQuestion.question_id,
          answer: answerToSubmit,
        });
        logger.debug('handleSubmit - Submitting to bronze-mode API', 'TRIVIA', {
          question_id: currentBronzeModeQuestion.question_id,
          answer: answerToSubmit,
        });
        logger.debug('BRONZE MODE - Submitting answer', 'TRIVIA', {
          question_id: currentBronzeModeQuestion.question_id,
          answer: answerToSubmit,
        });

        // Try to find ANY id field
        const questionId = Number(
          currentBronzeModeQuestion.question_id ||
          currentBronzeModeQuestion.id ||
          (currentBronzeModeQuestion as any)._id ||
          (currentBronzeModeQuestion as any).questionId
        );

        if (!questionId || !answerToSubmit) {
          console.error('🔴 [TRIVIA] Cannot submit Bronze Mode answer - missing data:', {
            questionId,
            rawObject: JSON.stringify(currentBronzeModeQuestion),
            keys: Object.keys(currentBronzeModeQuestion),
            answerToSubmit
          });
          return;
        }

        dispatch(
          submitBronzeModeAnswer({
            question_id: questionId,
            answer: answerToSubmit,
          })
        );
      } else if (mode === 'silver' && currentSilverModeQuestion) {
        console.log('🔵 [TRIVIA API] Submitting SILVER mode answer:', {
          question_id: currentSilverModeQuestion.question_id,
          answer: answerToSubmit,
        });
        logger.debug('handleSubmit - Submitting to silver-mode API', 'TRIVIA', {
          question_id: currentSilverModeQuestion.question_id,
          answer: answerToSubmit,
        });

        // Try to find ANY id field
        const questionId = Number(
          currentSilverModeQuestion.question_id ||
          currentSilverModeQuestion.id ||
          (currentSilverModeQuestion as any)._id ||
          (currentSilverModeQuestion as any).questionId
        );

        if (!questionId || !answerToSubmit) {
          console.error('🔴 [TRIVIA] Cannot submit Silver Mode answer - missing data:', {
            questionId,
            rawObject: JSON.stringify(currentSilverModeQuestion),
            keys: Object.keys(currentSilverModeQuestion),
            answerToSubmit
          });
          return;
        }

        dispatch(
          submitSilverModeAnswer({
            question_id: questionId,
            answer: answerToSubmit,
          })
        );
      } else if (mode === 'free' && currentFreeModeQuestion) {
        console.log('🔵 [TRIVIA API] Submitting FREE mode answer:', {
          question_id: currentFreeModeQuestion.question_id,
          answer: answerToSubmit,
        });
        logger.debug('handleSubmit - Submitting to free-mode API', 'TRIVIA', {
          question_id: currentFreeModeQuestion.question_id,
          answer: answerToSubmit,
        });

        dispatch(
          submitFreeModeAnswer({
            question_id: currentFreeModeQuestion.question_id,
            answer: answerToSubmit,
          })
        );
      } else {
        // Fallback to old API if free-mode question not available
        console.log('🔵 [TRIVIA API] Using legacy submitAnswer API:', {
          questionNumber: currentQuestion.questionNumber,
          answer: answerToSubmit,
        });
        logger.debug('handleSubmit - Using legacy submitAnswer', 'TRIVIA', { answerToSubmit });
        dispatch(
          submitAnswer({
            questionNumber: currentQuestion.questionNumber,
            answer: answerToSubmit,
          })
        );
      }

      // Note: Animation (correct/wrong lottie) will be triggered ONLY by submissionResult effect below
      // NO animations should be triggered here - wait for API response
      // NO local answer comparison should happen - use API response is_correct field
    },
    [
      selectedAnswer,
      question,
      currentFreeModeQuestion,
      currentBronzeModeQuestion,
      currentSilverModeQuestion,
      routeMode,
      currentMode,
      localIsSubmitted,
      dispatch,
      alreadyAnswered,
      showCongratsScreen,
    ]
  );

  // Store handleSubmit in ref so handleOptionSelect can access it
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Handle correct animation completion - simplified to prevent hanging
  const handleCorrectAnimationEnd = useCallback(() => {
    logger.debug('handleCorrectAnimationEnd - Correct animation completed', 'TRIVIA');
    console.log('🟢 [TRIVIA SCREEN] Correct animation ended');
    setCorrectAnimationCompleted(true);

    // Simplified: Hide animation and show congrats screen immediately
    // CRITICAL: Reduced delay from 500ms to 200ms for faster progression
    const timer = setTimeout(() => {
      const mode = routeMode || currentMode || 'free';
      setShowCorrectAnimation(false);

      // Free Mode must continue to next question (no per-question CongratsScreen)
      if (mode !== 'free') {
        setShowCongratsScreen(true);
        setAlreadyAnswered(true);
      } else {
        console.log(
          '🟢 [TRIVIA SCREEN] Free mode: Not showing congrats, preparing for next question'
        );
      }
      animationTimersRef.current.delete(timer);
    }, 200); // Reduced delay for faster progression (was 500ms)
    animationTimersRef.current.add(timer);
  }, [routeMode, currentMode]);

  // Keep handleSubmitRef updated with the latest handleSubmit function
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Handle wrong animation completion - simplified to prevent hanging
  const handleWrongAnimationEnd = useCallback(() => {
    logger.debug('handleWrongAnimationEnd - Wrong animation completed', 'TRIVIA');
    console.log('🔴 [TRIVIA SCREEN] Wrong animation ended');
    setWrongAnimationCompleted(true);

    // Simplified: Hide animation and show congrats screen immediately (no retry)
    // CRITICAL: Reduced delay from 500ms to 200ms for faster progression
    const timer = setTimeout(() => {
      const mode = routeMode || currentMode || 'free';
      setShowWrongAnimation(false);

      // Free Mode must continue to next question (no per-question CongratsScreen)
      if (mode !== 'free') {
        setShowCongratsScreen(true);
        setAlreadyAnswered(true);
      } else {
        console.log(
          '🟢 [TRIVIA SCREEN] Free mode: Not showing congrats, preparing for next question'
        );
      }
      animationTimersRef.current.delete(timer);
    }, 200); // Reduced delay for faster progression (was 500ms)
    animationTimersRef.current.add(timer);
  }, [routeMode, currentMode]);

  // Handle confetti animation end - show modal after confetti completes
  const handleConfettiAnimationEnd = useCallback(() => {
    const mode = routeMode || currentMode || 'free';
    // Free Mode must continue to next question (no per-question CongratsScreen)
    if (mode === 'free') {
      setConfettiAnimationCompleted(true);
      setShowConfetti(false);
      return;
    }

    // Prevent multiple calls
    if (confettiAnimationEndCalled.current) {
      // Already called - show congrats screen directly as fallback (but not during arrow navigation)
      setTimeout(() => {
        if (!isNavigatingWithArrows.current) {
          setShowCongratsScreen(true);
          setAlreadyAnswered(true); // Mark as answered so user can reopen modal
        }
      }, 500);
      return;
    }

    confettiAnimationEndCalled.current = true;

    setConfettiAnimationCompleted(true);

    // SLOW AND SMOOTH: Wait longer to ensure confetti fully completes before modal appears
    // Give user time to see all particles finish falling smoothly
    const timer1 = setTimeout(() => {
      // Keep confetti visible a bit longer for user to see it complete

      const timer2 = setTimeout(() => {
        // Hide confetti smoothly
        setShowConfetti(false);

        // Additional smooth delay for clean transition before modal
        const timer3 = setTimeout(() => {
          // CRITICAL: Show modal after smooth delay - clean and neat transition
          // But NOT during arrow navigation
          if (!isNavigatingWithArrows.current) {
            setShowCongratsScreen(true);
            setAlreadyAnswered(true); // Mark as answered so user can reopen modal
          }
          animationTimersRef.current.delete(timer3);
        }, 500); // 500ms delay between confetti end and modal for clean transition
        animationTimersRef.current.add(timer3);
        animationTimersRef.current.delete(timer2);
      }, 500); // 500ms delay before hiding confetti
      animationTimersRef.current.add(timer2);
      animationTimersRef.current.delete(timer1);
    }, 1000); // 1000ms (1 second) delay to ensure confetti cleanup completes fully
    animationTimersRef.current.add(timer1);
  }, [routeMode, currentMode]);

  // Removed: Handle 50-50 animation completion
  const handleFiftyFiftyAnimationComplete = useCallback(async () => {
    // Lifeline functionality removed
  }, []);

  // Handle change question animation completion
  const handleChangeQuestionAnimationComplete = useCallback(async () => {
    // CRITICAL: Wait for animation to fully complete visually before proceeding
    // Add delay to ensure animation is completely finished
    setTimeout(async () => {
      setChangeQuestionAnimationCompleted(true);
      // Don't hide animation immediately - keep it visible longer

      try {
        // Step 1: Hide text while lottie animation is playing
        Animated.timing(questionTextOpacity, {
          toValue: 0, // Hide the text
          duration: 200,
          useNativeDriver: true,
        }).start();

        // unlock-next endpoint removed - functionality no longer available
        Alert.alert('Error', 'Question change feature is no longer available.');
        // Restore text opacity if error
        Animated.timing(questionTextOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        return;

        // CRITICAL: Fetch fresh question data to ensure UI displays latest question from API
        // This ensures the question text, options, and all details are up-to-date
        try {
          await dispatch(fetchCurrentQuestion()).unwrap();
        } catch (error) {
          // Continue with unlocked question if fetch fails
        }

        // Step 3: Reveal new text slowly (fade in) after lottie animation completes
        // The lottie animation completion triggers this callback, so we reveal the text now
        Animated.timing(questionTextOpacity, {
          toValue: 1, // Fully reveal the text
          duration: 500, // Slow fade in animation
          useNativeDriver: true,
        }).start();

        // Show success popup modal
        setShowChangeQuestionSuccessModal(true);

        // Boost API removed

        // Update gems from response (already updated in Redux, but refresh UI)
        if (refreshGems && typeof refreshGems === 'function') {
          refreshGems();
        }

        // Animation removed
      } catch (error: any) {
        // Restore text opacity if error
        Animated.timing(questionTextOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
        if (errorMessage.includes('Insufficient gems') || errorMessage.includes('Insufficient')) {
          Alert.alert('Insufficient Gems', "You don't have enough gems to change the question.");
        } else {
          Alert.alert('Error', 'Failed to change question. Please try again.');
        }
      }
    }, 1000); // 1000ms delay to keep animation visible longer before proceeding
  }, [dispatch, refreshGems, question, apiQuestion, questionTextOpacity]);

  // Handle auto animation completion
  const handleAutoAnimationComplete = useCallback(async () => {
    // CRITICAL: Wait for animation to fully complete visually before proceeding
    // Keep animation visible longer - don't proceed immediately
    setTimeout(async () => {
      setAutoAnimationCompleted(true);
      // Don't hide animation immediately - keep it visible longer

      // Boost API removed - lifeline functionality disabled

      // Get current question
      const currentQuestion = questionWithDisabledOptions || question;
      if (!currentQuestion) {
        Alert.alert('Error', 'Question not available.');
        return;
      }

      // Get correct answer from current Redux state (this is ALWAYS correct for Auto)
      // Get the option ID first, then find the option text to send
      const correctAnswerId =
        apiQuestion?.correct_answer?.toLowerCase() || currentQuestion.correctAnswer?.toLowerCase();

      if (!correctAnswerId) {
        Alert.alert('Error', 'Correct answer not available for this question.');
        return;
      }

      // Find the option text for the correct answer ID
      const correctOption = currentQuestion.options.find(
        opt =>
          opt.id.toLowerCase() === correctAnswerId || opt.text.toLowerCase() === correctAnswerId
      );
      const correctAnswerText = correctOption?.text || correctAnswerId;

      // IMPORTANT: Set correct answer and mark as submitted BEFORE triggering animations
      // Store the option ID for UI display
      dispatch(setSelectedAnswer(correctAnswerId));
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // Flow: Correct Lottie → Confetti → Modal (EXACTLY same as manual correct answer)
      // Smooth and clean: Complete animation fully, then confetti falls, then modal

      // Reset confetti flags to ensure confetti and modal show properly
      confettiAnimationEndCalled.current = false; // Reset so confetti animation end can run
      confettiShownForQuestion.current = null; // Reset so confetti can show for this question

      setShowCorrectAnimation(true);
      setCorrectAnimationCompleted(false);
      setShowConfetti(false); // Don't show confetti yet (correct animation must complete first)
      setShowCongratsScreen(false); // Don't show modal yet (confetti must complete first)
      setShowWrongAnimation(false); // Ensure wrong animation is off
      setAlreadyAnswered(false); // Ensure not in already answered mode

      // Play WIN sound with Auto lifeline
      playSoundSafely('win', 'success');

      // Lifeline functionality removed

      // Animation removed

      // Submit to API for backend processing - send option text, not option ID

      dispatch(
        submitAnswer({
          questionNumber: currentQuestion.questionNumber,
          answer: correctAnswerText,
        })
      );
    }, 1000); // 1000ms delay to keep animation visible longer before proceeding
  }, [
    apiQuestion,
    question,
    questionWithDisabledOptions,
    dispatch,
    canPlaySounds,
    playWin,
    refreshGems,
  ]);

  // Handle hint animation completion
  const handleHintAnimationComplete = useCallback(async () => {
    // Lifeline functionality removed
  }, []);

  // Handle congrats close - allow reopening by tap until new question
  const handleCongratsClose = useCallback(() => {
    setShowCongratsScreen(false);
    // Mark that user manually closed modal - prevent auto-reopening
    userManuallyClosedModal.current = true;
    // Keep alreadyAnswered true so modal can be reopened by tapping screen
    // This allows user to close and reopen modal until new question is fetched
    setAlreadyAnswered(true);
    // CRITICAL: DO NOT clear marks (previousAnswer, previousAnswerCorrect, apiCorrectAnswer)
    // These must persist after closing modal so options continue to show right/wrong marks
    // Marks should remain visible until question refreshes tomorrow
    // Don't reset confetti flag - it should stay shown for this question
  }, [playSoundSafely]);

  // Retry functionality removed - one attempt only per question

  // Handle navigation to shop
  const navigateToShop = useCallback(() => {
    navigation.navigate('Shop' as never);
  }, [navigation]);

  // Handle info tooltip
  const handleInfoPress = useCallback(() => {
    if (infoIconRef.current) {
      infoIconRef.current.measure(
        (x: any, y: any, width: any, height: any, pageX: any, pageY: any) => {
          setTooltipAnchor({ x: pageX, y: pageY });
          setShowInfoTooltip(!showInfoTooltip);
        }
      );
    }
  }, [showInfoTooltip]);

  // Reset fetch flags when screen loses focus and track focus timestamp
  useEffect(() => {
    if (isFocused) {
      // Screen was focused - update timestamp to allow modal to show
      screenFocusTimestamp.current = Date.now();
      // Reset modal tracking so it can show for new question on focus
      modalShownForQuestionOnFocus.current = null;
    } else {
      hasFetchedOnFocus.current = false;
      fetchAttempted.current = false;
      // Reset question status check when screen loses focus so it checks again on reopen
      // This ensures fresh status when user closes and reopens the screen
      hasCheckedQuestionStatus.current = null;
      // Reset modal tracking when screen loses focus
      modalShownForQuestionOnFocus.current = null;

      // Bronze/Silver require auto-opening the congrats modal on every re-entry
      const modeOnBlur = routeMode || currentMode || 'free';
      if (modeOnBlur === 'bronze' || modeOnBlur === 'silver') {
        userManuallyClosedModal.current = false;
      }
    }
  }, [isFocused, routeMode, currentMode]);

  // Bronze/Silver: reopen the congrats modal automatically whenever the backend reports submission
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const mode = routeMode || currentMode || 'free';
    if (mode !== 'bronze' && mode !== 'silver') {
      return;
    }

    const statusData = mode === 'bronze' ? bronzeModeStatus : silverModeStatus;
    const questionData = mode === 'bronze' ? currentBronzeModeQuestion : currentSilverModeQuestion;

    const statusSaysSubmitted =
      statusData?.has_submitted === true ||
      Boolean(statusData?.submitted_at) ||
      Boolean(statusData?.fill_in_answer);

    const statusString = String(questionData?.status || '').toLowerCase();
    const questionSaysSubmitted =
      Boolean(questionData?.submitted_at) ||
      Boolean(questionData?.answered_at) ||
      (statusString.includes('answered') && statusString.length > 0);

    if (!statusSaysSubmitted && !questionSaysSubmitted) {
      return;
    }

    // CRITICAL: Never show modal when navigating with arrows
    if (
      userManuallyClosedModal.current ||
      showCongratsScreen ||
      showCorrectAnimation ||
      showWrongAnimation ||
      isNavigatingWithArrows.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      // Double-check arrow navigation flag before showing modal
      if (!userManuallyClosedModal.current && !isNavigatingWithArrows.current) {
        setShowCongratsScreen(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [
    isFocused,
    routeMode,
    currentMode,
    bronzeModeStatus,
    silverModeStatus,
    currentBronzeModeQuestion,
    currentSilverModeQuestion,
    showCongratsScreen,
    showCorrectAnimation,
    showWrongAnimation,
  ]);

  // Check if loaded question is already answered - trigger modal immediately
  useEffect(() => {
    if (!apiQuestion) return;

    // Free Mode uses completion summary + review UI (no per-question CongratsScreen)
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
      return;
    }

    const currentQNum = apiQuestion.question_number;

    // CRITICAL: If question number changed, it's a NEW question - reset everything and allow answering
    if (
      previousApiQuestionNumber.current !== null &&
      previousApiQuestionNumber.current !== currentQNum
    ) {
      // Update the ref to track this new question
      previousApiQuestionNumber.current = currentQNum;
      hasProcessedAlreadyAnswered.current = null; // Reset processing flag for new question
      modalShownForQuestionOnFocus.current = null; // Reset modal tracking for new question
      setAlreadyAnswered(false); // Reset to allow answering
      setShowCongratsScreen(false); // Close modal for new question
      userManuallyClosedModal.current = false; // Reset manual close flag

      // Reset previous answer state for extra_chance when new question detected
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      // Retry state removed
      // Retry state removed
      // Retry state removed - no need to preserve correct answer

      return; // Don't check for already-answered on new questions
    }

    // Update ref if this is first time seeing this question number
    if (previousApiQuestionNumber.current === null) {
      previousApiQuestionNumber.current = currentQNum;
    }

    // Prevent processing the same question multiple times
    if (hasProcessedAlreadyAnswered.current === currentQNum) {
      return;
    }

    // Check if API response indicates question is already answered
    // API returns user_answer, answered_at, or status: "answered_wrong" or "answered_correct"
    // CRITICAL: status field is the primary indicator - if status is answered_wrong or answered_correct, question is already answered
    // For free-mode: check currentFreeModeQuestion.answered_at
    const freeModeAnswered = currentFreeModeQuestion?.answered_at != null;
    const hasStatusAnswered =
      (apiQuestion as any).status === 'answered_wrong' ||
      (apiQuestion as any).status === 'answered_correct';
    const hasUserAnswer = apiQuestion.user_answer != null && apiQuestion.user_answer !== '';
    const hasAnsweredAt = apiQuestion.answered_at != null && apiQuestion.answered_at !== '';

    // CRITICAL: Only treat as already-answered when we have explicit answer data.
    // DO NOT rely on is_correct alone – some backends always send is_correct=false
    // which would incorrectly mark fresh questions as completed and show the
    // congratulations modal on first load.
    // Check free-mode status first
    if (freeModeAnswered || hasStatusAnswered || hasUserAnswer || hasAnsweredAt) {
      // CRITICAL: For already-answered questions, check if we're currently navigating
      const isArrowNav = isNavigatingWithArrows;
      const arrowNavTime = arrowNavigationTimestamp.current;
      const timeSinceArrowNav = arrowNavTime > 0 ? Date.now() - arrowNavTime : Infinity;

      if (isArrowNav || timeSinceArrowNav < 800) {
        // Skip showing modal during navigation, but CONTINUE processing to set marks
        logger.debug(
          'checkStatus - Navigation detected, skipping modal but setting marks',
          'TRIVIA'
        );
      }

      // Mark as processed to prevent re-processing
      hasProcessedAlreadyAnswered.current = currentQNum;

      // Set alreadyAnswered immediately - this disables options and lifelines
      setAlreadyAnswered(true);

      // Lifeline functionality removed

      // CRITICAL: For free mode, use fill_in_answer from freeModeQuestions list
      // Map fill_in_answer and correct_answer to option IDs
      const mapAnswerToOptionId = (raw: any, questionData: any): string | null => {
        if (raw == null || raw === '') return null;
        const normalized = String(raw).toLowerCase().trim();
        if (['a', 'b', 'c', 'd'].includes(normalized)) return normalized;

        const optionsById: Record<string, any> = {
          a: questionData?.option_a,
          b: questionData?.option_b,
          c: questionData?.option_c,
          d: questionData?.option_d,
        };

        for (const [id, text] of Object.entries(optionsById)) {
          const optionText = String(text ?? '')
            .toLowerCase()
            .trim();
          if (!optionText) continue;
          if (optionText === normalized) return id;
          if (optionText.includes(normalized) || normalized.includes(optionText)) return id;
        }

        return null;
      };

      // Get user answer - prioritize fill_in_answer from free mode question
      const userAnswerRaw =
        currentFreeModeQuestion?.fill_in_answer ||
        currentFreeModeQuestion?.answered_at ||
        apiQuestion.user_answer ||
        null;
      const mappedUserAnswer = userAnswerRaw
        ? mapAnswerToOptionId(userAnswerRaw, currentFreeModeQuestion)
        : null;

      // Get correct answer - prioritize correct_answer from free mode question
      const correctAnswerRaw =
        currentFreeModeQuestion?.correct_answer || apiQuestion.correct_answer || null;
      const mappedCorrectAnswer = correctAnswerRaw
        ? mapAnswerToOptionId(correctAnswerRaw, currentFreeModeQuestion)
        : null;

      // Set selected answer and correct answer
      if (mappedUserAnswer) {
        dispatch(setSelectedAnswer(mappedUserAnswer));
      }
      if (mappedCorrectAnswer) {
        setApiCorrectAnswer(mappedCorrectAnswer);
      }

      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // NO CONFETTI when opening screen with already-answered question
      // Confetti should ONLY show when user answers correctly in current session

      // CRITICAL: Set previous answer state from API response
      // This ensures marks (X for wrong, checkmark for correct) are shown based on API response
      // Always show both correct and wrong answers since question is already answered
      const answerIsCorrect =
        currentFreeModeQuestion?.is_correct ?? apiQuestion.is_correct ?? false;

      if (mappedUserAnswer) {
        setPreviousAnswer(mappedUserAnswer);
        // Use API response is_correct to determine if previous answer was correct
        setPreviousAnswerCorrect(Boolean(answerIsCorrect));
        // Question is already answered, so always show correct answer (both correct and wrong visible)
      }

      // CRITICAL: Set submitted state to true so options show right/wrong status
      // This ensures that after closing modal, options will display green (correct) or red (wrong)
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // Mark as already answered
      setAlreadyAnswered(true);

      // NO CONFETTI - just show modal directly
      setShowConfetti(false);

      // CRITICAL: NEVER show modal when navigating with arrows
      // Check flag AGAIN right before setting modal (final check)
      const finalCheckIsArrowNav = isNavigatingWithArrows.current;
      const finalCheckArrowNavTime = arrowNavigationTimestamp.current;
      const finalCheckTimeSinceArrowNav =
        finalCheckArrowNavTime > 0 ? Date.now() - finalCheckArrowNavTime : Infinity;

      if (finalCheckIsArrowNav || finalCheckTimeSinceArrowNav < 5000) {
        // Don't show modal when navigating with arrows - force close it
        setShowCongratsScreen(false);
        return; // EARLY RETURN - prevent any further processing that might show modal
      }

      // CRITICAL: Only show modal when navigating TO the screen (on focus), not while navigating within screen
      // Check if screen was recently focused (within 3 seconds) - this indicates user navigated TO the screen
      const timeSinceScreenFocus =
        screenFocusTimestamp.current > 0 ? Date.now() - screenFocusTimestamp.current : Infinity;
      const isScreenRecentlyFocused = isFocused && timeSinceScreenFocus < 3000;

      // CRITICAL: Check if modal was already shown for this question when screen was focused
      const alreadyShownForThisQuestion = modalShownForQuestionOnFocus.current === currentQNum;

      if (!isScreenRecentlyFocused || alreadyShownForThisQuestion) {
        // Screen is not recently focused OR modal already shown for this question - don't show modal
        setShowCongratsScreen(false);
        return;
      }

      // Only show modal if screen was recently focused (navigated TO screen) AND NOT navigating with arrows AND not already shown
      modalShownForQuestionOnFocus.current = currentQNum; // Mark as shown for this question
      setShowCongratsScreen(true);
    } else {
      // Question has no answer data - it's a fresh question, allow answering

      setAlreadyAnswered(false); // Ensure it's false for fresh questions
      setShowCongratsScreen(false); // Ensure modal is closed
    }
  }, [
    apiQuestion?.question_number,
    apiQuestion?.user_answer,
    apiQuestion?.answered_at,
    apiQuestion?.is_correct,
    currentFreeModeQuestion?.answered_at,
    currentFreeModeQuestion?.is_correct,
    dailyCompleted,
    dispatch,
    selectedAnswer,
    question,
    routeMode,
    currentMode,
    isFocused,
  ]);

  // Track if question status has been checked for current question

  // Check question status when screen opens/focuses or question changes
  // CRITICAL: Only check if NOT currently processing a fresh submission
  // NOTE: This is for LEGACY trivia mode only - disabled for free/bronze/silver modes
  useEffect(() => {
    // Skip for new modes (free/bronze/silver) - they handle status differently
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
      return; // Skip legacy status check for new modes
    }

    if (!isFocused || !apiQuestion?.question_number) return;

    const currentQNum = apiQuestion.question_number;

    // CRITICAL: Don't check status if we're currently processing a fresh submission
    // This prevents interference with the submission flow and animations
    // Check if we have a submission result that hasn't been processed yet OR animations are playing
    if (localIsSubmitted && submissionResult && submissionResult.is_correct !== undefined) {
      // Check if submission is being processed (not yet processed) OR animations are active
      const submissionKey =
        question?.questionNumber +
        '-' +
        selectedAnswer +
        '-' +
        submissionResult.is_correct +
        '-' +
        (submissionResult.correct_answer || '');
      const isProcessingSubmission = processedSubmission.current !== submissionKey;

      if (isProcessingSubmission || showCorrectAnimation || showWrongAnimation) {
        // We have a fresh submission result being processed or animations playing - don't interfere
        // The submission result effect will handle everything including animations
        return;
      }
    }

    // Check question status from API endpoint (LEGACY MODE ONLY)
    // Always check when screen focuses to get latest state (especially after closing/reopening)
    const checkStatus = async () => {
      try {
        const statusResult = await dispatch(checkQuestionStatus(currentQNum)).unwrap();

        // CRITICAL: If statusResult is null, skip status check and proceed to next step
        // This happens when question is not found, not unlocked, or not answered yet
        if (!statusResult || statusResult === null) {
          logger.debug(
            'checkQuestionStatus - Status is null (question not found/unlocked/not answered), skipping',
            'TRIVIA'
          );
          hasCheckedQuestionStatus.current = null;
          setAlreadyAnswered(false);
          // Retry state removed
          return; // Skip status check, proceed to normal flow
        }

        if (statusResult && statusResult.is_answered) {
          // Mark as checked for this question
          hasCheckedQuestionStatus.current = currentQNum;

          // CRITICAL: Double-check we're not processing a fresh submission
          // If we just got a submission result, let that flow handle it
          if (localIsSubmitted && submissionResult && submissionResult.is_correct !== undefined) {
            const submissionKey =
              question?.questionNumber +
              '-' +
              selectedAnswer +
              '-' +
              submissionResult.is_correct +
              '-' +
              (submissionResult.correct_answer || '');
            const isProcessingSubmission = processedSubmission.current !== submissionKey;

            if (isProcessingSubmission || showCorrectAnimation || showWrongAnimation) {
              return; // Let submission flow handle it - don't interfere with animations
            }
          }

          // Update all states based on question status response
          // Set alreadyAnswered immediately - this disables options and lifelines
          setAlreadyAnswered(true);

          // CRITICAL: Disable all lifelines when question is already answered
          // setLifelines({
          //   '50-50': false,
          //   'Auto': false,
          //   'Change': false,
          //   'Hint': false,
          // });

          // Set submitted state to true so options show right/wrong status
          if (statusResult.user_answer) {
            const normalized = String(statusResult.user_answer).toLowerCase().trim();
            if (
              normalized === 'a' ||
              normalized === 'b' ||
              normalized === 'c' ||
              normalized === 'd'
            ) {
              dispatch(setSelectedAnswer(normalized));
            }
          }
          setLocalIsSubmitted(true);
          dispatch(setIsSubmitted(true));

          // NO LOTTIE ANIMATIONS when reopening already-answered question
          setShowCorrectAnimation(false);
          setShowWrongAnimation(false);
          setShowConfetti(false);

          // CRITICAL: Set correct answer from API for display
          // Use free-mode question data if available, otherwise use statusResult
          const correctAnswerToMap =
            currentFreeModeQuestion?.correct_answer || statusResult.correct_answer;
          if (correctAnswerToMap) {
            const apiCorrectAnswerValue = correctAnswerToMap.toLowerCase().trim();
            const matchingOption = question?.options?.find(opt => {
              const optId = opt.id.toLowerCase().trim();
              const optText = opt.text.toLowerCase().trim();
              if (
                optId === apiCorrectAnswerValue ||
                optText === apiCorrectAnswerValue ||
                optText.includes(apiCorrectAnswerValue) ||
                apiCorrectAnswerValue.includes(optText)
              ) {
                return true;
              }
              return false;
            });
            if (matchingOption) {
              setApiCorrectAnswer(matchingOption.id.toLowerCase().trim());
            } else if (['a', 'b', 'c', 'd'].includes(apiCorrectAnswerValue)) {
              setApiCorrectAnswer(apiCorrectAnswerValue);
            }
          }

          // CRITICAL: Set previous answer state from API response
          // This ensures marks (X for wrong, checkmark for correct) are shown based on API response
          // Use free-mode question data if available, otherwise use statusResult
          const userAnswerToSet = currentFreeModeQuestion?.answered_at
            ? selectedAnswer
            : statusResult.user_answer || null;
          const answerIsCorrect =
            currentFreeModeQuestion?.is_correct ?? statusResult.is_correct ?? false;

          if (userAnswerToSet) {
            setPreviousAnswer(userAnswerToSet.toLowerCase());
            // Use API response is_correct to determine if previous answer was correct
            setPreviousAnswerCorrect(Boolean(answerIsCorrect));
          }

          // Check if retry was already used
          // If status is "answered_wrong" and there's no retry available in boost availability, retry was used
          // If extra_chance is not available (0 or undefined), retry was already used
          if (statusResult.status === 'answered_wrong') {
            // Boost API removed - retry status check disabled
            // Retry functionality may need to be implemented differently if still needed
          } else {
            // If status is "answered_correct", retry was not used (or not needed)
            // Retry state removed
          }

          // Show congrats screen when reopening (user can close it)
          // Only show if not manually closed by user AND not currently showing animations AND not navigating with arrows
          if (
            !userManuallyClosedModal.current &&
            !showCorrectAnimation &&
            !showWrongAnimation &&
            !isNavigatingWithArrows
          ) {
            setTimeout(() => {
              // Double-check arrow navigation flag before showing modal
              if (!isNavigatingWithArrows) {
                setShowCongratsScreen(true);
              }
            }, 100);
          }
        } else {
          // Question not answered yet - reset states
          hasCheckedQuestionStatus.current = null;
          setAlreadyAnswered(false);
          // Retry state removed
        }
      } catch (error: any) {
        // Error checking status - treat as not answered
        // Check if error contains "Question not found" or "not unlocked" detail
        const errorMessage = error?.message || error?.detail || String(error || '');
        if (
          errorMessage.includes('Question not found') ||
          errorMessage.includes('not unlocked') ||
          errorMessage.includes('not found')
        ) {
          logger.debug(
            'checkQuestionStatus - Question not found/unlocked (error), skipping',
            'TRIVIA',
            errorMessage
          );
        } else {
          logger.debug(
            'checkQuestionStatus - Error (treating as not answered)',
            'TRIVIA',
            errorMessage
          );
        }
        hasCheckedQuestionStatus.current = null;
        setAlreadyAnswered(false);
        // Retry state removed
      }
    };

    // Debounce the status check - check when screen focuses
    const statusTimeout = setTimeout(() => {
      checkStatus();
    }, 300);

    return () => {
      clearTimeout(statusTimeout);
    };
  }, [
    isFocused,
    apiQuestion?.question_number,
    question?.options,
    dispatch,
    localIsSubmitted,
    submissionResult,
    showCorrectAnimation,
    showWrongAnimation,
    question?.questionNumber,
    selectedAnswer,
    routeMode,
    currentMode,
  ]);

  // Always fetch fresh question when screen is focused - but prevent infinite loops
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    // Free/Bronze/Silver modes are orchestrated explicitly elsewhere
    if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
      return;
    }

    // Check if we have an error indicating no question is available
    const currentError = error;
    const hasNoQuestionError =
      currentError &&
      (currentError.includes('No questions available') ||
        currentError.includes('No question available') ||
        currentError.includes('already answered') ||
        currentError.includes('Come back tomorrow'));

    // CRITICAL: Only reset fetch flags if we don't have a "no question" error
    // This prevents infinite loops when the API says no question is available
    if (isFocused && !apiQuestion && !hasNoQuestionError && !loading) {
      // Reset fetch flags to allow fetching even if previously attempted
      // This ensures we can fetch if loading is stuck or apiQuestion is missing
      // BUT: Don't reset if we know there's no question available (prevents infinite loop)
      logger.debug('useEffect - Resetting fetch flags (no apiQuestion, no error)', 'TRIVIA');
      hasFetchedOnFocus.current = false;
      fetchAttempted.current = false;
    }

    // CRITICAL: Don't fetch if we have a "no question" error - prevents infinite loop
    if (isFocused && !hasFetchedOnFocus.current && !hasNoQuestionError) {
      let isMounted = true;
      let fetchTimeout: NodeJS.Timeout | null = null;

      const testAndFetch = async () => {
        try {
          if (!isMounted || fetchAttempted.current) {
            logger.debug('useEffect - Skipping fetch (not mounted or already attempted)', 'TRIVIA');
            return;
          }

          // REMOVED: Skip logic that prevented refetching when there's a "no question" error
          // This ensures we always try to fetch the latest question, even if previous fetch said no question

          fetchAttempted.current = true;
          logger.debug('useEffect - Starting testAndFetch', 'TRIVIA');

          if (!isMounted) return;

          // Legacy mode: fetch current question
          logger.debug('useEffect - Fetching legacy current question', 'TRIVIA');
          dispatch(fetchCurrentQuestion());

          hasFetchedOnFocus.current = true;
        } catch (error) {
          hasFetchedOnFocus.current = true;
        }
      };

      // Debounce the fetch to prevent multiple calls
      fetchTimeout = setTimeout(() => {
        testAndFetch();
      }, 500);

      return () => {
        isMounted = false;
        if (fetchTimeout) {
          clearTimeout(fetchTimeout);
        }
      };
    } else if (hasNoQuestionError) {
      // Mark as fetched even if there's no question, to prevent infinite loops
      hasFetchedOnFocus.current = true;
      fetchAttempted.current = true;
    }
  }, [isFocused, dispatch]);

  // Periodic refresh to check for new questions every 2 minutes when screen is focused (reduced frequency)
  useEffect(() => {
    if (!isFocused) return;

    // Mock question refresh removed - using static mock data
    const refreshInterval = setInterval(() => {
      // Mock questions don't need refreshing
    }, 120000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isFocused, loading, dispatch]);

  // Sync gems when API responses update totalGems (from question, boost, or submission)
  useEffect(() => {
    // When totalGems is updated from API responses, also refresh shop gems to keep them in sync
    if (totalGems > 0 && isFocused && refreshGems && typeof refreshGems === 'function') {
      // Debounce the refresh to avoid excessive API calls
      const timeoutId = setTimeout(() => {
        refreshGems();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // Always return a cleanup function (even if it's a no-op)
    return () => { };
  }, [totalGems, isFocused, refreshGems]);

  // Test button handler for Pollfish (manual trigger for testing)
  const handleTestPollfish = useCallback(() => {
    logger.debug('Test Pollfish button clicked', 'TRIVIA');

    const isInitialized = pollfishService.getInitialized();
    const isSurveyReady = pollfishService.isSurveyReady();

    logger.debug('Pollfish status', 'TRIVIA', {
      isInitialized,
      isSurveyReady,
    });

    if (!isInitialized) {
      Alert.alert(
        'Pollfish Not Ready',
        'Pollfish SDK is not initialized yet. Please wait a moment and try again.\n\nNote: In development mode, surveys may not be available immediately.'
      );
      return;
    }

    // Always try to show survey - Pollfish SDK will handle availability internally
    // Even if isSurveyReady is false, the SDK might still have surveys available
    logger.debug('Calling pollfishService.showSurvey()', 'TRIVIA');
    pollfishService.showSurvey();

    // Don't show alert immediately - let Pollfish SDK try to show the survey first
    // The SDK will handle showing the survey if available, or do nothing if not
  }, []);

  // Lifeline functionality removed - gem refresh no longer needed for lifelines

  // Calculate willShowLoading BEFORE any early returns (must be before hooks)
  // CRITICAL: Only show loading screen on FIRST load (when we haven't seen a question number yet)
  // This preserves UI continuity/persistence when fetching next questions
  const willShowLoading =
    !question && !apiQuestion && loading && previousApiQuestionNumber.current === null;

  // Only log loading check when state changes significantly - MUST be before early returns
  const previousLoadingStateRef = useRef({
    question: !!question,
    apiQuestion: !!apiQuestion,
    loading,
    willShowLoading,
  });
  useEffect(() => {
    const currentState = {
      question: !!question,
      apiQuestion: !!apiQuestion,
      loading,
      willShowLoading,
    };
    if (JSON.stringify(previousLoadingStateRef.current) !== JSON.stringify(currentState)) {
      logger.debug('Loading Check', 'TRIVIA', {
        question: question ? 'EXISTS' : 'NULL',
        apiQuestion: apiQuestion ? 'EXISTS' : 'NULL',
        loading,
        condition: !question && !apiQuestion && loading,
        willShowLoading,
      });
      previousLoadingStateRef.current = currentState;
    }
  }, [question, apiQuestion, loading, willShowLoading]);

  // Lifeline functionality removed

  // Track if we've already processed this submission to prevent loops

  // Safety mechanism: Reset loading state if it gets stuck for too long
  // This prevents the submit button from being stuck in loading state forever
  useEffect(() => {
    if (loading && localIsSubmitted) {
      // If loading has been true for more than 15 seconds, log a warning
      // The Redux state should handle resetting, but this helps debug
      const timeoutId = setTimeout(() => {
        if (loading) {
        }
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [loading, localIsSubmitted, submissionResult, isSubmitted]);

  // Handle submission result from API - trigger animations based on API response
  // CRITICAL: This is the ONLY place that should trigger animations - wait for API response
  // CRITICAL: API response (submissionResult.is_correct) is the ONLY source of truth
  // DO NOT compare selectedAnswer with correctAnswer locally - use API response only
  // Handles both fulfilled (success) and rejected (error with is_correct) responses
  useEffect(() => {
    logger.debug('submissionResult useEffect - CHECKING CONDITIONS', 'TRIVIA', {
      isSubmitted,
      hasSubmissionResult: !!submissionResult,
      localIsSubmitted,
      questionNumber: question?.questionNumber,
      selectedAnswer,
    });

    // Free Mode review/completion states must remain read-only (no per-question CongratsScreen logic)
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' && (isFreeModeReviewMode || showFreeModeCompletionModal)) {
      return;
    }

    // Only process if we have a valid submission result with is_correct
    // submissionResult can come from fulfilled OR rejected (error with is_correct field)
    if (!isSubmitted || !submissionResult || !localIsSubmitted || !question?.questionNumber) {
      logger.debug('submissionResult useEffect - SKIPPING: Missing required conditions', 'TRIVIA');
      return; // Wait for API response
    }

    // Ensure submissionResult has is_correct field (API response received)
    // This is the ONLY source of truth - don't make local comparisons
    // API can return is_correct in both success and error responses
    // is_correct can be true, false, or undefined/null
    if (submissionResult.is_correct === undefined || submissionResult.is_correct === null) {
      logger.debug('submissionResult useEffect - SKIPPING: is_correct is undefined/null', 'TRIVIA');
      return; // API response not complete yet - wait for is_correct field
    }

    logger.debug('submissionResult useEffect - PROCESSING SUBMISSION', 'TRIVIA', {
      is_correct: submissionResult.is_correct,
      correct_answer: submissionResult.correct_answer,
      questionNumber: question.questionNumber,
      selectedAnswer,
    });

    // Include selectedAnswer in the key to differentiate between first and retry submissions
    const submissionKey =
      question.questionNumber +
      '-' +
      selectedAnswer +
      '-' +
      submissionResult.is_correct +
      '-' +
      (submissionResult.correct_answer || '');

    // Only process if we haven't already processed this exact submission
    if (processedSubmission.current === submissionKey) {
      logger.debug(
        'submissionResult useEffect - SKIPPING: Already processed this submission',
        'TRIVIA',
        submissionKey
      );
      return; // Already processed
    }

    logger.debug('submissionResult useEffect - PROCESSING NEW SUBMISSION', 'TRIVIA', submissionKey);
    processedSubmission.current = submissionKey;

    // CRITICAL: Set correct answer from submission result for display
    // Use free-mode question data if available, otherwise use submission result
    const correctAnswerToSet =
      currentFreeModeQuestion?.correct_answer || submissionResult?.correct_answer;
    if (correctAnswerToSet) {
      const apiCorrectAnswerValue = correctAnswerToSet.toLowerCase().trim();
      const matchingOption = question?.options?.find(opt => {
        const optId = opt.id.toLowerCase().trim();
        const optText = opt.text.toLowerCase().trim();
        if (
          optId === apiCorrectAnswerValue ||
          optText === apiCorrectAnswerValue ||
          optText.includes(apiCorrectAnswerValue) ||
          apiCorrectAnswerValue.includes(optText)
        ) {
          return true;
        }
        return false;
      });
      if (matchingOption) {
        setApiCorrectAnswer(matchingOption.id.toLowerCase().trim());
      } else if (['a', 'b', 'c', 'd'].includes(apiCorrectAnswerValue)) {
        setApiCorrectAnswer(apiCorrectAnswerValue);
      }
    }

    // CRITICAL: Use API response to determine if answer is correct FIRST
    // API returns boolean is_correct - this is the ONLY source of truth
    // Handle various formats: true, "true", 1, etc.
    const isAnswerCorrect =
      Boolean(submissionResult.is_correct) ||
      String(submissionResult.is_correct).toLowerCase() === 'true';

    // CRITICAL: Only set previousAnswer if answer is WRONG
    // If correct, we don't need previousAnswer - just show the correct answer
    // DO NOT set marks until we know if answer is correct or wrong from API
    if (selectedAnswer && !isAnswerCorrect) {
      // Only set previousAnswer for WRONG answers
      setPreviousAnswer(selectedAnswer.toLowerCase());
      setPreviousAnswerCorrect(false);
    } else if (selectedAnswer && isAnswerCorrect) {
      // For correct answers, clear previousAnswer (no X mark needed)
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
    }

    // CRITICAL: Map correct answer from API response to option ID
    // API returns correct_answer - this is the ONLY source of truth
    // API might return different format (e.g., "Avocado" instead of "b")
    let mappedCorrectAnswer: string | null = null;

    if (submissionResult.correct_answer) {
      const apiCorrectAnswerValue = submissionResult.correct_answer.toLowerCase().trim();

      // Map API correct_answer to option ID format
      // Try multiple matching strategies:
      // 1. Direct ID match (a, b, c, d)
      // 2. Option text match (exact)
      // 3. Option text match (case-insensitive, trimmed)
      // 4. Partial text match (in case of extra whitespace or formatting)
      const matchingOption = question?.options?.find(opt => {
        const optId = opt.id.toLowerCase().trim();
        const optText = opt.text.toLowerCase().trim();
        const apiValue = apiCorrectAnswerValue;

        // Direct ID match
        if (optId === apiValue) {
          return true;
        }
        // Exact text match
        if (optText === apiValue) {
          return true;
        }
        // Partial match (in case API returns text with extra formatting)
        if (optText.includes(apiValue) || apiValue.includes(optText)) {
          return true;
        }
        return false;
      });

      if (matchingOption) {
        mappedCorrectAnswer = matchingOption.id.toLowerCase().trim();
      } else {
        // If no match, try to use the API value directly (might be option ID already like "a", "b", "c", "d")
        // Check if it's a valid option ID
        const validOptionIds = ['a', 'b', 'c', 'd'];
        if (validOptionIds.includes(apiCorrectAnswerValue)) {
          mappedCorrectAnswer = apiCorrectAnswerValue;
        } else {
          // Still use it, OptionButton will handle it
          mappedCorrectAnswer = apiCorrectAnswerValue;
        }
      }

      // CRITICAL: Set correct answer based on result
      // IMPORTANT: Set this AFTER determining isAnswerCorrect but BEFORE animations
      // This ensures marks show correctly with the right answer
      // 1. Answer is correct (ALWAYS show correct answer immediately)
      // Simplified: Always show correct answer immediately for wrong answers
      if (isAnswerCorrect) {
        // CORRECT ANSWER - Set immediately so checkmark shows right away
        // CRITICAL: Set this BEFORE showing animation to ensure marks display correctly
        setApiCorrectAnswer(mappedCorrectAnswer);
        // Clear any previous wrong answer state immediately
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);
      } else {
        // WRONG ANSWER - Always show correct answer immediately
        setApiCorrectAnswer(mappedCorrectAnswer);
      }
    } else {
      // If no correct_answer in response, try to use question's correctAnswer as fallback
      if (isAnswerCorrect) {
        // CORRECT ANSWER - Set immediately
        if (question?.correctAnswer) {
          setApiCorrectAnswer(question.correctAnswer.toLowerCase().trim());
        }
        // Clear any previous wrong answer state immediately
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);
      } else {
        // WRONG ANSWER - Always show correct answer
        if (question?.correctAnswer) {
          setApiCorrectAnswer(question.correctAnswer.toLowerCase().trim());
        }
      }
    }

    // SIMPLE: Show animation based ONLY on API response
    // API response is_correct = true → Correct lottie
    // API response is_correct = false → Wrong lottie
    // SKIP ANIMATIONS FOR FREE MODE - just show the result

    if (isAnswerCorrect) {
      // CORRECT ANSWER - Show correct animation OR skip for free mode
      // CRITICAL: Clear ALL wrong states FIRST before setting correct states
      // This prevents wrong animation from showing even briefly

      // Step 1: Immediately stop and clear wrong animation - CRITICAL FIX
      setShowWrongAnimation(false);
      setWrongAnimationCompleted(true); // Mark as completed to prevent showing
      if (wrongAnimationRef.current) {
        try {
          wrongAnimationRef.current.reset();
        } catch (e) {
          // Silent fail if animation ref is not ready
        }
      }

      // Clear any previous wrong answer state for correct answers
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);

      // FREE/BRONZE/SILVER MODE: Skip ALL animations, show result immediately
      const mode = routeMode || currentMode || 'free';
      if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
        logger.debug(
          `${mode.toUpperCase()} MODE - CORRECT ANSWER - No animations, immediate display`,
          'TRIVIA'
        );
        // Disable ALL animations
        setShowCorrectAnimation(false);
        setShowWrongAnimation(false);
        setCorrectAnimationCompleted(true);
        setWrongAnimationCompleted(true);
        setShowConfetti(false);

        // Set correct answer for display
        if (mappedCorrectAnswer) {
          setApiCorrectAnswer(mappedCorrectAnswer);
        }
        setPreviousAnswer(null);
        setPreviousAnswerCorrect(false);

        // Play sound
        if (canPlaySounds && playCorrect) {
          playCorrect();
        } else if (canPlaySounds) {
          playSoundSafely('win', 'success');
        }

        // Free Mode: keep result inline and auto-advance; Bronze/Silver: keep existing modal behavior
        if (mode === 'free') {
          setShowCongratsScreen(false);
        } else {
          setTimeout(() => {
            // Don't show modal during arrow navigation
            if (!isNavigatingWithArrows.current) {
              setShowCongratsScreen(true);
            }
          }, 200);
        }
      } else {
        // LEGACY MODE: Show animation
        // Step 3: Set correct animation state (this will trigger the correct lottie)
        // NO CONFETTI - go directly to congrats screen after animation completes
        logger.debug('CORRECT ANSWER - Setting showCorrectAnimation=true', 'TRIVIA');
        setShowCorrectAnimation(true);
        setCorrectAnimationCompleted(false);
        setShowConfetti(false);
        setShowCongratsScreen(false); // CRITICAL: Don't show CongratsScreen until animation completes

        // Step 4: Play CORRECT answer sound - play immediately when animation starts
        // CRITICAL: Play correct answer sound immediately when correct answer is detected
        // Use playCorrect for the specific correct answer sound effect
        logger.debug('CORRECT ANSWER - Playing correct sound', 'TRIVIA');
        if (canPlaySounds && playCorrect) {
          playCorrect();
        } else if (canPlaySounds) {
          // Fallback to win sound if playCorrect not available
          playSoundSafely('win', 'success');
        } else {
          // Fallback if sound system not ready
          setTimeout(() => {
            if (playCorrect) {
              playCorrect();
            } else {
              playSoundSafely('win', 'success');
            }
          }, 100);
        }

        // Step 5: Start the animation immediately (works for both first and second submission)
        // The useEffect hook will handle playing the animation when showCorrectAnimation becomes true
        // But we also try to play it directly here as a backup
        logger.debug('CORRECT ANSWER - Starting Lottie animation', 'TRIVIA');
        if (correctAnimationRef.current) {
          try {
            // Reset the playing flag to allow animation to play
            isCorrectAnimationPlaying.current = false;
            correctAnimationRef.current.reset();
            setTimeout(() => {
              if (correctAnimationRef.current && showCorrectAnimation) {
                logger.debug('CORRECT ANSWER - Playing Lottie animation', 'TRIVIA');
                correctAnimationRef.current.play();
                isCorrectAnimationPlaying.current = true;
              }
            }, 100);
          } catch (e) {
            logger.error('CORRECT ANSWER - Error starting animation', 'TRIVIA', e);
          }
        }
      }
    } else {
      // WRONG ANSWER
      // All modes (free/bronze/silver) use simplified flow - skip animations
      const mode = routeMode || currentMode || 'free';
      if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
        // NEW MODES: Skip ALL animations, show result immediately
        logger.debug(`${mode.toUpperCase()} MODE - WRONG ANSWER - No animations`, 'TRIVIA');
        // Disable all animations immediately
        setShowCorrectAnimation(false);
        setShowWrongAnimation(false);
        setCorrectAnimationCompleted(true);
        setWrongAnimationCompleted(true);
        setShowConfetti(false);

        // Set wrong answer and correct answer for display
        if (selectedAnswer) {
          setPreviousAnswer(selectedAnswer.toLowerCase());
          setPreviousAnswerCorrect(false);
        }
        if (mappedCorrectAnswer) {
          setApiCorrectAnswer(mappedCorrectAnswer);
        }

        // Play sound
        playSoundSafely('wrong_answer', 'error');

        // Free Mode: keep result inline and auto-advance; Bronze/Silver: keep existing modal behavior
        if (mode === 'free') {
          setShowCongratsScreen(false);
        } else {
          setTimeout(() => {
            // Don't show modal during arrow navigation
            if (!isNavigatingWithArrows.current) {
              setShowCongratsScreen(true);
            }
          }, 200);
        }
      } else {
        // LEGACY MODE: Keep old animation behavior
        // Step 1: Immediately stop and clear correct animation
        setShowCorrectAnimation(false);
        setCorrectAnimationCompleted(false);
        if (correctAnimationRef.current) {
          try {
            correctAnimationRef.current.reset();
          } catch (e) {
            // Silent fail if animation ref is not ready
          }
        }

        // Step 2: Set wrong animation state (ALWAYS show for wrong answers, first or second)
        setShowWrongAnimation(true);
        setWrongAnimationCompleted(false);
        setShowConfetti(false);
        setShowCongratsScreen(false);

        // CRITICAL: Start the wrong animation immediately (works for both first and second submission)
        if (wrongAnimationRef.current) {
          try {
            wrongAnimationRef.current.reset();
            setTimeout(() => {
              if (wrongAnimationRef.current) {
                wrongAnimationRef.current.play();
              }
            }, 100);
          } catch (e) {
            // Silent fail if animation ref is not ready
          }
        }

        // Step 3: Play sound
        playSoundSafely('wrong_answer', 'error');

        // Save wrong answer for display
        if (selectedAnswer) {
          setPreviousAnswer(selectedAnswer);
          setPreviousAnswerCorrect(false);
        }
      }
    }

    // Update previous answer state for wrong answers
    if (!isAnswerCorrect && selectedAnswer) {
      setPreviousAnswer(selectedAnswer);
      setPreviousAnswerCorrect(false);
    } else if (isAnswerCorrect) {
      // Clear wrong answer state for correct answers
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
    }

    // CRITICAL: Set isSubmitted in Redux NOW (after API response) so marks can show
    // This ensures marks only appear after we have the API response
    if (!isSubmitted) {
      dispatch(setIsSubmitted(true));
    }

    // Set alreadyAnswered so user can tap screen to reopen congrats popup
    setAlreadyAnswered(true);

    // Submission complete - next question will be fetched automatically

    // Lifeline functionality removed

    // Fetch question status ONCE to get explanation, answered_at, status for modal
    // This will update questionStatus in Redux with latest state from API
    // NOTE: Disabled for free/bronze/silver modes - they don't use legacy checkQuestionStatus
    const legacyModeForStatus = routeMode || currentMode || 'free';
    if (
      legacyModeForStatus !== 'free' &&
      legacyModeForStatus !== 'bronze' &&
      legacyModeForStatus !== 'silver'
    ) {
      dispatch(checkQuestionStatus(question.questionNumber));
    }

    // CRITICAL: Reset question status check ref so it will refresh after submission
    // This ensures when user reopens screen, it will fetch fresh status
    hasCheckedQuestionStatus.current = null;

    // Refresh gems from backend API after answer submission (like shop does)
    // This ensures we have the latest gem count from the backend
    if (refreshGems && typeof refreshGems === 'function') {
      // Small delay to ensure API response is fully processed
      setTimeout(() => {
        refreshGems();
      }, 500);
    }

    // NOTE: showCorrectAnimation and showWrongAnimation are NOT in dependencies to avoid infinite loops
    // We SET them here, so adding them to deps would cause the effect to run again
    // selectedAnswer IS in deps because it's part of the submissionKey logic
  }, [
    isSubmitted,
    submissionResult,
    localIsSubmitted,
    question?.questionNumber,
    question?.options,
    dispatch,
    playSoundSafely,
    selectedAnswer,
    refreshGems,
    routeMode,
    currentMode,
    isFreeModeReviewMode,
    showFreeModeCompletionModal,
  ]);

  // CRITICAL: Show CongratsScreen when Free mode is completed OR all questions answered
  // BUT ONLY ONCE when navigating to screen initially, NOT while reviewing questions
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode !== 'free') return;

    // CRITICAL: Don't show if user manually closed it
    if (userManuallyClosedFreeModeModal.current) {
      return;
    }

    // CRITICAL: Don't show if already showing to prevent duplicate triggers
    if (showCongratsScreen) {
      return;
    }

    // CRITICAL: Don't show if in review mode (reviewing already answered questions)
    if (isFreeModeReviewMode) {
      return;
    }

    // CRITICAL: Don't show if navigating with arrows (reviewing questions)
    if (isNavigatingWithArrows) {
      return;
    }

    // CRITICAL FIX: Show CongratsScreen when completed OR all questions answered
    // BUT ONLY on initial screen load, not during navigation
    const isCompleted = freeModeStatus?.progress?.completed === true;
    const allQuestionsAnswered = freeModeStatus?.progress?.all_questions_answered === true;
    if (isCompleted || allQuestionsAnswered) {
      // Only show on initial screen focus, not during navigation
      // Check if screen was just focused (initial load) - use screenFocusTimestamp
      const timeSinceFocus = Date.now() - screenFocusTimestamp.current;
      const isInitialLoad = timeSinceFocus < 3000 && hasFetchedOnFocus.current; // Within 3 seconds of focus and data fetched

      if (isInitialLoad) {
        console.log(
          '🎯 [TRIVIA SCREEN] Free mode completed/all answered, showing CongratsScreen on initial load:',
          {
            completed: isCompleted,
            allQuestionsAnswered,
            correctAnswers: freeModeStatus?.progress?.correct_answers,
            totalQuestions: freeModeStatus?.progress?.total_questions,
            timeSinceFocus,
          }
        );
        setShowCongratsScreen(true);
      }
    }
  }, [
    freeModeStatus?.progress?.completed,
    freeModeStatus?.progress?.all_questions_answered,
    routeMode,
    currentMode,
    showCongratsScreen,
    isFreeModeReviewMode,
    isNavigatingWithArrows,
  ]);

  // Handle error state - show modal for "already attempted" error or daily_completed
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free') {
      return;
    }

    if (error && (error.includes('already answered') || error.includes('Come back tomorrow'))) {
      const currentQNum = question?.questionNumber;
      const errorKey = currentQNum + '-' + error;

      // Prevent processing the same error multiple times
      if (hasProcessedError.current === errorKey) {
        return;
      }

      // Don't auto-open if user manually closed modal
      if (userManuallyClosedModal.current) {
        return;
      }

      // Mark as processed
      hasProcessedError.current = errorKey;

      // NO CONFETTI for error cases - confetti should ONLY show when user answers correctly in current session
      setAlreadyAnswered(true);

      // Lifeline functionality removed

      // CRITICAL: Set submitted state to true so options show right/wrong status
      // Get selected answer from API if available
      if (apiQuestion?.user_answer) {
        const normalized = String(apiQuestion.user_answer).toLowerCase().trim();
        if (normalized === 'a' || normalized === 'b' || normalized === 'c' || normalized === 'd') {
          dispatch(setSelectedAnswer(normalized));
        }
      }
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));
      setShowConfetti(false); // NO CONFETTI
      const timer = setTimeout(() => {
        // Don't show modal during arrow navigation
        if (!isNavigatingWithArrows.current) {
          setShowCongratsScreen(true);
        }
        animationTimersRef.current.delete(timer);
      }, 100);
      animationTimersRef.current.add(timer);

      // Fetch question status to show details in modal
      // NOTE: Disabled for free/bronze/silver modes - they don't use legacy checkQuestionStatus
      if (question?.questionNumber && mode !== 'free' && mode !== 'bronze' && mode !== 'silver') {
        dispatch(checkQuestionStatus(question.questionNumber));
      }
    }
  }, [
    error,
    canPlaySounds,
    playWin,
    question?.questionNumber,
    dispatch,
    dailyCompleted,
    isCorrect,
    routeMode,
    currentMode,
    freeModeStatus,
  ]);

  // Handle daily_completed from submission result - show modal when daily completed
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
      return;
    }

    if (submissionResult && submissionResult.daily_completed && !showCongratsScreen) {
      // Don't auto-open if user manually closed modal
      if (userManuallyClosedModal.current) {
        return;
      }

      setAlreadyAnswered(true);

      // Lifeline functionality removed

      // CRITICAL: Ensure submitted state is true so options show right/wrong status
      // selectedAnswer should already be set from handleSubmit, but ensure submitted state is true
      if (!localIsSubmitted) {
        setLocalIsSubmitted(true);
      }
      if (!isSubmitted) {
        dispatch(setIsSubmitted(true));
      }
      setShowConfetti(false); // NO CONFETTI for daily completed
      const timer = setTimeout(() => {
        setShowCongratsScreen(true);
        animationTimersRef.current.delete(timer);
      }, 100);
      animationTimersRef.current.add(timer);
    }
  }, [submissionResult?.daily_completed, showCongratsScreen, routeMode, currentMode]);

  // Handle daily_completed on screen open - show modal if daily completed
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
      return;
    }

    if (dailyCompleted && !showCongratsScreen && !apiQuestion) {
      // Don't auto-open if user manually closed modal
      if (userManuallyClosedModal.current) {
        return;
      }

      setAlreadyAnswered(true);

      // Lifeline functionality removed

      // CRITICAL: Set submitted state to true so options show right/wrong status
      // Note: apiQuestion is null in this case (!apiQuestion condition), so we can't get user_answer here
      // The selected answer should already be set from previous submission
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));
      setShowConfetti(false); // NO CONFETTI for daily completed
      const timer = setTimeout(() => {
        setShowCongratsScreen(true);
        animationTimersRef.current.delete(timer);
      }, 100);
      animationTimersRef.current.add(timer);
    }
  }, [dailyCompleted, showCongratsScreen, apiQuestion, isCorrect, routeMode, currentMode]);

  // Remove separate confetti completion for already attempted - use single handler

  // Cleanup all animation timers and refs on unmount
  useEffect(() => {
    return () => {
      // Clear all animation timers
      animationTimersRef.current.forEach(timer => clearTimeout(timer));
      animationTimersRef.current.clear();

      // Clear lifeline timer (if exists)
      // lifelineTimerRef removed - no longer needed

      // Cleanup music monitor interval
      if (musicMonitorInterval.current) {
        clearInterval(musicMonitorInterval.current);
        musicMonitorInterval.current = null;
      }

      // Cleanup Lottie animation refs
      const animationRefs = [lottieRef, correctAnimationRef, wrongAnimationRef];

      animationRefs.forEach(ref => {
        if (ref.current) {
          try {
            ref.current.reset();
          } catch (error) {
            // Silent fail - animation may already be cleaned up
          }
        }
      });
    };
  }, []);

  // Log when apiCorrectAnswer changes for debugging
  useEffect(() => { }, [apiCorrectAnswer]);

  // Trigger Lottie animations manually when states change
  useEffect(() => {
    // CRITICAL: Only play correct animation if it's explicitly set to true
    // AND wrong animation is NOT showing (prevent conflicts)
    // AND animation is not already playing (prevent interruption)
    if (
      showCorrectAnimation &&
      !showWrongAnimation &&
      correctAnimationRef.current &&
      !isCorrectAnimationPlaying.current
    ) {
      // Mark animation as playing
      isCorrectAnimationPlaying.current = true;

      // Reset animation to beginning and play - ensure it completes fully
      try {
        correctAnimationRef.current.reset();
        // Delay to ensure reset completes before playing
        const timer = setTimeout(() => {
          if (correctAnimationRef.current && showCorrectAnimation) {
            correctAnimationRef.current.play();
          }
          animationTimersRef.current.delete(timer);
        }, 200); // 200ms delay to ensure reset completes fully before playing
        animationTimersRef.current.add(timer);
      } catch (e) {
        // If reset fails, try playing directly
        const timer = setTimeout(() => {
          if (correctAnimationRef.current && showCorrectAnimation) {
            correctAnimationRef.current.play();
          }
          animationTimersRef.current.delete(timer);
        }, 150);
        animationTimersRef.current.add(timer);
      }
    } else if (
      !showCorrectAnimation &&
      correctAnimationRef.current &&
      !showWrongAnimation &&
      !isCorrectAnimationPlaying.current
    ) {
      // Only reset if animation is not playing (prevent interrupting animation)
      try {
        correctAnimationRef.current.reset();
      } catch (e) {
        // Silent fail
      }
    }
  }, [showCorrectAnimation, showWrongAnimation]);

  useEffect(() => {
    // CRITICAL: Only play wrong animation if it's explicitly set to true
    // AND correct animation is NOT showing (prevent conflicts)
    // AND animation is not already playing (prevent interruption)
    if (
      showWrongAnimation &&
      !showCorrectAnimation &&
      wrongAnimationRef.current &&
      !isWrongAnimationPlaying.current
    ) {
      // Mark animation as playing
      isWrongAnimationPlaying.current = true;

      // Reset to beginning before playing to ensure clean animation
      try {
        wrongAnimationRef.current.reset();
        const timer = setTimeout(() => {
          if (wrongAnimationRef.current && showWrongAnimation) {
            wrongAnimationRef.current.play();
          }
          animationTimersRef.current.delete(timer);
        }, 200); // 200ms delay to ensure reset completes fully before playing
        animationTimersRef.current.add(timer);
      } catch (e) {
        // If reset fails, try playing directly
        const timer = setTimeout(() => {
          if (wrongAnimationRef.current && showWrongAnimation) {
            wrongAnimationRef.current.play();
          }
          animationTimersRef.current.delete(timer);
        }, 150);
        animationTimersRef.current.add(timer);
      }
    } else if (
      !showWrongAnimation &&
      wrongAnimationRef.current &&
      !showCorrectAnimation &&
      !isWrongAnimationPlaying.current
    ) {
      // Only reset if animation is not playing (prevent interrupting animation)
      try {
        wrongAnimationRef.current.reset();
      } catch (e) {
        // Silent fail
      }
    }
  }, [showWrongAnimation, showCorrectAnimation]);

  // Lifeline animation effects removed

  // Music management - DISABLED to remove background vibration
  // Stop any existing background music when screen mounts or loses focus
  useEffect(() => {
    if (!isFocused) {
      stopScreenMusic();
      musicInitialized.current = false;
    }
    // Cleanup on unmount
    return () => {
      stopScreenMusic();
      musicInitialized.current = false;
    };
  }, [isFocused, stopScreenMusic]);

  // Get option animation style
  const getOptionAnimationStyle = useCallback(
    (index: number) => {
      return {
        transform: [{ translateX: optionsAnim[index] }],
      };
    },
    [optionsAnim]
  );

  // Show professional empty state ONLY when there's an actual error (not just loading)
  // This is moved here to prevent hook violations by ensuring all hooks run before any potential return
  if (!question && !loading && error) {
    logger.debug('RENDER - Showing error state', 'TRIVIA', { error });
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#1e90ff',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        {/* Empty State Content */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(40),
          }}
        >
          <GradientText text="Trivia Challenge" />
          <View style={{ marginTop: scaleSize(40) }}>
            <Icon name="help-circle-outline" size={scaleSize(64)} color="#F59E0B" />
          </View>
          <Text
            style={[
              typography.h4,
              {
                color: 'white',
                fontSize: scaleSize(18),
                marginTop: scaleSize(24),
                textAlign: 'center',
                marginBottom: scaleSize(12),
              },
            ]}
          >
            {error && (error.includes('already answered') || error.includes('Come back tomorrow'))
              ? "You've Completed Today's Trivia!"
              : error &&
                (error.includes('No questions available for today') ||
                  error.includes('No questions available'))
                ? 'No Questions Available for Today'
                : error && error.includes('No question')
                  ? 'No Question Available'
                  : 'Something went wrong'}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: scaleSize(14),
                textAlign: 'center',
                marginBottom: scaleSize(32),
              },
            ]}
          >
            {error && (error.includes('already answered') || error.includes('Come back tomorrow'))
              ? 'Come back tomorrow for a new challenge!'
              : error &&
                (error.includes('No questions available for today') ||
                  error.includes('No questions available'))
                ? 'Check back later or try again tomorrow.'
                : error && error.includes('No question')
                  ? 'Check back later or try again tomorrow.'
                  : error || 'Please check your connection and try again.'}
          </Text>
          {error &&
            !error.includes('already answered') &&
            !error.includes('Come back tomorrow') &&
            !error.includes('No questions available for today') &&
            !error.includes('No questions available') &&
            !error.includes('No question') && (
              <SoundTouchableOpacity
                onPress={() => {
                  hasFetchedOnFocus.current = false;
                  fetchAttempted.current = false;
                  dispatch(fetchCurrentQuestion());
                }}
                style={{
                  backgroundColor: '#F59E0B',
                  paddingHorizontal: scaleSize(24),
                  paddingVertical: scaleSize(12),
                  borderRadius: scaleSize(8),
                }}
              >
                <Text style={[typography.button, { color: 'white', fontSize: scaleSize(16) }]}>
                  Try Again
                </Text>
              </SoundTouchableOpacity>
            )}
        </View>
      </View>
    );
  }

  // Show loading state with professional UI
  // CRITICAL: Standardized with DogParachute Lottie
  if (willShowLoading) {
    logger.debug('SHOWING LOADING SCREEN', 'TRIVIA');
    return (
      <View style={{ flex: 1, backgroundColor: '#1e90ff' }}>
        <SafeScreenWrapper
          statusBarStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
          edges={[]} // STABILIZED: No edges to prevent layout shifts
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

          {/* Loading Content */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <GradientText text="Trivia Challenge" />
            <View style={{ marginTop: scaleSize(10) }}>
              <LottieView
                source={require('../../../../assets/signup/DogParachute.json')}
                autoPlay
                loop
                style={{ width: scaleSize(150), height: scaleSize(150) }}
              />
            </View>
            <Text
              style={[
                typography.body,
                {
                  color: 'white',
                  fontSize: scaleSize(16),
                  marginTop: scaleSize(16),
                  textAlign: 'center',
                },
              ]}
            >
              Preparing your challenge...
            </Text>
          </View>
        </SafeScreenWrapper>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary screenName="TriviaScreen">
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
        edges={['top', 'bottom', 'left', 'right']}
        showStatusBar={false}
        style={{ flex: 1, backgroundColor: '#1e90ff' }}
      >
        <ScreenBackButtonHandler action="navigate" />
        <View style={containerStyle}>
          {/* Lottie background removed - using homebg.png only */}

          {/* Correct Answer Lottie Animation - Shows when correct answer is chosen */}
          {/* CRITICAL: Show marks FIRST, then lottie animation plays on top */}
          {showCorrectAnimation && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 150, // Lower than marks (200) so marks show first, then lottie
                elevation: 150, // Android elevation
                backgroundColor: 'transparent',
              }}
            >
              <LottieView
                ref={correctAnimationRef}
                source={require('../../../../assets/trivia/Correct Animation.json')}
                autoPlay={false}
                loop={false}
                renderMode="HARDWARE"
                hardwareAccelerationAndroid={Platform.OS === 'android'}
                cacheStrategy="strong"
                cacheComposition={true}
                enableMergePathsAndroidForKitKatAndAbove={true}
                style={{
                  width: scaleSize(300),
                  height: scaleSize(300),
                }}
                onAnimationFinish={isCancelled => {
                  // CRITICAL: Only proceed if animation wasn't cancelled and fully completed
                  // Wait for animation to fully complete before proceeding
                  logger.debug('Correct Lottie onAnimationFinish', 'TRIVIA', { isCancelled });
                  if (!isCancelled) {
                    // Mark animation as no longer playing
                    isCorrectAnimationPlaying.current = false;

                    // CRITICAL: Keep animation visible - animation frame stays visible
                    // Call handler immediately since animation has completed
                    // The handler will manage the timing for hiding and showing CongratsScreen
                    logger.debug(
                      'Correct Lottie - Animation completed, calling handleCorrectAnimationEnd',
                      'TRIVIA'
                    );
                    handleCorrectAnimationEnd();
                  } else {
                    // Animation was cancelled - mark as not playing
                    logger.debug('Correct Lottie - Animation was cancelled', 'TRIVIA');
                    isCorrectAnimationPlaying.current = false;
                  }
                }}
                speed={1.0}
              />
            </View>
          )}

          {/* Wrong Answer Lottie Animation - Shows when wrong answer is chosen */}
          {/* CRITICAL: Show marks FIRST, then lottie animation plays on top */}
          {showWrongAnimation && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 150, // Higher than options but marks show first
                elevation: 150, // Android elevation
                backgroundColor: 'transparent',
              }}
            >
              <LottieView
                ref={wrongAnimationRef}
                source={require('../../../../assets/trivia/Wrong answer.json')}
                autoPlay={false}
                loop={false}
                renderMode="HARDWARE"
                hardwareAccelerationAndroid={Platform.OS === 'android'}
                cacheStrategy="strong"
                cacheComposition={true}
                enableMergePathsAndroidForKitKatAndAbove={true}
                style={{
                  width: scaleSize(300),
                  height: scaleSize(300),
                }}
                onAnimationFinish={isCancelled => {
                  // CRITICAL: Only proceed if animation wasn't cancelled and fully completed
                  // Wait for animation to fully complete before proceeding
                  logger.debug('Wrong Lottie onAnimationFinish', 'TRIVIA', { isCancelled });
                  if (!isCancelled) {
                    // Mark animation as no longer playing
                    isWrongAnimationPlaying.current = false;

                    // CRITICAL: Keep animation visible - animation frame stays visible
                    // Call handler immediately since animation has completed
                    // The handler will manage the timing for hiding and showing retry popup/congrats screen
                    logger.debug(
                      'Wrong Lottie - Animation completed, calling handleWrongAnimationEnd',
                      'TRIVIA'
                    );
                    handleWrongAnimationEnd();
                  } else {
                    // Animation was cancelled - mark as not playing
                    logger.debug('Wrong Lottie - Animation was cancelled', 'TRIVIA');
                    isWrongAnimationPlaying.current = false;
                  }
                }}
                speed={1.0}
              />
            </View>
          )}

          {/* Lifeline animations removed */}

          {/* Old Confetti Component - Keep for compatibility but won't show anymore */}

          {/* Main content - Removed outer TouchableWithoutFeedback to allow tap overlay to work properly */}
          {/* Tap handling is now done by dedicated tap overlays outside ScrollView */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleSize(100) }}
            showsVerticalScrollIndicator={(() => {
              const mode = routeMode || currentMode || 'free';
              // Hide scrollbar in free mode
              return mode !== 'free';
            })()}
            scrollEnabled={(() => {
              const mode = routeMode || currentMode || 'free';
              // Disable scrolling in free mode
              return mode !== 'free';
            })()}
            bounces={false}
          >
            <View style={{ flex: 1, overflow: 'visible' }}>
              {/* Header with Gems Display */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: scaleSize(10), // Standardized to match Header component
                  paddingVertical: scaleSize(4), // Standardized to match Header component
                  width: '100%',
                  height: scaleSize(60),
                  marginTop: scaleSize(6),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleSize(6) }}>
                  {/* Gem Background Image with Value - Standardized to match Header component */}
                  <ImageBackground
                    source={require('../../../../assets/gemBg.png')}
                    style={{
                      width: scaleSize(110), // Standardized to match Header component
                      height: scaleSize(45), // Standardized to match Header component
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    resizeMode="contain"
                  >
                    <Text
                      style={{
                        color: '#000000',
                        fontSize: scaleSize(14),
                        fontWeight: 'bold',
                        fontFamily: 'Baloo2',
                      }}
                    >
                      {profileGems.toLocaleString()}
                    </Text>
                  </ImageBackground>
                  {/* Coin Background Image with Value - Standardized to match Header component */}
                  <ImageBackground
                    source={require('../../../../assets/coinBg.png')}
                    style={{
                      width: scaleSize(110), // Standardized to match Header component
                      height: scaleSize(45), // Standardized to match Header component
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    resizeMode="contain"
                  >
                    <Text
                      style={{
                        color: '#000000',
                        fontSize: scaleSize(14),
                        fontWeight: 'bold',
                        fontFamily: 'Baloo2',
                      }}
                    >
                      {profileCoins.toLocaleString()}
                    </Text>
                  </ImageBackground>
                </View>

                {/* Reset button removed - no reset functionality */}

                <Animated.View style={infoButtonAnimation.animatedStyle}>
                  <SoundTouchableOpacity
                    onPress={handleInfoPress}
                    onPressIn={infoButtonAnimation.animatePress}
                    onPressOut={infoButtonAnimation.animateRelease}
                    ref={infoIconRef}
                    style={{
                      borderRadius: scaleSize(20),
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      width: scaleSize(48),
                      height: scaleSize(48),
                    }}
                    activeOpacity={1}
                  >
                    <ImageBackground
                      source={require('../../../../assets/trivia/infoIcon.png')}
                      style={{
                        width: scaleSize(34),
                        height: scaleSize(34),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      resizeMode="contain"
                    />
                  </SoundTouchableOpacity>
                </Animated.View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleSize(100) }}
                showsVerticalScrollIndicator={(() => {
                  const mode = routeMode || currentMode || 'free';
                  // Hide scrollbar in free mode
                  return mode !== 'free';
                })()}
                scrollEnabled={(() => {
                  const mode = routeMode || currentMode || 'free';
                  // Disable scrolling in free mode
                  return mode !== 'free';
                })()}
                bounces={false}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    zIndex: showCongratsScreen ? 0 : 1,
                    elevation: showCongratsScreen ? 0 : 1,
                    overflow: 'visible',
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [{ translateX: headerAnim }],
                      alignItems: 'center',
                      marginBottom: scaleSize(2),
                    }}
                  >
                    <GradientText text="Trivia Challenge" />
                  </Animated.View>

                  <Animated.View
                    style={{
                      transform: [{ translateX: questionAnim }],
                      marginHorizontal: scaleSize(4),
                      marginBottom: scaleSize(0),
                      overflow: 'visible', // Allow question card to display fully
                    }}
                  >
                    <SoundTouchableOpacity
                      activeOpacity={alreadyAnswered ? 0.8 : 1}
                      onPress={() => {
                        const mode = routeMode || currentMode || 'free';
                        if (mode !== 'free' && alreadyAnswered && !isNavigatingWithArrows.current) {
                          // Don't show modal during arrow navigation
                          setShowCongratsScreen(true);
                        }
                      }}
                      disabled={(routeMode || currentMode || 'free') === 'free' || !alreadyAnswered}
                      style={{ overflow: 'visible' }} // Allow question card to display fully
                    >
                      <ImageBackground
                        source={require('../../../../assets/trivia/questionCard.png')}
                        style={{
                          borderRadius: scaleSize(16),
                          overflow: 'hidden',
                          width: '100%',
                          aspectRatio: 320 / 300,
                          alignSelf: 'center',
                          justifyContent: 'center',
                          top: scaleSize(-60),
                        }}
                        resizeMode="contain"
                      >
                        {/* Tier-specific Badge for Bronze and Silver levels */}
                        {(currentMode === 'bronze' || currentMode === 'silver') && (
                          <Image
                            source={
                              currentMode === 'bronze'
                                ? require('../../../../assets/home/bronze.png')
                                : require('../../../../assets/home/silver.png')
                            }
                            style={{
                              position: 'absolute',
                              width: scaleSize(48),
                              height: scaleSize(48),
                              top: scaleSize(60), // Set to 30px
                              right: scaleSize(-2), // Moved right 10px from -2 (so -2 + 10 = 8)
                              zIndex: 10,
                            }}
                            resizeMode="contain"
                          />
                        )}
                        <View
                          style={{
                            position: 'absolute',
                            top: '25%',
                            left: '18%',
                            right: '15%',
                            bottom: '25%',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ overflow: 'hidden', width: '100%', alignItems: 'center' }}>
                            <Animated.Text
                              style={[
                                typography.h4,
                                {
                                  fontSize: scaleSize(18),
                                  color: 'white',
                                  textAlign: 'center',
                                  lineHeight: scaleSize(24),
                                  paddingHorizontal: scaleSize(10),
                                  flexShrink: 1,
                                  opacity: questionTextOpacity,
                                  marginBottom: scaleSize(8),
                                  flexWrap: 'wrap',
                                },
                              ]}
                              adjustsFontSizeToFit={true}
                              minimumFontScale={0.7}
                              numberOfLines={0}
                            >
                              {questionForDisplay?.text ||
                                question?.text ||
                                apiQuestion?.question ||
                                ''}
                            </Animated.Text>

                            {/* Hint display with lightbulb icon - shown only after taking hint */}
                            {hintTooltipText && (
                              <Animated.View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: scaleSize(2), // Moved up 6px (from 8 to 2) to avoid overlapping with prize pool text
                                  paddingHorizontal: scaleSize(12),
                                  paddingVertical: scaleSize(8),
                                  backgroundColor: '#FFD700',
                                  borderRadius: scaleSize(12),
                                  opacity: questionTextOpacity,
                                }}
                              >
                                <Icon
                                  name="lightbulb-on-outline"
                                  size={scaleSize(18)}
                                  color="#000000"
                                  style={{ marginRight: scaleSize(8) }}
                                />
                                <Text
                                  style={[
                                    typography.bodySmall,
                                    {
                                      color: '#000000',
                                      fontSize: scaleSize(14),
                                      lineHeight: scaleSize(20),
                                      textAlign: 'center',
                                      flex: 1,
                                    },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {hintTooltipText}
                                </Text>
                              </Animated.View>
                            )}
                          </View>
                        </View>
                      </ImageBackground>
                    </SoundTouchableOpacity>
                  </Animated.View>

                  <View
                    style={{
                      marginBottom: scaleSize(0),
                      paddingHorizontal: scaleSize(0),
                      marginTop: scaleSize(-110), // Moved down by 20px (from -130 to -110) to give space for yellow hint tooltip above green prize pool text
                      zIndex: showInfoTooltip ? 50 : 100, // Lower z-index when tooltip is visible so overlay covers it
                      elevation: showInfoTooltip ? 50 : 100, // Android elevation
                    }}
                  >
                    <View
                      style={{
                        padding: scaleSize(10),
                        alignItems: 'center',
                        marginTop: scaleSize(0), // No gap above options
                        justifyContent: 'center',
                        zIndex: showInfoTooltip ? 50 : 100, // Lower z-index when tooltip is visible so overlay covers it
                        elevation: showInfoTooltip ? 50 : 100, // Android elevation
                      }}
                    >
                      {(() => {
                        const optionsSource =
                          questionWithDisabledOptions || questionForDisplay || question;
                        const options = optionsSource?.options;
                        logger.debug('Rendering Options', 'TRIVIA', {
                          hasQuestionWithDisabled: !!questionWithDisabledOptions,
                          hasQuestionForDisplay: !!questionForDisplay,
                          hasQuestion: !!question,
                          optionsCount: options?.length || 0,
                          selectedAnswer,
                        });

                        if (!options || options.length === 0) {
                          logger.warn('NO OPTIONS TO RENDER!', 'TRIVIA');
                          return null;
                        }

                        return options.map((option, index) => {
                          // Use pre-defined animation hooks based on index
                          const getOptionAnimation = (index: number) => {
                            switch (index) {
                              case 0:
                                return option1Animation;
                              case 1:
                                return option2Animation;
                              case 2:
                                return option3Animation;
                              case 3:
                                return option4Animation;
                              default:
                                return option1Animation;
                            }
                          };

                          const optionAnimation = getOptionAnimation(index);

                          // CENTRALIZED CORRECT ANSWER LOGIC:
                          // Ensure we always have the best source of truth for the correct answer
                          const resolvedCorrectAnswer = isFreeModeReviewMode
                            ? derivedReviewState.apiCorrectAnswer || ''
                            : (
                              // 1. Submission Result (Freshest)
                              submissionResult?.correct_answer ||
                              // 2. Current Question Correct Answer (Redux/API)
                              (currentMode === 'bronze' ? currentBronzeModeQuestion?.correct_answer :
                                currentMode === 'silver' ? currentSilverModeQuestion?.correct_answer :
                                  currentFreeModeQuestion?.correct_answer) ||
                              // 3. API Question Fallback (State)
                              apiCorrectAnswer ||
                              // 4. Raw API Question Fallback (Selector)
                              apiQuestion?.correct_answer ||
                              ''
                            );

                          return (
                            <Animated.View
                              key={option.id}
                              style={{
                                transform: [
                                  { translateX: optionsAnim[index] || new Animated.Value(0) },
                                ],
                                width: '100%',
                                alignItems: 'center',
                                marginBottom: scaleSize(4), // 4px gap between options
                              }}
                            >
                              <Animated.View style={optionAnimation.animatedStyle}>
                                <OptionButton
                                  option={option}
                                  optionIndex={index}
                                  isSelected={
                                    selectedAnswer?.toLowerCase() === option.id?.toLowerCase()
                                  }
                                  // CRITICAL: Only show correct/wrong AFTER submission completes - prevent race condition
                                  // Use submissionResult to ensure we only show marks after actual API response
                                  isSubmitted={
                                    (localIsSubmitted || isSubmitted) &&
                                    (!!submissionResult || alreadyAnswered || (isFreeModeReviewMode && !!derivedReviewState.previousAnswer))
                                  }
                                  correctAnswer={resolvedCorrectAnswer}
                                  onPress={() => handleOptionSelect(option.id)}
                                  hasAnySelection={!!(selectedAnswer || (isFreeModeReviewMode && derivedReviewState.previousAnswer))}
                                  animatedStyle={optionAnimation.animatedStyle}
                                  onPressIn={optionAnimation.animatePress}
                                  onPressOut={optionAnimation.animateRelease}
                                  previousAnswer={isFreeModeReviewMode ? derivedReviewState.previousAnswer : previousAnswer}
                                  previousAnswerCorrect={isFreeModeReviewMode ? derivedReviewState.previousAnswerCorrect : previousAnswerCorrect}
                                  // CRITICAL: Only set alreadyAnswered if question was actually answered from API, not just submitted
                                  alreadyAnswered={
                                    (alreadyAnswered && !localIsSubmitted) || // Already answered from API, not just submitted
                                    (isFreeModeReviewMode && !!derivedReviewState.previousAnswer)
                                  }
                                />
                              </Animated.View>
                            </Animated.View>
                          );
                        });
                      })()}

                      {/* Manual Submit Button */}
                      {!isFreeModeReviewMode && !alreadyAnswered && !isSubmitted && (
                        <Animated.View
                          style={{ width: '100%', marginTop: scaleSize(20), alignItems: 'center' }}
                        >
                          <SoundTouchableOpacity
                            onPress={() => handleSubmit()}
                            disabled={!selectedAnswer}
                            style={{
                              width: '80%',
                              height: scaleSize(50),
                              borderRadius: scaleSize(25),
                              overflow: 'hidden',
                              opacity: selectedAnswer ? 1 : 0.5,
                            }}
                          >
                            <ImageBackground
                              source={require('../../../../assets/trivia/submitBtn.png')}
                              style={{
                                width: '100%',
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                              resizeMode="stretch"
                            >
                              <Text
                                style={{
                                  color: 'white',
                                  fontSize: scaleSize(18),
                                  fontWeight: 'bold',
                                  fontFamily: 'Baloo2',
                                }}
                              >
                                SUBMIT ANSWER
                              </Text>
                            </ImageBackground>
                          </SoundTouchableOpacity>
                        </Animated.View>
                      )}
                      {/* Free Mode Navigation Arrows - Moved inside options container, below options */}
                      {(() => {
                        const mode = routeMode || currentMode || 'free';

                        // Only show arrows if:
                        // 1. Mode is free
                        // 2. Questions are loaded
                        // 3. User has COMPLETED (completed === true OR all_questions_answered === true)
                        const isCompleted = freeModeStatus?.progress?.completed === true;
                        const allQuestionsAnswered = freeModeStatus?.progress?.all_questions_answered === true;
                        const shouldShowArrows =
                          mode === 'free' &&
                          freeModeQuestions &&
                          freeModeQuestions.length > 0 &&
                          (isCompleted || allQuestionsAnswered) &&
                          !showCongratsScreen; // CRITICAL: Hide when CongratsScreen is shown

                        if (!shouldShowArrows) {
                          return null;
                        }

                        // For navigation arrows, we don't need review mode logic
                        // Just show arrows to navigate through questions
                        const sortedQuestions = [...freeModeQuestions].sort(
                          (a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0)
                        );
                        const currentQuestionId = currentFreeModeQuestion?.question_id;
                        const currentIndex = sortedQuestions.findIndex(
                          (q: any) => q.question_id === currentQuestionId
                        );

                        const isPrevDisabled = currentIndex <= 0; // Disable if at first question
                        const isNextDisabled = currentIndex >= sortedQuestions.length - 1; // Disable if at last question

                        return (
                          <View
                            style={{
                              width: '100%',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: scaleSize(20),
                              marginTop: scaleSize(20), // Space above navigation arrows
                              marginBottom: scaleSize(10), // Add 10px spacing below navigation section
                              zIndex: 10000,
                              elevation: 10000,
                            }}
                          >
                            <SoundTouchableOpacity
                              onPress={() => {
                                console.log('🔵 [NAVIGATION] Prev button clicked');
                                handleFreeModeReviewPrev();
                              }}
                              disabled={isPrevDisabled}
                              activeOpacity={0.9}
                              style={{
                                opacity: isPrevDisabled ? 0.4 : 1,
                                padding: scaleSize(4),
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                borderRadius: scaleSize(20),
                                zIndex: 10001,
                                elevation: 10001,
                              }}
                            >
                              <Icon name="chevron-left" size={scaleSize(30)} color="#ffffff" />
                            </SoundTouchableOpacity>

                            <View
                              style={{
                                alignItems: 'center',
                                flex: 1,
                                padding: scaleSize(8),
                              }}
                            >
                              <Text
                                style={{
                                  color: '#ffffff',
                                  fontFamily: 'Baloo2',
                                  fontSize: scaleSize(16),
                                  fontWeight: 'bold',
                                  textShadowColor: 'rgba(0, 0, 0, 0.75)',
                                  textShadowOffset: { width: 0, height: 1 },
                                  textShadowRadius: 3,
                                }}
                              >
                                Navigate Questions ({currentIndex + 1}/{sortedQuestions.length})
                              </Text>
                            </View>

                            <SoundTouchableOpacity
                              onPress={() => {
                                console.log('🔵 [NAVIGATION] Next button clicked');
                                handleFreeModeReviewNext();
                              }}
                              disabled={isNextDisabled}
                              activeOpacity={0.9}
                              style={{
                                opacity: isNextDisabled ? 0.4 : 1,
                                padding: scaleSize(4),
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                borderRadius: scaleSize(20),
                                zIndex: 10001,
                                elevation: 10001,
                              }}
                            >
                              <Icon name="chevron-right" size={scaleSize(30)} color="#ffffff" />
                            </SoundTouchableOpacity>
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Lifeline buttons removed */}

                  {/* Background opacity overlay when info tooltip is visible - Must be after options/submit in render tree */}
                  {showInfoTooltip && (
                    <SoundTouchableOpacity
                      activeOpacity={1}
                      onPress={handleInfoPress}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999, // Higher than all content (options 100, lifelines 150) to cover everything
                        elevation: 999, // Android elevation
                      }}
                    >
                      <View />
                    </SoundTouchableOpacity>
                  )}

                </View>
              </ScrollView>

              {/* REMOVED: Review section that shows after first answer - only show navigation arrows when all questions completed */}

              <Tooltip
                isVisible={showInfoTooltip}
                onClose={handleInfoPress}
                anchorPosition={tooltipAnchor}
              />

              {/* Congrats Modal Popup - For all modes including Free mode completion */}
              <CongratsScreen
                visible={showCongratsScreen}
                onClose={() => {
                  const mode = routeMode || currentMode || 'free';
                  if (mode === 'free') {
                    handleFreeModeCompletionClose();
                  } else {
                    handleCongratsClose();
                  }
                }}
                selectedAnswer={selectedAnswer || ''}
                correctAnswer={
                  apiCorrectAnswer ||
                  questionForDisplay?.correctAnswer ||
                  question?.correctAnswer ||
                  ''
                }
                question={(questionForDisplay || question) as Question}
                alreadyAnswered={
                  alreadyAnswered || Boolean(error && error.includes('already answered'))
                }
                onExtraChance={undefined} // Retry logic removed
                extraChanceCost={0}
                userGems={realGems}
                freeModeStatus={routeMode === 'free' ? freeModeStatus : undefined} // Pass free mode status for score display
                correctAnswersCount={freeModeStatus?.progress?.correct_answers || 0}
              />

              {/* Change Question Success Modal */}
              <Modal
                visible={showChangeQuestionSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowChangeQuestionSuccessModal(false)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000, // High z-index to ensure modal appears above all content
                    elevation: 10000, // Android elevation
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'white',
                      borderRadius: scaleSize(16),
                      padding: scaleSize(24),
                      width: '80%',
                      maxWidth: scaleSize(400),
                      alignItems: 'center',
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    }}
                  >
                    <Icon
                      name="check-circle"
                      size={scaleSize(64)}
                      color="#22c55e"
                      style={{ marginBottom: scaleSize(16) }}
                    />
                    <Text
                      style={{
                        fontSize: scaleSize(20),
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: scaleSize(8),
                        textAlign: 'center',
                      }}
                    >
                      Question Changed!
                    </Text>
                    <Text
                      style={{
                        fontSize: scaleSize(14),
                        color: '#6b7280',
                        textAlign: 'center',
                        marginBottom: scaleSize(24),
                      }}
                    >
                      A new question has been unlocked for you.
                    </Text>
                    <SoundTouchableOpacity
                      onPress={() => setShowChangeQuestionSuccessModal(false)}
                      style={{
                        backgroundColor: '#8b5cf6',
                        borderRadius: scaleSize(12),
                        paddingVertical: scaleSize(12),
                        paddingHorizontal: scaleSize(32),
                        minWidth: scaleSize(120),
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: scaleSize(16),
                          fontWeight: '600',
                          textAlign: 'center',
                        }}
                      >
                        Continue
                      </Text>
                    </SoundTouchableOpacity>
                  </View>
                </View>
              </Modal>


              {/* Tap overlay for Free Mode - Only when already answered OR in review mode, positioned above everything to capture taps */}
              {/* CRITICAL: Show overlay in Free mode when isSubmitted is true OR when in review mode */}
              {/* CRITICAL: Overlay should NOT block navigation arrows - they have higher z-index */}
              {
                (() => {
                  const mode = routeMode || currentMode || 'free';
                  const shouldShowOverlay =
                    mode === 'free' &&
                    (isFreeModeReviewMode || // Show overlay in review mode to allow tap-to-close
                      (alreadyAnswered && !showCongratsScreen) || // Only show overlay if modal is not showing
                      (isSubmitted && !showCongratsScreen) ||
                      (currentFreeModeQuestion?.answered_at && !showCongratsScreen) ||
                      (currentFreeModeQuestion?.submitted_at && !showCongratsScreen));

                  // Debug log to check if overlay should render - ALWAYS LOG IN FREE MODE
                  if (mode === 'free') {
                    console.log('🔵 [TRIVIA SCREEN OVERLAY] Checking overlay condition:', {
                      mode,
                      isFreeModeReviewMode,
                      alreadyAnswered,
                      isSubmitted,
                      answeredAt: currentFreeModeQuestion?.answered_at,
                      submittedAt: currentFreeModeQuestion?.submitted_at,
                      shouldShowOverlay,
                      showCongratsScreen,
                      questionId: currentFreeModeQuestion?.question_id,
                    });
                  }

                  return shouldShowOverlay;
                })() && (
                  <TouchableWithoutFeedback
                    onPress={async () => {
                      const mode = routeMode || currentMode || 'free';

                      // ALWAYS LOG - This confirms tap is working
                      console.log(
                        '🔵🔵🔵 [TRIVIA SCREEN TAP OVERLAY] ========== SCREEN TAPPED =========='
                      );
                      console.log('🔵🔵🔵 [TRIVIA SCREEN TAP OVERLAY] Tap detected!', {
                        mode,
                        isFreeModeReviewMode,
                        alreadyAnswered,
                        isSubmitted,
                        showCongratsScreen,
                        freeModeQuestionId: currentFreeModeQuestion?.question_id,
                        nextQuestionScheduled: nextQuestionScheduled.current,
                      });

                      // Free mode review mode: Tap to exit review mode (like CongratsScreen tap-to-close)
                      if (mode === 'free' && isFreeModeReviewMode) {
                        console.log(
                          '🟢 [TRIVIA SCREEN TAP OVERLAY] Free mode review mode - Exiting review mode'
                        );
                        setIsFreeModeReviewMode(false);
                        setFreeModeReviewIndex(0);
                        // Fetch current question to return to normal view
                        try {
                          await dispatch(fetchCurrentFreeQuestion()).unwrap();
                        } catch (e) {
                          console.error(
                            '🔴 [TRIVIA SCREEN TAP OVERLAY] Error fetching current question:',
                            e
                          );
                        }
                        return;
                      }

                      // Free mode: If completed/all answered, show CongratsScreen on tap
                      const isCompleted = freeModeStatus?.progress?.completed === true;
                      const allQuestionsAnswered =
                        freeModeStatus?.progress?.all_questions_answered === true;
                      if (mode === 'free' && (isCompleted || allQuestionsAnswered)) {
                        console.log(
                          '🟢 [TRIVIA SCREEN TAP OVERLAY] Free mode completed/all answered - showing CongratsScreen',
                          {
                            completed: isCompleted,
                            allQuestionsAnswered,
                          }
                        );
                        userManuallyClosedFreeModeModal.current = false;
                        setShowCongratsScreen(true);
                        return;
                      }

                      // Free mode: Remove tap functionality - modal only shows automatically on screen load
                      // CRITICAL: Never show modal when navigating with arrows or on tap
                      // Do nothing - modal only shows on screen load
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: scaleSizeFunc(120), // Exclude bottom area where navigation arrows are (80px height + 30px bottom + 10px margin)
                      zIndex: 100, // Lower than navigation arrows (10000) so arrows are clickable
                      elevation: 100, // Android elevation - lower than arrows
                      backgroundColor: 'transparent',
                      pointerEvents: 'auto', // Always capture taps when overlay is visible
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                  </TouchableWithoutFeedback>
                )
              }

            </View >

            {/* Ad Banner removed from here to prevent layout shifts during transitions */}

            {/* Tap overlay for Bronze/Silver Mode - Show congrats screen when alreadyAnswered - Tap anywhere on screen */}
            {/* CRITICAL: Show overlay in Bronze/Silver mode when alreadyAnswered to allow tap anywhere to open congrats */}
            {/* MUST be outside ScrollView to cover entire screen */}
            {/* CRITICAL: z-index must be ABOVE opacity overlay (97) and ABOVE options container (100) but BELOW CongratsScreen (100) */}
            {/* Use z-index 99 to be above everything except CongratsScreen */}
            {
              (() => {
                const mode = routeMode || currentMode || 'free';
                const shouldShowBronzeSilverOverlay =
                  (mode === 'bronze' || mode === 'silver') &&
                  alreadyAnswered &&
                  !showCongratsScreen;

                return shouldShowBronzeSilverOverlay;
              })() && (
                <TouchableWithoutFeedback
                  onPress={() => {
                    const mode = routeMode || currentMode || 'free';
                    if ((mode === 'bronze' || mode === 'silver') && alreadyAnswered && !isNavigatingWithArrows.current) {
                      setShowCongratsScreen(true);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99, // ABOVE opacity overlay (97) and options container (100) to capture taps, but BELOW CongratsScreen (100)
                    elevation: 99,
                    backgroundColor: 'transparent',
                    pointerEvents: 'auto',
                  }}
                >
                  <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                </TouchableWithoutFeedback>
              )
            }

            {/* Opacity overlay for entire screen when CongratsScreen is visible - Covers everything including ad */}
            {/* MUST be outside ScrollView to cover ad banner */}
            {/* CRITICAL: z-index must be BELOW tap overlay (99) and BELOW CongratsScreen (100) so CongratsScreen appears without opacity */}
            {/* Use blue background tint to match screen background (#1e90ff) - no shadows, just opacity */}
            {showCongratsScreen && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(30, 144, 255, 0.5)', // Blue tint matching background #1e90ff with 0.5 opacity
                  zIndex: 97, // BELOW tap overlay (99) and BELOW CongratsScreen (100) so CongratsScreen appears on top without opacity
                  elevation: 97, // Android elevation - below CongratsScreen
                  pointerEvents: 'box-none', // Allow taps to pass through to CongratsScreen
                }}
              />
            )}

            {/* Confetti Animation - Rendered OUTSIDE SafeAreaView for full visibility */}
            {/* Must be at absolute root level to appear on top of all other components */}
            <Confetti isVisible={showConfetti} onAnimationEnd={handleConfettiAnimationEnd} />
          </ScrollView>

          {/* Ad Banner - Only in Free Mode - Outside ScrollView for vertical stability */}
          {(() => {
            const mode = routeMode || currentMode || 'free';
            if (mode === 'free' && !showCongratsScreen) {
              return (
                <View style={{
                  width: '100%',
                  alignItems: 'center',
                  paddingVertical: scaleSize(10),
                  backgroundColor: 'transparent',
                }}>
                  <AdBanner />
                </View>
              );
            }
            return null;
          })()}
        </View>
      </SafeScreenWrapper>
    </ScreenErrorBoundary >
  );
};

export default TriviaScreen;
