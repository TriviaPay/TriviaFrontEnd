/**
 * SubmitButton - TypeScript Implementation
 * Professional submit button component with comprehensive features
 */

import React, { memo, useMemo } from 'react';
import { Text, Platform, ImageBackground } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../../../hooks/useReduxHooks';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';

interface SubmitButtonProps {
  selectedAnswer: string | null;
  isSubmitted: boolean;
  correctAnswer: string;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isLoading?: boolean;
  alreadyAnswered?: boolean;
  // CRITICAL: Use API response to determine correctness, not local comparison
  isCorrect?: boolean | null; // From API response submissionResult.is_correct
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  selectedAnswer,
  isSubmitted,
  correctAnswer,
  onPress,
  onPressIn,
  onPressOut,
  isLoading = false,
  alreadyAnswered = false,
  isCorrect = null, // From API response - this is the ONLY source of truth
}) => {
  const { isDarkMode } = useTheme();

  // Button is disabled if no answer is selected, already submitted, already answered, or loading - memoized
  const isDisabled = useMemo(
    () => !selectedAnswer || isSubmitted || alreadyAnswered || isLoading,
    [selectedAnswer, isSubmitted, alreadyAnswered, isLoading]
  );

  const textColor = useMemo((): string => {
    if (isDisabled) {
      return '#BDBDBD'; // Gray when disabled
    } else if (isSubmitted) {
      // CRITICAL: Use API response (isCorrect) to determine color, NOT local comparison
      // API response is the ONLY source of truth for correctness
      if (isCorrect === true) {
        return '#22c55e'; // Green for correct (from API)
      } else if (isCorrect === false) {
        return '#ef4444'; // Red for wrong (from API)
      } else {
        // If API response not available yet, show neutral color
        return '#BDBDBD'; // Gray while waiting for API response
      }
    } else {
      return 'white';
    }
  }, [isDisabled, isSubmitted, isCorrect]);

  return (
    <SoundTouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      activeOpacity={1}
    >
      <ImageBackground
        source={require('../../../../assets/trivia/submitBtn.png')}
        style={{
          width: scaleSize(120),
          height: scaleSize(48),
          alignItems: 'center',
          justifyContent: 'center',
          top: scaleSize(-10),
        }}
        resizeMode="contain"
      >
        {isLoading && (
          <LottieView
            source={require('../../../../assets/animations/LoadingBar.json')}
            autoPlay
            loop
            style={{ width: scaleSize(40), height: scaleSize(40), top: scaleSize(4) }}
          />
        )}
      </ImageBackground>
    </SoundTouchableOpacity>
  );
};

const MemoizedSubmitButton = memo(SubmitButton, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.selectedAnswer === nextProps.selectedAnswer &&
    prevProps.isSubmitted === nextProps.isSubmitted &&
    prevProps.correctAnswer === nextProps.correctAnswer &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.alreadyAnswered === nextProps.alreadyAnswered &&
    prevProps.isCorrect === nextProps.isCorrect
  );
});

export default MemoizedSubmitButton;
