/**
 * Shared Trivia Engine Hook
 *
 * Extracts the core quiz logic from Silver Mode to be reused by Free, Bronze, and Silver modes.
 * This ensures consistent behavior across all trivia modes.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import {
  setSelectedAnswer,
  setIsSubmitted,
  submitFreeModeAnswer,
  submitBronzeModeAnswer,
  submitSilverModeAnswer,
} from '../../store/triviaSlice';
import { logger } from '../../lib/utils/logger';

export interface TriviaEngineConfig {
  mode: 'free' | 'bronze' | 'silver';
  currentQuestion: any; // FreeModeQuestion | BronzeModeQuestion | SilverModeQuestion
  question: any; // UI formatted question
  playSoundSafely: (soundName: string, fallbackName?: string) => Promise<void>;
  trackAction: (action: string, params?: any) => void;
  // Redux state
  submissionResult: any; // SubmissionResult from Redux
  isSubmitted: boolean; // isSubmitted from Redux
  // Mode-specific status (for checking if already answered)
  modeStatus?: any; // bronzeModeStatus | silverModeStatus | freeModeStatus
  // Free Mode specific: pre-answered options array
  answeredOptions?: number[]; // Array of option indices (0-3) for each question
  currentQuestionIndex?: number; // Current question index in Free Mode
  // Optional submit handler to override default Redux dispatch (for RTK Query migration)
  onSubmit?: (questionId: string | number, answer: string) => void;
}

export interface TriviaEngineState {
  selectedAnswer: string | null;
  localIsSubmitted: boolean;
  alreadyAnswered: boolean;
  showCorrectAnimation: boolean;
  showWrongAnimation: boolean;
  showConfetti: boolean;
  showCongratsScreen: boolean;
  previousAnswer: string | null;
  previousAnswerCorrect: boolean;
  apiCorrectAnswer: string | null;
  correctAnimationCompleted: boolean;
  wrongAnimationCompleted: boolean;
  confettiAnimationEndCalled: boolean;
  isAnswerCorrect: boolean; // Explicit correct/incorrect from API
}

export interface TriviaEngineActions {
  handleOptionSelect: (optionId: string) => void;
  handleSubmit: () => void;
  handleCorrectAnimationEnd: () => void;
  handleWrongAnimationEnd: () => void;
  handleConfettiAnimationEnd: () => void;
  setShowCongratsScreen: (show: boolean) => void;
  setAlreadyAnswered: (answered: boolean) => void;
  setLocalIsSubmitted: (submitted: boolean) => void;
  setPreviousAnswer: (answer: string | null) => void;
  setPreviousAnswerCorrect: (correct: boolean) => void;
  setApiCorrectAnswer: (answer: string | null) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setShowCorrectAnimation: (show: boolean) => void;
  setShowWrongAnimation: (show: boolean) => void;
  setShowConfetti: (show: boolean) => void;
}

export const useTriviaEngine = (config: TriviaEngineConfig) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    mode,
    currentQuestion,
    question,
    playSoundSafely,
    trackAction,
    submissionResult,
    isSubmitted: reduxIsSubmitted,
    modeStatus,
    answeredOptions = [],
    currentQuestionIndex = 0,
  } = config;

  // State
  const [selectedAnswer, setSelectedAnswerState] = useState<string | null>(null);
  const [localIsSubmitted, setLocalIsSubmitted] = useState<boolean>(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState<boolean>(false);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState<boolean>(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showCongratsScreen, setShowCongratsScreen] = useState<boolean>(false);
  const [previousAnswer, setPreviousAnswer] = useState<string | null>(null);
  const [previousAnswerCorrect, setPreviousAnswerCorrect] = useState<boolean>(false);
  const [apiCorrectAnswer, setApiCorrectAnswer] = useState<string | null>(null);
  const [correctAnimationCompleted, setCorrectAnimationCompleted] = useState<boolean>(false);
  const [wrongAnimationCompleted, setWrongAnimationCompleted] = useState<boolean>(false);
  const [confettiAnimationEndCalled, setConfettiAnimationEndCalled] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false); // Track correctness from API

  // Refs
  const handleSubmitRef = useRef<(() => void) | null>(null);
  const processedSubmission = useRef<string | null>(null);
  const animationTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Check if question is already answered
  const isQuestionAlreadyAnswered = useCallback(() => {
    if (mode === 'free') {
      return !!currentQuestion?.answered_at || !!currentQuestion?.submitted_at;
    } else if (mode === 'bronze') {
      const statusSaysSubmitted = modeStatus?.has_submitted === true || !!modeStatus?.submitted_at;
      const questionSaysSubmitted = !!currentQuestion?.submitted_at;
      return statusSaysSubmitted || questionSaysSubmitted;
    } else if (mode === 'silver') {
      const statusSaysSubmitted = modeStatus?.has_submitted === true || !!modeStatus?.submitted_at;
      const questionSaysSubmitted = !!currentQuestion?.submitted_at;
      return statusSaysSubmitted || questionSaysSubmitted;
    }
    return false;
  }, [mode, currentQuestion, modeStatus]);

  // Handle option selection
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      logger.debug('useTriviaEngine - handleOptionSelect called', 'TRIVIA', { optionId, mode });

      // Prevent selection if already answered
      if (alreadyAnswered || localIsSubmitted || isQuestionAlreadyAnswered()) {
        logger.debug('useTriviaEngine - BLOCKED: already answered', 'TRIVIA');
        return;
      }

      // Free Mode: Use pre-answered option from array
      if (
        mode === 'free' &&
        answeredOptions.length > 0 &&
        currentQuestionIndex < answeredOptions.length
      ) {
        const preAnsweredIndex = answeredOptions[currentQuestionIndex];
        const optionIds = ['a', 'b', 'c', 'd'];
        const preAnsweredOptionId = optionIds[preAnsweredIndex];

        if (preAnsweredOptionId && preAnsweredOptionId !== optionId) {
          // Override with pre-answered option
          optionId = preAnsweredOptionId;
          logger.debug('useTriviaEngine - Free Mode: Using pre-answered option', 'TRIVIA', {
            preAnsweredIndex,
            preAnsweredOptionId,
          });
        }
      }

      // Clear previous marks
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
      setApiCorrectAnswer(null);

      // Play sound
      playSoundSafely('button', 'click');

      // Set selected answer
      dispatch(setSelectedAnswer(optionId));
      setSelectedAnswerState(optionId);

      // Auto-submit after delay (same as Silver Mode)
      setTimeout(() => {
        if (handleSubmitRef.current) {
          handleSubmitRef.current();
        }
      }, 100);
    },
    [
      mode,
      alreadyAnswered,
      localIsSubmitted,
      isQuestionAlreadyAnswered,
      answeredOptions,
      currentQuestionIndex,
      dispatch,
      playSoundSafely,
    ]
  );

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    logger.debug('useTriviaEngine - handleSubmit called', 'TRIVIA', {
      selectedAnswer,
      mode,
      hasQuestion: !!question,
    });

    // Prevent duplicate submission
    if (
      !selectedAnswer ||
      !question ||
      localIsSubmitted ||
      alreadyAnswered ||
      isQuestionAlreadyAnswered()
    ) {
      logger.debug('useTriviaEngine - BLOCKED: duplicate or invalid submission', 'TRIVIA');
      return;
    }

    // Track analytics
    trackAction('answer_submitted', {
      questionNumber: question?.questionNumber,
      answer: selectedAnswer,
    });

    // Get option text for submission
    const selectedOption = question.options?.find(
      (opt: any) => opt.id.toLowerCase() === selectedAnswer.toLowerCase()
    );
    const answerToSubmit = selectedOption?.text || selectedAnswer;

    // Set local submitted state (but NOT Redux isSubmitted - wait for API)
    setLocalIsSubmitted(true);

    // Reset processed submission
    processedSubmission.current = null;

    // Submit to appropriate API
    if (config.onSubmit) {
      // Use provided submit handler (RTK Query mutation)
      config.onSubmit(currentQuestion?.question_id, answerToSubmit);
    } else if (mode === 'free' && currentQuestion?.question_id) {
      dispatch(
        submitFreeModeAnswer({
          question_id: currentQuestion.question_id,
          answer: answerToSubmit,
        })
      );
    } else if (mode === 'bronze' && currentQuestion?.question_id) {
      dispatch(
        submitBronzeModeAnswer({
          question_id: currentQuestion.question_id,
          answer: answerToSubmit,
        })
      );
    } else if (mode === 'silver' && currentQuestion?.question_id) {
      dispatch(
        submitSilverModeAnswer({
          question_id: currentQuestion.question_id,
          answer: answerToSubmit,
        })
      );
    }
  }, [
    selectedAnswer,
    question,
    mode,
    currentQuestion,
    localIsSubmitted,
    alreadyAnswered,
    isQuestionAlreadyAnswered,
    dispatch,
    trackAction,
  ]);

  // Store handleSubmit in ref
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Handle correct animation end
  const handleCorrectAnimationEnd = useCallback(() => {
    logger.debug('useTriviaEngine - Correct animation completed', 'TRIVIA');
    setCorrectAnimationCompleted(true);

    const timer = setTimeout(() => {
      setShowCorrectAnimation(false);
      // ALWAYS show congrats screen for ALL MODES including Free Mode
      // This ensures the "Question & Answer" modal appears as requested
      setShowCongratsScreen(true);
      setAlreadyAnswered(true);
      animationTimersRef.current.delete(timer);
    }, 200);

    animationTimersRef.current.add(timer);
  }, []);

  // Handle wrong animation end
  const handleWrongAnimationEnd = useCallback(() => {
    logger.debug('useTriviaEngine - Wrong animation completed', 'TRIVIA');
    setWrongAnimationCompleted(true);

    const timer = setTimeout(() => {
      setShowWrongAnimation(false);
      // ALWAYS show congrats screen for ALL MODES including Free Mode
      setShowCongratsScreen(true);
      setAlreadyAnswered(true);
      animationTimersRef.current.delete(timer);
    }, 200);

    animationTimersRef.current.add(timer);
  }, []);

  // Handle confetti animation end
  const handleConfettiAnimationEnd = useCallback(() => {
    if (confettiAnimationEndCalled) {
      // Already called - show congrats screen directly
      setTimeout(() => {
        setShowCongratsScreen(true);
        setAlreadyAnswered(true);
      }, 500);
      return;
    }

    setConfettiAnimationEndCalled(true);

    const timer1 = setTimeout(() => {
      const timer2 = setTimeout(() => {
        setShowConfetti(false);

        const timer3 = setTimeout(() => {
          // ALWAYS show congrats screen (same for all modes)
          setShowCongratsScreen(true);
          setAlreadyAnswered(true);
          animationTimersRef.current.delete(timer3);
        }, 500);

        animationTimersRef.current.add(timer3);
        animationTimersRef.current.delete(timer2);
      }, 500);

      animationTimersRef.current.add(timer2);
      animationTimersRef.current.delete(timer1);
    }, 1000);

    animationTimersRef.current.add(timer1);
  }, [confettiAnimationEndCalled]);

  // Handle submission result from API - trigger animations and congrats screen
  useEffect(() => {
    if (!reduxIsSubmitted || !submissionResult || !localIsSubmitted || !question?.questionNumber) {
      return; // Wait for API response
    }

    // Ensure submissionResult has is_correct field
    if (submissionResult.is_correct === undefined || submissionResult.is_correct === null) {
      return; // API response not complete yet
    }

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
      return; // Already processed
    }

    processedSubmission.current = submissionKey;

    // Set correct answer from submission result
    const correctAnswerToSet = currentQuestion?.correct_answer || submissionResult?.correct_answer;
    if (correctAnswerToSet) {
      const apiCorrectAnswerValue = correctAnswerToSet.toLowerCase().trim();
      const matchingOption = question?.options?.find((opt: any) => {
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

    // Determine if answer is correct
    const isAnswerCorrect =
      Boolean(submissionResult.is_correct) ||
      String(submissionResult.is_correct).toLowerCase() === 'true';

    // Store the correctness in state for CongratsScreen
    setIsAnswerCorrect(isAnswerCorrect);

    // Set previous answer only if wrong
    if (selectedAnswer && !isAnswerCorrect) {
      setPreviousAnswer(selectedAnswer.toLowerCase());
      setPreviousAnswerCorrect(false);
    } else if (selectedAnswer && isAnswerCorrect) {
      setPreviousAnswer(null);
      setPreviousAnswerCorrect(false);
    }

    // Set Redux isSubmitted state
    dispatch(setIsSubmitted(true));

    // For all modes: Skip animations, show congrats screen immediately
    setShowCorrectAnimation(false);
    setShowWrongAnimation(false);
    setCorrectAnimationCompleted(true);
    setWrongAnimationCompleted(true);
    setShowConfetti(false);

    // Play sound
    if (isAnswerCorrect) {
      playSoundSafely('win', 'success');
    } else {
      playSoundSafely('wrong', 'error');
    }

    // ALWAYS show congrats screen for all modes (same behavior)
    const timer = setTimeout(() => {
      setShowCongratsScreen(true);
      setAlreadyAnswered(true);
      animationTimersRef.current.delete(timer);
    }, 200);

    animationTimersRef.current.add(timer);
  }, [
    reduxIsSubmitted,
    submissionResult,
    localIsSubmitted,
    question,
    selectedAnswer,
    currentQuestion,
    dispatch,
    playSoundSafely,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach(timer => clearTimeout(timer));
      animationTimersRef.current.clear();
    };
  }, []);

  const state: TriviaEngineState = {
    selectedAnswer,
    localIsSubmitted,
    alreadyAnswered,
    showCorrectAnimation,
    showWrongAnimation,
    showConfetti,
    showCongratsScreen,
    previousAnswer,
    previousAnswerCorrect,
    apiCorrectAnswer,
    correctAnimationCompleted,
    wrongAnimationCompleted,
    confettiAnimationEndCalled,
    isAnswerCorrect, // Pass to CongratsScreen for explicit correct/incorrect display
  };

  const actions: TriviaEngineActions = {
    handleOptionSelect,
    handleSubmit,
    handleCorrectAnimationEnd,
    handleWrongAnimationEnd,
    handleConfettiAnimationEnd,
    setShowCongratsScreen,
    setAlreadyAnswered,
    setLocalIsSubmitted,
    setPreviousAnswer,
    setPreviousAnswerCorrect,
    setApiCorrectAnswer,
    setSelectedAnswer: setSelectedAnswerState,
    setShowCorrectAnimation,
    setShowWrongAnimation,
    setShowConfetti,
  };

  return {
    state,
    actions,
  };
};
