/**
 * TriviaScreen - TypeScript Implementation
 * Complete trivia game implementation with all functionality from old version
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
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
  StyleSheet,
} from 'react-native';
import { useNavigation, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { MainStackParamList } from '../../../navigation/types';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useSoundEffects } from '../../../hooks/use-sound-effects';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
// Use TriviaPay sound manager (expo-av based)
import soundManager from '../../../lib/audio/sound-manager';
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
import { useTriviaEngine } from '../../../hooks/Trivia/useTriviaEngine';
import { Question } from '../types';
import {
  setSelectedAnswer,
  resetTrivia,
  setIsSubmitted,
  fetchCurrentQuestion,
  submitAnswer,
  fetchFreeModeQuestions,
  fetchFreeModeStatus,
  submitFreeModeAnswer,
  fetchCurrentFreeQuestion,
  fetchBronzeModeQuestion,
  fetchBronzeModeStatus,
  submitBronzeModeAnswer,
  setCurrentMode,
  checkQuestionStatus,
} from '../../../store/triviaSlice';
import {
  useGetSilverModeStatusQuery,
  useGetSilverModeQuestionQuery,
  useSubmitSilverModeAnswerMutation,
} from '../../../store/api/triviaApi';
import { fetchUserGems } from '../../../store/slices/shopSlice';
import { useShop } from '../../../hooks/useReduxHooks';
import { RootState, AppDispatch } from '../../../store';
import { testApiConnectivity } from '../../../services/api/apiclient';
// Pollfish removed
import { scaleSize } from '../../../utils/scaleSize';
import { typography, FONTS } from '../../../theme/typography';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import {
  usePlatformOptimization,
  useHapticFeedback,
  useAndroidBackButton,
} from '../../../hooks/usePlatformOptimization';
import { useSafeArea } from '../../../hooks/useSafeArea';
import { useStatusBar } from '../../../hooks/useStatusBar';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
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

const SilverTriviaScreen: React.FC = () => {
  // DEBUG: Log component mount
  console.log('🟢 [SILVER TRIVIA SCREEN] Component mounted/rendered');

  // Analytics tracking
  useTrackScreenView('SilverTriviaScreen');
  const { trackEvent, trackAction } = useAnalytics();

  // Standardized error handling
  const { handleError } = useErrorHandler({
    component: 'SilverTriviaScreen',
    category: 'TRIVIA',
  });

  // HARDCODED MODE: This screen is always silver mode
  const MODE: 'silver' = 'silver';

  // RTK Query Hooks
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGetSilverModeStatusQuery(undefined, {
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: questionData,
    isLoading: isQuestionLoading,
    error: questionError,
    refetch: refetchQuestion,
  } = useGetSilverModeQuestionQuery(undefined, {
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const [submitSilverAnswer, { isLoading: isSubmitting }] = useSubmitSilverModeAnswerMutation();

  // Compat for legacy code
  const currentSilverModeQuestion = questionData?.question;
  const silverModeStatus = statusData;
  const loading = isStatusLoading || isQuestionLoading || isSubmitting;
  const error = statusError || questionError;

  // Redux state
  const dispatch = useDispatch<AppDispatch>();
  const {
    selectedAnswer,
    isSubmitted,
    isCorrect,
    dailyCompleted,
    // loading, // Replaced
    // error, // Replaced
    submissionResult,
    totalGems,
    questionsList,
    questionStatus,
    currentFreeModeQuestion,
    freeModeQuestions,
    freeModeStatus,
    currentBronzeModeQuestion,
    bronzeModeStatus,
    // currentSilverModeQuestion, // Replaced
    // silverModeStatus, // Replaced
    currentMode,
    currentQuestionIndex,
  } = useSelector((state: RootState) => state.trivia, shallowEqual);

  const { playCorrect, playWrong, playWin, canPlaySounds, startScreenMusic, stopScreenMusic } =
    useSoundEffects();

  // Debouncing refs to prevent duplicate sound plays
  const lastSoundPlayed = useRef<{ name: string; time: number } | null>(null);
  const SOUND_DEBOUNCE_MS = 200; // Prevent same sound from playing within 200ms

  const playSoundSafely = useCallback(async (soundName: string, fallbackName?: string) => {
    const sm = soundManager as any;
    if (sm && !sm.isSoundEnabled) {
      return;
    }

    // Debounce: Prevent same sound from playing too quickly
    const soundToPlay = soundName || fallbackName;
    if (soundToPlay) {
      const now = Date.now();
      if (
        lastSoundPlayed.current &&
        lastSoundPlayed.current.name === soundToPlay &&
        now - lastSoundPlayed.current.time < SOUND_DEBOUNCE_MS
      ) {
        // Sound is being debounced, skip playing
        return;
      }
      lastSoundPlayed.current = { name: soundToPlay, time: now };
    }

    // Auto-initialize in background if not initialized (non-blocking)
    if (!(soundManager as any).isInitialized) {
      // Use background initialization to prevent UI blocking
      if (typeof (soundManager as any).initializeInBackground === 'function') {
        (soundManager as any).initializeInBackground();
      } else {
        // Fallback to async initialization
        if (typeof (soundManager as any).initialize === 'function') {
          (soundManager as any).initialize().catch(() => {
            // Silent fail - initialization will retry on next sound play
          });
        }
      }
      // Don't wait - continue to try playing sound
    }

    // CRITICAL: Only use AudioManager/soundManager - NO fallback to prevent null path errors
    // AudioManager is safe and handles all edge cases, fallback causes crashes
    try {
      const smObj = soundManager as any;
      if (soundToPlay && smObj && typeof smObj.playSound === 'function') {
        await smObj.playSound(soundToPlay).catch(() => {
          // Silent fail - sound couldn't play, but don't crash
        });
        return; // Always return after AudioManager attempt - NO FALLBACK
      }
    } catch (error) {
      // Silent fail - don't crash on sound errors
    }
  }, []);

  // Get current question - always silver mode
  const currentQuestionData = useMemo(() => {
    if (currentSilverModeQuestion) {
      return currentSilverModeQuestion;
    }
    return null;
  }, [currentSilverModeQuestion]);

  // Convert question to Question format for compatibility
  const apiQuestion = useMemo(() => {
    if (!currentQuestionData) return null;

    // Handle bronze/silver mode questions
    if ('submitted_at' in currentQuestionData) {
      const bronzeSilverQuestion = currentQuestionData as any;
      return {
        question_number: bronzeSilverQuestion.question_id,
        question: bronzeSilverQuestion.question,
        options: {
          a: bronzeSilverQuestion.option_a,
          b: bronzeSilverQuestion.option_b,
          c: bronzeSilverQuestion.option_c,
          d: bronzeSilverQuestion.option_d,
        },
        category: bronzeSilverQuestion.category,
        difficulty: bronzeSilverQuestion.difficulty_level,
        picture_url: bronzeSilverQuestion.picture_url,
        hint: bronzeSilverQuestion.hint,
        correct_answer: bronzeSilverQuestion.correct_answer,
        total_gems: totalGems,
        order: 0,
        is_common: false,
        is_used: false,
        total_questions: 0,
        questions_answered: 0,
        daily_completed: false,
        user_answer: bronzeSilverQuestion.fill_in_answer || null,
        is_correct: bronzeSilverQuestion.is_correct,
        answered_at: bronzeSilverQuestion.submitted_at,
        explanation: bronzeSilverQuestion.explanation,
      };
    }

    // Handle free mode questions
    const freeQuestion = currentQuestionData as any;
    return {
      question_number: freeQuestion.question_id,
      question: freeQuestion.question,
      options: {
        a: freeQuestion.option_a,
        b: freeQuestion.option_b,
        c: freeQuestion.option_c,
        d: freeQuestion.option_d,
      },
      category: freeQuestion.category,
      difficulty: freeQuestion.difficulty_level,
      picture_url: freeQuestion.picture_url,
      hint: freeQuestion.hint,
      correct_answer: freeQuestion.correct_answer,
      total_gems: totalGems,
      order: freeQuestion.question_order || 0,
      is_common: false,
      is_used: false,
      total_questions: freeModeStatus?.progress.total_questions || 0,
      questions_answered: freeModeStatus?.progress.correct_answers || 0,
      daily_completed: freeModeStatus?.progress.completed || false,
      user_answer: freeQuestion.fill_in_answer || null,
      is_correct: freeQuestion.is_correct,
      answered_at: freeQuestion.answered_at,
      explanation: freeQuestion.explanation,
    };
  }, [currentQuestionData, totalGems, freeModeStatus]);

  // Convert API question to UI format - MEMOIZED to prevent excessive re-renders
  const question = useMemo(() => {
    return convertQuestionToUIFormat(apiQuestion);
  }, [apiQuestion]);

  // Create submit handler for engine (RTK Query migration)
  const handleEngineSubmit = useCallback(
    (questionId: string | number, answer: string) => {
      submitSilverAnswer({ question_id: Number(questionId), answer });
    },
    [submitSilverAnswer]
  );

  // Initialize shared trivia engine - handles all quiz logic consistently
  const { state: engineState, actions: engineActions } = useTriviaEngine({
    mode: 'silver',
    currentQuestion: currentSilverModeQuestion,
    question,
    playSoundSafely,
    trackAction,
    submissionResult,
    isSubmitted,
    modeStatus: silverModeStatus,
    onSubmit: handleEngineSubmit,
  });
  // DEBUG: Log ONLY critical Redux state changes (optimized to prevent render loops)
  const prevQuestionIdRef = useRef<number | string | undefined>(undefined);
  const prevIsSubmittedRef = useRef<boolean>(false);

  useEffect(() => {
    const currentQuestionId =
      currentFreeModeQuestion?.question_id ||
      currentBronzeModeQuestion?.question_id ||
      currentSilverModeQuestion?.question_id;

    // Only log when question changes or submission state changes
    if (
      currentQuestionId !== prevQuestionIdRef.current ||
      isSubmitted !== prevIsSubmittedRef.current
    ) {
      console.log('🟢 [TRIVIA SCREEN] Redux state update:', {
        loading,
        hasError: !!error,
        questionId: currentQuestionId,
        isSubmitted,
        isCorrect,
        dailyCompleted,
        currentMode,
        selectedAnswer,
      });

      prevQuestionIdRef.current = currentQuestionId;
      prevIsSubmittedRef.current = isSubmitted;
    }
  }, [
    currentFreeModeQuestion?.question_id,
    currentBronzeModeQuestion?.question_id,
    currentSilverModeQuestion?.question_id,
    isSubmitted,
    loading,
    error,
    isCorrect,
    dailyCompleted,
    currentMode,
    selectedAnswer,
  ]);

  // Get profile data for gems and coins
  const profileData = useSelector((state: RootState) => state.profile.profile, shallowEqual);
  const profileGems = useMemo(
    () => (profileData as any)?.total_gems || 0,
    [(profileData as any)?.total_gems]
  );
  const profileCoins = useMemo(
    () => (profileData as any)?.total_trivia_coins || 0,
    [(profileData as any)?.total_trivia_coins]
  );

  // Extra chance cost (retry) - hardcoded since boost API is removed
  const EXTRA_CHANCE_COST = 150;

  // Free Mode completion + review UI state (must be declared before effects that reference it)
  const [showFreeModeCompletionModal, setShowFreeModeCompletionModal] = useState<boolean>(false);
  const [isFreeModeReviewMode, setIsFreeModeReviewMode] = useState<boolean>(false);
  const [freeModeReviewIndex, setFreeModeReviewIndex] = useState<number>(0);

  // All hooks at the top
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParamList, 'SilverTriviaScreen'>>();
  const isFocused = useIsFocused();
  // This screen is always silver mode - use MODE constant directly
  const routeMode = MODE; // Always silver for this screen

  // HARDCODED MODE: Always silver mode for this screen
  // Prevent infinite API calls - track if API call is in progress
  const isFetchingStatusRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_COOLDOWN_MS = 2000; // 2 seconds cooldown between API calls

  // Fetch question and status based on mode on mount - STRICT API ISOLATION
  useEffect(() => {
    console.log('🔵 [SILVER TRIVIA SCREEN] useEffect - Screen focus check', {
      isFocused,
      mode: MODE,
    });

    if (!isFocused) {
      console.log('🟡 [SILVER TRIVIA SCREEN] Screen not focused, skipping API calls');
      return;
    }

    // Prevent infinite loops - check if already fetching or too soon since last fetch
    const now = Date.now();
    if (isFetchingStatusRef.current || now - lastFetchTimeRef.current < FETCH_COOLDOWN_MS) {
      console.log('🟡 [SILVER TRIVIA SCREEN] API call skipped (already fetching or cooldown)');
      return;
    }

    console.log('🟢 [SILVER TRIVIA SCREEN] Screen focused, mode: silver');
    dispatch(setCurrentMode(MODE));

    // Mark as fetching immediately
    isFetchingStatusRef.current = true;
    lastFetchTimeRef.current = Date.now();

    // STRICT API ISOLATION: Only call silver mode APIs
    console.log('🔵 [SILVER TRIVIA API] SILVER MODE - Starting API calls');
    // Silver mode APIs only
    // Refetch using RTK Query functions
    console.log('🔵 [SILVER TRIVIA API] Refetching silver mode data...');
    refetchQuestion();
    refetchStatus();

    isFetchingStatusRef.current = false;

    return () => {
      isFetchingStatusRef.current = false;
    };
  }, [isFocused, dispatch, refetchQuestion, refetchStatus]); // MODE is constant, no need to include it

  // Set current question when questions are loaded
  useEffect(() => {
    if (freeModeQuestions && freeModeQuestions.length > 0 && !currentFreeModeQuestion) {
      // Find first unlocked question or first question
      const firstUnlocked = freeModeQuestions.find(q => q.status !== 'locked');
      const questionToUse = firstUnlocked || freeModeQuestions[0];

      if (questionToUse) {
        // Dispatch action to set current question
        dispatch({
          type: 'trivia/fetchFreeModeQuestions/fulfilled',
          payload: { questions: freeModeQuestions },
        } as any);
      }
    }
  }, [freeModeQuestions, currentFreeModeQuestion, dispatch]);

  // Ref to track if we've scheduled next question fetch
  const nextQuestionScheduled = useRef(false);
  // Ref to track the last answered question ID
  const lastAnsweredQuestionId = useRef<number | null>(null);

  // CRITICAL: Force state reset when new silver mode question arrives
  // This ensures UI updates even if other useEffects have conditions that prevent them from running
  useEffect(() => {
    // This screen is always silver mode
    if (!currentSilverModeQuestion) {
      return;
    }

    const currentQuestionId = currentSilverModeQuestion.question_id;

    // Check if this is a NEW question (different from last answered)
    if (currentQuestionId && currentQuestionId !== lastAnsweredQuestionId.current) {
      console.log('🟢 [SILVER TRIVIA SCREEN] Silver mode question changed:', {
        newQuestionId: currentQuestionId,
        lastAnsweredId: lastAnsweredQuestionId.current,
        isSubmitted,
        localIsSubmitted,
      });

      // If we just answered a question and now have a new question, reset submission state
      if (lastAnsweredQuestionId.current !== null && !currentSilverModeQuestion.answered_at) {
        console.log('🟢 [SILVER TRIVIA SCREEN] New question after submission - resetting UI state');
        engineActions.setLocalIsSubmitted(false);
        engineActions.setAlreadyAnswered(false);
        engineActions.setShowCongratsScreen(false);
        engineActions.setShowCorrectAnimation(false);
        engineActions.setShowWrongAnimation(false);
        engineActions.setPreviousAnswer(null);
        engineActions.setPreviousAnswerCorrect(false);
        engineActions.setApiCorrectAnswer(null);
        dispatch(setSelectedAnswer(null));
      }
    }
  }, [currentSilverModeQuestion, lastAnsweredQuestionId, isSubmitted, engineState.localIsSubmitted, dispatch]);

  // After submission, fetch silver mode status (silver is single-question mode)
  useEffect(() => {
    console.log('🔵 [SILVER TRIVIA SCREEN] useEffect - After submission check', {
      isSubmitted,
      hasSubmissionResult: !!submissionResult,
      nextQuestionScheduled: nextQuestionScheduled.current,
    });

    if (isSubmitted && submissionResult && !nextQuestionScheduled.current) {
      const currentQuestionId = currentSilverModeQuestion?.question_id;

      console.log(
        '🔵 [SILVER TRIVIA SCREEN] Submission detected, current question ID:',
        currentQuestionId
      );

      if (!currentQuestionId) {
        console.log('🟡 [SILVER TRIVIA SCREEN] No current question ID, skipping');
        return;
      }

      // Skip if we already processed this question
      if (lastAnsweredQuestionId.current === currentQuestionId) {
        console.log('🟡 [SILVER TRIVIA SCREEN] Already processed this question, skipping');
        return;
      }

      console.log('🟢 [SILVER TRIVIA SCREEN] Scheduling status fetch...');
      nextQuestionScheduled.current = true;
      lastAnsweredQuestionId.current = currentQuestionId;

      // Silver is a single-question mode: fetch status after submission
      const timer = setTimeout(() => {
        const run = async () => {
          try {
            console.log('🔵 [SILVER TRIVIA API] Fetching silver mode status after submission...');
            // Silver is a single-question mode: do not refetch the question (it resets UI state in the slice).
            // Status is the source of truth after submission.
            await refetchStatus().unwrap();
          } finally {
            nextQuestionScheduled.current = false;
            console.log('🟢 [SILVER TRIVIA SCREEN] Status fetch completed');
          }
        };

        void run();
      }, 300); // Minimal delay (300ms) for UI animation

      return () => {
        console.log('🟡 [SILVER TRIVIA SCREEN] Cleanup: clearing timer');
        clearTimeout(timer);
      };
    }
  }, [isSubmitted, submissionResult, currentSilverModeQuestion, dispatch]);

  // Display previously answered questions with correct/wrong indicators
  useEffect(() => {
    // HARDCODED: Always silver mode
    let questionData: any = null;
    let statusData: any = null;

    if (currentSilverModeQuestion) {
      questionData = currentSilverModeQuestion;
      statusData = silverModeStatus;
    }

    // Check if question was already answered
    // CRITICAL: Status endpoint is the primary source of truth.
    // Prefer statusData.has_submitted / statusData.is_correct over questionData fields.
    const statusAnswered = !!(
      statusData &&
      (statusData.has_submitted ||
        (statusData.is_correct !== null && statusData.is_correct !== undefined))
    );

    const questionAnswered = !!(
      questionData &&
      (questionData.answered_at || questionData.submitted_at)
    );

    const isAnswered = statusAnswered || questionAnswered;

    if (questionData && isAnswered) {
      // Check if this is a question we just answered (don't re-trigger the display logic)
      if (lastAnsweredQuestionId.current === questionData.question_id) {
        logger.debug('SILVER MODE - Skipping display logic for question just answered', 'TRIVIA', {
          question_id: questionData.question_id,
        });
        return; // Skip - we already handled the display in submission result effect
      }

      // Question was already answered (in a previous session) - show the result
      logger.debug('SILVER MODE - Loading previously answered question', 'TRIVIA', {
        question_id: questionData.question_id,
        fill_in_answer: questionData.fill_in_answer || (statusData && statusData.fill_in_answer),
        is_correct: questionData.is_correct || (statusData && statusData.is_correct),
      });

      // Get user's answer from STATUS endpoint first, then fall back to question data
      const userAnswer =
        (statusData &&
          (statusData.fill_in_answer || statusData.selected_option || statusData.user_answer)) ||
        questionData.fill_in_answer ||
        questionData.user_answer ||
        questionData.selected_option ||
        questionData.answered_option_id;

      // Determine correctness from STATUS endpoint first, then fall back
      let isCorrect = false;
      if (statusData && statusData.is_correct !== null && statusData.is_correct !== undefined) {
        isCorrect = Boolean(statusData.is_correct);
      } else if (
        questionData &&
        questionData.is_correct !== null &&
        questionData.is_correct !== undefined
      ) {
        isCorrect = Boolean(questionData.is_correct);
      }

      // IMPORTANT: Clear previous states first to avoid conflicts
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
      engineActions.setApiCorrectAnswer(null);

      // Set the user's previous answer from fill_in_answer
      if (userAnswer) {
        // Map the fill_in_answer to the option ID
        const userAnswerText = String(userAnswer ?? '')
          .toLowerCase()
          .trim();
        const optionsMap = apiQuestion?.options
          ? Array.isArray(apiQuestion.options)
            ? apiQuestion.options.map((opt: any, index: number) => [
              String.fromCharCode(97 + index),
              typeof opt === 'string' ? opt : opt.text || opt.option || '',
            ])
            : Object.entries(apiQuestion.options)
          : [];
        const matchingOption = optionsMap.find(
          ([id, text]) =>
            String(text ?? '')
              .toLowerCase()
              .trim() === userAnswerText ||
            String(text ?? '')
              .toLowerCase()
              .trim()
              .includes(userAnswerText) ||
            userAnswerText.includes(
              String(text ?? '')
                .toLowerCase()
                .trim()
            )
        );

        if (matchingOption) {
          dispatch(setSelectedAnswer(matchingOption[0]));
          if (!isCorrect) {
            engineActions.setPreviousAnswer(matchingOption[0]);
            engineActions.setPreviousAnswerCorrect(false);
          }
        } else if (['a', 'b', 'c', 'd'].includes(userAnswerText)) {
          dispatch(setSelectedAnswer(userAnswerText));
          if (!isCorrect) {
            engineActions.setPreviousAnswer(userAnswerText);
            engineActions.setPreviousAnswerCorrect(false);
          }
        }
      }

      // Always set the correct answer (this will show checkmark)
      // Prefer correct_answer from STATUS endpoint, then fall back to question data
      const correctAnswerSource =
        (statusData && statusData.correct_answer) || questionData.correct_answer;

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

        const matchingOption = optionsMap.find(
          ([id, text]) =>
            String(text ?? '')
              .toLowerCase()
              .trim() === correctAnswerText ||
            String(text ?? '')
              .toLowerCase()
              .trim()
              .includes(correctAnswerText) ||
            correctAnswerText.includes(
              String(text ?? '')
                .toLowerCase()
                .trim()
            )
        );

        if (matchingOption) {
          engineActions.setApiCorrectAnswer(matchingOption[0]); // Set option ID (a, b, c, d)
        } else if (['a', 'b', 'c', 'd'].includes(correctAnswerText)) {
          engineActions.setApiCorrectAnswer(correctAnswerText);
        }
      }

      // Mark as already answered
      engineActions.setAlreadyAnswered(true);
      engineActions.setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // CRITICAL: Automatically show congrats screen for already answered questions
      // only if the screen is focused
      if (isFocused) {
        engineActions.setShowCongratsScreen(true);
      }
    } else if (questionData && !isAnswered) {
      // Question not yet answered - reset states
      console.log('🔵 [TRIVIA SCREEN] Resetting answer state (question not answered)');
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
      engineActions.setApiCorrectAnswer(null);
      engineActions.setAlreadyAnswered(false);
      engineActions.setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false));
      dispatch(setSelectedAnswer(null));
    }
  }, [currentSilverModeQuestion, silverModeStatus, dispatch, apiQuestion, isFocused]);

  const sortedFreeModeQuestionsForReview = useMemo(() => {
    const list = freeModeQuestions ?? [];
    return [...list].sort((a: any, b: any) => (a?.question_order ?? 0) - (b?.question_order ?? 0));
  }, [freeModeQuestions]);


  // Get gems from shop state (source of truth) - fetch from shop API
  const { userBalance, fetchUserGems: refreshGems } = useShop();
  // Use totalGems from API response if available and > 0, otherwise use shop gems
  // Priority: totalGems from trivia API (if > 0) > shop gems > 0
  // CRITICAL: If totalGems is 0, use shop gems (totalGems might be 0 initially)
  const realGems = totalGems && totalGems > 0 ? totalGems : userBalance?.gems || 0;

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  const safeArea = useSafeArea();
  useStatusBar({ style: 'light-content', backgroundColor: '#000000' });
  usePlatformOptimization();
  useAndroidBackButton(() => {
    // Allow default navigation back behavior
    return false;
  });

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

  // Fetch gems from shop API when screen loads - only once on mount
  // Removed focus-based refresh to prevent excessive API calls
  useEffect(() => {
    if (refreshGems && typeof refreshGems === 'function') {
      refreshGems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Local UI state (engine handled states removed)
  const [confettiAnimationCompleted, setConfettiAnimationCompleted] = useState<boolean>(false);
  const [hintAnimationCompleted, setHintAnimationCompleted] = useState<boolean>(false);
  const [autoAnimationCompleted, setAutoAnimationCompleted] = useState<boolean>(false);
  const [changeQuestionAnimationCompleted, setChangeQuestionAnimationCompleted] =
    useState<boolean>(false);
  const [fiftyFiftyAnimationCompleted, setFiftyFiftyAnimationCompleted] = useState<boolean>(false);

  // Confetti state tracking (removed debug log for performance)
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [hintTooltipText, setHintTooltipText] = useState<string>('');
  const [showChangeQuestionSuccessModal, setShowChangeQuestionSuccessModal] =
    useState<boolean>(false);
  const hintButtonRef = useRef<any>(null);
  const [hintButtonLayout, setHintButtonLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Retry logic removed - one attempt only per question

  // Convert API question to UI format - MEMOIZED to prevent excessive re-renders


  // DEBUG: Log state values to diagnose loading issue - Only log when state actually changes
  const previousApiQuestionRef = useRef(apiQuestion);
  useEffect(() => {
    if (previousApiQuestionRef.current !== apiQuestion) {
      logger.debug('State Check', 'TRIVIA', {
        hasApiQuestion: !!apiQuestion,
        apiQuestionKeys: apiQuestion ? Object.keys(apiQuestion) : [],
        apiQuestionNumber: apiQuestion?.question_number,
        hasQuestion: !!question,
        questionKeys: question ? Object.keys(question) : [],
        loading,
        loadingCondition: !question && !apiQuestion && loading,
      });
      previousApiQuestionRef.current = apiQuestion;
    }
  }, [apiQuestion, question, loading]);

  // Update question options with disabled options from 50-50
  const questionWithDisabledOptions = question
    ? {
      ...question,
      options: question.options.map(opt => ({
        ...opt,
        disabled:
          disabledOptions.some(disabledId => disabledId.toLowerCase() === opt.id.toLowerCase()) ||
          opt.disabled,
      })),
    }
    : null;

  const freeModeReviewTotal = sortedFreeModeQuestionsForReview.length;

  const handleFreeModeCompletionClose = useCallback(() => {
    setShowFreeModeCompletionModal(false);
    setIsFreeModeReviewMode(true);
    setFreeModeReviewIndex(0);
  }, []);

  const handleFreeModeReviewPrev = useCallback(() => {
    setFreeModeReviewIndex(index => Math.max(0, index - 1));
  }, []);

  const handleFreeModeReviewNext = useCallback(() => {
    setFreeModeReviewIndex(index => {
      if (freeModeReviewTotal <= 0) return 0;
      return Math.min(freeModeReviewTotal - 1, index + 1);
    });
  }, [freeModeReviewTotal]);

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

    dispatch(setSelectedAnswer(mappedUserAnswer));
    engineActions.setApiCorrectAnswer(mappedCorrectAnswer);

    const isCorrectValue =
      reviewQuestion.is_correct != null
        ? Boolean(reviewQuestion.is_correct)
        : Boolean(
          mappedUserAnswer && mappedCorrectAnswer && mappedUserAnswer === mappedCorrectAnswer
        );

    if (!isCorrectValue && mappedUserAnswer) {
      engineActions.setPreviousAnswer(mappedUserAnswer);
      engineActions.setPreviousAnswerCorrect(false);
    } else {
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(Boolean(isCorrectValue));
    }

    engineActions.setAlreadyAnswered(true);
    engineActions.setLocalIsSubmitted(true);
    engineActions.setShowCongratsScreen(false);
    engineActions.setShowCorrectAnimation(false);
    engineActions.setShowWrongAnimation(false);
    engineActions.setShowConfetti(false);
  }, [
    routeMode,
    currentMode,
    isFreeModeReviewMode,
    freeModeReviewIndex,
    sortedFreeModeQuestionsForReview,
    dispatch,
  ]);


  // Refs
  const infoIconRef = useRef<any>(null);
  const lottieRef = useRef<LottieView>(null);
  const correctAnimationRef = useRef<LottieView>(null);
  const wrongAnimationRef = useRef<LottieView>(null);
  const musicInitialized = useRef<boolean>(false);
  const lastFocusState = useRef<boolean | null>(null);
  const musicMonitorInterval = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedOnFocus = useRef<boolean>(false);
  const fetchAttempted = useRef<boolean>(false);
  const previousQuestionNumber = useRef<number | null>(null);
  const previousApiQuestionNumber = useRef<number | null>(null); // Track API question number to detect new questions
  const confettiShownForQuestion = useRef<number | null>(null);
  const hasProcessedAlreadyAnswered = useRef<number | null>(null);
  const hasProcessedError = useRef<string | null>(null);
  const confettiAnimationEndCalled = useRef<boolean>(false);
  const userManuallyClosedModal = useRef<boolean>(false); // Track if user manually closed modal
  // Retry functionality removed - no need to preserve correct answer

  // Track if animations are currently playing to prevent interruption
  const isCorrectAnimationPlaying = useRef<boolean>(false);
  const isWrongAnimationPlaying = useRef<boolean>(false);

  // Timer refs for cleanup
  const animationTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Animation hooks
  const { headerAnim, questionAnim, optionsAnim } = useEntranceAnimations(
    isFocused,
    question?.options || []
  );

  // Button animations
  const shopButtonAnimation = useButtonAnimation();
  const infoButtonAnimation = useButtonAnimation();

  // Question text reveal animation for smooth transition when changing question (reveal from question card)
  const questionTextOpacity = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

  // Option button animations - create at top level
  const option1Animation = useButtonAnimation();
  const option2Animation = useButtonAnimation();
  const option3Animation = useButtonAnimation();
  const option4Animation = useButtonAnimation();


  // Create a ref to store handleSubmit to avoid circular dependency
  const handleSubmitRef = useRef<(() => void) | null>(null);

  // Handle option selection - Auto-submit for all modes
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      console.log('🔵 [TRIVIA SCREEN] handleOptionSelect - Option tapped:', optionId);
      logger.debug('handleOptionSelect - CALLED', 'TRIVIA', {
        optionId,
        alreadyAnswered,
        localIsSubmitted,
        isSubmitted,
      });

      // Prevent selection if already answered in any way
      // - alreadyAnswered: local UI flag
      // - localIsSubmitted / isSubmitted: this session has already submitted
      // - questionStatus?.is_answered or mode-specific flags: backend says it's answered
      const mode = routeMode || currentMode || 'free';
      if (mode === 'free' && (isFreeModeReviewMode || showFreeModeCompletionModal)) {
        logger.debug('handleOptionSelect - BLOCKED: free-mode review/completed', 'TRIVIA');
        return;
      }

      const freeModeCompleted = mode === 'free' && freeModeStatus?.progress?.completed === true;
      const freeModeQuestionAlreadyAnswered =
        mode === 'free' && !!currentFreeModeQuestion?.answered_at;
      const bronzeAlreadySubmitted =
        mode === 'bronze' &&
        (bronzeModeStatus?.has_submitted === true || !!currentBronzeModeQuestion?.submitted_at);
      const silverAlreadySubmitted =
        mode === 'silver' &&
        (silverModeStatus?.has_submitted === true || !!currentSilverModeQuestion?.submitted_at);
      const legacyAlreadyAnswered =
        mode !== 'free' &&
        mode !== 'bronze' &&
        mode !== 'silver' &&
        (questionStatus?.is_answered || dailyCompleted);

      const backendAlreadyAnswered =
        freeModeCompleted ||
        freeModeQuestionAlreadyAnswered ||
        bronzeAlreadySubmitted ||
        silverAlreadySubmitted ||
        legacyAlreadyAnswered;

      if (alreadyAnswered || engineState.localIsSubmitted || isSubmitted || backendAlreadyAnswered) {
        logger.debug('handleOptionSelect - BLOCKED: already answered', 'TRIVIA');
        return;
      }

      // CRITICAL: Clear all marks BEFORE selecting new answer
      // This ensures no X marks or checkmarks      // Clear previous marks
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
      engineActions.setApiCorrectAnswer(null);

      // Play button sound for option selection
      playSoundSafely('button', 'click');

      // Set selected answer (just highlight, no marks yet)
      dispatch(setSelectedAnswer(optionId));
      console.log('🟢 [TRIVIA SCREEN] handleOptionSelect - Selected answer set to:', optionId);

      // Auto-submit immediately after selection
      setTimeout(() => {
        console.log('🔵 [TRIVIA SCREEN] handleOptionSelect - Auto-submit triggered');
        if (handleSubmitRef.current) {
          handleSubmitRef.current();
        }
      }, 100);
    },
    [
      localIsSubmitted,
      alreadyAnswered,
      isSubmitted,
      dispatch,
      playSoundSafely,
      // handleSubmit is NOT included to prevent circular dependency - it's called inside setTimeout
      routeMode,
      currentMode,
      showFreeModeCompletionModal,
      isFreeModeReviewMode,
      freeModeStatus,
      currentFreeModeQuestion,
      bronzeModeStatus,
      currentBronzeModeQuestion,
      silverModeStatus,
      currentSilverModeQuestion,
      questionStatus,
      dailyCompleted,
    ]
  );

  // OLD CODE: No auto-checking question status - only check when needed (like old code)
  // Removed auto checkQuestionStatus to prevent auto-answer behavior

  // Clear selected answer when question changes or screen first loads - ensure no option is selected on open
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free' && isFreeModeReviewMode) {
      return;
    }

    const currentQuestionNumber = question?.questionNumber;

    // Clear selected answer only when question number changes (new question) or first load
    if (
      currentQuestionNumber &&
      currentQuestionNumber !== previousQuestionNumber.current &&
      !localIsSubmitted &&
      !isSubmitted
    ) {
      // CRITICAL: Log when new question is detected
      console.log('🟢 [TRIVIA SCREEN] NEW QUESTION DETECTED:', {
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
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
      engineActions.setApiCorrectAnswer(null); // Reset API correct answer for new question

      // Reset all animation states for new question
      engineActions.setShowCorrectAnimation(false);
      engineActions.setShowWrongAnimation(false);
      engineActions.setShowConfetti(false);
      // setCorrectAnimationCompleted(false); // Managed by engine state? Wait, engine doesn't have setter for this.
      // setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      engineActions.setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state for new question
      engineActions.setShowCongratsScreen(false); // Close modal when new question loads
      engineActions.setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag for new question
      processedSubmission.current = null; // Reset processed submission tracker
      confettiShownForQuestion.current = null; // Reset confetti tracking for new question
      hasProcessedAlreadyAnswered.current = null; // Reset already answered processing
      hasProcessedError.current = null; // Reset error processing
      confettiAnimationEndCalled.current = false; // Reset confetti animation end flag
      setHintTooltipText(''); // Reset hint tooltip text

      console.log('🟢 [TRIVIA SCREEN] All state reset for new question #' + currentQuestionNumber);
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
      engineActions.setShowCorrectAnimation(false);
      engineActions.setShowWrongAnimation(false);
      engineActions.setShowConfetti(false);
      // setCorrectAnimationCompleted(false);
      // setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      engineActions.setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state on first load
      engineActions.setShowCongratsScreen(false); // Close modal on first load
      engineActions.setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag on first load
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
      engineActions.setShowCorrectAnimation(false);
      engineActions.setShowWrongAnimation(false);
      engineActions.setShowConfetti(false);
      // setCorrectAnimationCompleted(false);
      // setWrongAnimationCompleted(false);
      setConfettiAnimationCompleted(false);
      engineActions.setLocalIsSubmitted(false);
      dispatch(setIsSubmitted(false)); // Reset Redux submitted state on first load
      engineActions.setShowCongratsScreen(false); // Close modal on first load
      engineActions.setAlreadyAnswered(false); // Reset so modal behavior works for new question
      userManuallyClosedModal.current = false; // Reset manual close flag on first load
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

  // Handle submit - Simplified: immediate submit, no retry logic
  const handleSubmit = useCallback(() => {
    console.log('🔵 [TRIVIA SCREEN] handleSubmit - CALLED', {
      selectedAnswer,
      questionNumber: question?.questionNumber,
      hasQuestion: !!question,
      localIsSubmitted,
      isSubmitted,
      alreadyAnswered,
      mode: routeMode || currentMode || 'free',
    });

    logger.debug('handleSubmit - CALLED', 'TRIVIA', {
      selectedAnswer,
      questionNumber: question?.questionNumber,
      hasQuestion: !!question,
      localIsSubmitted,
      isSubmitted,
      alreadyAnswered,
    });

    // Track analytics
    trackAction('answer_submitted', {
      questionNumber: question?.questionNumber,
      answer: selectedAnswer,
    });
    const currentQuestion = question;
    const mode = routeMode || currentMode || 'free';

    // CRITICAL: Prevent submission if already answered
    if (alreadyAnswered) {
      console.log('🟡 [TRIVIA SCREEN] handleSubmit - Already answered, skipping');
      // Free Mode uses completion summary + review UI (no per-question congrats modal)
      if (mode !== 'free' && !showCongratsScreen) {
        setShowCongratsScreen(true);
      }
      return;
    }

    // Prevent duplicate submission
    if (!selectedAnswer || !currentQuestion || localIsSubmitted || isSubmitted) {
      console.log('🟡 [TRIVIA SCREEN] handleSubmit - Duplicate submission prevented', {
        hasSelectedAnswer: !!selectedAnswer,
        hasCurrentQuestion: !!currentQuestion,
        localIsSubmitted,
        isSubmitted,
      });
      return;
    }

    // Free Mode: backend completion is the single source of truth
    if (mode === 'free' && freeModeStatus?.progress?.completed === true) {
      setShowFreeModeCompletionModal(true);
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

    // Check if question is already answered (double check from questionStatus)
    if (mode !== 'free' && mode !== 'bronze' && mode !== 'silver' && questionStatus?.is_answered) {
      setAlreadyAnswered(true);
      setShowCongratsScreen(true);

      // Don't show confetti when opening screen - only show when answering correctly in current session
      // Confetti should only appear after user answers correctly, not when viewing already-answered questions
      return;
    }

    // CRITICAL: Send the actual option text (e.g., "Objective-C") instead of option ID (a, b, c, d)
    // Find the selected option and get its text
    const selectedOption = currentQuestion.options.find(
      opt => opt.id.toLowerCase() === selectedAnswer.toLowerCase()
    );
    const answerToSubmit = selectedOption?.text || selectedAnswer;

    // Log the submission details for debugging
    logger.debug('handleSubmit - Submitting answer', 'TRIVIA', {
      selectedAnswerId: selectedAnswer,
      selectedOptionText: selectedOption?.text,
      answerToSubmit,
      questionNumber: currentQuestion.questionNumber,
    });

    // CRITICAL: DO NOT set isSubmitted yet - wait for API response
    // Setting isSubmitted immediately causes marks to show before API responds
    // We'll set it in the submissionResult useEffect after API responds
    // For now, just disable options to prevent multiple submissions
    engineActions.setLocalIsSubmitted(true);
    // DO NOT dispatch(setIsSubmitted(true)) here - wait for API response

    // CRITICAL: Don't check answer locally - wait for API response
    // API will return is_correct and correct_answer
    // DO NOT compare selectedAnswer with correctAnswer locally - API is the ONLY source of truth
    // Marks will ONLY show after API response in submissionResult useEffect
    // DO NOT trigger any animations here - wait for API response in useEffect

    // Reset processed submission to allow new processing
    processedSubmission.current = null;

    // Use real API - always silver mode
    if (currentSilverModeQuestion) {
      console.log('🔵 [SILVER TRIVIA API] Submitting SILVER mode answer:', {
        question_id: currentSilverModeQuestion.question_id,
        answer: answerToSubmit,
      });
      logger.debug('handleSubmit - Submitting to silver-mode API', 'TRIVIA', {
        question_id: currentSilverModeQuestion.question_id,
        answer: answerToSubmit,
      });

      // Use engine action for consistent submission state management
      engineActions.handleSubmit(currentSilverModeQuestion.question_id, answerToSubmit);
    } else if (currentFreeModeQuestion) {
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
      // Fallback to old API if silver-mode or free-mode question not available
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
  }, [
    selectedAnswer,
    question,
    currentFreeModeQuestion,
    currentBronzeModeQuestion,
    currentSilverModeQuestion,
    routeMode,
    currentMode,
    engineState.localIsSubmitted,
    dispatch,
    engineState.alreadyAnswered,
    engineState.showCongratsScreen,
  ]);

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
      engineActions.setShowCorrectAnimation(false);

      // Free Mode must continue to next question (no per-question CongratsScreen)
      if (mode !== 'free') {
        engineActions.setShowCongratsScreen(true);
        engineActions.setAlreadyAnswered(true);
      } else {
        console.log(
          '🟢 [TRIVIA SCREEN] Free mode: Not showing congrats, preparing for next question'
        );
      }
      animationTimersRef.current.delete(timer);
    }, 200); // Reduced delay for faster progression (was 500ms)
    animationTimersRef.current.add(timer);
  }, [routeMode, currentMode]);

  // Handle wrong animation completion - simplified to prevent hanging
  const handleWrongAnimationEnd = useCallback(() => {
    logger.debug('handleWrongAnimationEnd - Wrong animation completed', 'TRIVIA');
    console.log('🔴 [TRIVIA SCREEN] Wrong animation ended');
    setWrongAnimationCompleted(true);

    // Simplified: Hide animation and show congrats screen immediately (no retry)
    // CRITICAL: Reduced delay from 500ms to 200ms for faster progression
    const timer = setTimeout(() => {
      const mode = routeMode || currentMode || 'free';
      engineActions.setShowWrongAnimation(false);

      // Free Mode must continue to next question (no per-question CongratsScreen)
      if (mode !== 'free') {
        engineActions.setShowCongratsScreen(true);
        engineActions.setAlreadyAnswered(true);
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
      engineActions.setShowConfetti(false);
      return;
    }

    // Prevent multiple calls
    if (confettiAnimationEndCalled.current) {
      // Already called - show congrats screen directly as fallback
      setTimeout(() => {
        engineActions.setShowCongratsScreen(true);
        engineActions.setAlreadyAnswered(true); // Mark as answered so user can reopen modal
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
        engineActions.setShowConfetti(false);

        // Additional smooth delay for clean transition before modal
        const timer3 = setTimeout(() => {
          // CRITICAL: Show modal after smooth delay - clean and neat transition
          // This MUST happen to show congrats screen automatically
          engineActions.setShowCongratsScreen(true);
          engineActions.setAlreadyAnswered(true); // Mark as answered so user can reopen modal
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
    // Play buttonMenu sound for close
    playSoundSafely('buttonMenu', 'click');
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

  // Reset fetch flags when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      hasFetchedOnFocus.current = false;
      fetchAttempted.current = false;
      // Reset question status check when screen loses focus so it checks again on reopen
      // This ensures fresh status when user closes and reopens the screen
      hasCheckedQuestionStatus.current = null;

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

    if (
      userManuallyClosedModal.current ||
      engineState.showCongratsScreen ||
      engineState.showCorrectAnimation ||
      engineState.showWrongAnimation
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (!userManuallyClosedModal.current) {
        engineActions.setShowCongratsScreen(true);
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
    engineState.showCongratsScreen,
    engineState.showCorrectAnimation,
    engineState.showWrongAnimation,
  ]);

  // Check if loaded question is already answered - trigger modal immediately
  // CRITICAL: Silver mode needs to handle already-answered questions to show marks
  useEffect(() => {
    if (!apiQuestion) return;

    const mode = routeMode || currentMode || 'free';

    // Free Mode uses completion summary + review UI (no per-question CongratsScreen)
    if (mode === 'free') {
      return;
    }

    // Silver/Bronze mode: Check if question is already answered
    if (mode === 'silver' || mode === 'bronze') {
      const statusData = mode === 'bronze' ? bronzeModeStatus : silverModeStatus;
      const questionData =
        mode === 'bronze' ? currentBronzeModeQuestion : currentSilverModeQuestion;

      const statusSaysSubmitted =
        statusData?.has_submitted === true ||
        Boolean(statusData?.submitted_at) ||
        Boolean(statusData?.fill_in_answer);

      const questionSaysSubmitted =
        Boolean(questionData?.submitted_at) ||
        Boolean(questionData?.answered_at) ||
        Boolean(questionData?.fill_in_answer);

      if (statusSaysSubmitted || questionSaysSubmitted) {
        // Question is already answered - set states to show marks
        const currentQNum = questionData?.question_id || apiQuestion?.question_number;
        if (hasProcessedAlreadyAnswered.current === currentQNum) {
          return; // Already processed
        }
        hasProcessedAlreadyAnswered.current = currentQNum;

        // Set alreadyAnswered to show marks
        setAlreadyAnswered(true);
        setLocalIsSubmitted(true);
        dispatch(setIsSubmitted(true));

        // Get user's answer from question data
        const userAnswer =
          questionData?.fill_in_answer || statusData?.fill_in_answer || apiQuestion?.user_answer;
        if (userAnswer) {
          // Map to option ID if needed
          const answerLower = String(userAnswer).toLowerCase().trim();
          if (['a', 'b', 'c', 'd'].includes(answerLower)) {
            dispatch(setSelectedAnswer(answerLower));
          } else {
            // Try to find in options
            const matchingOption = question?.options?.find(
              opt =>
                opt.id?.toLowerCase() === answerLower || opt.text?.toLowerCase() === answerLower
            );
            if (matchingOption) {
              dispatch(setSelectedAnswer(matchingOption.id.toLowerCase()));
            }
          }
        }

        // Set correct answer
        const correctAnswerSource = questionData?.correct_answer || apiQuestion?.correct_answer;
        if (correctAnswerSource) {
          const correctAnswerLower = String(correctAnswerSource).toLowerCase().trim();
          const matchingOption = question?.options?.find(opt => {
            const optId = opt.id.toLowerCase().trim();
            const optText = opt.text.toLowerCase().trim();
            return (
              optId === correctAnswerLower ||
              optText === correctAnswerLower ||
              optText.includes(correctAnswerLower) ||
              correctAnswerLower.includes(optText)
            );
          });
          if (matchingOption) {
            setApiCorrectAnswer(matchingOption.id.toLowerCase().trim());
          } else if (['a', 'b', 'c', 'd'].includes(correctAnswerLower)) {
            setApiCorrectAnswer(correctAnswerLower);
          }
        }

        // Set previous answer for marks
        const answerIsCorrect =
          questionData?.is_correct ?? statusData?.is_correct ?? apiQuestion?.is_correct ?? false;
        if (userAnswer) {
          const answerLower = String(userAnswer).toLowerCase().trim();
          setPreviousAnswer(answerLower);
          setPreviousAnswerCorrect(Boolean(answerIsCorrect));
        }

        // Show congrats screen
        setTimeout(() => {
          setShowCongratsScreen(true);
        }, 100);

        return;
      }
    }

    // Legacy mode handling (skip for new modes)
    if (mode === 'bronze' || mode === 'silver') {
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
      // Mark as processed to prevent re-processing
      hasProcessedAlreadyAnswered.current = currentQNum;

      // CRITICAL: Always show congrats screen if question is already answered
      // Even if user manually closed modal, still set all states correctly
      // But show modal again on screen open (user can close it if they want)

      // Set alreadyAnswered immediately - this disables options and lifelines
      setAlreadyAnswered(true);

      // Lifeline functionality removed

      // CRITICAL: Set submitted state to true so options show right/wrong status
      // Use free-mode question data if available
      const userAnswerToSet = currentFreeModeQuestion?.answered_at
        ? selectedAnswer
        : apiQuestion.user_answer || null;
      if (userAnswerToSet) {
        dispatch(setSelectedAnswer(userAnswerToSet.toLowerCase()));
      }
      setLocalIsSubmitted(true);
      dispatch(setIsSubmitted(true));

      // NO CONFETTI when opening screen with already-answered question
      // Confetti should ONLY show when user answers correctly in current session

      // CRITICAL: Set correct answer from API for display
      // Map correct_answer to option ID format
      // Use free-mode question data if available
      const correctAnswerToMap =
        currentFreeModeQuestion?.correct_answer || apiQuestion.correct_answer;
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
      // Always show both correct and wrong answers since question is already answered
      // Use free-mode question data if available
      const userAnswer = currentFreeModeQuestion?.answered_at
        ? selectedAnswer
        : apiQuestion.user_answer || null;
      const answerIsCorrect =
        currentFreeModeQuestion?.is_correct ?? apiQuestion.is_correct ?? false;

      if (userAnswer) {
        setPreviousAnswer(userAnswer.toLowerCase());
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

      // CRITICAL: Always show congrats screen when question is already answered
      // This ensures user sees the result immediately when screen opens
      setTimeout(() => {
        setShowCongratsScreen(true);
      }, 100);
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
  ]);

  // Track if question status has been checked for current question
  const hasCheckedQuestionStatus = useRef<number | null>(null);

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
          setLifelines({
            '50-50': false,
            Auto: false,
            Change: false,
            Hint: false,
          });

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
          // Only show if not manually closed by user AND not currently showing animations
          if (!userManuallyClosedModal.current && !showCorrectAnimation && !showWrongAnimation) {
            setTimeout(() => {
              setShowCongratsScreen(true);
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
  const willShowLoading = !question && !apiQuestion && loading;

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
  const processedSubmission = useRef<string | null>(null);

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
        engineActions.setApiCorrectAnswer(matchingOption.id.toLowerCase().trim());
      } else if (['a', 'b', 'c', 'd'].includes(apiCorrectAnswerValue)) {
        engineActions.setApiCorrectAnswer(apiCorrectAnswerValue);
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
      engineActions.setPreviousAnswer(selectedAnswer.toLowerCase());
      engineActions.setPreviousAnswerCorrect(false);
    } else if (selectedAnswer && isAnswerCorrect) {
      // For correct answers, clear previousAnswer (no X mark needed)
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
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
        engineActions.setApiCorrectAnswer(mappedCorrectAnswer);
        // Clear any previous wrong answer state immediately
        engineActions.setPreviousAnswer(null);
        engineActions.setPreviousAnswerCorrect(false);
      } else {
        // WRONG ANSWER - Always show correct answer immediately
        engineActions.setApiCorrectAnswer(mappedCorrectAnswer);
      }
    } else {
      // If no correct_answer in response, try to use question's correctAnswer as fallback
      if (isAnswerCorrect) {
        // CORRECT ANSWER - Set immediately
        if (question?.correctAnswer) {
          engineActions.setApiCorrectAnswer(question.correctAnswer.toLowerCase().trim());
        }
        // Clear any previous wrong answer state immediately
        engineActions.setPreviousAnswer(null);
        engineActions.setPreviousAnswerCorrect(false);
      } else {
        // WRONG ANSWER - Always show correct answer
        if (question?.correctAnswer) {
          engineActions.setApiCorrectAnswer(question.correctAnswer.toLowerCase().trim());
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

      // Step 1: Immediately stop and clear wrong animation
      engineActions.setShowWrongAnimation(false);
      // setWrongAnimationCompleted(false);
      if (wrongAnimationRef.current) {
        try {
          wrongAnimationRef.current.reset();
        } catch (e) {
          // Silent fail if animation ref is not ready
        }
      }

      // Clear any previous wrong answer state for correct answers
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);

      // FREE/BRONZE/SILVER MODE: Skip ALL animations, show result immediately
      const mode = routeMode || currentMode || 'free';
      if (mode === 'free' || mode === 'bronze' || mode === 'silver') {
        logger.debug(
          `${mode.toUpperCase()} MODE - CORRECT ANSWER - No animations, immediate display`,
          'TRIVIA'
        );
        // Disable ALL animations
        engineActions.setShowCorrectAnimation(false);
        engineActions.setShowWrongAnimation(false);
        // setCorrectAnimationCompleted(true);
        // setWrongAnimationCompleted(true);
        engineActions.setShowConfetti(false);

        // Set correct answer for display
        if (mappedCorrectAnswer) {
          engineActions.setApiCorrectAnswer(mappedCorrectAnswer);
        }
        engineActions.setPreviousAnswer(null);
        engineActions.setPreviousAnswerCorrect(false);

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
            setShowCongratsScreen(true);
          }, 200);
        }
      } else {
        // LEGACY MODE: Show animation
        // Step 3: Set correct animation state (this will trigger the correct lottie)
        // NO CONFETTI - go directly to congrats screen after animation completes
        logger.debug('CORRECT ANSWER - Setting showCorrectAnimation=true', 'TRIVIA');
        engineActions.setShowCorrectAnimation(true);
        // setCorrectAnimationCompleted(false);
        engineActions.setShowConfetti(false);
        engineActions.setShowCongratsScreen(false); // CRITICAL: Don't show CongratsScreen until animation completes

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
              if (correctAnimationRef.current && engineState.showCorrectAnimation) {
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
        engineActions.setShowCorrectAnimation(false);
        engineActions.setShowWrongAnimation(false);
        // setCorrectAnimationCompleted(true);
        // setWrongAnimationCompleted(true);
        engineActions.setShowConfetti(false);

        // Set wrong answer and correct answer for display
        if (selectedAnswer) {
          engineActions.setPreviousAnswer(selectedAnswer.toLowerCase());
          engineActions.setPreviousAnswerCorrect(false);
        }
        if (mappedCorrectAnswer) {
          engineActions.setApiCorrectAnswer(mappedCorrectAnswer);
        }

        // Play sound
        playSoundSafely('wrong_answer', 'error');

        // Free Mode: keep result inline and auto-advance; Bronze/Silver: keep existing modal behavior
        if (mode === 'free') {
          setShowCongratsScreen(false);
        } else {
          setTimeout(() => {
            setShowCongratsScreen(true);
          }, 200);
        }
      } else {
        // LEGACY MODE: Keep old animation behavior
        // Step 1: Immediately stop and clear correct animation
        engineActions.setShowCorrectAnimation(false);
        // setCorrectAnimationCompleted(false);
        if (correctAnimationRef.current) {
          try {
            correctAnimationRef.current.reset();
          } catch (e) {
            // Silent fail if animation ref is not ready
          }
        }

        // Step 2: Set wrong animation state (ALWAYS show for wrong answers, first or second)
        engineActions.setShowWrongAnimation(true);
        // setWrongAnimationCompleted(false);
        engineActions.setShowConfetti(false);
        engineActions.setShowCongratsScreen(false);

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
          engineActions.setPreviousAnswer(selectedAnswer);
          engineActions.setPreviousAnswerCorrect(false);
        }
      }
    }

    // Update previous answer state for wrong answers
    if (!isAnswerCorrect && selectedAnswer) {
      engineActions.setPreviousAnswer(selectedAnswer);
      engineActions.setPreviousAnswerCorrect(false);
    } else if (isAnswerCorrect) {
      // Clear wrong answer state for correct answers
      engineActions.setPreviousAnswer(null);
      engineActions.setPreviousAnswerCorrect(false);
    }

    // CRITICAL: Set isSubmitted in Redux NOW (after API response) so marks can show
    // This ensures marks only appear after we have the API response
    if (!isSubmitted) {
      dispatch(setIsSubmitted(true));
    }

    // Set alreadyAnswered so user can tap screen to reopen congrats popup
    engineActions.setAlreadyAnswered(true);

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

  // Handle error state - show modal for "already attempted" error or daily_completed
  useEffect(() => {
    const mode = routeMode || currentMode || 'free';
    if (mode === 'free') {
      if (freeModeStatus?.progress?.completed === true) {
        setShowFreeModeCompletionModal(true);
      }
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
        setShowCongratsScreen(true);
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
  if (!question && !loading && error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e90ff' }}>
        <SafeAreaView
          style={useMemo(
            () => ({
              paddingTop: 0, // STABILIZED: Fixed padding to prevent jumping
              flex: 1,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }),
            []
          )}
          edges={[]} // STABILIZED: No edges to prevent layout shifts
        >
          <StatusBar barStyle="light-content" backgroundColor="transparent" />

          {/* Lottie background removed - using homebg.png only */}

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
                ? "You have completed today's trivia!"
                : error &&
                  (error.includes('No questions available for today') ||
                    error.includes('No questions available'))
                  ? 'No questions available for today'
                  : error && error.includes('No question')
                    ? 'No question available at this time'
                    : error}
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
                  ? 'Check back later or try again tomorrow'
                  : error && error.includes('No question')
                    ? 'Check back later or try again tomorrow'
                    : 'Please check your connection and try again'}
            </Text>
            {error &&
              !error.includes('already answered') &&
              !error.includes('Come back tomorrow') &&
              !error.includes('No questions available for today') &&
              !error.includes('No questions available') &&
              !error.includes('No question') && (
                <SoundTouchableOpacity
                  onPress={() => {
                    // Reset fetch flags to allow retry
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
                  <Text
                    style={[
                      typography.button,
                      {
                        color: 'white',
                        fontSize: scaleSize(16),
                      },
                    ]}
                  >
                    Try Again
                  </Text>
                </SoundTouchableOpacity>
              )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show loading state with professional UI
  // CRITICAL: Only show loading if we don't have question AND we're actually loading
  // If we have apiQuestion but question conversion failed, try to show it anyway
  // If we have neither and not loading, it's an error (handled below)
  // Note: willShowLoading is calculated above before early returns
  if (willShowLoading) {
    logger.debug('SHOWING LOADING SCREEN', 'TRIVIA');
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SafeAreaView
          style={useMemo(
            () => ({
              paddingTop: 0, // STABILIZED: Fixed padding to prevent jumping
              flex: 1,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }),
            []
          )}
          edges={[]} // STABILIZED: No edges to prevent layout shifts
        >
          <StatusBar barStyle="light-content" backgroundColor="transparent" />

          {/* Lottie background removed - using background color only */}

          {/* Loading Content */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <GradientText text="Trivia Challenge" />
            <View style={{ marginTop: scaleSize(10) }}>
              <LottieView
                source={require('../../../../assets/animations/LoadingBar.json')}
                autoPlay
                loop
                style={{ width: scaleSize(100), height: scaleSize(100) }}
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
              Loading question...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // CRITICAL: If we have apiQuestion but question conversion returned null, try to create question from apiQuestion directly
  // This prevents showing loading when we actually have question data
  // Use question if available, otherwise fallback to apiQuestion structure
  const displayQuestion =
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
      : null);

  // CRITICAL: Use displayQuestion for rendering, but keep using question for logic
  // This ensures we show content even if conversion failed, but logic still works
  const questionForDisplay = displayQuestion || question;

  return (
    <ScreenErrorBoundary screenName="TriviaScreen">
      <ScreenBackButtonHandler action="navigate" />
      <View style={{ flex: 1, backgroundColor: '#1e90ff' }}>
        <SafeAreaView
          style={useMemo(
            () => ({
              paddingTop: 0, // STABILIZED: Fixed padding to prevent jumping
              flex: 1,
              backgroundColor: 'transparent',
            }),
            []
          )}
          edges={[]} // STABILIZED: No edges to prevent layout shifts
        >
          <StatusBar barStyle="light-content" backgroundColor="transparent" />

          {/* Lottie background removed - using homebg.png only */}

          {/* Correct Answer Lottie Animation - Shows when correct answer is chosen */}
          {/* CRITICAL: Show marks FIRST, then lottie animation plays on top */}
          {engineState.showCorrectAnimation && (
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
          {engineState.showWrongAnimation && (
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

          {/* Main content with tap-to-show-modal if alreadyAnswered */}
          <TouchableWithoutFeedback
            onPress={() => {
              // Simple tap handler - check if already answered and modal is closed
              const mode = routeMode || currentMode || 'free';
              if (mode !== 'free' && engineState.alreadyAnswered && !engineState.showCongratsScreen) {
                engineActions.setShowCongratsScreen(true);
              }
            }}
          >
            <View style={{ flex: 1 }}>
              {/* Header with Gems Display - Standardized to match Header component */}
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
                    source={require('../../../../assets/common/gemBg.png')}
                    style={{
                      width: scaleSize(105), // Standardized to match Header component
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
                    source={require('../../../../assets/common/coinBg.png')}
                    style={{
                      width: scaleSize(105), // Standardized to match Header component
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

              {/* Fixed middle part, no ScrollView */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleSize(100) }}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    zIndex: engineState.showCongratsScreen ? 0 : 1, // Lower z-index when modal is open
                    elevation: engineState.showCongratsScreen ? 0 : 1, // Android elevation
                    overflow: 'visible', // CRITICAL: Allow question card animation to display fully without clipping
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [{ translateX: headerAnim }],
                      alignItems: 'center',
                      marginBottom: scaleSize(24),
                    }}
                  >
                    <GradientText text="Trivia Challenge" />
                  </Animated.View>

                  <Animated.View
                    style={{
                      transform: [{ translateX: questionAnim }],
                      marginHorizontal: scaleSize(4),
                      marginBottom: scaleSize(5),
                      zIndex: 100, // Ensure it's above other elements
                    }}
                  >
                    <SoundTouchableOpacity
                      activeOpacity={alreadyAnswered ? 0.8 : 1}
                      onPress={() => {
                        const mode = routeMode || currentMode || 'free';
                        if (mode !== 'free' && engineState.alreadyAnswered) {
                          engineActions.setShowCongratsScreen(true);
                        }
                      }}
                      disabled={(routeMode || currentMode || 'free') === 'free' || !engineState.alreadyAnswered}
                      style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <ImageBackground
                        source={require('../../../../assets/trivia/questionCard.png')}
                        style={{
                          width: '100%',
                          aspectRatio: 320 / 300,
                          alignSelf: 'center',
                          maxWidth: scaleSize(320),
                        }}
                        resizeMode="contain"
                      >
                        {/* Tier-specific Badge for Silver level */}
                        <Image
                          source={require('../../../../assets/common/silver.png')}
                          style={{
                            position: 'absolute',
                            width: scaleSize(48),
                            height: scaleSize(48),
                            top: scaleSize(15),
                            right: scaleSize(15),
                            zIndex: 10,
                          }}
                          resizeMode="contain"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: scaleSize(80),
                            left: scaleSize(60),
                            right: scaleSize(50),
                            bottom: scaleSize(80),
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ overflow: 'hidden', width: '100%', alignItems: 'center' }}>
                            <Animated.Text
                              style={[
                                typography.h4,
                                {
                                  fontSize: scaleSize(18), // Smaller base font for long questions
                                  color: 'white',
                                  textAlign: 'center',
                                  lineHeight: scaleSize(24),
                                  paddingHorizontal: scaleSize(10),
                                  flexShrink: 1,
                                  opacity: questionTextOpacity, // Fade in/out animation
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
                          </View>

                          {/* Hint display with lightbulb icon - shown only after taking hint */}
                          {hintTooltipText && (
                            <Animated.View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: scaleSize(8),
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
                      </ImageBackground>
                    </SoundTouchableOpacity>

                  </Animated.View>

                  <View
                    style={{
                      marginBottom: scaleSize(0),
                      paddingHorizontal: scaleSize(0),
                      marginTop: scaleSize(-80), // Increased gap between question card and options
                      zIndex: showInfoTooltip ? 50 : 100, // Lower z-index when tooltip is visible so overlay covers it
                      elevation: showInfoTooltip ? 50 : 100, // Android elevation
                    }}
                  >
                    <View
                      style={{
                        padding: scaleSize(10),
                        alignItems: 'center',
                        marginTop: scaleSize(20), // Increased gap above options
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
                                  isSubmitted={engineState.localIsSubmitted || isSubmitted}
                                  correctAnswer={engineState.apiCorrectAnswer || ''} // ONLY use apiCorrectAnswer from API response - never use question's correctAnswer to prevent premature marks
                                  onPress={() => engineActions.handleOptionSelect(option.id)}
                                  hasAnySelection={selectedAnswer !== null}
                                  animatedStyle={optionAnimation.animatedStyle}
                                  onPressIn={optionAnimation.animatePress}
                                  onPressOut={optionAnimation.animateRelease}
                                  previousAnswer={engineState.previousAnswer}
                                  previousAnswerCorrect={engineState.previousAnswerCorrect}
                                  alreadyAnswered={engineState.alreadyAnswered}
                                />
                              </Animated.View>
                            </Animated.View>
                          );
                        });
                      })()}
                    </View>

                    {(() => {
                      const mode = routeMode || currentMode || 'free';
                      if (mode !== 'free' || !isFreeModeReviewMode || freeModeReviewTotal <= 0)
                        return null;

                      const reviewQuestion: any =
                        sortedFreeModeQuestionsForReview[freeModeReviewIndex];
                      const hasResult =
                        reviewQuestion?.is_correct !== null &&
                        reviewQuestion?.is_correct !== undefined;
                      const isCorrect = reviewQuestion?.is_correct === true;
                      const statusText = !hasResult ? '' : isCorrect ? 'Correct' : 'Incorrect';
                      const statusColor = !hasResult
                        ? 'rgba(255,255,255,0.65)'
                        : isCorrect
                          ? '#22c55e'
                          : '#ef4444';

                      const isPrevDisabled = freeModeReviewIndex <= 0;
                      const isNextDisabled = freeModeReviewIndex >= freeModeReviewTotal - 1;

                      return (
                        <View
                          style={{
                            marginTop: scaleSize(10),
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: scaleSize(12),
                          }}
                        >
                          <SoundTouchableOpacity
                            onPress={handleFreeModeReviewPrev}
                            disabled={isPrevDisabled}
                            activeOpacity={0.9}
                            style={{ opacity: isPrevDisabled ? 0.4 : 1, padding: scaleSize(6) }}
                          >
                            <Icon name="chevron-left" size={scaleSize(34)} color="#ffffff" />
                          </SoundTouchableOpacity>

                          <View style={{ alignItems: 'center' }}>
                            <Text
                              style={{
                                color: '#ffffff',
                                fontFamily: 'Baloo2',
                                fontSize: scaleSize(14),
                                fontWeight: 'bold',
                              }}
                            >
                              Review {freeModeReviewIndex + 1}/{freeModeReviewTotal}
                            </Text>
                            {!!statusText && (
                              <View
                                style={{
                                  marginTop: scaleSize(4),
                                  borderWidth: 1,
                                  borderColor: statusColor,
                                  borderRadius: scaleSize(999),
                                  paddingHorizontal: scaleSize(10),
                                  paddingVertical: scaleSize(2),
                                }}
                              >
                                <Text
                                  style={{
                                    color: statusColor,
                                    fontFamily: 'Baloo2',
                                    fontSize: scaleSize(12),
                                  }}
                                >
                                  {statusText}
                                </Text>
                              </View>
                            )}
                          </View>

                          <SoundTouchableOpacity
                            onPress={handleFreeModeReviewNext}
                            disabled={isNextDisabled}
                            activeOpacity={0.9}
                            style={{ opacity: isNextDisabled ? 0.4 : 1, padding: scaleSize(6) }}
                          >
                            <Icon name="chevron-right" size={scaleSize(34)} color="#ffffff" />
                          </SoundTouchableOpacity>
                        </View>
                      );
                    })()}

                    {/* Submit button removed - auto-submit on selection */}

                    {/* Test Pollfish Button - Only in development */}
                    {__DEV__ && (
                      <View
                        style={{
                          position: 'absolute',
                          top: scaleSize(60),
                          right: scaleSize(10),
                          zIndex: 1000,
                          elevation: 1000,
                        }}
                      >
                        <TouchableOpacity
                          onPress={handleTestPollfish}
                          style={{
                            backgroundColor: '#6c5ce7',
                            paddingHorizontal: scaleSize(16),
                            paddingVertical: scaleSize(12),
                            borderRadius: scaleSize(8),
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: '#ffffff',
                              fontSize: scaleSize(14),
                              fontWeight: 'bold',
                            }}
                          >
                            Test Pollfish
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Lifeline buttons removed */}


              {/* FreeModeCompletionModal removed - Silver mode uses CongratsScreen only */}

            </View>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </View>

      {/* Congrats Modal Popup - Rendered at root for absolute full screen coverage */}
      <CongratsScreen
        visible={engineState.showCongratsScreen}
        onClose={handleCongratsClose}
        selectedAnswer={selectedAnswer || ''}
        correctAnswer={
          engineState.apiCorrectAnswer ||
          questionForDisplay?.correctAnswer ||
          question?.correctAnswer ||
          ''
        }
        question={(questionForDisplay || question) as Question}
        alreadyAnswered={
          engineState.alreadyAnswered || Boolean(error && error.includes('already answered'))
        }
        onExtraChance={undefined} // Retry logic removed
        extraChanceCost={0}
        userGems={realGems}
      />

      {/* Background opacity overlay when info tooltip is visible */}
      {showInfoTooltip && (
        <SoundTouchableOpacity
          activeOpacity={1}
          onPress={handleInfoPress}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            zIndex: 999,
            elevation: 999,
          }}
        >
          <View />
        </SoundTouchableOpacity>
      )}

      <Tooltip
        isVisible={showInfoTooltip}
        onClose={handleInfoPress}
        anchorPosition={tooltipAnchor}
      />

      <Confetti isVisible={engineState.showConfetti} onAnimationEnd={engineActions.handleConfettiAnimationEnd} />

    </ScreenErrorBoundary>
  );
};

export default SilverTriviaScreen;
