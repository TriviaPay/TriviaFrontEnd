/**
 * Trivia Feature Types
 */

export type GameMode = 'free' | 'paid' | 'challenge';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type LifelineType = 'fiftyFifty' | 'skip' | 'hint';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  hint?: string;
}

export interface GameSession {
  id: string;
  mode: GameMode;
  entryFee?: number;
  prizePool?: number;
  questions: Question[];
  startedAt: string;
}

export interface GameResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  prize?: number;
  rank?: number;
}

export interface Lifelines {
  fiftyFifty: boolean;
  skip: boolean;
  hint: boolean;
}

export interface PlayerAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TriviaMode {
  id: GameMode;
  name: string;
  description: string;
  entryFee: number;
  prizePool: number;
  questionCount: number;
  difficulty: string;
  icon: string;
  locked: boolean;
}
