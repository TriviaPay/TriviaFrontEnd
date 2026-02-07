import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import {
  useGetFreeModeStatusQuery,
  useGetCurrentFreeQuestionQuery,
  useGetFreeModeQuestionsQuery,
} from '../../../store/api/triviaApi';
import { setCurrentMode, fetchFreeModeQuestions } from '../../../store/triviaSlice';
import { AppDispatch } from '../../../store';

export const useFreeModeData = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isFocused = useIsFocused();
  const MODE = 'free';

  // Track manual navigation to prevent API overwrites
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  // 1. Fetch Status (polling less often)
  const {
    data: statusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
    error: statusError,
  } = useGetFreeModeStatusQuery(undefined, {
    pollingInterval: 30000,
    skip: !isFocused,
    refetchOnMountOrArgChange: true,
  });

  // 2. Fetch Current Question
  const {
    data: questionData,
    isLoading: isLoadingQuestion,
    isFetching: isFetchingQuestion,
    refetch: refetchQuestion,
    error: questionError,
  } = useGetCurrentFreeQuestionQuery(undefined, {
    skip: !isFocused || isManualNavigation,
    refetchOnMountOrArgChange: true,
  });

  // 3. Fetch All Questions (for completion/review)
  const { data: allQuestionsData, refetch: refetchAllQuestions } = useGetFreeModeQuestionsQuery(
    undefined,
    {
      skip: !isFocused, // Fetch when screen is focused so arrows have data
      refetchOnMountOrArgChange: true,
    }
  );

  // Combined Loading/Fetching State
  const isLoading = isLoadingStatus || isLoadingQuestion;
  const isFetching = isFetchingQuestion;
  const error = statusError || questionError;

  // Sync with Redux (legacy compatibility)
  useEffect(() => {
    if (isFocused) {
      // Use mode from statusData if available, otherwise default to 'free'
      const activeMode = statusData?.mode || MODE;
      dispatch(setCurrentMode(activeMode));
      console.log('🔄 [useFreeModeData] Syncing mode to Redux:', activeMode);
    }
  }, [isFocused, dispatch, statusData?.mode]);

  // Handle completion state
  // CRITICAL: Check both completed and all_questions_answered
  // API may return all_questions_answered=true with completed=false
  const isCompleted = Boolean(
    statusData?.progress?.completed || statusData?.progress?.all_questions_answered
  );

  // Fetch all questions when completed
  useEffect(() => {
    if (isCompleted && isFocused) {
      refetchAllQuestions();
      // Trigger legacy fetch for compatibility - explicitly typed
      dispatch(fetchFreeModeQuestions());
    }
  }, [isCompleted, isFocused, dispatch, refetchAllQuestions]);

  // Manual refresh function
  const refetch = async () => {
    setIsManualNavigation(false);
    await Promise.all([refetchStatus(), refetchQuestion()]);
  };

  /**
   * Set manual navigation mode
   * When true, automatic question fetching is paused to allow reviewing previous questions
   */
  const setManualNavigationFn = (enabled: boolean) => {
    setIsManualNavigation(enabled);
  };

  // CRITICAL: Normalize questionData to handle actual API response
  // API returns { message, questions: [...] } not a single question object
  let normalizedQuestionData = null;

  if (questionData) {
    // If API returns {questions: [...]}, extract first question
    if (questionData.questions && Array.isArray(questionData.questions)) {
      normalizedQuestionData = questionData.questions[0] || null;
    }
    // If wrapped as { question: {...} } or { data: { question: {...} } }
    else if (questionData.question) {
      normalizedQuestionData = questionData.question;
    } else if (questionData.data?.question) {
      normalizedQuestionData = questionData.data.question;
    }
    // Already a flat question object
    else if (questionData.question_id || questionData.question_text) {
      normalizedQuestionData = questionData;
    }
  }

  // CRITICAL: Normalize allQuestionsData to handle wrapped array responses
  // API returns { message, questions: [...] } or { questions: [...] }
  let normalizedQuestionsArray = [];

  if (allQuestionsData) {
    // Extract questions array from wrapper
    const questionsArray =
      allQuestionsData.questions ?? allQuestionsData.data?.questions ?? allQuestionsData;

    // Ensure it's an array and unwrap each item if needed
    if (Array.isArray(questionsArray)) {
      normalizedQuestionsArray = questionsArray.map((item: any) => {
        if (item?.question) {
          // Spread item.question first, then item to ensure item's fields (like fill_in_answer, is_correct) 
          // are preserved as they usually reside at the root of the array items.
          return { ...item.question, ...item };
        }
        return item;
      });
    }
  }

  return {
    statusData,
    questionData: normalizedQuestionData,
    allQuestionsData: normalizedQuestionsArray,
    isLoading,
    isFetching,
    error,
    refetch,
    isCompleted: !!isCompleted,
    setManualNavigation: setManualNavigationFn,
    isManualNavigation,
  };
};
