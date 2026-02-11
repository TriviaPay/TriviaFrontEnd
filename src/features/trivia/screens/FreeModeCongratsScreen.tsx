import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../../utils/scaleSize';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import Animated from 'react-native-reanimated';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';

type FreeModeQuestionSummary = {
  question_id: number;
  question_order?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  fill_in_answer: string | null;
  is_correct: boolean | null;
};

type FreeModeStatusSummary = {
  progress?: {
    correct_answers: number;
    total_questions: number;
    completed: boolean;
  };
};

type Props = {
  visible: boolean;
  status: FreeModeStatusSummary | null;
  questions: FreeModeQuestionSummary[] | null;
  onClose: () => void;
  onTapToReview?: () => void;
};

const FreeModeCongratsScreen: React.FC<Props> = ({
  visible,
  status,
  questions,
  onClose,
  onTapToReview,
}) => {
  const { width: _unusedWidth } = useStandardResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const closeButtonAnimation = useButtonAnimation();
  // const currentMode = useSelector((state: any) => state.trivia.currentMode);

  const sortedQuestions = useMemo(() => {
    const list = questions ?? [];
    return [...list].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));
  }, [questions]);

  const scoreText = useMemo(() => {
    const correct = status?.progress?.correct_answers;
    const total = status?.progress?.total_questions;
    if (typeof correct !== 'number' || typeof total !== 'number') return '';
    return `${correct}/${total}`;
  }, [status?.progress?.correct_answers, status?.progress?.total_questions]);

  const resolveAnswerText = (
    value: string | null | undefined,
    q: FreeModeQuestionSummary
  ): string => {
    if (!value) return '—';
    const normalized = String(value).toLowerCase().trim();
    if (normalized === 'a') return q.option_a;
    if (normalized === 'b') return q.option_b;
    if (normalized === 'c') return q.option_c;
    if (normalized === 'd') return q.option_d;
    return String(value);
  };

  const currentQuestion = sortedQuestions[currentIndex];

  // Logic to determine if answer is correct even if API field is null/false but content matches
  const isCorrect = useMemo(() => {
    if (currentQuestion?.is_correct === true) return true;

    // Fallback logic for manual content check if is_correct is null or false
    if (currentQuestion?.fill_in_answer && currentQuestion?.correct_answer) {
      const userAns = String(currentQuestion.fill_in_answer).toLowerCase().trim();
      const correctAns = String(currentQuestion.correct_answer).toLowerCase().trim();

      // 1. Direct match
      if (userAns === correctAns) return true;

      // 2. ID match (e.g. user answers 'a' and correct is 'a')
      if (userAns.length === 1 && userAns === correctAns) return true;

      // 3. Resolve IDs to text for comparison (Ultra Robust)
      const options = [
        { id: 'a', text: currentQuestion.option_a },
        { id: 'b', text: currentQuestion.option_b },
        { id: 'c', text: currentQuestion.option_c },
        { id: 'd', text: currentQuestion.option_d },
      ];

      const userText = options.find(opt => opt.id === userAns || opt.text?.toLowerCase()?.trim() === userAns)?.text?.toLowerCase()?.trim();
      const correctText = options.find(opt => opt.id === correctAns || opt.text?.toLowerCase()?.trim() === correctAns)?.text?.toLowerCase()?.trim();

      if (userText && correctText && userText === correctText) return true;
      if (userText && userText === correctAns) return true;
      if (correctText && correctText === userAns) return true;
    }
    return false;
  }, [currentQuestion]);

  const handleNext = () => {
    if (currentIndex < sortedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
    if (onTapToReview) {
      onTapToReview();
    }
  };

  const handleDotPress = (index: number) => {
    setCurrentIndex(index);
  };

  // Sticky Correctness Logic (Same as CongratsScreen.tsx)
  const stickyCorrectnessRef = useRef<Record<number, boolean>>({});

  // Update sticky ref when isCorrect is explicitly true
  useEffect(() => {
    if (isCorrect && currentQuestion?.question_id !== undefined) {
      stickyCorrectnessRef.current[currentQuestion.question_id] = true;
    }
  }, [isCorrect, currentQuestion]);

  // Determine final correctness
  const finalIsCorrect = useMemo(() => {
    if (isCorrect) return true;
    if (currentQuestion?.question_id !== undefined && stickyCorrectnessRef.current[currentQuestion.question_id]) {
      return true;
    }
    return isCorrect;
  }, [isCorrect, currentQuestion]);

  if (!visible || !currentQuestion) {
    return null;
  }

  const userAnswerText = resolveAnswerText(currentQuestion.fill_in_answer, currentQuestion);
  const correctAnswerText = resolveAnswerText(currentQuestion.correct_answer, currentQuestion);

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
      {/* Backdrop - tappable to close */}
      <TouchableOpacity
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 1,
          elevation: 1,
        }}
        activeOpacity={1}
        onPress={handleClose}
      />

      <View
        style={{
          width: scaleSize(340),
          height: scaleSize(340),
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          elevation: 2,
        }}
        pointerEvents="box-none"
      >
        {/* Display correct or incorrect PNG based on answer - Same as TriviaPay */}
        <Image
          source={
            finalIsCorrect
              ? require('../../../../assets/trivia/correct.png')
              : require('../../../../assets/trivia/inCorrect.png')
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

        {/* X Close Icon at the very top-right corner of the card - Same as TriviaPay */}
        <Animated.View
          style={[
            closeButtonAnimation.animatedStyle,
            {
              position: 'absolute',
              top: scaleSize(62),
              right: scaleSize(6),
              zIndex: 20,
            },
          ]}
        >
          <SoundTouchableOpacity
            onPress={handleClose}
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
              source={require('../../../../assets/common/closeIcon.png')}
              style={{
                width: scaleSize(34),
                height: scaleSize(34),
              }}
              resizeMode="contain"
            />
          </SoundTouchableOpacity>
        </Animated.View>

        {/* Main content inside the card - Same style as TriviaPay */}
        <View
          style={{
            width: '60%',
            height: '80%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(8),
            paddingVertical: scaleSize(12),
            top: scaleSize(80),
          }}
        >
          <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: scaleSize(12) }}>
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
              {finalIsCorrect ? 'Great Job!' : 'Keep Going!'}
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
              {finalIsCorrect ? 'You Answered Correctly!' : 'That was close! Try again.'}
            </Text>

            {/* Question Number and Total */}
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                fontSize: scaleSize(14),
                fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                marginBottom: scaleSize(8),
              }}
            >
              Question {currentIndex + 1} of {sortedQuestions.length}
            </Text>

            {/* Score Display */}
            {!!scoreText && (
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  fontSize: scaleSize(16),
                  fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                  fontWeight: '600',
                  marginBottom: scaleSize(12),
                }}
              >
                Score: {scoreText}
              </Text>
            )}

            {/* Question Text */}
            <Text
              style={{
                fontSize: scaleSize(14),
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                marginTop: scaleSize(8),
                marginBottom: scaleSize(12),
              }}
            >
              {currentQuestion.question}
            </Text>

            {/* Your Answer */}
            <Text
              style={{
                fontSize: scaleSize(13),
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                marginBottom: scaleSize(4),
              }}
            >
              Your answer: {userAnswerText}
            </Text>

            {/* Correct Answer */}
            <Text
              style={{
                fontSize: scaleSize(13),
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                marginTop: scaleSize(4),
              }}
            >
              Correct answer: {correctAnswerText}
            </Text>
          </View>
        </View>

        {/* Carousel Dots - Below the card */}
        <View
          style={{
            position: 'absolute',
            bottom: scaleSize(-40),
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: '100%',
            zIndex: 10,
          }}
        >
          {sortedQuestions.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                {
                  width: scaleSize(10),
                  height: scaleSize(10),
                  borderRadius: scaleSize(5),
                  backgroundColor: '#cbd5e1',
                  marginHorizontal: scaleSize(4),
                  marginVertical: scaleSize(4),
                },
                index === currentIndex && {
                  width: scaleSize(12),
                  height: scaleSize(12),
                  borderRadius: scaleSize(6),
                  backgroundColor: '#0a7aca',
                },
                sortedQuestions[index]?.is_correct === true && {
                  backgroundColor: '#16a34a',
                },
                sortedQuestions[index]?.is_correct === false && {
                  backgroundColor: '#dc2626',
                },
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>

        {/* Navigation Buttons - Below dots */}
        <View
          style={{
            position: 'absolute',
            bottom: scaleSize(-80),
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '80%',
            zIndex: 10,
          }}
        >
          <SoundTouchableOpacity
            onPress={handlePrevious}
            style={[
              {
                flex: 1,
                backgroundColor: '#e2e8f0',
                borderRadius: scaleSize(12),
                paddingVertical: scaleSize(12),
                alignItems: 'center',
                marginHorizontal: scaleSize(4),
              },
              currentIndex === 0 && { opacity: 0.5 },
            ]}
            disabled={currentIndex === 0}
          >
            <Text
              style={[
                {
                  color: '#0f172a',
                  fontSize: scaleSize(14),
                  fontFamily: 'Baloo2',
                  fontWeight: '600',
                },
                currentIndex === 0 && { color: '#94a3b8' },
              ]}
            >
              Previous
            </Text>
          </SoundTouchableOpacity>

          {currentIndex < sortedQuestions.length - 1 ? (
            <SoundTouchableOpacity
              onPress={handleNext}
              style={{
                flex: 1,
                backgroundColor: '#e2e8f0',
                borderRadius: scaleSize(12),
                paddingVertical: scaleSize(12),
                alignItems: 'center',
                marginHorizontal: scaleSize(4),
              }}
            >
              <Text
                style={{
                  color: '#0f172a',
                  fontSize: scaleSize(14),
                  fontFamily: 'Baloo2',
                  fontWeight: '600',
                }}
              >
                Next
              </Text>
            </SoundTouchableOpacity>
          ) : (
            <SoundTouchableOpacity
              onPress={handleClose}
              style={{
                flex: 1,
                backgroundColor: '#0a7aca',
                borderRadius: scaleSize(12),
                paddingVertical: scaleSize(12),
                alignItems: 'center',
                marginHorizontal: scaleSize(4),
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: scaleSize(14),
                  fontFamily: 'Baloo2',
                  fontWeight: '600',
                }}
              >
                Review All
              </Text>
            </SoundTouchableOpacity>
          )}
        </View>
      </View>
    </SafeScreenWrapper>
  );
};

export default FreeModeCongratsScreen;
