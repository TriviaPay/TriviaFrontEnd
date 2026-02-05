/**
 * Game Flow Integration Test
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { Providers } from '../../app/Providers';
import { useTrivia } from '@features/trivia';
import * as triviaApi from '@features/trivia/api/triviaApi';

jest.mock('@features/trivia/api/triviaApi');

describe('Game Flow Integration', () => {
  it('should complete full game flow', async () => {
    const mockSession = {
      id: 'session1',
      mode: 'free' as const,
      questions: [
        {
          id: '1',
          question: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          category: 'Test',
          difficulty: 'easy' as const,
          timeLimit: 30,
        },
      ],
      startedAt: new Date().toISOString(),
    };

    (triviaApi.startGameSession as jest.Mock).mockResolvedValue(mockSession);
    (triviaApi.submitAnswer as jest.Mock).mockResolvedValue({ correct: true, points: 100 });
    (triviaApi.endGameSession as jest.Mock).mockResolvedValue({
      score: 100,
      correctAnswers: 1,
      totalQuestions: 1,
      timeSpent: 30,
    });

    const { result } = renderHook(() => useTrivia(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    });

    // Start game
    await result.current.startNewGame('free');
    await waitFor(() => expect(result.current.gameStatus).toBe('playing'));

    // Answer question
    await result.current.submitAnswer(0, 10);
    await waitFor(() => expect(result.current.score).toBe(100));

    // End game
    await result.current.endCurrentGame();
    await waitFor(() => expect(result.current.gameStatus).toBe('finished'));
  });
});
