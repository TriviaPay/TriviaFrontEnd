import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSubmitFreeModeAnswerMutation } from '../../../store/api/triviaApi';
import {
  setIsSubmitted,
  setSelectedAnswer,
  setIsCorrect as setContextIsCorrect,
} from '../../../store/triviaSlice';
import { triviaApi } from '../../../store/api/triviaApi';
import { logger } from '../../../lib/utils/logger';

interface UseAnswerSubmissionProps {
  onSubmissionComplete?: (isCorrect: boolean) => void;
  questionId?: number;
}

export const useAnswerSubmission = ({
  onSubmissionComplete,
  questionId, // Used to reset state when question changes
}: UseAnswerSubmissionProps) => {
  const dispatch = useDispatch();

  // Local state
  const [localIsSubmitted, setLocalIsSubmitted] = useState(false);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // RTK Mutation
  const [submitAnswerMutation] = useSubmitFreeModeAnswerMutation();

  // Track previous question ID to prevent accidental resets during data flickers
  const lastResetQuestionIdRef = useRef<number | null>(null);

  // Reset state when question changes
  useEffect(() => {
    // Only reset if we have a valid questionId AND it's different from the last one we reset for
    if (questionId && lastResetQuestionIdRef.current !== questionId) {
      console.log('🔄 [useAnswerSubmission] Question ID changed, resetting state:', {
        from: lastResetQuestionIdRef.current,
        to: questionId
      });

      setLocalIsSubmitted(false);
      setLocalSelectedAnswer(null);
      setIsCorrect(null);
      setCorrectAnswer(null);
      setIsSubmitting(false);
      isSubmittingRef.current = false;

      // Reset Redux state
      dispatch(setIsSubmitted(false));
      dispatch(setSelectedAnswer(null));
      dispatch(setContextIsCorrect(false));

      // Update ref
      lastResetQuestionIdRef.current = questionId;
    }
  }, [questionId, dispatch]);

  const submitAnswer = useCallback(
    async (answer: string, qId: number) => {
      // 1. Guard against double submission
      if (isSubmittingRef.current || localIsSubmitted) {
        return;
      }

      if (!qId) {
        logger.error('Attempted to submit answer without question ID');
        return;
      }

      // 2. Lock UI immediately
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setLocalSelectedAnswer(answer);

      // Update Redux immediately for UI feedback
      dispatch(setSelectedAnswer(answer));

      try {
        // 3. API Call
        const result = await submitAnswerMutation({
          question_id: qId,
          answer,
        }).unwrap();

        // 4. Update state with result
        const correct = result.is_correct;
        const correctAns = result.correct_answer;

        setIsCorrect(correct);
        setCorrectAnswer(correctAns);
        setLocalIsSubmitted(true);

        // Update Redux
        dispatch(setIsSubmitted(true));
        dispatch(setContextIsCorrect(correct));

        // Persist answer into RTK Query caches so it can't be changed by re-taps or navigation
        // Handle both wrapped ({ question: {...} }) and flat response shapes
        dispatch(
          triviaApi.util.updateQueryData('getCurrentFreeQuestion', undefined, (draft: any) => {
            // Detect if response is wrapped (has a question property) or flat
            const targetQuestion = draft?.question || draft;

            if (targetQuestion && targetQuestion.question_id === qId) {
              targetQuestion.fill_in_answer = answer;
              targetQuestion.answered_at = new Date().toISOString();
              targetQuestion.is_correct = correct;
              targetQuestion.status = correct ? 'answered_correct' : 'answered_wrong';
            }
          })
        );
        dispatch(
          triviaApi.util.updateQueryData('getFreeModeQuestions', undefined, (draft: any) => {
            if (!draft?.questions) return;
            const idx = draft.questions.findIndex((q: any) => {
              // Handle both wrapped and flat question objects in array
              const question = q?.question || q;
              return question.question_id === qId;
            });

            if (idx >= 0) {
              // Determine if array items are wrapped or flat
              const targetQuestion = draft.questions[idx]?.question || draft.questions[idx];

              targetQuestion.fill_in_answer = answer;
              targetQuestion.answered_at = new Date().toISOString();
              targetQuestion.is_correct = correct;
              targetQuestion.status = correct ? 'answered_correct' : 'answered_wrong';
            }
          })
        );

        logger.debug('Answer submitted successfully', 'TRIVIA', { isCorrect: correct });

        // 5. Callback
        if (onSubmissionComplete) {
          onSubmissionComplete(correct);
        }

        // Unlock submitting state after successful submit
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      } catch (error) {
        logger.error('Failed to submit answer', error);
        // Don't reset submitting state on error to prevent retry loops
        // Allow user to try again? Or show error?
        // For now, we unlock to allow retry
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [dispatch, submitAnswerMutation, localIsSubmitted, onSubmissionComplete]
  );

  return {
    submitAnswer,
    isSubmitting,
    isSubmitted: localIsSubmitted,
    selectedAnswer: localSelectedAnswer,
    isCorrect,
    correctAnswer,
  };
};
