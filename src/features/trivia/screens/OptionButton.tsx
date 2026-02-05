import React, { memo, useMemo } from 'react';
import { Text, View, Animated, Platform, ImageBackground } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

interface Option {
  id: string;
  text: string;
  disabled?: boolean;
}

interface OptionButtonProps {
  option: Option;
  isSelected: boolean;
  isSubmitted: boolean;
  correctAnswer: string;
  onPress: () => void;
  animatedStyle?: any;
  optionIndex: number;
  hasAnySelection: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  previousAnswer?: string | null;
  previousAnswerCorrect?: boolean;
  isExtraChanceActive?: boolean;
  alreadyAnswered?: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  option,
  isSelected,
  isSubmitted,
  correctAnswer,
  onPress,
  animatedStyle,
  optionIndex,
  hasAnySelection,
  onPressIn,
  onPressOut,
  previousAnswer,
  previousAnswerCorrect,
  isExtraChanceActive,
  alreadyAnswered = false,
}) => {
  // Debug log for option state during review/submission
  if (isSubmitted || alreadyAnswered) {
    console.log(`🎨 [OptionButton] Rendering Option ${optionIndex} (${option.id}):`, {
      isSelected,
      isSubmitted,
      alreadyAnswered,
      correctAnswer,
      previousAnswer,
      previousAnswerCorrect,
      optionText: option.text,
    });
  }

  const { isDarkMode, colors } = useTheme();
  const { scaleSize } = useStandardResponsive();

  // Get alphabetical letter (a, b, c, d) - memoized
  const optionLetter = useMemo(() => String.fromCharCode(97 + optionIndex), [optionIndex]);

  // Get background image based on state - memoized
  const backgroundImage = useMemo(() => {
    const optionAssets = [
      require('../../../../assets/trivia/optionA.png'),
      require('../../../../assets/trivia/optionB.png'),
      require('../../../../assets/trivia/optionC.png'),
      require('../../../../assets/trivia/optionD.png'),
    ];
    return optionAssets[optionIndex] || optionAssets[0];
  }, [optionIndex]);

  // Get text color based on state - simplified and robust
  const textColor = useMemo(() => {
    const optionId = option.id.toLowerCase().trim();
    const correctId = correctAnswer?.toLowerCase().trim() || '';
    const prevId = previousAnswer?.toLowerCase().trim();
    const isSelectedAny = isSelected || optionId === prevId;

    // 1. Correct Answer (always green if known and submitted/answered)
    if ((isSubmitted || alreadyAnswered || isExtraChanceActive) && correctId !== '' && optionId === correctId) {
      return '#22c55e';
    }

    // 2. User's Selection (if wrong)
    if (isSelectedAny && (isSubmitted || alreadyAnswered || isExtraChanceActive)) {
      if (correctId !== '' && optionId !== correctId) {
        return '#ef4444'; // Red for confirmed wrong
      }
      if (previousAnswerCorrect === false && optionId === prevId) {
        return '#ef4444'; // Red for historical wrong
      }
    }

    // 3. Current Selection (not submitted)
    if (isSelected) {
      return '#ff8c00'; // Orange for pending selection
    }

    return '#000000'; // Default black
  }, [
    isExtraChanceActive,
    previousAnswer,
    previousAnswerCorrect,
    isSubmitted,
    alreadyAnswered,
    correctAnswer,
    option.id,
    isSelected,
  ]);

  // Handle opacity based on state
  const opacity = useMemo(() => {
    if (!isSubmitted && !alreadyAnswered && !isExtraChanceActive) {
      return option.disabled ? 0.5 : 1;
    }

    const optionId = option.id.toLowerCase().trim();
    const correctId = correctAnswer?.toLowerCase().trim() || '';
    const prevId = previousAnswer?.toLowerCase().trim();
    const isSelection = isSelected || optionId === prevId;
    const isCorrect = correctId !== '' && optionId === correctId;

    if (isCorrect || isSelection) return 1;
    return 0.5; // Dim other options
  }, [isSubmitted, alreadyAnswered, isExtraChanceActive, correctAnswer, option.id, option.disabled, isSelected, previousAnswer]);

  // Simplified and robust checkmark logic
  const shouldShowCheckmark = useMemo(() => {
    if (!(isSubmitted || alreadyAnswered || isExtraChanceActive)) return false;

    const optionId = option.id.toLowerCase().trim();
    const correctId = correctAnswer?.toLowerCase().trim() || '';

    // TRIVIA FIX: Also match against option TEXT if ID doesn't match
    // This handles cases where backend sends the full text as correct_answer
    const optionText = option.text.toLowerCase().trim();

    // Show on correct option (ID match OR Text match)
    if (correctId !== '') {
      if (optionId === correctId) return true;
      if (optionText === correctId) return true;
    }

    // Show if previously answered correctly
    if (previousAnswerCorrect === true && previousAnswer?.toLowerCase().trim() === optionId) return true;

    return false;
  }, [isSubmitted, alreadyAnswered, isExtraChanceActive, correctAnswer, option.id, option.text, previousAnswer, previousAnswerCorrect]);

  // Simplified and robust X-mark logic
  const shouldShowXMark = useMemo(() => {
    if (!(isSubmitted || alreadyAnswered || isExtraChanceActive)) {
      return false;
    }

    const optionId = option.id.toLowerCase().trim();
    const correctId = correctAnswer?.toLowerCase().trim() || '';
    const prevId = previousAnswer?.toLowerCase().trim();

    // Never show X on correct answer
    if (correctId !== '' && optionId === correctId) return false;

    // CRITICAL: If this specific option was marked as correct in the history, NEVER show X
    if (previousAnswerCorrect === true && prevId === optionId) return false;

    // Show X if this is the user's selected option and it is wrong
    if (optionId === prevId || isSelected) {
      if (correctId !== '' && optionId !== correctId) return true;
      // CRITICAL FIX: Only show X based on history if this matches history
      if (optionId === prevId && previousAnswerCorrect === false) return true;
    }

    return false;
  }, [isSubmitted, alreadyAnswered, isExtraChanceActive, correctAnswer, option.id, isSelected, previousAnswer, previousAnswerCorrect]);

  return (
    <Animated.View
      style={{
        ...animatedStyle,
        alignSelf: 'center',
        width: '90%',
        opacity,
      }}
    >
      <SoundTouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={(isSubmitted && !isExtraChanceActive) || option.disabled}
        style={{ width: '100%' }}
        activeOpacity={1}
      >
        <ImageBackground
          source={backgroundImage}
          style={{
            padding: scaleSize(10),
            borderRadius: scaleSize(16),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: scaleSize(50),
            // Visual feedback for correct/wrong states
            // Visual feedback for correct/wrong states - Text color only as requested
            borderWidth: 0,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          }}
          resizeMode="stretch"
          onError={error => {
            // Handle image load error silently
          }}
        >
          {/* Centered content container */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Option text centered */}
            <Text
              style={{
                color: textColor,
                fontSize: scaleSize(16),
                lineHeight: scaleSize(20),
                textAlign: 'center',
                width: '100%',
                fontFamily: Platform.OS === 'ios' ? 'Baloo2' : 'Baloo2',
                fontWeight: Platform.OS === 'android' ? 'normal' : '600',
              }}
            >
              {option.text}
            </Text>

            {/* Checkmark icon for correct answer */}
            {shouldShowCheckmark && (
              <View
                style={{
                  position: 'absolute',
                  right: scaleSize(10),
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: scaleSize(20),
                    color: '#22c55e',
                    fontWeight: 'bold',
                  }}
                >
                  ✓
                </Text>
              </View>
            )}

            {/* Cross mark icon for wrong selected answer */}
            {shouldShowXMark && (
              <View
                style={{
                  position: 'absolute',
                  right: scaleSize(10),
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: scaleSize(20),
                    color: '#ef4444',
                    fontWeight: 'bold',
                  }}
                >
                  ✗
                </Text>
              </View>
            )}
          </View>
        </ImageBackground>
      </SoundTouchableOpacity>
    </Animated.View>
  );
};

export default memo(OptionButton, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.option.id === nextProps.option.id &&
    prevProps.option.text === nextProps.option.text &&
    prevProps.option.disabled === nextProps.option.disabled &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSubmitted === nextProps.isSubmitted &&
    prevProps.correctAnswer === nextProps.correctAnswer &&
    prevProps.optionIndex === nextProps.optionIndex &&
    prevProps.hasAnySelection === nextProps.hasAnySelection &&
    prevProps.previousAnswer === nextProps.previousAnswer &&
    prevProps.previousAnswerCorrect === nextProps.previousAnswerCorrect &&
    prevProps.isExtraChanceActive === nextProps.isExtraChanceActive &&
    prevProps.alreadyAnswered === nextProps.alreadyAnswered
  );
});
