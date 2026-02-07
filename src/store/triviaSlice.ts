/**
 * TriviaSlice - TypeScript Implementation
 * Professional trivia slice with comprehensive features
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { logger } from '../lib/utils/logger';
import { apiClient, testApiConnectivity } from '../services/api/apiclient';
import { API_CONFIG } from '../config/api';


const API_URL = `${API_CONFIG.BASE_URL}/trivia`;

// New API response interfaces for free-mode
interface FreeModeQuestion {
  question_id: number | string;
  question_order?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  hint: string;
  fill_in_answer: string | null;
  explanation: string;
  category: string;
  difficulty_level: string;
  picture_url: string | null;
  status: string;
  is_correct: boolean | null;
  answered_at: string | null;
}

interface FreeModeQuestionsResponse {
  message?: string;
  questions: FreeModeQuestion[];
}

interface FreeModeStatusResponse {
  progress: {
    questions_answered: number;
    correct_answers: number;
    total_questions: number;
    completed: boolean;
    all_questions_answered: boolean;
  };
  completion_time: string | null;
  is_winner: boolean;
  current_date: string;
  fill_in_answer?: {
    question_order: number;
    user_answer: string;
    is_correct: boolean;
    answered_at: string;
  }[];
}

interface SubmitAnswerResponse {
  status: string;
  is_correct: boolean;
  message: string;
  submitted_at?: string;
}

// Bronze and Silver Mode interfaces
interface BronzeSilverModeQuestion {
  question_id: number;
  id?: number; // Fallback for some API responses
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  hint: string;
  fill_in_answer: string | null;
  explanation: string;
  category: string;
  difficulty_level: string;
  picture_url: string | null;
  status: string; // "locked", "answered", etc.
  is_correct: boolean | null;
  submitted_at: string | null;
  is_open: boolean;
  time_until_close_seconds: number;
}

interface BronzeSilverModeQuestionResponse {
  question: BronzeSilverModeQuestion;
}

interface BronzeSilverModeSubmitResponse {
  status: string;
  is_correct: boolean;
  submitted_at: string;
  message: string;
  level_info?: {
    level_increased: boolean;
    new_level: number;
    total_correct_answers: number;
    correct_answers_until_next_level: number;
    progress: {
      level: number;
      current_correct_answers: number;
      target_correct_answers: number;
      progress: string;
      total_correct_answers: number;
    };
  };
}

interface BronzeSilverModeStatusResponse {
  has_access?: boolean;
  subscription_status?: string;
  has_submitted: boolean;
  submitted_at: string | null;
  is_correct: boolean | null;
  fill_in_answer: string | null;
  is_winner: boolean;
  current_date: string;
  correct_answer?: string;
  correct_option_id?: string;
}

// Legacy interface for backward compatibility
interface Question {
  question_number: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  category: string;
  difficulty: string;
  picture_url: string | null;
  hint: string;
  correct_answer: string;
  total_gems: number;
  order: number;
  is_common: boolean;
  is_used: boolean;
  total_questions: number;
  questions_answered: number;
  daily_completed: boolean;
  // Fields present when question is already answered
  user_answer?: string | null;
  is_correct?: boolean | null;
  answered_at?: string | null;
  explanation?: string | null;
}

interface SubmissionResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  daily_completed: boolean;
}

interface BoostAvailability {
  available_boosts: {
    streak_saver: number;
    question_reroll: number;
    extra_chance: number;
    hint: number;
    fifty_fifty: number;
    change_question: number;
    auto_submit: number;
  };
  question_changes_remaining: number;
  total_gems: number;
  boost_costs: {
    streak_saver: number;
    question_reroll: number;
    extra_chance: number;
    hint: number;
    fifty_fifty: number;
    change_question: number;
    auto_submit: number;
  };
}

interface QuestionListItem {
  question_number: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  category: string;
  difficulty: string;
  picture_url: string | null;
  order: number;
  is_common: boolean;
  is_unlocked: boolean;
  unlock_method: string | null;
  status: string;
  user_answer: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
}

interface QuestionsListResponse {
  questions: QuestionListItem[];
}

interface QuestionStatus {
  question_number: number;
  is_answered: boolean;
  is_correct: boolean | null;
  user_answer: string | null;
  correct_answer: string;
  answered_at: string | null;
  explanation: string | null;
  status: string;
}

interface TriviaState {
  currentQuestion: Question | null;
  currentFreeModeQuestion: FreeModeQuestion | null; // Current question from free-mode API
  freeModeQuestions: FreeModeQuestion[] | null; // All questions from free-mode API
  freeModeStatus: FreeModeStatusResponse | null; // Status from free-mode API
  currentBronzeModeQuestion: BronzeSilverModeQuestion | null; // Current question from bronze-mode API
  bronzeModeStatus: BronzeSilverModeStatusResponse | null; // Status from bronze-mode API
  currentSilverModeQuestion: BronzeSilverModeQuestion | null; // Current question from silver-mode API
  silverModeStatus: BronzeSilverModeStatusResponse | null; // Status from silver-mode API
  currentMode: 'free' | 'bronze' | 'silver' | null; // Track which mode is active
  selectedAnswer: string | null;
  isSubmitted: boolean;
  isCorrect: boolean;
  dailyCompleted: boolean;
  loading: boolean;
  error: string | null;
  submissionResult: SubmissionResult | null;
  boostAvailability: BoostAvailability | null;
  totalGems: number;
  lastQuestionFetch: number | null;
  lastBoostFetch: number | null;
  questionsList: QuestionListItem[] | null;
  questionStatus: QuestionStatus | null;
  currentQuestionIndex: number; // Index of current question in freeModeQuestions array
}

export const fetchCurrentQuestion = createAsyncThunk(
  'trivia/fetchCurrentQuestion',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      if (!state.auth.isAuthenticated && !state.auth.token) {
        return rejectWithValue('No authentication token available');
      }
      const triviaState = state.trivia;

      if (
        triviaState?.currentQuestion &&
        triviaState?.lastQuestionFetch &&
        Date.now() - triviaState.lastQuestionFetch < 60000
      ) {
        return triviaState.currentQuestion;
      }

      const isConnected = await testApiConnectivity();
      if (!isConnected) {
        return rejectWithValue('Cannot connect to server. Please check your internet connection.');
      }

      const response = await apiClient.get('/trivia/current-question');

      if (!response || typeof response !== 'object') {
        return rejectWithValue('Unable to load question. Please try again.');
      }

      if (response.no_question_available) {
        const message = response.detail || 'No questions available for today';
        return rejectWithValue(message);
      }

      if (
        !response.question ||
        !response.options ||
        typeof response.question !== 'string' ||
        typeof response.options !== 'object'
      ) {
        // Check if user has already completed today's trivia
        if (response.daily_completed) {
          return rejectWithValue("You have already answered today's question. Come back tomorrow!");
        }
        return rejectWithValue('No question available at this time. Please try again later.');
      }

      return response;
    } catch (error: any) {
      logger.error('Error fetching current question:', 'STORE', error);

      // Provide more specific error messages
      if (error.message.includes('Network request failed')) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (error.message.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (error.message.includes('Authentication')) {
        return rejectWithValue('Authentication failed - please log in again');
      }

      return rejectWithValue(error.message || 'Failed to fetch question');
    }
  }
);

export const submitAnswer = createAsyncThunk(
  'trivia/submitAnswer',
  async (
    { questionNumber, answer }: { questionNumber: number; answer: string },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      if (!questionNumber || !answer) {
        return rejectWithValue('Question number and answer are required');
      }

      const apiUrl = `/trivia/submit-answer?question_number=${questionNumber}&answer=${encodeURIComponent(answer)}`;

      const response = await apiClient.post(apiUrl, {});

      return response;
    } catch (error: any) {
      logger.error('Error submitting answer:', 'STORE', error);

      // Check if error contains structured data (is_correct, daily_completed)
      // This happens when API returns error but with useful data
      if (error.is_correct !== undefined) {
        // Return structured error data so UI can display correct/incorrect PNG
        return rejectWithValue({
          message:
            error.message ||
            'You have already answered correctly today. Come back tomorrow for new questions!',
          is_correct: error.is_correct,
          daily_completed: error.daily_completed || false,
          status: error.status || 'error',
        });
      }

      if (error.message.includes('Network request failed')) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (error.message.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (error.message.includes('Authentication')) {
        return rejectWithValue('Authentication failed - please log in again');
      } else if (error.message.includes('HTTP 400')) {
        if (error.message.includes('Question already attempted')) {
          return rejectWithValue(
            'You have already answered this question today. Come back tomorrow!'
          );
        }
        return rejectWithValue('Invalid request - please check your answer format');
      }

      return rejectWithValue(error.message || 'Failed to submit answer');
    }
  }
);

// New free-mode API thunks
export const fetchFreeModeQuestions = createAsyncThunk(
  'trivia/fetchFreeModeQuestions',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      const response = (await apiClient.get(
        '/trivia/free-mode/questions'
      )) as FreeModeQuestionsResponse;

      if (!response || !response.questions || !Array.isArray(response.questions)) {
        return rejectWithValue('Invalid response format from API');
      }

      return response;
    } catch (error: any) {
      logger.error('Error fetching free-mode questions:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch questions');
    }
  }
);

export const fetchFreeModeStatus = createAsyncThunk(
  'trivia/fetchFreeModeStatus',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    logger.debug('🔵 [TRIVIA REDUX] fetchFreeModeStatus - STARTED', 'TRIVIA');
    try {
      logger.debug('🔵 [TRIVIA REDUX] Making GET request to /trivia/free-mode/status', 'TRIVIA');
      const response = (await apiClient.get('/trivia/free-mode/status')) as FreeModeStatusResponse;
      logger.debug('🟢 [TRIVIA REDUX] fetchFreeModeStatus - Response received:', 'TRIVIA', {
        hasResponse: !!response,
        hasProgress: !!response?.progress,
        completed: response?.progress?.completed,
        correctAnswers: response?.progress?.correct_answers,
        totalQuestions: response?.progress?.total_questions,
        questionsAnswered: response?.progress?.questions_answered,
        hasSummary: !!response?.fill_in_answer,
      });

      if (!response || !response.progress) {
        logger.error('🔴 [TRIVIA REDUX] fetchFreeModeStatus - Invalid response format', 'TRIVIA');
        return rejectWithValue('Invalid response format from API');
      }

      return response;
    } catch (error: any) {
      // Suppress "No authentication token available" errors - expected when not logged in
      const errorMessage = error?.message || error?.toString() || String(error);
      const errorString = String(error);
      const isAuthError =
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token') ||
        errorString.includes('No authentication token available') ||
        errorString.includes('No authentication token');

      if (isAuthError) {
        // Silent - expected when user is not authenticated
        // Don't log, just return the error silently
        return rejectWithValue(errorMessage || 'No authentication token available');
      }
      // Only log non-auth errors
      logger.error('🔴 [TRIVIA REDUX] fetchFreeModeStatus - ERROR:', 'TRIVIA', error);
      logger.error('Error fetching free-mode status:', 'STORE', error);
      return rejectWithValue(errorMessage || 'Failed to fetch status');
    }
  }
);

export const fetchCurrentFreeQuestion = createAsyncThunk(
  'trivia/fetchCurrentFreeQuestion',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    if (__DEV__) {
      logger.debug('fetchCurrentFreeQuestion - STARTED', 'STORE');
    }
    try {
      const response: any = await apiClient.get('/trivia/free-mode/current-question');

      // Log response structure for debugging
      if (__DEV__) {
        const responseKeys = response && typeof response === 'object' ? Object.keys(response) : [];
        logger.debug('fetchCurrentFreeQuestion - Raw response received', 'STORE', {
          hasResponse: !!response,
          responseType: typeof response,
          responseKeys,
          hasQuestion: !!response?.question,
          hasQuestionId: !!response?.question_id,
          hasData: !!response?.data,
          noQuestionAvailable: response?.no_question_available,
        });
      }

      // Check for explicit "no question available" response
      if (response && response.no_question_available) {
        const detail = response.detail || 'No current question available';
        if (__DEV__) {
          logger.debug('fetchCurrentFreeQuestion - No question available', 'STORE', detail);
        }
        return rejectWithValue(detail);
      }

      // Try multiple response structures - improved logic
      let candidate: FreeModeQuestion | null = null;

      // Structure 1: response.question (nested question object)
      if (response && typeof response === 'object' && response.question) {
        const question = response.question;
        if (question && typeof question === 'object' && 'question_id' in question) {
          candidate = question as FreeModeQuestion;
        }
      }

      // Structure 2: response.data.question (nested in data)
      if (!candidate && response?.data?.question) {
        const question = response.data.question;
        if (question && typeof question === 'object' && 'question_id' in question) {
          candidate = question as FreeModeQuestion;
        }
      }

      // Structure 3: response is the question object itself (question_id at root)
      if (!candidate && response && typeof response === 'object' && 'question_id' in response) {
        // Verify it has required fields to be a valid question
        if ('question' in response && 'option_a' in response) {
          candidate = response as FreeModeQuestion;
        }
      }

      // Structure 4: response.data is the question object
      if (
        !candidate &&
        response?.data &&
        typeof response.data === 'object' &&
        'question_id' in response.data
      ) {
        if ('question' in response.data && 'option_a' in response.data) {
          candidate = response.data as FreeModeQuestion;
        }
      }

      // Structure 5: response.questions is an array, get first question
      if (
        !candidate &&
        response?.questions &&
        Array.isArray(response.questions) &&
        response.questions.length > 0
      ) {
        const firstQuestion = response.questions[0];
        if (firstQuestion && typeof firstQuestion === 'object' && 'question_id' in firstQuestion) {
          if ('question' in firstQuestion && 'option_a' in firstQuestion) {
            candidate = firstQuestion as FreeModeQuestion;
          }
        }
      }

      // Structure 6: response.data.questions is an array, get first question
      if (
        !candidate &&
        response?.data?.questions &&
        Array.isArray(response.data.questions) &&
        response.data.questions.length > 0
      ) {
        const firstQuestion = response.data.questions[0];
        if (firstQuestion && typeof firstQuestion === 'object' && 'question_id' in firstQuestion) {
          if ('question' in firstQuestion && 'option_a' in firstQuestion) {
            candidate = firstQuestion as FreeModeQuestion;
          }
        }
      }

      // New Structure for Review: response.questions is the main array
      if (response && response.questions && Array.isArray(response.questions)) {
        if (__DEV__) {
          logger.debug('fetchCurrentFreeQuestion - Review questions list detected', 'STORE', {
            count: response.questions.length,
            message: response.message
          });
        }
        return response; // Return the whole object to handle multiple questions
      }

      // Validate candidate
      if (!candidate || !candidate.question_id) {
        const errorMsg = 'No valid question found in API response';
        logger.error('fetchCurrentFreeQuestion - No valid candidate found', 'STORE', {
          responseStructure:
            response && typeof response === 'object' ? Object.keys(response) : 'not an object',
          responseType: typeof response,
        });
        return rejectWithValue(errorMsg);
      }

      // Validate required fields
      if (!candidate.question || !candidate.option_a || !candidate.option_b) {
        const errorMsg = 'Question data is incomplete';
        logger.error('fetchCurrentFreeQuestion - Incomplete question data', 'STORE', {
          hasQuestion: !!candidate.question,
          hasOptionA: !!candidate.option_a,
          hasOptionB: !!candidate.option_b,
          hasOptionD: !!candidate.option_d,
        });
        return rejectWithValue(errorMsg);
      }

      return candidate;
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Failed to fetch current question';
      const errorString = String(error);
      // Suppress "No authentication token available" errors - expected when not logged in
      const isAuthError =
        errorMessage === 'No authentication token available' ||
        errorMessage.includes('No authentication token') ||
        errorString.includes('No authentication token available') ||
        errorString.includes('No authentication token');

      if (isAuthError) {
        // Silent - expected when user is not authenticated
        return rejectWithValue(errorMessage || 'No authentication token available');
      }
      logger.error('fetchCurrentFreeQuestion - ERROR', 'STORE', {
        message: errorMessage,
        error: error?.toString(),
        stack: error?.stack,
      });
      return rejectWithValue(errorMessage);
    }
  }
);

// Bronze Mode API thunks
export const fetchBronzeModeQuestion = createAsyncThunk(
  'trivia/fetchBronzeModeQuestion',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      const response = (await apiClient.get(
        '/trivia/bronze-mode/question'
      )) as BronzeSilverModeQuestionResponse;

      if (!response || !response.question) {
        return rejectWithValue('No bronze mode question available');
      }

      return response.question as BronzeSilverModeQuestion;
    } catch (error: any) {
      logger.error('Error fetching bronze mode question:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch bronze mode question');
    }
  }
);

export const fetchBronzeModeStatus = createAsyncThunk(
  'trivia/fetchBronzeModeStatus',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      const response = (await apiClient.get(
        '/trivia/bronze-mode/status'
      )) as BronzeSilverModeStatusResponse;

      if (!response) {
        return rejectWithValue('Invalid response format from API');
      }

      return response;
    } catch (error: any) {
      logger.error('Error fetching bronze mode status:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch bronze mode status');
    }
  }
);

export const submitBronzeModeAnswer = createAsyncThunk(
  'trivia/submitBronzeModeAnswer',
  async (
    { question_id, answer }: { question_id: number; answer: string },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    logger.debug('🔵 [TRIVIA REDUX] submitBronzeModeAnswer - STARTED', 'TRIVIA', {
      question_id,
      answer,
    });
    try {
      if (!question_id || !answer) {
        logger.error('🔴 [TRIVIA REDUX] submitBronzeModeAnswer - Missing required params', 'TRIVIA');
        return rejectWithValue('Question ID and answer are required');
      }

      logger.debug('🔵 [TRIVIA REDUX] Making POST request to /trivia/bronze-mode/submit-answer', 'TRIVIA');
      const response = (await apiClient.post('/trivia/bronze-mode/submit-answer', {
        question_id,
        answer,
      })) as BronzeSilverModeSubmitResponse;
      console.log('🟢 [TRIVIA REDUX] submitBronzeModeAnswer - Response received:', {
        is_correct: response?.is_correct,
        status: response?.status,
        message: response?.message,
      });

      return response;
    } catch (error: any) {
      logger.error('Error submitting bronze mode answer:', 'STORE', error);

      // Check if error contains structured data
      if (error.is_correct !== undefined) {
        return rejectWithValue({
          message: error.message || 'Failed to submit answer',
          is_correct: error.is_correct,
          status: error.status || 'error',
        });
      }

      return rejectWithValue(error.message || 'Failed to submit answer');
    }
  }
);

// Silver Mode API thunks
export const fetchSilverModeQuestion = createAsyncThunk(
  'trivia/fetchSilverModeQuestion',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      const response = (await apiClient.get(
        '/trivia/silver-mode/question'
      )) as BronzeSilverModeQuestionResponse;

      if (!response || !response.question) {
        return rejectWithValue('No silver mode question available');
      }

      return response.question as BronzeSilverModeQuestion;
    } catch (error: any) {
      logger.error('Error fetching silver mode question:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch silver mode question');
    }
  }
);

export const fetchSilverModeStatus = createAsyncThunk(
  'trivia/fetchSilverModeStatus',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      const response = (await apiClient.get(
        '/trivia/silver-mode/status'
      )) as BronzeSilverModeStatusResponse;

      if (!response) {
        return rejectWithValue('Invalid response format from API');
      }

      return response;
    } catch (error: any) {
      logger.error('Error fetching silver mode status:', 'STORE', error);
      return rejectWithValue(error.message || 'Failed to fetch silver mode status');
    }
  }
);

export const submitSilverModeAnswer = createAsyncThunk(
  'trivia/submitSilverModeAnswer',
  async (
    { question_id, answer }: { question_id: number; answer: string },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    logger.debug('🔵 [TRIVIA REDUX] submitSilverModeAnswer - STARTED', 'TRIVIA', {
      question_id,
      answer,
    });
    try {
      if (!question_id || !answer) {
        logger.error('🔴 [TRIVIA REDUX] submitSilverModeAnswer - Missing required params', 'TRIVIA');
        return rejectWithValue('Question ID and answer are required');
      }

      logger.debug('🔵 [TRIVIA REDUX] Making POST request to /trivia/silver-mode/submit-answer', 'TRIVIA');
      const response = (await apiClient.post('/trivia/silver-mode/submit-answer', {
        question_id,
        answer,
      })) as SubmitAnswerResponse;
      logger.debug('🟢 [TRIVIA REDUX] submitSilverModeAnswer - Response received:', 'TRIVIA', {
        is_correct: response?.is_correct,
        status: response?.status,
        message: response?.message,
      });

      return response;
    } catch (error: any) {
      logger.error('Error submitting silver mode answer:', 'STORE', error);

      // Check if error contains structured data
      if (error.is_correct !== undefined) {
        return rejectWithValue({
          message: error.message || 'Failed to submit answer',
          is_correct: error.is_correct,
          status: error.status || 'error',
        });
      }

      // Handle "already submitted" error
      if (error.message && error.message.includes('already submitted')) {
        return rejectWithValue({
          message: 'You have already submitted an answer for today',
          is_correct: null,
          status: 'already_submitted',
        });
      }

      return rejectWithValue(error.message || 'Failed to submit answer');
    }
  }
);

export const submitFreeModeAnswer = createAsyncThunk(
  'trivia/submitFreeModeAnswer',
  async (
    { question_id, answer }: { question_id: number; answer: string },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    logger.debug('🔵 [TRIVIA REDUX] submitFreeModeAnswer - STARTED', 'TRIVIA', {
      question_id,
      answer,
    });
    try {
      if (!question_id || !answer) {
        logger.error('🔴 [TRIVIA REDUX] submitFreeModeAnswer - Missing required params', 'TRIVIA');
        return rejectWithValue('Question ID and answer are required');
      }

      logger.debug('🔵 [TRIVIA REDUX] Making POST request to /trivia/free-mode/submit-answer', 'TRIVIA');
      const response = (await apiClient.post('/trivia/free-mode/submit-answer', {
        question_id,
        answer,
      })) as SubmitAnswerResponse;
      logger.debug('🟢 [TRIVIA REDUX] submitFreeModeAnswer - Response received:', 'TRIVIA', {
        is_correct: response?.is_correct,
        status: response?.status,
        message: response?.message,
      });

      return response;
    } catch (error: any) {
      logger.error('Error submitting free-mode answer:', 'STORE', error);

      // Check if error contains structured data
      if (error.is_correct !== undefined) {
        return rejectWithValue({
          message: error.message || 'Failed to submit answer',
          is_correct: error.is_correct,
          status: error.status || 'error',
        });
      }

      const rawMessage = (error?.message || '').toString();
      const cleanedMessage = rawMessage.replace(/^HTTP \d{3}:\s*/i, '').trim();
      const lowerMessage = cleanedMessage.toLowerCase();

      // Treat already-answered responses as structured failures so UI can advance
      if (
        lowerMessage.includes('already answered') ||
        lowerMessage.includes('answered_wrong') ||
        lowerMessage.includes('already_answered')
      ) {
        return rejectWithValue({
          message: cleanedMessage || 'Question has already been answered',
          is_correct: false,
          status: 'already_answered',
        });
      }

      return rejectWithValue(cleanedMessage || 'Failed to submit answer');
    }
  }
);

export const fetchBoostAvailability = createAsyncThunk(
  'trivia/fetchBoostAvailability',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      if (!state.auth.isAuthenticated && !state.auth.token) {
        return rejectWithValue('No authentication token available');
      }
      const triviaState = state.trivia;

      // Check if we already have boost data and it's recent (less than 5 minutes old)
      if (
        triviaState?.boostAvailability &&
        triviaState?.lastBoostFetch &&
        Date.now() - triviaState.lastBoostFetch < 300000
      ) {
        return triviaState.boostAvailability;
      }

      const response = await apiClient.get('/trivia/boost-availability');

      if (!response || typeof response !== 'object') {
        return rejectWithValue('Unable to load boost information. Please try again.');
      }

      return response;
    } catch (error: any) {
      logger.error('Error fetching boost availability:', 'STORE', error);

      if (error.message.includes('Network request failed')) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (error.message.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (error.message.includes('Authentication')) {
        return rejectWithValue('Authentication failed - please log in again');
      }

      return rejectWithValue(error.message || 'Failed to fetch boost availability');
    }
  }
);

export const fetchQuestionsList = createAsyncThunk(
  'trivia/fetchQuestionsList',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      // /trivia/questions endpoint removed
      throw new Error('Endpoint no longer available');
    } catch (error: any) {
      logger.error('Error fetching questions list:', 'STORE', error);

      if (error.message.includes('Network request failed')) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (error.message.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (error.message.includes('Authentication')) {
        return rejectWithValue('Authentication failed - please log in again');
      }

      return rejectWithValue(error.message || 'Failed to fetch questions list');
    }
  }
);

export const checkQuestionStatus = createAsyncThunk(
  'trivia/checkQuestionStatus',
  async (questionNumber: number, { rejectWithValue, getState }) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      if (!questionNumber) {
        return rejectWithValue('Question number is required');
      }

      const response = await apiClient.get(`/trivia/question-status/${questionNumber}`);

      // 404 is normal if question hasn't been answered yet - apiClient returns null for 404
      if (!response || response === null) {
        // Question not answered yet - this is not an error
        return null as any; // Return null to indicate no status yet
      }

      // Handle case where API returns {"detail": "Question not found or not unlocked"}
      if (typeof response === 'object' && 'detail' in response) {
        const detail = (response as any).detail;
        if (
          typeof detail === 'string' &&
          (detail.includes('Question not found') ||
            detail.includes('not unlocked') ||
            detail.includes('not found'))
        ) {
          return null as any;
        }
      }

      if (typeof response !== 'object') {
        return rejectWithValue('Unable to check question status. Please try again.');
      }

      return response as QuestionStatus;
    } catch (error: any) {
      logger.error('Error checking question status:', 'STORE', error);

      // Handle structured error responses with "detail" field
      if (error.detail && typeof error.detail === 'string') {
        if (
          error.detail.includes('Question not found') ||
          error.detail.includes('not unlocked') ||
          error.detail.includes('not found')
        ) {
          return null as any;
        }
      }

      if (error.message && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (error.message && error.message.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (error.message && error.message.includes('Authentication')) {
        return rejectWithValue('Authentication failed - please log in again');
      }

      return rejectWithValue(error.message || 'Failed to check question status');
    }
  }
);

interface UnlockNextResponse {
  success: boolean;
  remaining_gems: number;
  unlocked_question: {
    question_number: number;
    question: string;
    options: {
      a: string;
      b: string;
      c: string;
      d: string;
    };
    category: string;
    difficulty: string;
    picture_url: string | null;
    hint: string;
    correct_answer: string;
    order: number;
    is_common: boolean;
  };
}

// unlockNextQuestion removed - endpoint no longer available

export const useBoost = createAsyncThunk(
  'trivia/useBoost',
  async (
    { boostType, questionNumber }: { boostType: string; questionNumber: number },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as any;
    if (!state.auth.isAuthenticated && !state.auth.token) {
      return rejectWithValue('No authentication token available');
    }
    try {
      // Validate question number
      if (!questionNumber || questionNumber <= 0) {
        return rejectWithValue('Invalid question number');
      }

      // Map lifeline names to API boost types
      const boostTypeMap: { [key: string]: string } = {
        '50-50': 'fifty_fifty',
        Auto: 'auto_submit',
        Change: 'change_question',
        Hint: 'hint',
        ExtraChance: 'extra_chance',
      };

      const apiBoostType = boostTypeMap[boostType] || boostType;

      // Use the correct API endpoint: POST /store/gameplay-boosts

      const response = await apiClient.post(`/store/gameplay-boosts`, {
        boost_type: apiBoostType,
        question_number: questionNumber,
      });

      return response;
    } catch (error: any) {
      logger.error('❌ Error using boost:', 'STORE', error);
      logger.error('❌ Error details:', 'STORE', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        boostType,
        questionNumber,
      });

      // Extract error message - check multiple sources
      let errorMessage = error?.message || 'Failed to use boost';

      // Try to extract error from response data if available
      if (error?.response?.data) {
        const responseData = error.response.data;
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
      }

      // Strip "HTTP XXX: " prefix from error messages for cleaner user-facing messages
      // Format: "HTTP 400: Question not unlocked for today" -> "Question not unlocked for today"
      const httpPrefixMatch = errorMessage.match(/^HTTP \d{3}:\s*(.+)$/);
      if (httpPrefixMatch) {
        errorMessage = httpPrefixMatch[1].trim();
      }

      // Check for specific error patterns (case-insensitive)
      const lowerErrorMessage = errorMessage.toLowerCase();

      if (lowerErrorMessage.includes('404') || lowerErrorMessage.includes('not found')) {
        return rejectWithValue('Boost endpoint not found. Please check API configuration.');
      } else if (
        lowerErrorMessage.includes('network request failed') ||
        lowerErrorMessage.includes('network error')
      ) {
        return rejectWithValue('Network error - please check your internet connection');
      } else if (lowerErrorMessage.includes('timeout')) {
        return rejectWithValue('Request timeout - server is taking too long to respond');
      } else if (
        lowerErrorMessage.includes('authentication') ||
        lowerErrorMessage.includes('401') ||
        lowerErrorMessage.includes('unauthorized')
      ) {
        return rejectWithValue('Authentication failed - please log in again');
      } else if (lowerErrorMessage.includes('400') || lowerErrorMessage.includes('bad request')) {
        // Handle specific 400 error cases
        if (
          lowerErrorMessage.includes('insufficient gems') ||
          lowerErrorMessage.includes('insufficient')
        ) {
          return rejectWithValue('Insufficient gems to use this boost');
        } else if (
          lowerErrorMessage.includes('question not unlocked') ||
          lowerErrorMessage.includes('not unlocked for today') ||
          lowerErrorMessage.includes('not unlocked')
        ) {
          return rejectWithValue(
            'Question not unlocked for today. Please unlock the question first.'
          );
        } else if (
          lowerErrorMessage.includes('already answered') ||
          lowerErrorMessage.includes('already_answered')
        ) {
          return rejectWithValue('Question has already been answered');
        } else if (
          lowerErrorMessage.includes('invalid boost request') ||
          lowerErrorMessage.includes('invalid')
        ) {
          return rejectWithValue(`Invalid boost request: ${errorMessage}`);
        }
        // For other 400 errors, return the cleaned error message
        return rejectWithValue(errorMessage);
      }

      // For any other errors, return the cleaned error message
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState: TriviaState = {
  currentQuestion: null,
  currentFreeModeQuestion: null,
  freeModeQuestions: null,
  freeModeStatus: null,
  currentBronzeModeQuestion: null,
  bronzeModeStatus: null,
  currentSilverModeQuestion: null,
  silverModeStatus: null,
  currentMode: null,
  selectedAnswer: null,
  isSubmitted: false,
  isCorrect: false,
  dailyCompleted: false,
  loading: false,
  error: null,
  submissionResult: null,
  boostAvailability: null,
  totalGems: 0,
  lastQuestionFetch: null,
  lastBoostFetch: null,
  questionsList: null,
  questionStatus: null,
  currentQuestionIndex: 0,
};

const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    setSelectedAnswer: (state, action: PayloadAction<string | null>) => {
      state.selectedAnswer = action.payload;
    },
    resetTrivia: state => {
      // CRITICAL: Fully reset all trivia state on logout
      // Don't preserve any state - new user should start fresh
      return {
        ...initialState,
      };
    },
    setTotalGems: (state, action: PayloadAction<number>) => {
      state.totalGems = action.payload;
    },
    setIsSubmitted: (state, action: PayloadAction<boolean>) => {
      state.isSubmitted = action.payload;
    },
    setIsCorrect: (state, action: PayloadAction<boolean>) => {
      state.isCorrect = action.payload;
    },
    clearSubmissionResult: state => {
      // Clear submission result to allow fresh submission processing
      state.submissionResult = null;
      state.isSubmitted = false;
      state.isCorrect = false;
    },
    clearQuestionCache: state => {
      // Clear cache to force fresh fetch
      state.lastQuestionFetch = null;
    },
    setCurrentQuestionFromList: (state, action: PayloadAction<any>) => {
      // Set current question from questions list item
      // Convert QuestionListItem format to Question format
      const listItem = action.payload;
      state.currentQuestion = {
        question_number: listItem.question_number,
        question: listItem.question,
        options: listItem.options,
        category: listItem.category,
        difficulty: listItem.difficulty,
        picture_url: listItem.picture_url,
        hint: '', // Will be fetched from current-question endpoint if available
        correct_answer: '', // Will be fetched from current-question endpoint if available
        total_gems: state.totalGems,
        order: listItem.order,
        is_common: listItem.is_common,
        is_used: false,
        total_questions: 0,
        questions_answered: 0,
        daily_completed: false,
      };
      // Don't set lastQuestionFetch so next fetchCurrentQuestion will fetch fresh
      state.lastQuestionFetch = null;
      // Reset submission state for new question
      state.selectedAnswer = null;
      state.isSubmitted = false;
      state.isCorrect = false;
      state.submissionResult = null;
    },
    setCurrentFreeModeQuestion: (state, action: PayloadAction<FreeModeQuestion | null>) => {
      state.currentFreeModeQuestion = action.payload;
      // Reset submission state when question changes
      if (action.payload) {
        state.selectedAnswer = null;
        state.isSubmitted = false;
        state.isCorrect = false;
        state.submissionResult = null;
      }
    },
    setCurrentMode: (state, action: PayloadAction<'free' | 'bronze' | 'silver' | null>) => {
      state.currentMode = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCurrentQuestion.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentQuestion.fulfilled, (state, action) => {
        state.loading = false;

        if (
          state.currentQuestion &&
          state.currentQuestion.question_number !== action.payload.question_number
        ) {
          if (!state.currentQuestion.hint || state.currentQuestion.hint.trim() === '') {
            state.currentQuestion.hint = action.payload.hint || '';
          }
          if (
            !state.currentQuestion.correct_answer ||
            state.currentQuestion.correct_answer.trim() === ''
          ) {
            state.currentQuestion.correct_answer = action.payload.correct_answer || '';
          }
          state.currentQuestion.total_gems =
            action.payload.total_gems || state.currentQuestion.total_gems || 0;
          state.totalGems = action.payload.total_gems || 0;
        } else {
          state.currentQuestion = action.payload;
          state.totalGems = action.payload.total_gems || 0;
        }

        state.lastQuestionFetch = Date.now();

        state.selectedAnswer = null;
        state.isSubmitted = false;
        state.isCorrect = false;
        state.submissionResult = null;
        state.questionStatus = null;

        state.dailyCompleted = action.payload.daily_completed || false;
      })
      .addCase(fetchCurrentQuestion.rejected, (state, action) => {
        state.loading = false;

        // Check if error payload contains structured data (is_correct, daily_completed)
        const errorPayload = action.payload as any;
        if (errorPayload && typeof errorPayload === 'object' && 'is_correct' in errorPayload) {
          // Store structured error data for UI to use
          state.error = errorPayload.message || 'Failed to fetch question';
          state.isCorrect = errorPayload.is_correct;
          state.dailyCompleted = errorPayload.daily_completed || false;
        } else {
          state.error =
            (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
            'Failed to fetch question';
        }
      })
      .addCase(submitAnswer.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        state.loading = false;
        state.submissionResult = action.payload;
        state.isSubmitted = true;
        state.isCorrect = action.payload.is_correct;
        state.dailyCompleted = action.payload.daily_completed || false;
        if (action.payload.total_gems !== undefined) {
          state.totalGems = action.payload.total_gems;
        }
      })
      .addCase(submitAnswer.rejected, (state, action) => {
        state.loading = false;

        // Check if error payload contains structured data (is_correct, daily_completed, status, message)
        // API returns: { "status": "error", "message": "...", "is_correct": false, "daily_completed": false }
        const errorPayload = action.payload as any;
        if (errorPayload && typeof errorPayload === 'object' && 'is_correct' in errorPayload) {
          // Store structured error data for UI to use
          state.error = errorPayload.message || 'Failed to submit answer';
          state.isCorrect = errorPayload.is_correct;
          state.dailyCompleted = errorPayload.daily_completed || false;
          state.isSubmitted = true; // Mark as submitted so UI can show result
          // Store submission result with is_correct for animation and congrats screen
          state.submissionResult = {
            is_correct: errorPayload.is_correct,
            daily_completed: errorPayload.daily_completed || false,
            correct_answer: errorPayload.correct_answer || null,
            explanation: errorPayload.message || '',
            status: errorPayload.status || 'error',
          } as any;
        } else {
          state.error =
            (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
            'Failed to submit answer';
        }
      })
      .addCase(fetchBoostAvailability.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoostAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.boostAvailability = action.payload;
        state.totalGems = action.payload.total_gems || 0;
        state.lastBoostFetch = Date.now(); // Set timestamp for caching
      })
      .addCase(fetchBoostAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch boost availability';
      })
      .addCase(useBoost.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(useBoost.fulfilled, (state, action) => {
        state.loading = false;
        // Update gems from API response (remaining_gems from /store/gameplay-boosts)
        if (action.payload.remaining_gems !== undefined) {
          state.totalGems = action.payload.remaining_gems;
        }
        // Also check for total_gems (fallback)
        if (action.payload.total_gems !== undefined) {
          state.totalGems = action.payload.total_gems;
        }
        // Store hint from API response if provided
        if (action.payload.hint) {
          // Store hint in a temp field for UI to access
          (state as any).lastBoostHint = action.payload.hint;
        }
        // Update boost availability if provided
        if (action.payload.boost_availability) {
          state.boostAvailability = action.payload.boost_availability;
        }
      })
      .addCase(useBoost.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to use boost';
      })
      .addCase(fetchQuestionsList.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestionsList.fulfilled, (state, action) => {
        state.loading = false;
        state.questionsList = action.payload.questions;
      })
      .addCase(fetchQuestionsList.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch questions list';
      })
      .addCase(checkQuestionStatus.pending, state => {
        // Don't set loading to true for status check to avoid UI blocking
      })
      .addCase(checkQuestionStatus.fulfilled, (state, action) => {
        // action.payload can be null if question hasn't been answered yet (404)
        state.questionStatus = action.payload || null;
      })
      .addCase(checkQuestionStatus.rejected, (state, action) => {
        // 404 is normal if question hasn't been answered yet - don't treat as error
        const errorMessage =
          typeof action.payload === 'string' ? action.payload : action.payload?.toString() || '';
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          // Question not answered yet - set status to null (not an error)
          state.questionStatus = null;
        } else {
          // Other errors - log but don't show to user
          logger.error('Question status check failed:', 'STORE', action.payload);
          state.questionStatus = null;
        }
      })
      // Free-mode API reducers
      .addCase(fetchFreeModeQuestions.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFreeModeQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.freeModeQuestions = action.payload.questions;
        // Set first unlocked question as current if available
        // Questions with status "answered_correct", "answered_wrong", or "locked" should be skipped
        // Only questions with status "unlocked" or without answered_at should be set as current
        const firstUnlocked = action.payload.questions.find(
          q => q.status === 'unlocked' || (!q.answered_at && q.status !== 'locked')
        );
        if (firstUnlocked) {
          state.currentFreeModeQuestion = firstUnlocked;
          state.currentQuestionIndex = action.payload.questions.indexOf(firstUnlocked);
        } else if (!state.currentFreeModeQuestion && action.payload.questions.length > 0) {
          // If no unlocked questions, set to first question (already answered scenario)
          state.currentFreeModeQuestion = action.payload.questions[0];
          state.currentQuestionIndex = 0;
        }
      })
      .addCase(fetchFreeModeQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch questions';
      })
      .addCase(fetchFreeModeStatus.pending, state => {
        // Don't set loading for status check
      })
      .addCase(fetchFreeModeStatus.fulfilled, (state, action) => {
        console.log('🟢 [TRIVIA REDUX] fetchFreeModeStatus.fulfilled - Updating state:', {
          completed: action.payload?.progress?.completed,
          correctAnswers: action.payload?.progress?.correct_answers,
          totalQuestions: action.payload?.progress?.total_questions,
          questionsAnswered: action.payload?.progress?.questions_answered,
        });
        state.freeModeStatus = action.payload;
        state.dailyCompleted = action.payload.progress.completed;
      })
      .addCase(fetchFreeModeStatus.rejected, (state, action) => {
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch status';
      })
      .addCase(submitFreeModeAnswer.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitFreeModeAnswer.fulfilled, (state, action) => {
        console.log('🟢 [TRIVIA REDUX] submitFreeModeAnswer.fulfilled - Updating state:', {
          is_correct: action.payload.is_correct,
          status: action.payload.status,
        });
        const answerValue = (action.meta as any)?.arg?.answer;
        state.loading = false;
        state.isSubmitted = true;
        state.isCorrect = action.payload.is_correct;
        // Persist answer on current question for navigation/review
        if (state.currentFreeModeQuestion) {
          state.currentFreeModeQuestion.is_correct = action.payload.is_correct;
          state.currentFreeModeQuestion.status = action.payload.is_correct
            ? 'answered_correct'
            : 'answered_wrong';
          if (answerValue) {
            state.currentFreeModeQuestion.fill_in_answer = answerValue;
            state.currentFreeModeQuestion.answered_at =
              state.currentFreeModeQuestion.answered_at || new Date().toISOString();
          }

          // Update the question in the questions list if needed
          if (state.freeModeQuestions) {
            const questionIndex = state.freeModeQuestions.findIndex(
              q => q.question_id === state.currentFreeModeQuestion?.question_id
            );
            if (questionIndex !== -1) {
              state.freeModeQuestions[questionIndex].is_correct = action.payload.is_correct;
              state.freeModeQuestions[questionIndex].status = action.payload.is_correct
                ? 'answered_correct'
                : 'answered_wrong';
              if (answerValue) {
                state.freeModeQuestions[questionIndex].fill_in_answer = answerValue;
                state.freeModeQuestions[questionIndex].answered_at =
                  state.freeModeQuestions[questionIndex].answered_at || new Date().toISOString();
              }
            } else {
              state.freeModeQuestions.push({
                ...state.currentFreeModeQuestion,
                fill_in_answer: answerValue || state.currentFreeModeQuestion.fill_in_answer,
                answered_at: state.currentFreeModeQuestion.answered_at || new Date().toISOString(),
              } as any);
            }
          } else {
            state.freeModeQuestions = [
              {
                ...state.currentFreeModeQuestion,
                fill_in_answer: answerValue || state.currentFreeModeQuestion.fill_in_answer,
                answered_at: state.currentFreeModeQuestion.answered_at || new Date().toISOString(),
              } as any,
            ];
          }
        }
        if (answerValue) {
          state.selectedAnswer = answerValue;
        }
        // Update submission result
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentFreeModeQuestion?.correct_answer || '',
          explanation: action.payload.message || '',
          daily_completed: state.freeModeStatus?.progress.completed || false,
        };
      })
      .addCase(submitFreeModeAnswer.rejected, (state, action) => {
        state.loading = false;
        const answerValue = (action.meta as any)?.arg?.answer;
        const errorPayload = action.payload as any;
        if (errorPayload && typeof errorPayload === 'object' && 'is_correct' in errorPayload) {
          state.isSubmitted = true;
          state.isCorrect = errorPayload.is_correct;

          if (state.currentFreeModeQuestion) {
            const derivedStatus =
              errorPayload.status ||
              (errorPayload.is_correct ? 'answered_correct' : 'answered_wrong');
            state.currentFreeModeQuestion.is_correct = errorPayload.is_correct;
            state.currentFreeModeQuestion.status = derivedStatus as any;
            if (answerValue) {
              state.currentFreeModeQuestion.fill_in_answer = answerValue;
              state.currentFreeModeQuestion.answered_at =
                state.currentFreeModeQuestion.answered_at || new Date().toISOString();
            }

            if (state.freeModeQuestions) {
              const questionIndex = state.freeModeQuestions.findIndex(
                q => q.question_id === state.currentFreeModeQuestion?.question_id
              );
              if (questionIndex !== -1) {
                state.freeModeQuestions[questionIndex].is_correct = errorPayload.is_correct;
                state.freeModeQuestions[questionIndex].status = derivedStatus as any;
                if (answerValue) {
                  state.freeModeQuestions[questionIndex].fill_in_answer = answerValue;
                  state.freeModeQuestions[questionIndex].answered_at =
                    state.freeModeQuestions[questionIndex].answered_at || new Date().toISOString();
                }
              } else {
                state.freeModeQuestions.push({
                  ...state.currentFreeModeQuestion,
                  fill_in_answer: answerValue || state.currentFreeModeQuestion.fill_in_answer,
                  answered_at:
                    state.currentFreeModeQuestion.answered_at || new Date().toISOString(),
                  status: derivedStatus as any,
                  is_correct: errorPayload.is_correct,
                } as any);
              }
            } else {
              state.freeModeQuestions = [
                {
                  ...state.currentFreeModeQuestion,
                  fill_in_answer: answerValue || state.currentFreeModeQuestion.fill_in_answer,
                  answered_at:
                    state.currentFreeModeQuestion.answered_at || new Date().toISOString(),
                  status: derivedStatus as any,
                  is_correct: errorPayload.is_correct,
                } as any,
              ];
            }
          }

          state.submissionResult = {
            is_correct: errorPayload.is_correct,
            correct_answer: state.currentFreeModeQuestion?.correct_answer || '',
            explanation: errorPayload.message || '',
            daily_completed: false,
          };
        } else {
          state.error =
            (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
            'Failed to submit answer';
        }
      })
      .addCase(fetchCurrentFreeQuestion.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentFreeQuestion.fulfilled, (state, action) => {
        const payload = action.payload;
        const isReviewList = payload && payload.questions && Array.isArray(payload.questions);

        console.log('🟢 [TRIVIA REDUX] fetchCurrentFreeQuestion.fulfilled - Updating state:', {
          isReviewList,
          questionId: !isReviewList ? payload?.question_id : 'N/A',
          questionsCount: isReviewList ? payload.questions.length : 1,
        });

        state.loading = false;

        if (isReviewList) {
          // Handle the review mode list
          state.freeModeQuestions = payload.questions;
          if (payload.questions.length > 0) {
            state.currentFreeModeQuestion = payload.questions[0];
            state.currentQuestionIndex = 0;
          }
        } else {
          // Handle single question
          state.currentFreeModeQuestion = payload;
          if (payload) {
            if (!state.freeModeQuestions) {
              state.freeModeQuestions = [payload as any];
            } else {
              const idx = state.freeModeQuestions.findIndex(
                q => q.question_id === payload.question_id
              );
              if (idx >= 0) {
                state.freeModeQuestions[idx] = payload as any;
              } else {
                state.freeModeQuestions.push(payload as any);
              }
            }
          }
        }

        // Reset submission state for new question or review list
        state.selectedAnswer = null;
        state.isSubmitted = false;
        state.isCorrect = false;
        state.submissionResult = null;
      })
      .addCase(fetchCurrentFreeQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch current question';

        // Treat "no valid candidate" as free-mode completion so UI can show summary
        const existingProgress = state.freeModeStatus?.progress || {
          correct_answers: state.freeModeQuestions?.filter(q => q.is_correct)?.length || 0,
          total_questions: state.freeModeQuestions?.length || 0,
          completed: true,
        };
        state.freeModeStatus = {
          ...(state.freeModeStatus || {}),
          progress: {
            correct_answers: existingProgress.correct_answers ?? 0,
            total_questions: existingProgress.total_questions ?? 0,
            completed: true,
          },
        } as any;
        state.currentFreeModeQuestion = null;
        state.isSubmitted = true;
      })
      // Bronze Mode reducers
      .addCase(fetchBronzeModeQuestion.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBronzeModeQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBronzeModeQuestion = action.payload;
        state.currentMode = 'bronze';
        // Reset submission state for new question
        state.selectedAnswer = null;
        state.isSubmitted = false;
        state.isCorrect = false;
        state.submissionResult = null;
      })
      .addCase(fetchBronzeModeQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch bronze mode question';
      })
      .addCase(fetchBronzeModeStatus.pending, state => {
        // Don't set loading for status check
      })
      .addCase(fetchBronzeModeStatus.fulfilled, (state, action) => {
        state.bronzeModeStatus = action.payload;
      })
      .addCase(fetchBronzeModeStatus.rejected, (state, action) => {
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch bronze mode status';
      })
      .addCase(submitBronzeModeAnswer.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitBronzeModeAnswer.fulfilled, (state, action) => {
        console.log('🟢 [TRIVIA REDUX] submitBronzeModeAnswer.fulfilled - Updating state:', {
          is_correct: action.payload.is_correct,
          status: action.payload.status,
        });
        state.loading = false;
        state.isSubmitted = true;
        state.isCorrect = action.payload.is_correct;
        if (state.currentBronzeModeQuestion) {
          state.currentBronzeModeQuestion.is_correct = action.payload.is_correct;
          state.currentBronzeModeQuestion.submitted_at = action.payload.submitted_at;
          state.currentBronzeModeQuestion.status = 'answered';
        }
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentBronzeModeQuestion?.correct_answer || '',
          explanation: action.payload.message || '',
          daily_completed: false,
        };
      })
      // Silver Mode reducers
      .addCase(fetchSilverModeQuestion.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSilverModeQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSilverModeQuestion = action.payload;
        state.currentMode = 'silver';
        // Reset submission state for new question
        state.selectedAnswer = null;
        state.isSubmitted = false;
        state.isCorrect = false;
        state.submissionResult = null;
      })
      .addCase(fetchSilverModeQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch silver mode question';
      })
      .addCase(fetchSilverModeStatus.pending, state => {
        // Don't set loading for status check
      })
      .addCase(fetchSilverModeStatus.fulfilled, (state, action) => {
        state.silverModeStatus = action.payload;
      })
      .addCase(fetchSilverModeStatus.rejected, (state, action) => {
        state.error =
          (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
          'Failed to fetch silver mode status';
      })
      .addCase(submitSilverModeAnswer.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitSilverModeAnswer.fulfilled, (state, action) => {
        console.log('🟢 [TRIVIA REDUX] submitSilverModeAnswer.fulfilled - Updating state:', {
          is_correct: action.payload.is_correct,
          status: action.payload.status,
        });
        state.loading = false;
        state.isSubmitted = true;
        state.isCorrect = action.payload.is_correct;
        if (state.currentSilverModeQuestion) {
          state.currentSilverModeQuestion.is_correct = action.payload.is_correct;
          state.currentSilverModeQuestion.submitted_at = action.payload.submitted_at;
          state.currentSilverModeQuestion.status = 'answered';
        }
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentSilverModeQuestion?.correct_answer || '',
          explanation: action.payload.message || '',
          daily_completed: false,
        };
      })
      .addCase(submitSilverModeAnswer.rejected, (state, action) => {
        state.loading = false;
        const errorPayload = action.payload as any;
        if (errorPayload && typeof errorPayload === 'object' && 'is_correct' in errorPayload) {
          state.isSubmitted = true;
          state.isCorrect = errorPayload.is_correct;
          state.submissionResult = {
            is_correct: errorPayload.is_correct,
            correct_answer: state.currentSilverModeQuestion?.correct_answer || '',
            explanation: errorPayload.message || '',
            daily_completed: errorPayload.daily_completed || false,
          };
        } else {
          state.error =
            (typeof action.payload === 'string' ? action.payload : action.payload?.toString()) ||
            'Failed to submit answer';
        }
      });
  },
});

export const {
  setSelectedAnswer,
  resetTrivia,
  setTotalGems,
  setIsSubmitted,
  setIsCorrect,
  clearSubmissionResult,
  clearQuestionCache,
  setCurrentQuestionFromList,
  setCurrentMode,
} = triviaSlice.actions;

// Export actions separately
export const { setCurrentFreeModeQuestion } = triviaSlice.actions;
export default triviaSlice.reducer;
