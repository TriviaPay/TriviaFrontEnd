/**
 * Trivia Feature Module
 * Public API
 */

// Screens
export { default as TriviaSelectionScreen } from './screens/TriviaSelectionScreen';
export { default as TriviaScreen } from './screens/TriviaScreen';
export { default as CongratsScreen } from './screens/CongratsScreen';

// Hooks
export { useTrivia } from './hooks/useTrivia';
export { useTimer } from './hooks/useTimer';

// Components
export { QuestionCard } from './components/QuestionCard';
export { OptionButton } from './components/OptionButton';
export { Timer } from './components/Timer';
export { LifelineButton } from './components/LifelineButton';

// Types
export type { Question, GameMode, GameSession, GameResult, Lifelines } from './types';
