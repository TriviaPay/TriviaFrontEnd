import {
  startGameSession,
  fetchQuestions,
  submitAnswer,
  endGameSession,
  useLifeline,
  fetchGameModes,
} from '../../features/trivia/api/triviaApi';
import { apiClient } from '../../core/services/ApiClient';

jest.mock('../../core/services/ApiClient', () => {
  const original = jest.requireActual('../../core/services/ApiClient');
  return {
    ...original,
    apiClient: {
      post: jest.fn(),
      get: jest.fn(),
    },
  };
});

const mockQuestion = {
  id: 'q1',
  question: 'What is 2+2?',
  options: ['1', '2', '3', '4'],
  correctAnswer: 3,
  category: 'Math',
  difficulty: 'easy',
  timeLimit: 30,
};

describe('Trivia API integration', () => {
  it('starts game session', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 's1', mode: 'free', questions: [mockQuestion], startedAt: 'now' },
    });
    const session = await startGameSession('free' as any);
    expect(session.id).toBe('s1');
  });

  it('fetches questions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: [mockQuestion],
    });
    const questions = await fetchQuestions('free' as any, 1);
    expect(questions.length).toBe(1);
    expect(questions[0].id).toBe('q1');
  });

  it('submits answer', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { correct: true, points: 10 },
    });
    const res = await submitAnswer('s1', 'q1', 3, 5);
    expect(res.correct).toBe(true);
    expect(res.points).toBe(10);
  });

  it('ends game session', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { totalPoints: 100, correctAnswers: 10, mode: 'free' },
    });
    const res = await endGameSession('s1', [{ questionId: 'q1', answer: 3, timeSpent: 5 } as any]);
    expect(res.totalPoints).toBe(100);
  });

  it('uses lifeline', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { eliminatedOptions: [0, 1] },
    });
    const res = await useLifeline('s1', 'q1', 'fiftyFifty');
    expect(res.eliminatedOptions).toEqual([0, 1]);
  });

  it('fetches game modes', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: ['free', 'bronze', 'silver'],
    });
    const modes = await fetchGameModes();
    expect(modes).toContain('free');
  });
});
