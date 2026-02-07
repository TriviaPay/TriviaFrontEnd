/**
 * Trivia Slice
 * Game state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  Question,
  GameMode,
  GameStatus,
  Lifelines,
  PlayerAnswer,
  GameResult,
} from '@features/trivia/types';

interface TriviaState {
  sessionId: string | null;
  mode: GameMode | null;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  timeRemaining: number;
  lifelines: Lifelines;
  gameStatus: GameStatus;
  playerAnswers: PlayerAnswer[];
  result: GameResult | null;
  eliminatedOptions: number[];
}

const initialState: TriviaState = {
  sessionId: null,
  mode: null,
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  correctAnswers: 0,
  timeRemaining: 30,
  lifelines: {
    fiftyFifty: true,
    skip: true,
    hint: true,
  },
  gameStatus: 'idle',
  playerAnswers: [],
  result: null,
  eliminatedOptions: [],
};

const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    startGame: (
      state,
      action: PayloadAction<{ sessionId: string; mode: GameMode; questions: Question[] }>
    ) => {
      state.sessionId = action.payload.sessionId;
      state.mode = action.payload.mode;
      state.questions = action.payload.questions;
      state.currentQuestionIndex = 0;
      state.score = 0;
      state.correctAnswers = 0;
      state.gameStatus = 'playing';
      state.playerAnswers = [];
      state.result = null;
      state.eliminatedOptions = [];

      // Set initial timer from first question
      if (action.payload.questions.length > 0) {
        state.timeRemaining = action.payload.questions[0].timeLimit;
      }
    },

    answerQuestion: (
      state,
      action: PayloadAction<{
        answer: number;
        isCorrect: boolean;
        points: number;
        timeSpent: number;
      }>
    ) => {
      const currentQuestion = state.questions[state.currentQuestionIndex];

      // Record answer
      state.playerAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: action.payload.answer,
        isCorrect: action.payload.isCorrect,
        timeSpent: action.payload.timeSpent,
      });

      // Update score
      if (action.payload.isCorrect) {
        state.score += action.payload.points;
        state.correctAnswers += 1;
      }

      // Move to next question or end game
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
        state.eliminatedOptions = [];

        // Reset timer for next question
        const nextQuestion = state.questions[state.currentQuestionIndex + 1];
        if (nextQuestion) {
          state.timeRemaining = nextQuestion.timeLimit;
        }
      } else {
        state.gameStatus = 'finished';
      }
    },

    useLifeline: (state, action: PayloadAction<{ type: keyof Lifelines; data?: any }>) => {
      state.lifelines[action.payload.type] = false;

      if (action.payload.type === 'fiftyFifty' && action.payload.data?.eliminatedOptions) {
        state.eliminatedOptions = action.payload.data.eliminatedOptions;
      }
    },

    skipQuestion: state => {
      if (state.lifelines.skip) {
        state.lifelines.skip = false;

        // Move to next question
        if (state.currentQuestionIndex < state.questions.length - 1) {
          state.currentQuestionIndex += 1;
          state.eliminatedOptions = [];

          const nextQuestion = state.questions[state.currentQuestionIndex];
          if (nextQuestion) {
            state.timeRemaining = nextQuestion.timeLimit;
          }
        } else {
          state.gameStatus = 'finished';
        }
      }
    },

    updateTimer: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;

      // Auto-skip if time runs out
      if (action.payload <= 0 && state.gameStatus === 'playing') {
        if (state.currentQuestionIndex < state.questions.length - 1) {
          state.currentQuestionIndex += 1;
          state.eliminatedOptions = [];

          const nextQuestion = state.questions[state.currentQuestionIndex];
          if (nextQuestion) {
            state.timeRemaining = nextQuestion.timeLimit;
          }
        } else {
          state.gameStatus = 'finished';
        }
      }
    },

    pauseGame: state => {
      if (state.gameStatus === 'playing') {
        state.gameStatus = 'paused';
      }
    },

    resumeGame: state => {
      if (state.gameStatus === 'paused') {
        state.gameStatus = 'playing';
      }
    },

    endGame: (state, action: PayloadAction<GameResult>) => {
      state.gameStatus = 'finished';
      state.result = action.payload;
    },

    resetGame: () => initialState,
  },
});

export const {
  startGame,
  answerQuestion,
  useLifeline,
  skipQuestion,
  updateTimer,
  pauseGame,
  resumeGame,
  endGame,
  resetGame,
} = triviaSlice.actions;

export default triviaSlice.reducer;
