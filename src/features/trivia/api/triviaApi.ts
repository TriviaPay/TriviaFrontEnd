/**
 * Trivia API
 * All trivia game-related API calls
 */

import { apiClient } from '@core/services';
import { ApiResponse } from '@core/types';
import type { GameSession, GameResult, Question, GameMode, PlayerAnswer } from '../types';

/**
 * Start a new game session
 */
export const startGameSession = async (mode: GameMode): Promise<GameSession> => {
  const response = await apiClient.post<GameSession>('/trivia/start', { mode });

  if (!response.success || !response.data) {
    throw new Error('Failed to start game session');
  }

  return response.data;
};

/**
 * Fetch questions for game mode
 */
export const fetchQuestions = async (mode: GameMode, count: number = 10): Promise<Question[]> => {
  const response = await apiClient.get<Question[]>(`/trivia/questions`, {
    params: { mode, count },
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch questions');
  }

  return response.data;
};

/**
 * Submit answer
 */
export const submitAnswer = async (
  sessionId: string,
  questionId: string,
  answer: number,
  timeSpent: number
): Promise<{ correct: boolean; points: number }> => {
  const response = await apiClient.post<{ correct: boolean; points: number }>('/trivia/answer', {
    sessionId,
    questionId,
    answer,
    timeSpent,
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to submit answer');
  }

  return response.data;
};

/**
 * End game session and get results
 */
export const endGameSession = async (
  sessionId: string,
  answers: PlayerAnswer[]
): Promise<GameResult> => {
  const response = await apiClient.post<GameResult>('/trivia/end', {
    sessionId,
    answers,
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to end game session');
  }

  return response.data;
};

/**
 * Use lifeline
 */
export const useLifeline = async (
  sessionId: string,
  questionId: string,
  lifelineType: 'fiftyFifty' | 'skip' | 'hint'
): Promise<{ eliminatedOptions?: number[]; hint?: string }> => {
  const response = await apiClient.post<{ eliminatedOptions?: number[]; hint?: string }>(
    '/trivia/lifeline',
    {
      sessionId,
      questionId,
      lifelineType,
    }
  );

  if (!response.success || !response.data) {
    throw new Error('Failed to use lifeline');
  }

  return response.data;
};

/**
 * Get available game modes
 */
export const fetchGameModes = async () => {
  const response = await apiClient.get('/trivia/modes');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch game modes');
  }

  return response.data;
};
