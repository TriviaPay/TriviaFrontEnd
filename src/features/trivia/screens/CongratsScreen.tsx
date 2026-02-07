/**
 * CongratsScreen - TypeScript Implementation
 * Professional congrats screen component with comprehensive features
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Platform, Image, Animated, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useTheme } from '../../../hooks/useReduxHooks';
import LottieView from 'lottie-react-native';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { scaleSize } from '../../../utils/scaleSize';
import { RootState } from '../../store';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';

interface Option {
  id: string;
  text: string;
}

interface Question {
  options: Option[];
}

interface CongratsScreenProps {
  visible: boolean;
  onClose: () => void;
  selectedAnswer: string;
  correctAnswer: string;
  question: Question;
  alreadyAnswered: boolean;
  onExtraChance?: () => void;
  extraChanceCost?: number;
  userGems?: number;
  freeModeStatus?: {
    progress?: {
      questions_answered?: number;
      correct_answers?: number;
      total_questions?: number;
      completed?: boolean;
    };
  };
  correctAnswersCount?: number;
  isCorrect?: boolean; // Explicit override for result status
}

const CongratsScreen: React.FC<CongratsScreenProps> = ({
  visible,
  onClose,
  selectedAnswer,
  correctAnswer,
  question,
  alreadyAnswered,
  onExtraChance,
  extraChanceCost = 150,
  userGems = 0,
  freeModeStatus,
  correctAnswersCount,
  isCorrect: explicitIsCorrect,
}) => {
  // Use responsive dimensions hook instead of hardcoded Dimensions.get()
  const { width, height } = useStandardResponsive();
  const { isDarkMode, colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);
  const closeButtonAnimation = useButtonAnimation();

  // Get submission result from Redux for explanation and daily_completed
  const submissionResult = useSelector((state: RootState) => state.trivia.submissionResult);
  const questionStatus = useSelector((state: RootState) => state.trivia.questionStatus);
  const apiQuestion = useSelector((state: RootState) => state.trivia.currentQuestion);
  const dailyCompleted = useSelector((state: RootState) => state.trivia.dailyCompleted);
  const currentMode = useSelector((state: RootState) => state.trivia.currentMode);
  const reduxIsCorrect = useSelector((state: RootState) => state.trivia.isCorrect); // Fallback: use Redux isCorrect if submissionResult not available
  // Also check current question's is_correct (set by Redux thunk after submission)
  const currentSilverModeQuestion = useSelector(
    (state: RootState) => state.trivia.currentSilverModeQuestion
  );
  const currentBronzeModeQuestion = useSelector(
    (state: RootState) => state.trivia.currentBronzeModeQuestion
  );
  const currentFreeModeQuestion = useSelector(
    (state: RootState) => state.trivia.currentFreeModeQuestion
  );

  // All modes (free/bronze/silver) use the same UI flow
  const isNewMode = true; // Always true - all modes use simplified flow

  // Get is_correct from API response, fallback to comparing answers (case-insensitive)
  // Priority depends on whether this is already-answered or current session:
  // - Already answered: questionStatus > apiQuestion > direct comparison (SKIP submissionResult - it's stale!)
  // - Current session: submissionResult > questionStatus > apiQuestion > direct comparison
  // CRITICAL: Calculate isCorrect BEFORE any useEffect that uses it to avoid hooks order issues
  const submissionIsCorrect = submissionResult?.is_correct;
  const statusIsCorrect = questionStatus?.is_correct;
  const apiQuestionIsCorrect = apiQuestion?.is_correct;
  const directComparison = selectedAnswer?.toLowerCase() === correctAnswer?.toLowerCase();

  // Determine isCorrect with clear priority
  // CRITICAL: Always prioritize submissionResult if available (it's the freshest data from current submission)
  // Priority: submissionResult > questionStatus > apiQuestion
  // DO NOT use directComparison - API response is the ONLY source of truth
  // Handle string "true"/"false" and boolean values
  const normalizeBoolean = (value: any): boolean | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  };

  // Get is_correct from current question (most reliable - set directly by Redux thunk)
  const currentQuestionIsCorrect =
    currentMode === 'silver'
      ? currentSilverModeQuestion?.is_correct
      : currentMode === 'bronze'
        ? currentBronzeModeQuestion?.is_correct
        : currentMode === 'free'
          ? currentFreeModeQuestion?.is_correct
          : null;

  // LOGIC OVERRIDE: Check if backend is lying (e.g. is_correct: false, but fill_in_answer matches correct_answer)
  // This handles the "Diwali" vs "Christmas" database error on the client side
  const calculateDerivedCorrectness = (): boolean | null => {
    // Only apply for Bronze/Silver/Free modes where we have detailed question data
    const q = currentMode === 'silver'
      ? currentSilverModeQuestion
      : currentMode === 'bronze'
        ? currentBronzeModeQuestion
        : currentMode === 'free'
          ? currentFreeModeQuestion
          : null;

    if (!q) return null;

    const userAnswer = q.fill_in_answer || (q as any).user_answer || selectedAnswer;
    const correctAnswer = q.correct_answer || (q as any).correct_answer || correctAnswerProp;

    if (userAnswer && correctAnswer) {
      const userString = String(userAnswer).trim().toLowerCase();
      const correctString = String(correctAnswer).trim().toLowerCase();

      // 1. Direct match
      if (userString === correctString) return true;

      // 2. ID match (if user answers "a" and correct is "a")
      if (userString.length === 1 && userString === correctString) return true;

      // 3. Resolve IDs to text for comparison (Ultra Robust)
      const optionsArray = (q as any).options || question?.options;
      if (optionsArray && Array.isArray(optionsArray)) {
        const userText = optionsArray.find((opt: any) => opt.id?.toLowerCase() === userString || opt.text?.toLowerCase() === userString)?.text?.toLowerCase()?.trim();
        const correctText = optionsArray.find((opt: any) => opt.id?.toLowerCase() === correctString || opt.text?.toLowerCase() === correctString)?.text?.toLowerCase()?.trim();

        if (userText && correctText && userText === correctText) return true;
        if (userText && userText === correctString) return true;
        if (correctText && correctText === userString) return true;
      }
    }
    return null;
  };

  // CRITICAL: Sticky correctness to prevent flipping back to false after a background update
  const stickyCorrectnessRef = useRef<Record<string, boolean>>({});
  const currentQuestionId = question?.id || currentFreeModeQuestion?.id || currentBronzeModeQuestion?.id || currentSilverModeQuestion?.id || 'unknown';

  // Determine isCorrect with priority: sticky correct > explicit prop > submissionResult > currentQuestion > Redux fallback > API status
  let isCorrect: boolean;

  if (explicitIsCorrect !== undefined && explicitIsCorrect !== null) {
    isCorrect = explicitIsCorrect;
    console.log('🟢 [CONGRATS SCREEN] Using explicit isCorrect prop:', isCorrect);
  } else {
    // Check derived correctness first
    const derived = calculateDerivedCorrectness();
    if (derived === true) {
      isCorrect = true;
      stickyCorrectnessRef.current[currentQuestionId] = true;
      console.log('✨ [CONGRATS SCREEN] Using LOGIC OVERRIDE for correctness (STICKY):', isCorrect);
    } else if (stickyCorrectnessRef.current[currentQuestionId]) {
      isCorrect = true;
      console.log('🎯 [CONGRATS SCREEN] Using sticky correctness (Already marked correct):', isCorrect);
    } else if (derived === false) {
      isCorrect = false;
      console.log('✨ [CONGRATS SCREEN] Using LOGIC OVERRIDE for correctness:', isCorrect);
    } else if (submissionResult && submissionIsCorrect !== null && submissionIsCorrect !== undefined) {
      const normalized = normalizeBoolean(submissionIsCorrect);
      if (normalized !== null) {
        isCorrect = normalized;
        if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
        console.log('🟢 [CONGRATS SCREEN] Using submissionResult.is_correct:', isCorrect);
      } else if (currentQuestionIsCorrect !== null && currentQuestionIsCorrect !== undefined) {
        isCorrect = normalizeBoolean(currentQuestionIsCorrect) ?? false;
        if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
        console.log('🟢 [CONGRATS SCREEN] Using currentQuestion.is_correct fallback:', isCorrect);
      } else {
        isCorrect = false;
      }
    } else if (currentQuestionIsCorrect !== null && currentQuestionIsCorrect !== undefined) {
      isCorrect = normalizeBoolean(currentQuestionIsCorrect) ?? false;
      if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
      console.log('🟢 [CONGRATS SCREEN] Using currentQuestionIsCorrect:', isCorrect);
    } else if (reduxIsCorrect !== null && reduxIsCorrect !== undefined) {
      // FALLBACK 2: Use Redux isCorrect state (set by submitSilverModeAnswer.fulfilled)
      const normalized = normalizeBoolean(reduxIsCorrect);
      if (normalized !== null) {
        isCorrect = normalized;
        if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
        console.log('🟡 [CONGRATS SCREEN] Using Redux isCorrect (fallback):', isCorrect);
      } else {
        isCorrect = false;
      }
    } else if (statusIsCorrect !== null && statusIsCorrect !== undefined) {
      const normalized = normalizeBoolean(statusIsCorrect);
      if (normalized !== null) {
        isCorrect = normalized;
        if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
        console.log('🟡 [CONGRATS SCREEN] Using questionStatus.is_correct:', isCorrect);
      } else {
        isCorrect = false;
      }
    } else if (apiQuestionIsCorrect !== null && apiQuestionIsCorrect !== undefined) {
      const normalized = normalizeBoolean(apiQuestionIsCorrect);
      if (normalized !== null) {
        isCorrect = normalized;
        if (isCorrect) stickyCorrectnessRef.current[currentQuestionId] = true;
        console.log('🟡 [CONGRATS SCREEN] Using apiQuestion.is_correct:', isCorrect);
      } else {
        isCorrect = false;
      }
    } else {
      isCorrect = false;
      console.log('🔴 [CONGRATS SCREEN] No API response available, defaulting to false');
    }
  }

  // Prize pool state - fetch from API
  const [prizePool, setPrizePool] = React.useState<number>(0);
  const [loadingPrizePool, setLoadingPrizePool] = React.useState(true);

  // Fetch prize pool data when modal is visible
  React.useEffect(() => {
    if (visible && isCorrect) {
      const fetchPrizePool = async () => {
        try {
          console.log('🔵 [CONGRATS SCREEN] Fetching prize pool...');
          // Import apiService dynamically to avoid circular deps
          const { apiService } = await import('../../../services/apiService');
          const response = await apiService.getNextDraw();
          if (response.success && response.data) {
            const pool = (response.data as any).prize_pool || 0;
            console.log('🟢 [CONGRATS SCREEN] Prize pool loaded:', pool);
            setPrizePool(pool);
          }
        } catch (error) {
          console.error('🔴 [CONGRATS SCREEN] Failed to load prize pool:', error);
        } finally {
          setLoadingPrizePool(false);
        }
      };
      fetchPrizePool();
    }
  }, [visible, isCorrect]);
  // Get explanation from API response
  const explanation = submissionResult?.explanation || questionStatus?.explanation || '';
  const isDailyCompleted =
    submissionResult?.daily_completed ?? questionStatus?.daily_completed ?? dailyCompleted ?? false;

  // AGGRESSIVE Debug logging - CRITICAL for debugging PNG display

  // OLD CODE: Simple useEffect like old code
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.play();
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getSelectedOptionText = (): string => {
    // 1. Try resolving via question options using selectedAnswer (ID check)
    if (question?.options && selectedAnswer) {
      const answerLower = selectedAnswer.toLowerCase().trim();
      const option = question.options.find(
        opt => opt.id?.toLowerCase() === answerLower
      );
      if (option?.text) return option.text;
    }

    // 2. Fallback to API/Redux provided answer string
    const currentQuestionAnswer =
      currentMode === 'silver'
        ? currentSilverModeQuestion?.fill_in_answer || currentSilverModeQuestion?.user_answer
        : currentMode === 'bronze'
          ? currentBronzeModeQuestion?.fill_in_answer || currentBronzeModeQuestion?.user_answer
          : currentMode === 'free'
            ? currentFreeModeQuestion?.fill_in_answer || currentFreeModeQuestion?.user_answer
            : null;

    const apiUserAnswer = apiQuestion?.user_answer || (apiQuestion as any)?.fill_in_answer;
    const finalAnswer = currentQuestionAnswer || apiUserAnswer || selectedAnswer;

    if (finalAnswer) {
      const answerString = String(finalAnswer).toLowerCase().trim();

      // Try finding in options by ID or Text match
      if (question?.options) {
        const option = question.options.find(
          opt => opt.id?.toLowerCase() === answerString || opt.text?.toLowerCase() === answerString
        );
        if (option?.text) return option.text;
      }

      // If it looks like an ID (a,b,c,d), and we couldn't find it in options, just uppercase it
      if (['a', 'b', 'c', 'd'].includes(answerString)) {
        return answerString.toUpperCase();
      }

      // Otherwise return the text itself as it might be a direct answer string
      return String(finalAnswer);
    }

    return null; // Return null instead of Unknown to allow UI to hide it
  };

  const getCorrectOptionText = (): string => {
    // 1. Try resolving via question options using correctAnswer (ID check)
    if (question?.options && correctAnswer) {
      const answerLower = correctAnswer.toLowerCase().trim();
      const option = question.options.find(
        opt => opt.id?.toLowerCase() === answerLower
      );
      if (option?.text) return option.text;
    }

    // 2. Fallback to API/Redux provided answer string
    const currentQuestionCorrect =
      currentMode === 'silver'
        ? currentSilverModeQuestion?.correct_answer
        : currentMode === 'bronze'
          ? currentBronzeModeQuestion?.correct_answer
          : currentMode === 'free'
            ? currentFreeModeQuestion?.correct_answer
            : null;

    const apiCorrectAnswer = apiQuestion?.correct_answer;
    const finalCorrect = currentQuestionCorrect || apiCorrectAnswer || correctAnswer;

    if (finalCorrect) {
      const answerString = String(finalCorrect).toLowerCase().trim();

      // Try finding in options by ID or Text match
      if (question?.options) {
        const option = question.options.find(
          opt => opt.id?.toLowerCase() === answerString || opt.text?.toLowerCase() === answerString
        );
        if (option?.text) return option.text;
      }

      // If it looks like an ID (a,b,c,d), and we couldn't find it in options, just uppercase it
      if (['a', 'b', 'c', 'd'].includes(answerString)) {
        return answerString.toUpperCase();
      }

      // Otherwise return the text itself
      return String(finalCorrect);
    }

    return null; // Return null instead of Unknown to allow UI to hide it
  };

  if (!visible) return null;

  return (
    <SafeScreenWrapper
      backgroundColor="transparent"
      showStatusBar={false}
      edges={[]}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        elevation: 100,
      }}
    >
      {/* Backdrop - tappable to close - No opacity, opacity handled by parent TriviaScreen */}
      <SoundTouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          zIndex: 1, // Same as old code - backdrop at z-index 1
          elevation: 1, // Android elevation
        }}
        activeOpacity={1}
        onPress={onClose}
      />

      <View
        style={{
          width: scaleSize(340),
          height: scaleSize(340),
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2, // Same as old code - card at z-index 2
          elevation: 2, // Android elevation
        }}
        pointerEvents="box-none"
      >
        {/* Display correct or incorrect PNG based on answer */}
        {isCorrect ? (
          <Image
            source={
              currentMode === 'free'
                ? correctAnswersCount === 1
                  ? require('../../../../assets/trivia/correct-1.png')
                  : correctAnswersCount === 2
                    ? require('../../../../assets/trivia/correct-2.png')
                    : correctAnswersCount === 3
                      ? require('../../../../assets/trivia/correct-3.png')
                      : require('../../../../assets/trivia/correct.png')
                : require('../../../../assets/trivia/correct.png')
            }
            style={{
              position: 'absolute',
              width: scaleSize(380),
              height: scaleSize(380),
              top: scaleSize(-20),
              left: scaleSize(-20),
              zIndex: -1,
            }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require('../../../../assets/trivia/inCorrect.png')}
            style={{
              position: 'absolute',
              width: scaleSize(380),
              height: scaleSize(380),
              top: scaleSize(-20),
              left: scaleSize(-20),
              zIndex: -1,
            }}
            resizeMode="contain"
          />
        )}

        {/* X Close Icon at the very top-right corner of the card */}
        <Animated.View
          style={[
            closeButtonAnimation.animatedStyle,
            {
              position: 'absolute',
              top: scaleSize(62),
              right: scaleSize(6), // Moved 4px to the right (12 - 4 = 8)
              zIndex: 20,
            },
          ]}
        >
          <SoundTouchableOpacity
            onPress={onClose}
            onPressIn={closeButtonAnimation.animatePress}
            onPressOut={closeButtonAnimation.animateRelease}
            style={{
              borderRadius: scaleSize(16),
              padding: scaleSize(6),
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 5,
            }}
            activeOpacity={1}
          >
            <Image
              source={require('../../../../assets/closeIcon.png')}
              style={{
                width: scaleSize(34),
                height: scaleSize(34),
              }}
              resizeMode="contain"
            />
          </SoundTouchableOpacity>
        </Animated.View>

        {/* Main content inside the card - OLD CODE: Clean and simple */}
        <View
          style={{
            width: '60%',
            height: '80%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(8),
            paddingVertical: scaleSize(12),
            top: scaleSize(30), // Moved up from 70
          }}
        >
          {alreadyAnswered && !isNewMode ? (
            <>
              <Text
                style={{
                  color: 'white',
                  textAlign: 'center',
                  fontWeight: Platform.OS === 'android' ? 'normal' : '700',
                  fontSize: scaleSize(20),
                  fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                  marginBottom: scaleSize(16),
                  top: scaleSize(14),
                }}
              >
                {isDailyCompleted || isCorrect
                  ? `Prize pool entry confirmed`
                  : `Challenge Completed`}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  fontWeight: Platform.OS === 'android' ? 'normal' : '500',
                  fontSize: scaleSize(14),
                  fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                  marginVertical: scaleSize(8),
                  top: scaleSize(8),
                }}
              >
                {isCorrect
                  ? `You have already answered correctly today.\nCome back tomorrow at 6pm EST.`
                  : `You answered incorrectly. Try again!`}
              </Text>
            </>
          ) : (
            <>
              {/* Entry Status Display - Display API response */}
              <View
                style={{ width: '100%', alignItems: 'center', paddingHorizontal: scaleSize(12), top: scaleSize(30) }}
              >
                {/* For new modes (free/bronze/silver), show simple message with level_info */}
                {isNewMode ? (
                  <>
                    {/* Free Mode Completion: Show score instead of Correct/Incorrect */}
                    {freeModeStatus?.progress &&
                      (freeModeStatus.progress.completed ||
                        freeModeStatus.progress.all_questions_answered) ? (
                      <>
                        <Text
                          style={{
                            color: 'white',
                            textAlign: 'center',
                            fontSize: scaleSize(24),
                            fontWeight: Platform.OS === 'android' ? 'normal' : '700',
                            fontFamily:
                              Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                            marginBottom: scaleSize(8),
                          }}
                        >
                          {freeModeStatus.progress.correct_answers || 0} /{' '}
                          {freeModeStatus.progress.total_questions || 0}
                        </Text>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            textAlign: 'center',
                            fontSize: scaleSize(16),
                            fontWeight: Platform.OS === 'android' ? 'normal' : '500',
                            fontFamily:
                              Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                            marginTop: scaleSize(8),
                            marginBottom: scaleSize(12),
                          }}
                        >
                          Come back tomorrow
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          style={{
                            color: 'white',
                            textAlign: 'center',
                            fontSize: scaleSize(24),
                            fontWeight: Platform.OS === 'android' ? 'normal' : '700',
                            fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                            marginBottom: scaleSize(4),
                          }}
                        >
                          {isCorrect ? 'Great Job!' : ''}
                        </Text>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            textAlign: 'center',
                            fontSize: scaleSize(18),
                            fontWeight: Platform.OS === 'android' ? 'normal' : '500',
                            fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                            marginBottom: scaleSize(12),
                          }}
                        >
                          {isCorrect ? 'You Answered Correctly!' : 'That was close! Try again.'}
                        </Text>
                      </>
                    )}

                    {/* Free Mode Completion: Don't show answer details, only score */}
                    {!(
                      freeModeStatus?.progress &&
                      (freeModeStatus.progress.completed ||
                        freeModeStatus.progress.all_questions_answered)
                    ) && (
                        <>
                          {/* Display level info if available */}
                          {submissionResult && (submissionResult as any).level_info && (
                            <View style={{ marginTop: scaleSize(8), alignItems: 'center' }}>
                              <Text
                                style={{
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  textAlign: 'center',
                                  fontSize: scaleSize(16),
                                  fontWeight: '600',
                                  marginBottom: scaleSize(6),
                                }}
                              >
                                Level {(submissionResult as any).level_info.new_level}
                              </Text>
                              <Text
                                style={{
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  textAlign: 'center',
                                  fontSize: scaleSize(14),
                                }}
                              >
                                Progress: {(submissionResult as any).level_info.progress.progress}
                              </Text>
                              <Text
                                style={{
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  textAlign: 'center',
                                  fontSize: scaleSize(12),
                                  marginTop: scaleSize(4),
                                }}
                              >
                                {
                                  (submissionResult as any).level_info
                                    .correct_answers_until_next_level
                                }{' '}
                                more correct to next level
                              </Text>
                            </View>
                          )}

                          {/* Conditional Answer Display - Simplified labels */}
                          {isCorrect ? (
                            <View style={{ marginTop: scaleSize(12), width: '100%', alignItems: 'center' }}>
                              <Text
                                style={{
                                  fontSize: scaleSize(20),
                                  textAlign: 'center',
                                  color: '#177038ff', // Green for correct
                                  fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                  fontWeight: 'bold',
                                }}
                              >
                                {getSelectedOptionText() || String(selectedAnswer || '')}
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={{ marginTop: scaleSize(12), width: '100%', alignItems: 'center' }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(4) }}>
                                <Text
                                  style={{
                                    fontSize: scaleSize(18),
                                    color: 'white',
                                    fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                  }}
                                >
                                  Your answer: {' '}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: scaleSize(18),
                                    color: '#EF4444', // Red for wrong
                                    fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {getSelectedOptionText() || String(selectedAnswer || '')}
                                </Text>
                              </View>
                              {getCorrectOptionText() && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text
                                    style={{
                                      fontSize: scaleSize(18),
                                      color: 'white',
                                      fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                    }}
                                  >
                                    Correct answer: {' '}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: scaleSize(18),
                                      color: '#177038ff', // Green for correct
                                      fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {getCorrectOptionText()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {explanation && (
                            <Text
                              style={{
                                fontSize: scaleSize(14),
                                textAlign: 'center',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontFamily:
                                  Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                                marginTop: scaleSize(12),
                              }}
                            >
                              {explanation}
                            </Text>
                          )}
                        </>
                      )}
                  </>
                ) : isCorrect ? (
                  <>
                    <View
                      style={{
                        borderRadius: scaleSize(16),
                        paddingVertical: scaleSize(12),
                        marginVertical: scaleSize(8),
                        width: '90%',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          textAlign: 'center',
                          top: scaleSize(14),
                          fontSize: scaleSize(18),
                          fontWeight: Platform.OS === 'android' ? 'normal' : '500',
                          fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                        }}
                      >
                        {isDailyCompleted ? `Prize pool entry confirmed` : 'Great job! Keep it up!'}
                      </Text>

                      {/* Display Prize Pool Amount */}
                      {isCorrect && !loadingPrizePool && prizePool > 0 && (
                        <View style={{ marginTop: scaleSize(12), alignItems: 'center' }}>
                          <Text
                            style={{
                              color: '#FFD700',
                              textAlign: 'center',
                              fontSize: scaleSize(16),
                              fontWeight: Platform.OS === 'android' ? 'bold' : '700',
                              fontFamily:
                                Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                            }}
                          >
                            Prize Pool: {prizePool.toLocaleString()} TC
                          </Text>
                        </View>
                      )}

                      {/* Loading indicator for prize pool */}
                      {isCorrect && loadingPrizePool && (
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            textAlign: 'center',
                            fontSize: scaleSize(14),
                            marginTop: scaleSize(8),
                          }}
                        >
                          Loading prize pool...
                        </Text>
                      )}
                    </View>
                    {explanation && (
                      <Text
                        style={{
                          fontSize: scaleSize(14),
                          top: scaleSize(-6),
                          textAlign: 'center',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                          fontWeight: Platform.OS === 'android' ? 'normal' : '400',
                          marginBottom: scaleSize(8),
                        }}
                      >
                        {explanation}
                      </Text>
                    )}
                    {isDailyCompleted && (
                      <Text
                        style={{
                          fontSize: scaleSize(14),
                          top: scaleSize(-8),
                          textAlign: 'center',
                          color: 'white',
                          fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                          fontWeight: Platform.OS === 'android' ? 'normal' : '400',
                        }}
                      >
                        {`New challenge available\ntomorrow at 6pm EST`}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        color: 'white',
                        textAlign: 'center',
                        top: scaleSize(8),
                        fontWeight: Platform.OS === 'android' ? 'normal' : '500',
                        fontSize: scaleSize(18),
                        fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                        marginVertical: scaleSize(8),
                      }}
                    >
                      Entry denied
                    </Text>
                    {explanation && (
                      <Text
                        style={{
                          fontSize: scaleSize(14),
                          textAlign: 'center',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                          fontWeight: Platform.OS === 'android' ? 'normal' : '400',
                          marginVertical: scaleSize(6),
                        }}
                      >
                        {explanation}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: scaleSize(13),
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                        fontWeight: Platform.OS === 'android' ? 'normal' : '400',
                        fontStyle: 'italic',
                        marginVertical: scaleSize(4),
                      }}
                    >
                      Don't worry, try again!
                    </Text>

                    {/* New challenge text for Entry denied */}
                    <Text
                      style={{
                        fontSize: scaleSize(14),
                        textAlign: 'center',
                        color: 'white',
                        fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                        fontWeight: Platform.OS === 'android' ? 'normal' : '400',
                        marginTop: scaleSize(4),
                      }}
                    >
                      {`New challenge available\ntomorrow at 6pm EST`}
                    </Text>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </SafeScreenWrapper>
  );
};

export default CongratsScreen;
