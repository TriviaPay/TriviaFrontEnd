import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionCard } from '../../features/trivia/components/QuestionCard';

const question = {
  id: 'q1',
  question: 'Which planet is known as the Red Planet?',
  options: ['Earth', 'Mars', 'Venus', 'Jupiter'],
  correctAnswer: 1,
  category: 'Space',
  difficulty: 'easy',
  timeLimit: 30,
};

describe('QuestionCard snapshots', () => {
  it('renders question card', () => {
    const { toJSON } = render(
      <QuestionCard question={question as any} questionNumber={1} totalQuestions={10} />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
