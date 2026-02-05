import { useMemo, useEffect, useRef } from 'react';
import { logger } from '../../../lib/utils/logger';

interface UIQuestion {
  text: string;
  options: Array<{ id: string; text: string; disabled?: boolean }>;
  correctAnswer: string;
  questionNumber: number;
  hint: string;
  category: string;
  difficulty: string;
  questionId: number;
}

export const useQuestionState = (apiQuestion: any) => {
  // Track previous question ID to detect changes
  const prevQuestionIdRef = useRef<number | null>(null);

  // Convert API format to UI format
  // Memoize to prevent re-calculations on every render
  const uiQuestion = useMemo((): UIQuestion | null => {
    if (!apiQuestion) return null;

    try {
      // CRITICAL: Handle both Bronze/Silver format (question, options)
      // and Free mode format (question_text, option_a/b/c/d)
      const questionText = apiQuestion.question || apiQuestion.question_text;

      if (!questionText) {
        return null;
      }

      let options;

      // If apiQuestion has options object or array, use it
      if (apiQuestion.options) {
        options = Array.isArray(apiQuestion.options)
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
      }
      // Free mode format: option_a, option_b, option_c, option_d
      else if (
        apiQuestion.option_a ||
        apiQuestion.option_b ||
        apiQuestion.option_c ||
        apiQuestion.option_d
      ) {
        options = [
          { id: 'a', text: apiQuestion.option_a || '', disabled: false },
          { id: 'b', text: apiQuestion.option_b || '', disabled: false },
          { id: 'c', text: apiQuestion.option_c || '', disabled: false },
          { id: 'd', text: apiQuestion.option_d || '', disabled: false },
        ];
      }
      // No valid options found
      else {
        return null;
      }

      const converted = {
        text: questionText,
        options,
        correctAnswer: (apiQuestion.correct_answer || '').toLowerCase(),
        questionNumber: apiQuestion.question_number || 0,
        hint: apiQuestion.hint || '',
        category: apiQuestion.category || '',
        difficulty: apiQuestion.difficulty || apiQuestion.difficulty_level || '',
        questionId: apiQuestion.question_id || 0,
      };

      return converted;
    } catch (error) {
      logger.error('Error converting question format', error);
      return null;
    }
  }, [apiQuestion]);

  // Track question changes
  useEffect(() => {
    if (uiQuestion?.questionId && typeof uiQuestion.questionId === 'number') {
      if (prevQuestionIdRef.current !== uiQuestion.questionId) {
        logger.debug('Question changed', 'TRIVIA', {
          from: prevQuestionIdRef.current,
          to: uiQuestion.questionId,
        });
        prevQuestionIdRef.current = uiQuestion.questionId;
      }
    }
  }, [uiQuestion?.questionId]);

  return {
    uiQuestion,
    hasQuestion: !!uiQuestion,
    questionId: uiQuestion?.questionId,
  };
};
