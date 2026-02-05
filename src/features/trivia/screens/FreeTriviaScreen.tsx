import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  ImageBackground,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useSoundEffects } from '../../../hooks/use-sound-effects';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useTrackScreenView, useAnalytics } from '../../../hooks/useAnalytics';
import CongratsScreen from './CongratsScreen';
import FreeModeCongratsScreen from './FreeModeCongratsScreen';
import FreeModeCompletionModal from './FreeModeCompletionModal';
import Confetti from '../../../components/modals/Trivia/Confetti';
import Tooltip from './Tooltip';
import GradientText from './GradientText';
import OptionButton from './OptionButton';
import { useEntranceAnimations } from '../../../hooks/Trivia/useAnimations';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import {
  setSelectedAnswer as setReduxSelectedAnswer,
  setIsSubmitted as setReduxIsSubmitted,
  setCurrentMode,
  fetchFreeModeQuestions,
} from '../../../store/triviaSlice';
import { useShop } from '../../../hooks/useReduxHooks';
import { AppDispatch } from '../../../store';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
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
import AdBanner from '../../../components/AdBanner';

// NEW HOOKS
import { useFreeModeData } from '../hooks/useFreeModeData';
import { useQuestionState } from '../hooks/useQuestionState';
import { useAnswerSubmission } from '../hooks/useAnswerSubmission';
import { useDerivedFreeModeState } from '../hooks/useDerivedAnswerState';
import { normalizeOptions } from '../utils/answerMapping';

const FreeTriviaScreen: React.FC = () => {
  // Analytics
  useTrackScreenView('FreeTriviaScreen');
  const { trackAction } = useAnalytics();
  useErrorHandler({ component: 'FreeTriviaScreen', category: 'TRIVIA' });

  // Theme & Navigation
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useDispatch<AppDispatch>();
  const selectedAnswer = useSelector((state: any) => state.trivia.selectedAnswer);
  const currentMode = useSelector((state: any) => state.trivia.currentMode);

  // 1. Data Fetching Hook
  const {
    questionData,
    isLoading: isDataLoading,
    isFetching,
    error: dataError,
    isCompleted,
    setManualNavigation,
    allQuestionsData,
    refetch,
    statusData,
    isManualNavigation,
  } = useFreeModeData();

  // Review Mode State
  const [isFreeModeReviewMode, setIsFreeModeReviewMode] = useState<boolean>(false);
  const [freeModeReviewIndex, setFreeModeReviewIndex] = useState<number>(0);
  const [showFreeModeCompletionModal, setShowFreeModeCompletionModal] = useState<boolean>(false);

  // Determine Current Question (Live or Review)
  const currentQuestionSource = useMemo(() => {
    if (isFreeModeReviewMode && allQuestionsData && allQuestionsData.length > 0) {
      const safeIndex = Math.min(Math.max(0, freeModeReviewIndex), allQuestionsData.length - 1);
      return allQuestionsData[safeIndex];
    }
    if (questionData) return questionData;
    if (allQuestionsData && allQuestionsData.length > 0) return allQuestionsData[0];
    return null;
  }, [isFreeModeReviewMode, freeModeReviewIndex, allQuestionsData, questionData]);

  const { uiQuestion: rawUiQuestion, questionId: rawQuestionId } = useQuestionState(currentQuestionSource);

  // CRITICAL: Persist the last valid question data to prevent UI clearing during background refetches
  // This is the primary cause of "flickering" marks - if the question briefly resets, local state clears.
  const lastQuestionRef = useRef<{ uiQuestion: any; questionId: any } | null>(null);
  const { uiQuestion: question, questionId } = useMemo(() => {
    if (rawUiQuestion && rawQuestionId) {
      lastQuestionRef.current = { uiQuestion: rawUiQuestion, questionId: rawQuestionId };
      return { uiQuestion: rawUiQuestion, questionId: rawQuestionId };
    }
    return lastQuestionRef.current || { uiQuestion: null, questionId: null };
  }, [rawUiQuestion, rawQuestionId]);

  const questionForDisplay = question;

  // Normalize options for answer mapping
  const normalizedOptions = useMemo(() => {
    if (!question?.options) return [];
    return question.options.map(opt => ({ id: opt.id, text: opt.text }));
  }, [question?.options]);

  // CRITICAL: Derive ALL answer state from RTK Query cache (no local state)
  const derivedState = useDerivedFreeModeState(
    currentQuestionSource,
    allQuestionsData,
    isFreeModeReviewMode,
    freeModeReviewIndex,
    normalizedOptions
  );

  // DEBUG: Log derived state to diagnose answer display issues
  useEffect(() => {
    console.log('🚨🚨🚨 [DERIVED STATE]', {
      isReviewMode: isFreeModeReviewMode,
      reviewIndex: freeModeReviewIndex,
      currentQuestionSource,
      currentQuestionHasSubmissionFields: {
        fill_in_answer: (currentQuestionSource as any)?.fill_in_answer,
        answered_at: (currentQuestionSource as any)?.answered_at,
        status: (currentQuestionSource as any)?.status,
        is_correct: (currentQuestionSource as any)?.is_correct,
      },
      derivedState: {
        selectedId: derivedState?.selectedId,
        correctId: derivedState?.correctId,
        isCorrect: derivedState?.isCorrect,
        isSubmitted: derivedState?.isSubmitted,
      },
      questionData: {
        fill_in_answer: (currentQuestionSource as any)?.fill_in_answer,
        correct_answer: (currentQuestionSource as any)?.correct_answer,
        is_correct: (currentQuestionSource as any)?.is_correct,
        answered_at: (currentQuestionSource as any)?.answered_at,
      },
    });
  }, [derivedState, isFreeModeReviewMode, freeModeReviewIndex, currentQuestionSource]);

  // DEBUG: Log fetch status and total response
  useEffect(() => {
    if (question && statusData && !statusData?.status?.is_completed) {
      console.log('🔥🔥🔥 [TRIVIA] Free mode not completed, fetching current question...');
    }
    if (questionData) {
      console.log('🔥🔥🔥 [TRIVIA] TOTAL RESPONSE:', JSON.stringify(questionData, null, 2));
    }
    if (question) {
      console.log('🔥🔥🔥 [TRIVIA] UI QUESTION (transformed):', JSON.stringify(question, null, 2));
    }
    console.log('🎯 [TRIVIA] All Questions Data:', allQuestionsData);
    console.log('🎯 [TRIVIA] isCompleted:', isCompleted);
  }, [question, questionData, statusData, allQuestionsData, isCompleted]);

  // 3. Answer Submission Hook
  const {
    submitAnswer,
    isSubmitting,
    isSubmitted: localIsSubmitted,
    isCorrect: localIsCorrect,
    selectedAnswer: localSelectedId,
    correctAnswer: hookCorrectAnswer,
  } = useAnswerSubmission({
    questionId: question?.questionId,
  });

  // UI State (only for modals and animations, NOT answer state)
  const [showCongratsScreen, setShowCongratsScreen] = useState<boolean>(false);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState<boolean>(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  // Refs for Animations
  const correctAnimationRef = useRef<LottieView>(null);
  const wrongAnimationRef = useRef<LottieView>(null);
  const isCorrectAnimationPlaying = useRef(false);
  const infoIconRef = useRef<any>(null);
  const questionTextOpacity = useRef(new Animated.Value(1)).current;
  const shownCongratsForRef = useRef<number | null>(null);

  // Consolidate Hooks with UI State - merge derived and local state with safety guards
  // We consider it transitioning if it's either loading OR fetching NEW data
  // But we DON'T consider it transitioning if we just submitted (keep results showing during refetch)
  // And we don't consider it transitioning in review mode (data is static from array)
  const isQuestionTransitioning = (isDataLoading || (isFetching && !localIsSubmitted)) && !isFreeModeReviewMode;
  const isAlreadyAnswered = derivedState.isSubmitted && !isQuestionTransitioning;

  // CRITICAL: Only show submission state if the data is NOT stale
  // This prevents marks from Question N showing on Question N+1 during loading
  const isSubmitted = (!isQuestionTransitioning && (localIsSubmitted || derivedState.isSubmitted));

  // CRITICAL: During review mode, ALWAYS prioritize derivedState (historical data)
  // This prevents selectedAnswer from Redux (current session) from overriding historical answers
  // Map localCorrectAnswer (string) to ID for option button matching
  const memoLocalCorrectId = useMemo(() => {
    if (!hookCorrectAnswer || !question?.options) return null;
    const found = question.options.find(
      opt => opt.text.trim().toLowerCase() === hookCorrectAnswer.trim().toLowerCase() ||
        opt.key === hookCorrectAnswer.toUpperCase()
    );
    return found ? found.id : null;
  }, [hookCorrectAnswer, question?.options]);

  const currentSelectedId = isFreeModeReviewMode
    ? derivedState.selectedId
    : (localSelectedId || derivedState.selectedId);

  const currentCorrectId = isFreeModeReviewMode
    ? derivedState.correctId
    : (memoLocalCorrectId || derivedState.correctId);

  const currentIsCorrect = isFreeModeReviewMode
    ? derivedState.isCorrect
    : (localIsCorrect !== null ? localIsCorrect : derivedState.isCorrect);

  const isLoading = isQuestionTransitioning;
  const error = typeof dataError === 'string' ? dataError : (dataError as any)?.message || null;

  // Computed Properties
  const totalGems = (allQuestionsData?.filter((q: any) => q.is_correct).length || 0) * 10;
  const currentProgress = statusData?.progress?.questions_answered || 0;
  const totalQuestions = statusData?.progress?.total_questions || 10;
  const modalStatus = useMemo(() => {
    const progress = (statusData as any)?.progress;
    if (!progress) return null;
    const correct = progress.correct_answers ?? progress.answered ?? 0;
    const total = progress.total_questions ?? progress.total ?? 0;
    const completed = Boolean(progress.completed);
    return { progress: { correct_answers: correct, total_questions: total, completed } };
  }, [statusData]);

  // Shop Gems
  const { userBalance, fetchUserGems: refreshGems } = useShop();
  const realGems = totalGems > 0 ? totalGems : userBalance?.gems || 0;

  // Sounds & Platform
  const { playCorrect, playWrong, playSound } = useSoundEffects();
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  useAndroidBackButton(() => {
    if (isFreeModeReviewMode) {
      setIsFreeModeReviewMode(false);
      return true;
    }
    return false;
  });

  // Animations Hook
  const { headerAnim, questionAnim, optionsAnim } = useEntranceAnimations(
    isFocused,
    question?.options || []
  );

  const infoButtonAnimation = useButtonAnimation();
  const option1Animation = useButtonAnimation();
  const option2Animation = useButtonAnimation();
  const option3Animation = useButtonAnimation();
  const option4Animation = useButtonAnimation();

  // Diagnostics: Log API response and derived state counts
  useEffect(() => {
    if (isFreeModeReviewMode) {
      console.log('🔍 [FREE MODE REVIEW] Current State:', {
        reviewIndex: freeModeReviewIndex,
        totalQuestions: questionsArray.length,
        hasQuestionData: !!questionData,
        hasAllQuestions: !!allQuestionsData,
        isSubmitted: derivedState.isSubmitted,
        selectedId: derivedState.selectedId,
        correctId: derivedState.correctId,
        isCorrect: derivedState.isCorrect,
      });
    }
  }, [isFreeModeReviewMode, freeModeReviewIndex, questionsArray.length, derivedState]);

  // --- HANDLERS ---
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (isSubmitted || isFreeModeReviewMode) return;
      triggerHaptic('selection');
      // CRITICAL: Set selected answer in Redux immediately for UI feedback
      dispatch(setReduxSelectedAnswer(optionId));
      // Manual mode: DO NOT trigger submission automatically
      // handleSubmit(optionId);
    },
    [isSubmitted, isFreeModeReviewMode, triggerHaptic, question, dispatch]
  );

  const handleSubmit = useCallback(
    async (answerId?: string) => {
      // Valid answer = explicit arg OR selectedAnswer from Redux
      const answerToProcess = answerId || selectedAnswer;

      if (!answerToProcess || isSubmitted || !question) return;

      triggerHaptic('impactLight');
      await submitAnswer(answerToProcess, question.questionId);
    },
    [isSubmitted, question, submitAnswer, triggerHaptic, selectedAnswer]
  );

  // Effects for Animations based on submission result
  const submissionResultRef = useRef<{ isCorrect: boolean; questionId: number } | null>(null);

  useEffect(() => {
    // Trigger animations only for newly submitted answers (not already answered questions)
    if (
      isSubmitted &&
      derivedState.isCorrect !== null &&
      !isFreeModeReviewMode &&
      !isAlreadyAnswered
    ) {
      const currentQuestionId = questionId || 0;

      // Check if this is a new submission (prevent animation on reopen)
      if (
        !submissionResultRef.current ||
        submissionResultRef.current.questionId !== currentQuestionId
      ) {
        submissionResultRef.current = {
          isCorrect: derivedState.isCorrect,
          questionId: currentQuestionId,
        };

        if (derivedState.isCorrect) {
          setShowCorrectAnimation(true);
          playCorrect();
        } else {
          setShowWrongAnimation(true);
          playWrong();
        }
        refreshGems();
      }
    }
  }, [
    isSubmitted,
    derivedState.isCorrect,
    questionId,
    isFreeModeReviewMode,
    isAlreadyAnswered,
    playCorrect,
    playWrong,
    refreshGems,
  ]);

  // Show completion modal immediately on screen entry when already completed
  useEffect(() => {
    console.log('🎯 [FreeTriviaScreen] Completion check:', {
      isCompleted,
      allQuestionsCount: allQuestionsData?.length,
      isFocused,
      showFreeModeCompletionModal,
      statusData,
      progressCompleted: (statusData as any)?.progress?.completed,
    });

    // Don't show if screen not focused
    if (!isFocused) return;

    // Check completion status from multiple sources
    const progressCompleted = (statusData as any)?.progress?.completed === true;
    const isActuallyCompleted = isCompleted || progressCompleted;

    if (!isActuallyCompleted) {
      console.log('🟡 [FreeTriviaScreen] Not completed yet');
      return;
    }

    // If we have questions, show the modal immediately
    if (allQuestionsData && allQuestionsData.length > 0) {
      console.log('✅ [FreeTriviaScreen] SHOWING COMPLETION MODAL - Questions available');
      setShowFreeModeCompletionModal(true);
      if (!isFreeModeReviewMode) {
        setIsFreeModeReviewMode(false);
        setFreeModeReviewIndex(0);
      }
    } else {
      // Fetch questions if we don't have them yet
      console.log('⚠️ [FreeTriviaScreen] Completed but no questions data, fetching...');
      dispatch(fetchFreeModeQuestions());
    }
  }, [isCompleted, allQuestionsData, dispatch, isFocused, statusData, showFreeModeCompletionModal]);

  // CRITICAL: Show modal when questions are loaded after completion check
  useEffect(() => {
    if (!isFocused) return;
    if (showFreeModeCompletionModal) return; // Already showing

    const progressCompleted = (statusData as any)?.progress?.completed === true;
    const isActuallyCompleted = isCompleted || progressCompleted;

    if (isActuallyCompleted && allQuestionsData && allQuestionsData.length > 0) {
      console.log('✅ [FreeTriviaScreen] Questions loaded after completion, showing modal');
      setShowFreeModeCompletionModal(true);
      if (!isFreeModeReviewMode) {
        setIsFreeModeReviewMode(false);
        setFreeModeReviewIndex(0);
      }
    }
  }, [allQuestionsData, isCompleted, statusData, isFocused, showFreeModeCompletionModal]);

  // CRITICAL: Automatically show results modal for already answered questions
  // This handles initial load and after-animation display
  // Suppressed during review mode (arrow navigation)
  useEffect(() => {
    if (!isFocused) {
      shownCongratsForRef.current = null;
      return;
    }

    if (
      isSubmitted &&
      !isFreeModeReviewMode &&
      shownCongratsForRef.current !== questionId &&
      !showCorrectAnimation &&
      !showWrongAnimation &&
      !showConfetti &&
      !showFreeModeCompletionModal
    ) {
      setShowCongratsScreen(true);
      shownCongratsForRef.current = questionId;
    }
  }, [
    isSubmitted,
    isFocused,
    isFreeModeReviewMode,
    questionId,
    showCorrectAnimation,
    showWrongAnimation,
    showConfetti,
    showFreeModeCompletionModal,
  ]);

  const handleCorrectAnimationEnd = useCallback(() => {
    setShowCorrectAnimation(false);
    setShowConfetti(true);
  }, []);

  const handleWrongAnimationEnd = useCallback(() => {
    setShowWrongAnimation(false);
  }, []);

  const handleConfettiAnimationEnd = useCallback(() => {
    setShowConfetti(false);
    if (isCompleted) {
      setShowFreeModeCompletionModal(true);
    }
  }, [isCompleted]);

  const handleFreeModeCompletionClose = useCallback(() => {
    setShowFreeModeCompletionModal(false);
    setIsFreeModeReviewMode(true);
    setFreeModeReviewIndex(0);
  }, []);

  const handleNavigateToPrevQuestion = useCallback(() => {
    const total = allQuestionsData?.length || 0;
    if (total <= 0) return;

    const getCurrentIndex = () => {
      if (isFreeModeReviewMode) return freeModeReviewIndex % total;
      const currentId = (currentQuestionSource as any)?.question_id;
      const idx = allQuestionsData?.findIndex(q => q.question_id === currentId) ?? -1;
      return idx >= 0 ? idx : 0;
    };

    const currentIndex = getCurrentIndex();
    const nextIndex = (currentIndex - 1 + total) % total;

    setManualNavigation(true);
    setShowCongratsScreen(false);
    setIsFreeModeReviewMode(true);
    setFreeModeReviewIndex(nextIndex);
    triggerHaptic('selection');
  }, [
    isFreeModeReviewMode,
    allQuestionsData,
    freeModeReviewIndex,
    currentQuestionSource,
    setManualNavigation,
    triggerHaptic,
  ]);

  const handleNavigateToNextQuestion = useCallback(() => {
    const total = allQuestionsData?.length || 0;
    if (total <= 0) return;

    const getCurrentIndex = () => {
      if (isFreeModeReviewMode) return freeModeReviewIndex % total;
      const currentId = (currentQuestionSource as any)?.question_id;
      const idx = allQuestionsData?.findIndex(q => q.question_id === currentId) ?? -1;
      return idx >= 0 ? idx : 0;
    };

    const currentIndex = getCurrentIndex();
    const nextIndex = (currentIndex + 1) % total;

    setManualNavigation(true);
    setShowCongratsScreen(false);
    setIsFreeModeReviewMode(true);
    setFreeModeReviewIndex(nextIndex);
    triggerHaptic('selection');
  }, [
    isFreeModeReviewMode,
    allQuestionsData,
    freeModeReviewIndex,
    currentQuestionSource,
    setManualNavigation,
    triggerHaptic,
  ]);

  const handleCongratsClose = () => setShowCongratsScreen(false);
  const handleInfoPress = () => setShowInfoTooltip(prev => !prev);

  if (!question && error && !isDataLoading) {
    const displayError = error.includes('completion') ? "You've completed all questions!" : error;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#1e90ff',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Icon name="alert-circle-outline" size={64} color="white" />
        <Text style={{ color: 'white', fontSize: 18, marginTop: 20, textAlign: 'center' }}>
          {displayError}
        </Text>
        <TouchableOpacity
          onPress={() => dispatch(setCurrentMode('free'))}
          style={{ marginTop: 20, backgroundColor: 'white', padding: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#1e90ff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const options = question?.options || [];

  return (
    <ScreenErrorBoundary screenName="TriviaScreen">
      <ScreenBackButtonHandler action="navigate" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <LinearGradient
          colors={['#1e90ff', '#0a6fc2', '#1e90ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <SafeScreenWrapper
            statusBarStyle="light-content"
            backgroundColor="transparent"
            edges={['top', 'left', 'right']}
            showStatusBar={false}
          >
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.headerContainer}>
                <View style={styles.gemContainer}>
                  <ImageBackground
                    source={require('../../../../assets/gemBg.png')}
                    style={styles.gemBackground}
                    resizeMode="contain"
                  >
                    <Text style={styles.gemText}>{realGems.toLocaleString()}</Text>
                  </ImageBackground>
                </View>

                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Q {currentProgress + 1}/{totalQuestions}
                  </Text>
                </View>

                <Animated.View style={infoButtonAnimation.animatedStyle}>
                  <SoundTouchableOpacity onPress={handleInfoPress} style={styles.infoButton}>
                    <ImageBackground
                      source={require('../../../../assets/trivia/infoIcon.png')}
                      style={styles.infoIcon}
                      resizeMode="contain"
                    />
                  </SoundTouchableOpacity>
                </Animated.View>
              </View>

              {/* Loading Content */}
              {isLoading && (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LottieView
                    source={require('../../../../assets/signup/DogParachute.json')}
                    autoPlay
                    loop
                    style={{ width: scaleSize(120), height: scaleSize(120) }}
                  />
                </View>
              )}
              {!isLoading && question && (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleSize(20) }}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.contentContainer}>
                    <View style={styles.questionContainer}>
                      <Animated.View
                        style={[{ transform: [{ translateX: headerAnim }] }, styles.titleContainer]}
                      >
                        <GradientText text="Trivia Challenge" />
                      </Animated.View>

                      <Animated.View
                        style={[{ transform: [{ translateX: questionAnim }] }, styles.cardContainer]}
                      >
                        <ImageBackground
                          source={require('../../../../assets/trivia/questionCard.png')}
                          style={styles.cardImageBackground}
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
                                width: scaleSize(60),
                                height: scaleSize(60),
                                top: 0,
                                right: 0,
                                zIndex: 10,
                              }}
                              resizeMode="contain"
                            />
                          )}
                          <View style={styles.cardTextContainer}>
                            <Animated.Text
                              style={[
                                typography.h4,
                                styles.questionText,
                                { opacity: questionTextOpacity },
                              ]}
                              numberOfLines={5}
                              adjustsFontSizeToFit
                            >
                              {question?.text || ''}
                            </Animated.Text>
                          </View>
                        </ImageBackground>
                      </Animated.View>

                      {/* Options */}
                      <View style={styles.optionsContainer}>
                        {options.map((option, index) => {
                          let anim = option1Animation;
                          if (index === 1) anim = option2Animation;
                          if (index === 2) anim = option3Animation;
                          if (index === 3) anim = option4Animation;

                          return (
                            <Animated.View
                              key={option.id}
                              style={[
                                {
                                  transform: [
                                    { translateX: optionsAnim[index] || new Animated.Value(0) },
                                  ],
                                },
                                styles.optionWrapper,
                              ]}
                            >
                              <Animated.View style={anim.animatedStyle}>
                                <OptionButton
                                  option={option}
                                  optionIndex={index}
                                  isSelected={currentSelectedId === option.id}
                                  isSubmitted={isSubmitted}
                                  correctAnswer={currentCorrectId || ''}
                                  onPress={() => handleOptionSelect(option.id)}
                                  hasAnySelection={currentSelectedId !== null}
                                  animatedStyle={anim.animatedStyle}
                                  onPressIn={anim.animatePress}
                                  onPressOut={anim.animateRelease}
                                  previousAnswer={currentSelectedId}
                                  previousAnswerCorrect={currentIsCorrect === true}
                                  alreadyAnswered={isAlreadyAnswered}
                                />
                              </Animated.View>
                            </Animated.View>
                          );
                        })}
                      </View>

                      {/* Manual Submit Button */}
                      {!isFreeModeReviewMode && !isSubmitted && !isAlreadyAnswered && (
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
                            <LinearGradient
                              colors={['#1e90ff', '#0a6fc2']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{
                                width: '100%',
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: 'white',
                                  fontSize: scaleSize(18),
                                  fontWeight: 'bold',
                                }}
                              >
                                SUBMIT ANSWER
                              </Text>
                            </LinearGradient>
                          </SoundTouchableOpacity>
                        </Animated.View>
                      )}

                      {/* Ad Banner removed from here to prevent layout shifts */}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </SafeScreenWrapper>
        </LinearGradient>

        <SafeScreenWrapper
          edges={['bottom']}
          backgroundColor="#000" // Solid background for footer
          style={{ backgroundColor: '#000' }}
        >
          {/* Footer Section: Navigation & Ad - Hidden when congrats screen is visible */}
          {/* Constant Ad in footer - doesn't move during question transitions */}
          {!showCongratsScreen && (
            <View style={{ width: '100%', alignItems: 'center', backgroundColor: '#000', paddingTop: scaleSize(8) }}>
              <AdBanner />
            </View>
          )}

          {!showCongratsScreen && !showCorrectAnimation && !showWrongAnimation && (
            <View style={{ backgroundColor: '#000' }}>
              {!isLoading && question && (
                <View style={styles.navigationContainer}>
                  <SoundTouchableOpacity
                    onPress={handleNavigateToPrevQuestion}
                    style={styles.navButton}
                    disabled={!isFreeModeReviewMode && !derivedState.isSubmitted}
                  >
                    <Icon
                      name="chevron-left"
                      size={scaleSize(32)}
                      color="white"
                      style={{
                        opacity: !isFreeModeReviewMode && !derivedState.isSubmitted ? 0.3 : 1,
                      }}
                    />
                  </SoundTouchableOpacity>
                  <Text style={styles.navText}>
                    {isFreeModeReviewMode
                      ? `Review ${freeModeReviewIndex + 1}/${allQuestionsData?.length || 0}`
                      : 'Next Question'}
                  </Text>
                  <SoundTouchableOpacity
                    onPress={handleNavigateToNextQuestion}
                    style={styles.navButton}
                    disabled={!derivedState.isSubmitted}
                  >
                    <Icon
                      name="chevron-right"
                      size={scaleSize(32)}
                      color="white"
                      style={{ opacity: !derivedState.isSubmitted ? 0.3 : 1 }}
                    />
                  </SoundTouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SafeScreenWrapper>

        {/* Global Overlays */}
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
              zIndex: 150,
              elevation: 150,
            }}
          >
            <LottieView
              ref={correctAnimationRef}
              source={require('../../../../assets/trivia/Correct Animation.json')}
              autoPlay={true}
              loop={false}
              style={{ width: scaleSize(300), height: scaleSize(300) }}
              onAnimationFinish={handleCorrectAnimationEnd}
            />
          </View>
        )}

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
              zIndex: 150,
              elevation: 150,
            }}
          >
            <LottieView
              ref={wrongAnimationRef}
              source={require('../../../../assets/trivia/Wrong answer.json')}
              autoPlay={true}
              loop={false}
              style={{ width: scaleSize(300), height: scaleSize(300) }}
              onAnimationFinish={handleWrongAnimationEnd}
            />
          </View>
        )}

        <Tooltip
          isVisible={showInfoTooltip}
          onClose={handleInfoPress}
          anchorPosition={tooltipAnchor}
        />
        <Confetti isVisible={showConfetti} onAnimationEnd={handleConfettiAnimationEnd} />

        <FreeModeCompletionModal
          visible={showFreeModeCompletionModal}
          status={modalStatus}
          questions={allQuestionsData}
          onClose={handleFreeModeCompletionClose}
        />

        <CongratsScreen
          visible={showCongratsScreen}
          onClose={handleCongratsClose}
          selectedAnswer={currentSelectedId || ''}
          correctAnswer={currentCorrectId || ''}
          isCorrect={currentIsCorrect}
          question={questionForDisplay as any}
          alreadyAnswered={isAlreadyAnswered}
          extraChanceCost={0}
          userGems={realGems}
          correctAnswersCount={modalStatus?.progress?.correct_answers}
        />
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: scaleSize(5),
    marginHorizontal: scaleSize(4),
  },
  cardImageBackground: {
    alignSelf: 'center',
    aspectRatio: 320 / 300,
    justifyContent: 'center',
    maxWidth: scaleSize(320),
    width: '100%',
  },
  cardTextContainer: {
    alignItems: 'center',
    bottom: '25%',
    justifyContent: 'center',
    left: '18%',
    position: 'absolute',
    right: '15%',
    top: '25%',
  },
  contentContainer: {
    flex: 1,
  },
  gemBackground: {
    alignItems: 'center',
    height: scaleSize(45),
    justifyContent: 'center',
    width: scaleSize(105),
  },
  gemContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: scaleSize(6),
  },
  gemText: {
    color: '#000',
    fontSize: scaleSize(14),
    fontWeight: 'bold',
  },
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleSize(6),
    paddingHorizontal: scaleSize(10),
  },
  infoButton: {
    alignItems: 'center',
    height: scaleSize(48),
    justifyContent: 'center',
    width: scaleSize(48),
  },
  infoIcon: {
    height: scaleSize(34),
    width: scaleSize(34),
  },
  navButton: {
    padding: 10,
  },
  navText: {
    color: 'white',
    fontSize: scaleSize(14),
    fontWeight: '600',
    marginHorizontal: scaleSize(20),
  },
  navigationContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: scaleSize(8),
  },
  optionWrapper: {
    alignItems: 'center',
    marginBottom: scaleSize(4),
    width: '100%',
  },
  optionsContainer: {
    alignItems: 'center',
    marginTop: scaleSize(-100), // Moved up from -80
    padding: scaleSize(10), // Maintain original overlap for now, but via StyleSheet
  },
  progressContainer: {
    alignItems: 'center',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scaleSize(14),
    fontWeight: '600',
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  questionText: {
    color: 'white',
    fontSize: scaleSize(18),
    textAlign: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
});

export default FreeTriviaScreen;
