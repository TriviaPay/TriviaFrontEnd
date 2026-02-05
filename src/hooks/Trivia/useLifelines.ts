/**
 * useLifelines Hook - TypeScript Implementation
 * Professional trivia lifelines hook with comprehensive features
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { LIFELINE_TYPES, QUESTION_DATA } from '../../core/types/trivia';

interface Question {
  text: string;
  options: Array<{
    id: string;
    text: string;
    disabled?: boolean;
  }>;
  correctAnswer: string;
}

interface Lifelines {
  [key: string]: boolean;
}

interface UseLifelinesProps {
  question: Question;
  setQuestion: (question: Question | ((prev: Question) => Question)) => void;
  isSubmitted: boolean;
  setSelectedAnswer: (answer: string) => void;
  setIsSubmitted: (submitted: boolean) => void;
  setShowConfetti: (show: boolean) => void;
  setShowCongratsScreen: (show: boolean) => void;
}

interface UseLifelinesReturn {
  lifelines: Lifelines;
  useLifeline: (lifeline: string) => void;
  resetLifelines: () => void;
}

export const useLifelines = ({
  question,
  setQuestion,
  isSubmitted,
  setSelectedAnswer,
  setIsSubmitted,
  setShowConfetti,
  setShowCongratsScreen,
}: UseLifelinesProps): UseLifelinesReturn => {
  const initialLifelines: Lifelines = {
    [LIFELINE_TYPES.FIFTY_FIFTY]: true,
    [LIFELINE_TYPES.SKIP]: true,
    [LIFELINE_TYPES.CHANGE_QUESTION]: true,
    [LIFELINE_TYPES.AUDIENCE]: true,
  };

  const [lifelines, setLifelines] = useState<Lifelines>(initialLifelines);

  const resetLifelines = useCallback((): void => {
    setLifelines(initialLifelines);
  }, []);

  const useLifeline = useCallback(
    (lifeline: string): void => {
      if (!lifelines[lifeline] || isSubmitted) return;

      const handleFiftyFifty = (): void => {
        const incorrectOptions = question.options
          .filter(option => option.id !== question.correctAnswer)
          .map(option => option.id);

        const optionsToRemove: string[] = [];
        while (optionsToRemove.length < Math.min(2, incorrectOptions.length)) {
          const randomIndex = Math.floor(Math.random() * incorrectOptions.length);
          const optionToRemove = incorrectOptions[randomIndex];
          if (!optionsToRemove.includes(optionToRemove)) {
            optionsToRemove.push(optionToRemove);
          }
        }

        const updatedOptions = question.options.map(option => ({
          ...option,
          disabled: optionsToRemove.includes(option.id),
        }));

        setQuestion(prevQuestion => ({
          ...prevQuestion,
          options: updatedOptions,
        }));
      };

      const handleChangeQuestion = (): void => {
        setQuestion(QUESTION_DATA.ALTERNATE);
      };

      const handleSkip = (): void => {
        setSelectedAnswer(question.correctAnswer);
        setIsSubmitted(true);
        setShowConfetti(true);
        setTimeout(() => {
          setShowCongratsScreen(true);
        }, 3000);
      };

      const handleHint = (): void => {
        if (question.text.includes('Land of the Rising Sun')) {
          Alert.alert('Hint', 'This country is in East Asia and is famous for sushi and samurai.');
        } else if (question.text.includes('capital of Australia')) {
          Alert.alert('Hint', "It's not Sydney or Melbourne as many people think.");
        } else {
          Alert.alert(
            'Hint',
            'Look carefully at the options and think about the most logical answer.'
          );
        }
      };

      if (lifeline === LIFELINE_TYPES.FIFTY_FIFTY) {
        handleFiftyFifty();
      }

      if (lifeline === LIFELINE_TYPES.CHANGE_QUESTION) {
        handleChangeQuestion();
      }

      if (lifeline === LIFELINE_TYPES.SKIP) {
        handleSkip();
      }

      if (lifeline === LIFELINE_TYPES.AUDIENCE) {
        handleHint();
      }

      setLifelines(prev => ({ ...prev, [lifeline]: false }));
    },
    [
      lifelines,
      isSubmitted,
      question.options,
      question.correctAnswer,
      setQuestion,
      setSelectedAnswer,
      setIsSubmitted,
      setShowConfetti,
      setShowCongratsScreen,
    ]
  );

  return { lifelines, useLifeline, resetLifelines };
};
