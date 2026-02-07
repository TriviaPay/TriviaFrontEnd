import { useMemo } from 'react';
import { mapAnswerToOptionId } from '../utils/answerMapping';

interface Option {
  id: string;
  text: string;
}

interface DerivedAnswerState {
  selectedId: string | null;
  correctId: string | null;
  isCorrect: boolean | null;
  isSubmitted: boolean;
}

/**
 * Derives UI answer state from RTK Query cache data
 *
 * This is the single source of truth for answer display state.
 * No local state variables should duplicate this information.
 *
 * @param questionData - Question data from RTK Query (contains correct_answer, options)
 * @param statusData - Status data from RTK Query (contains fill_in_answer, is_correct)
 * @param options - Normalized UI options array
 * @returns Derived state for UI rendering
 */
export const useDerivedAnswerState = (
  questionData: any,
  statusData: any,
  options: Option[] | null
): DerivedAnswerState => {
  return useMemo(() => {
    if (!questionData && !statusData) {
      return {
        selectedId: null,
        correctId: null,
        isCorrect: null,
        isSubmitted: false,
      };
    }

    // Priority: StatusData > QuestionData for user's answer
    const userAnswer = statusData?.fill_in_answer || questionData?.fill_in_answer;
    const correctAnswer = questionData?.correct_answer;

    // Map string answers to option IDs
    const selectedId = mapAnswerToOptionId(userAnswer, options);
    const correctId = mapAnswerToOptionId(correctAnswer, options);

    // Determine if answer is correct
    // Priority: StatusData > QuestionData > Compare selectedId with correctId
    let isCorrect: boolean | null = null;
    if (statusData?.is_correct !== null && statusData?.is_correct !== undefined) {
      isCorrect = Boolean(statusData.is_correct);
    } else if (questionData?.is_correct !== null && questionData?.is_correct !== undefined) {
      isCorrect = Boolean(questionData.is_correct);
    } else if (selectedId && correctId) {
      isCorrect = selectedId === correctId;
    }

    // Determine if submitted
    const isSubmitted = Boolean(
      statusData?.has_submitted ||
      questionData?.answered_at ||
      questionData?.submitted_at ||
      userAnswer
    );

    return {
      selectedId,
      correctId,
      isCorrect,
      isSubmitted,
    };
  }, [questionData, statusData, options]);
};

/**
 * Derives answer state for Free Mode with review support
 *
 * @param questionData - Current live question
 * @param allQuestions - All questions array for review mode
 * @param isReviewMode - Whether in review mode
 * @param reviewIndex - Current review index
 * @param options - Normalized UI options for current question
 */
export const useDerivedFreeModeState = (
  questionData: any,
  allQuestions: any[] | null,
  isReviewMode: boolean,
  reviewIndex: number,
  options: Option[] | null
): DerivedAnswerState => {
  return useMemo(() => {
    // CRITICAL FIX: questionData parameter is already the correct question
    // (FreeTriviaScreen passes currentQuestionSource which is pre-selected)
    const activeQuestion = questionData;

    console.log('[useDerivedFreeModeState] Computing state:', {
      hasActiveQuestion: !!activeQuestion,
      isReviewMode,
      reviewIndex,
      activeQuestion: activeQuestion
        ? {
          fill_in_answer: activeQuestion.fill_in_answer,
          correct_answer: activeQuestion.correct_answer,
          is_correct: activeQuestion.is_correct,
          answered_at: activeQuestion.answered_at,
          status: activeQuestion.status,
        }
        : null,
      optionsCount: options?.length || 0,
    });

    if (!activeQuestion) {
      return {
        selectedId: null,
        correctId: null,
        isCorrect: null,
        isSubmitted: false,
      };
    }

    // Safety: Unwrap if question is still wrapped (should not happen after useFreeModeData normalization)
    const unwrappedQuestion = activeQuestion.question ?? activeQuestion;

    // For Free mode, question object contains all fields
    // CRITICAL: Check all possible fields for user and correct answers (match TriviaScreen behavior)
    const userAnswer =
      unwrappedQuestion.fill_in_answer ||
      unwrappedQuestion.user_answer ||
      unwrappedQuestion.selected_option ||
      unwrappedQuestion.answered_option_id;

    const correctAnswer =
      unwrappedQuestion.correct_answer ||
      unwrappedQuestion.correct_option;

    const selectedId = mapAnswerToOptionId(userAnswer, options);
    const correctId = mapAnswerToOptionId(correctAnswer, options);

    console.log('[useDerivedFreeModeState] Mapping answers:', {
      userAnswer,
      correctAnswer,
      selectedId,
      correctId,
      rawStatus: unwrappedQuestion.status,
      rawIsCorrect: unwrappedQuestion.is_correct
    });

    // Check status field for Free mode
    let isCorrect: boolean | null = null;
    if (unwrappedQuestion.is_correct !== null && unwrappedQuestion.is_correct !== undefined) {
      isCorrect = Boolean(unwrappedQuestion.is_correct);
    } else if (unwrappedQuestion.status) {
      // Parse status string (e.g., "answered_correct", "answered_wrong")
      isCorrect = unwrappedQuestion.status.toLowerCase().includes('correct');
    } else if (selectedId && correctId) {
      isCorrect = selectedId === correctId;
    }

    const isSubmitted = Boolean(
      unwrappedQuestion.answered_at ||
      unwrappedQuestion.submitted_at ||
      userAnswer ||
      (unwrappedQuestion.status && unwrappedQuestion.status.toLowerCase().startsWith('answered'))
    );

    const result = {
      selectedId,
      correctId,
      isCorrect,
      isSubmitted,
    };

    if (isReviewMode) {
      console.log('🔍 [useDerivedFreeModeState] REVIEW DIAGNOSTICS:', {
        reviewIndex,
        rawUserAnswer: userAnswer,
        rawCorrectAnswer: correctAnswer,
        mappedSelectedId: selectedId,
        mappedCorrectId: correctId,
        determinedIsCorrect: isCorrect,
        isSubmitted,
      });
    }

    return result;
  }, [questionData, allQuestions, isReviewMode, reviewIndex, options]);
};
