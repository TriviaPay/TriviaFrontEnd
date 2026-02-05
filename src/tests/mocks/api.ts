/**
 * Mock API Layer
 */

export const mockApiResponses = {
  '/auth/login': {
    success: true,
    data: {
      user: { id: '1', email: 'test@test.com', username: 'test' },
      token: 'mock-token',
    },
  },
  '/trivia/start': {
    success: true,
    data: {
      id: 'session1',
      mode: 'free',
      questions: [
        {
          id: '1',
          question: 'Mock Question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          category: 'Test',
          difficulty: 'easy',
          timeLimit: 30,
        },
      ],
      startedAt: new Date().toISOString(),
    },
  },
  '/wallet/transactions': {
    success: true,
    data: [],
  },
  '/shop/items': {
    success: true,
    data: [],
  },
};

export function getMockResponse(url: string) {
  return mockApiResponses[url as keyof typeof mockApiResponses] || { success: false };
}
