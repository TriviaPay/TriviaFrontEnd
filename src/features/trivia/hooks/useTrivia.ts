/**
 * useTrivia Hook
 * Trivia game business logic
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  startGame,
  answerQuestion,
  useLifeline as useLifelineAction,
  skipQuestion,
  endGame,
  resetGame,
} from '@store/slices/triviaSlice';
import { errorHandler } from '@core/errors';
import { logger } from '@core/services';
import * as triviaApi from '../api/triviaApi';
import type { GameMode, LifelineType } from '../types';

export const useTrivia = () => {
  const dispatch = useAppDispatch();
  const triviaState = useAppSelector(state => state.trivia);

  /**
   * Start a new game
   */
  const startNewGame = useCallback(
    async (mode: GameMode) => {
      try {
        logger.info(`Starting ${mode} game`, 'TRIVIA');

        const session = await triviaApi.startGameSession(mode);

        dispatch(
          startGame({
            sessionId: session.id,
            mode,
            questions: session.questions,
          })
        );

        logger.info('Game started successfully', 'TRIVIA');
      } catch (error) {
        const appError = errorHandler.handle(error);
        throw appError;
      }
    },
    [dispatch]
  );

  /**
   * Submit an answer
   */
  const submitAnswer = useCallback(
    async (selectedOption: number, timeSpent: number) => {
      if (!triviaState.sessionId) return;

      try {
        const currentQuestion = triviaState.questions[triviaState.currentQuestionIndex];

        const result = await triviaApi.submitAnswer(
          triviaState.sessionId,
          currentQuestion.id,
          selectedOption,
          timeSpent
        );

        dispatch(
          answerQuestion({
            answer: selectedOption,
            isCorrect: result.correct,
            points: result.points,
            timeSpent,
          })
        );
      } catch (error) {
        logger.error('Failed to submit answer', 'TRIVIA', error);
        errorHandler.handle(error);
      }
    },
    [triviaState.sessionId, triviaState.questions, triviaState.currentQuestionIndex, dispatch]
  );

  /**
   * Use a lifeline
   */
  const useLifeline = useCallback(
    async (type: LifelineType) => {
      if (!triviaState.sessionId || !triviaState.lifelines[type]) return;

      try {
        const currentQuestion = triviaState.questions[triviaState.currentQuestionIndex];

        const result = await triviaApi.useLifeline(triviaState.sessionId, currentQuestion.id, type);

        dispatch(useLifelineAction({ type, data: result }));
      } catch (error) {
        logger.error('Failed to use lifeline', 'TRIVIA', error);
        errorHandler.handle(error);
      }
    },
    [
      triviaState.sessionId,
      triviaState.questions,
      triviaState.currentQuestionIndex,
      triviaState.lifelines,
      dispatch,
    ]
  );

  /**
   * Skip current question
   */
  const skip = useCallback(() => {
    if (triviaState.lifelines.skip) {
      dispatch(skipQuestion());
    }
  }, [triviaState.lifelines.skip, dispatch]);

  /**
   * End the game
   */
  const endCurrentGame = useCallback(async () => {
    if (!triviaState.sessionId) return;

    try {
      const result = await triviaApi.endGameSession(
        triviaState.sessionId,
        triviaState.playerAnswers
      );

      dispatch(endGame(result));
    } catch (error) {
      logger.error('Failed to end game', 'TRIVIA', error);
      errorHandler.handle(error);
    }
  }, [triviaState.sessionId, triviaState.playerAnswers, dispatch]);

  /**
   * Reset game state
   */
  const reset = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  return {
    ...triviaState,
    startNewGame,
    submitAnswer,
    useLifeline,
    skip,
    endCurrentGame,
    reset,
  };
};
