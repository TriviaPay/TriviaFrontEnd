/**
 * Trivia Feature Tests
 */

import { renderHookWithProviders, waitFor, act } from '../../testUtils';
import { useTrivia } from '@features/trivia';
import * as triviaApi from '@features/trivia/api/triviaApi';

jest.mock('@features/trivia/api/triviaApi');

describe('Trivia Feature', () => {
  const mockQuestions = [
    {
      id: '1',
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      category: 'Math',
      difficulty: 'easy' as const,
      timeLimit: 30,
    },
  ];

  const mockSession = {
    id: 'session1',
    mode: 'free' as const,
    questions: mockQuestions,
    startedAt: new Date().toISOString(),
  };

  describe('useTrivia hook', () => {
    it('should start game successfully', async () => {
      (triviaApi.startGameSession as jest.Mock).mockResolvedValue(mockSession);

      const { result } = renderHookWithProviders(() => useTrivia());

      await act(async () => {
        await result.current.startNewGame('free');
      });

      await waitFor(() => {
        expect(result.current.gameStatus).toBe('playing');
        expect(result.current.questions).toEqual(mockQuestions);
      });
    });

    it('should submit answer correctly', async () => {
      (triviaApi.startGameSession as jest.Mock).mockResolvedValue(mockSession);
      (triviaApi.submitAnswer as jest.Mock).mockResolvedValue({ correct: true, points: 100 });

      const { result } = renderHookWithProviders(() => useTrivia());

      await act(async () => {
        await result.current.startNewGame('free');
      });

      await act(async () => {
        await result.current.submitAnswer(1, 10);
      });

      await waitFor(() => {
        expect(result.current.score).toBeGreaterThan(0);
        expect(result.current.correctAnswers).toBe(1);
      });
    });

    it('should use lifeline successfully', async () => {
      (triviaApi.startGameSession as jest.Mock).mockResolvedValue(mockSession);
      (triviaApi.useLifeline as jest.Mock).mockResolvedValue({ eliminatedOptions: [0, 2] });

      const { result } = renderHookWithProviders(() => useTrivia());

      await act(async () => {
        await result.current.startNewGame('free');
      });

      await act(async () => {
        await result.current.useLifeline('fiftyFifty');
      });

      await waitFor(() => {
        expect(result.current.lifelines.fiftyFifty).toBe(false);
      });
    });
  });
});
