import { baseApi } from './baseApi';

export interface FreeModeStatus {
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
  // Optional legacy fields if still needed by other logic
  active?: boolean;
  lives?: number;
  current_streak?: number;
  max_streak?: number;
}

export interface FreeModeQuestion {
  question_id: number | string;
  question_order?: number;
  question: string; // User response uses 'question' instead of 'question_text'
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  options?: { // Fallback/compatibility
    a: string;
    b: string;
    c: string;
    d: string;
  };
  category: string;
  difficulty_level: string; // User response uses 'difficulty_level'
  picture_url?: string | null;
  hint?: string;
  explanation?: string;
  // Submission fields
  fill_in_answer?: string;
  answered_at?: string;
  status?: string;
  is_correct?: boolean;
  correct_answer?: string;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  points_awarded?: number;
  lives_remaining?: number;
}

export interface BronzeSilverModeSummary {
  question_order: number;
  user_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export const triviaApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: builder => ({
    getFreeModeStatus: builder.query<FreeModeStatus, void>({
      query: () => '/trivia/free-mode/status',
      providesTags: ['Trivia'],
    }),
    getCurrentFreeQuestion: builder.query<any, void>({
      query: () => '/trivia/free-mode/current-question',
      providesTags: ['Trivia'],
      // Normalize wrapped responses: { question: {...}, questions: [...] }
      transformResponse: (response: any) => {
        // Unwrap if needed
        if (response?.question) return response.question;
        if (response?.data?.question) return response.data.question;
        if (response?.questions && Array.isArray(response.questions)) {
          // If it's the "All questions completed" response with a list
          return {
            message: response.message,
            questions: response.questions.map((q: any) => {
              // CRITICAL: Only unwrap if q.question is an OBJECT (wrapper)
              // If q.question is a string, it's the question text, so return q as is
              if (q?.question && typeof q.question === 'object') return q.question;
              return q;
            })
          };
        }
        // Already flat or includes questions list
        return response;
      },
    }),
    getFreeModeQuestions: builder.query<{ questions: FreeModeQuestion[] }, void>({
      query: () => '/trivia/free-mode/questions',
      providesTags: ['Trivia'],
      // Normalize wrapped responses in questions array
      transformResponse: (response: any) => {
        // Handle { questions: [...] } or { data: { questions: [...] } }
        const questionsArray = response?.questions || response?.data?.questions || response;

        // Unwrap each question if needed - only if it's an object wrapper
        const normalizedQuestions = Array.isArray(questionsArray)
          ? questionsArray.map((item: any) => {
            if (item?.question && typeof item.question === 'object') return item.question;
            return item;
          })
          : [];

        return { questions: normalizedQuestions };
      },
    }),
    submitFreeModeAnswer: builder.mutation<
      SubmitAnswerResponse,
      { question_id: string; answer: string }
    >({
      query: ({ question_id, answer }) => ({
        url: '/trivia/free-mode/submit-answer',
        method: 'POST',
        body: { question_id, answer },
      }),
      invalidatesTags: ['Trivia'],
    }),
    // Bronze Mode
    getBronzeModeStatus: builder.query<BronzeSilverModeStatusResponse, void>({
      query: () => '/trivia/bronze-mode/status',
      providesTags: ['Trivia'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        return data?.bronze_mode || data;
      },
    }),
    getBronzeModeQuestion: builder.query<{ question: BronzeSilverModeQuestion }, void>({
      query: () => '/trivia/bronze-mode/question',
      providesTags: ['Trivia'],
      transformResponse: (response: any) => response?.data || response,
    }),
    submitBronzeModeAnswer: builder.mutation<
      BronzeSilverModeSubmitResponse,
      { question_id: number; answer: string }
    >({
      query: ({ question_id, answer }) => ({
        url: '/trivia/bronze-mode/submit-answer',
        method: 'POST',
        body: { question_id, answer },
      }),
      invalidatesTags: ['Trivia'],
    }),
    // Silver Mode
    getSilverModeStatus: builder.query<BronzeSilverModeStatusResponse, void>({
      query: () => '/trivia/silver-mode/status',
      providesTags: ['Trivia'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        return data?.silver_mode || data;
      },
    }),
    getSilverModeQuestion: builder.query<{ question: BronzeSilverModeQuestion }, void>({
      query: () => '/trivia/silver-mode/question',
      providesTags: ['Trivia'],
      transformResponse: (response: any) => response?.data || response,
    }),
    submitSilverModeAnswer: builder.mutation<
      BronzeSilverModeSubmitResponse,
      { question_id: number; answer: string }
    >({
      query: ({ question_id, answer }) => ({
        url: '/trivia/silver-mode/submit-answer',
        method: 'POST',
        body: { question_id, answer },
      }),
      invalidatesTags: ['Trivia'],
    }),
    // Unified Modes Status
    getModesStatus: builder.query<ModesStatusResponse, void>({
      query: () => '/profile/modes/status',
      providesTags: ['Trivia'],
    }),
  }),
});

export const {
  useGetFreeModeStatusQuery,
  useGetCurrentFreeQuestionQuery,
  useGetFreeModeQuestionsQuery,
  useSubmitFreeModeAnswerMutation,
  useGetBronzeModeStatusQuery,
  useGetBronzeModeQuestionQuery,
  useSubmitBronzeModeAnswerMutation,
  useGetSilverModeStatusQuery,
  useGetSilverModeQuestionQuery,
  useSubmitSilverModeAnswerMutation,
  useGetModesStatusQuery,
} = triviaApi;

// Bronze/Silver interfaces
export interface BronzeSilverModeQuestion {
  question_id: number;
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
  submitted_at: string | null;
  is_open: boolean;
  time_until_close_seconds: number;
}

export interface BronzeSilverModeStatusResponse {
  has_access?: boolean;
  subscription_status?: string;
  has_submitted: boolean;
  submitted_at: string | null;
  is_correct: boolean | null;
  fill_in_answer: string | null;
  is_winner: boolean;
  current_date: string;
  // Common fields
  active?: boolean;
  lives?: number;
  current_streak?: number;
}

export interface ModesStatusResponse {
  free_mode: ModeStatus;
  bronze_mode: ModeStatus;
  silver_mode: ModeStatus;
  gold_mode?: ModeStatus;
  platinum_mode?: ModeStatus;
}

export interface ModeStatus {
  has_access: boolean;
  subscription_status: string;
  subscription_details: any;
  mode_name: string;
  price: number;
  questions_remaining: number;
  task_completed: boolean;
  message: string;
  in_reset_window: boolean;
  reset_window_minutes_left: number;
}


export interface BronzeSilverModeSubmitResponse {
  status: string;
  is_correct: boolean;
  submitted_at: string;
  message: string;
  explanation?: string;
  correct_answer?: string;
  level_info?: any; // Simplify for now
}
