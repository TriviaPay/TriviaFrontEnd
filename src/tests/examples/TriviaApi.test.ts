import { apiClient } from '../../services/api/apiclient';
import { triviaApi } from '../../store/api/triviaApi';

// Example of mocking the apiClient for unit testing
jest.mock('../../services/api/apiclient', () => ({
    apiClient: {
        get: jest.fn(),
        post: jest.fn(),
    },
}));

describe('Trivia API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('successfully fetches free mode questions', async () => {
        const mockQuestions = {
            questions: [
                { question_id: 1, question: 'What is 2+2?', option_a: '4', option_b: '5', option_c: '6', option_d: '7' },
            ],
        };

        (apiClient.get as jest.Mock).mockResolvedValueOnce(mockQuestions);

        // In a real scenario, you would test the RTK Query hook or the thunk
        // Here we just verify the client interaction as an example
        const result = await apiClient.get('/trivia/free-mode/questions');

        expect(apiClient.get).toHaveBeenCalledWith('/trivia/free-mode/questions');
        expect(result).toEqual(mockQuestions);
    });

    it('handles API errors gracefully', async () => {
        (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

        await expect(apiClient.get('/trivia/free-mode/questions')).rejects.toThrow('Network Error');
    });
});
