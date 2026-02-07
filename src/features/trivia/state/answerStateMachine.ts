/**
 * Answer State Machine for Trivia Gameplay
 * Single source of truth for answer selection and submission state
 * Prevents multi-tap bugs and state conflicts
 */

export type AnswerStatus = 'unanswered' | 'selected' | 'submitted' | 'locked' | 'reviewing';

export interface AnswerState {
  status: AnswerStatus;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  userAnswer: string | null;
  submittedAt: Date | null;
}

export type AnswerAction =
  | { type: 'SELECT_ANSWER'; answer: string }
  | { type: 'SUBMIT_ANSWER'; answer: string }
  | { type: 'ANSWER_RESULT'; isCorrect: boolean; correctAnswer: string }
  | { type: 'RESET' }
  | { type: 'LOCK' }
  | { type: 'ENTER_REVIEW'; userAnswer: string; isCorrect: boolean; correctAnswer: string };

export const initialAnswerState: AnswerState = {
  status: 'unanswered',
  selectedAnswer: null,
  isCorrect: null,
  correctAnswer: null,
  userAnswer: null,
  submittedAt: null,
};

/**
 * Answer state reducer - handles all state transitions
 * Prevents invalid state transitions and ensures consistency
 */
export function answerReducer(state: AnswerState, action: AnswerAction): AnswerState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      // Can only select if unanswered or already selected (changing selection)
      if (state.status === 'unanswered' || state.status === 'selected') {
        return {
          ...state,
          status: 'selected',
          selectedAnswer: action.answer,
        };
      }
      // Ignore selection if already submitted or locked
      return state;

    case 'SUBMIT_ANSWER':
      // Can only submit if an answer is selected
      if (state.status === 'selected' && state.selectedAnswer) {
        return {
          ...state,
          status: 'submitted',
          userAnswer: action.answer,
          submittedAt: new Date(),
        };
      }
      return state;

    case 'ANSWER_RESULT':
      // Can only receive result if submitted
      if (state.status === 'submitted') {
        return {
          ...state,
          isCorrect: action.isCorrect,
          correctAnswer: action.correctAnswer,
          status: 'locked', // Lock after receiving result
        };
      }
      return state;

    case 'RESET':
      // Reset to initial state (for new question)
      return initialAnswerState;

    case 'LOCK':
      // Lock current state (prevent further changes)
      return {
        ...state,
        status: 'locked',
      };

    case 'ENTER_REVIEW':
      // Enter review mode with pre-filled answer
      return {
        status: 'reviewing',
        selectedAnswer: action.userAnswer,
        isCorrect: action.isCorrect,
        correctAnswer: action.correctAnswer,
        userAnswer: action.userAnswer,
        submittedAt: null,
      };

    default:
      return state;
  }
}

/**
 * Helper functions for state queries
 */
export const canSelectAnswer = (state: AnswerState): boolean => {
  return state.status === 'unanswered' || state.status === 'selected';
};

export const canSubmitAnswer = (state: AnswerState): boolean => {
  return state.status === 'selected' && state.selectedAnswer !== null;
};

export const isAnswerLocked = (state: AnswerState): boolean => {
  return state.status === 'locked' || state.status === 'reviewing';
};

export const hasResult = (state: AnswerState): boolean => {
  return state.isCorrect !== null;
};

/**
 * Get display state for option buttons
 */
export const getOptionState = (
  state: AnswerState,
  optionId: string
): 'default' | 'selected' | 'correct' | 'incorrect' | 'disabled' => {
  // If locked or reviewing, show final state
  if (isAnswerLocked(state)) {
    if (optionId === state.correctAnswer) {
      return 'correct';
    }
    if (optionId === state.userAnswer && !state.isCorrect) {
      return 'incorrect';
    }
    return 'disabled';
  }

  // If selected, highlight the selected option
  if (state.selectedAnswer === optionId) {
    return 'selected';
  }

  return 'default';
};
