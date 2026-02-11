import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';

type FreeModeQuestionSummary = {
  question_id: number;
  question_order?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  fill_in_answer: string | null;
  user_answer?: string | null;
  is_correct: boolean | null;
  status?: string;
};

type FreeModeStatusSummary = {
  progress?: {
    correct_answers: number;
    total_questions: number;
    completed: boolean;
  };
};

type Props = {
  visible: boolean;
  status: FreeModeStatusSummary | null;
  questions: FreeModeQuestionSummary[] | null;
  onClose: () => void;
};

const FreeModeCompletionModal: React.FC<Props> = ({ visible, status, questions, onClose }) => {
  const { width } = useStandardResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);

  const sortedQuestions = useMemo(() => {
    const list = questions ?? [];
    return [...list].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));
  }, [questions]);

  const scoreText = useMemo(() => {
    const correct = status?.progress?.correct_answers;
    const total = status?.progress?.total_questions;
    if (typeof correct !== 'number' || typeof total !== 'number') return '';
    return `${correct}/${total}`;
  }, [status?.progress?.correct_answers, status?.progress?.total_questions]);

  const resolveAnswerText = (
    value: string | null | undefined,
    q: FreeModeQuestionSummary
  ): string => {
    if (!value) return '—';
    const normalized = String(value).toLowerCase().trim();
    if (normalized === 'a') return q.option_a;
    if (normalized === 'b') return q.option_b;
    if (normalized === 'c') return q.option_c;
    if (normalized === 'd') return q.option_d;
    return String(value);
  };

  const currentQuestion = sortedQuestions[currentIndex];
  const totalQuestions = sortedQuestions.length;

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0); // Reset to first question
    onClose();
  };

  // Reset index when modal first opens
  React.useEffect(() => {
    if (visible) {
      console.log('🎯 [FreeModeCompletionModal] Modal opened:', {
        visible,
        totalQuestions,
        hasQuestions: sortedQuestions.length > 0,
        questions: sortedQuestions,
      });
      setCurrentIndex(0);
    }
  }, [visible, totalQuestions, sortedQuestions]);

  // Debug: Log navigation
  console.log('🎯 [FreeModeCompletionModal] Render:', {
    visible,
    currentIndex,
    totalQuestions,
    hasCurrentQuestion: !!currentQuestion,
  });

  if (!visible) {
    return null; // Don't render if not visible
  }

  if (!currentQuestion || totalQuestions === 0) {
    // Show error message instead of returning null
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.backdropContainer}>
          <View
            style={[
              styles.card,
              { width: Math.min(width - scaleSize(32), scaleSize(400)), padding: scaleSize(20) },
            ]}
          >
            <Text style={styles.title}>No Questions Available</Text>
            <Text style={styles.subtitle}>Unable to load completed questions.</Text>
            <SoundTouchableOpacity onPress={handleClose} style={styles.cta}>
              <Text style={styles.ctaText}>Close</Text>
            </SoundTouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const isCorrect = currentQuestion.is_correct === true ||
    (currentQuestion.status && currentQuestion.status.toLowerCase().includes('correct'));
  const statusLabel =
    currentQuestion.is_correct == null && !currentQuestion.status ? '—' : isCorrect ? 'Correct ✓' : 'Wrong ✗';
  const statusColor =
    currentQuestion.is_correct == null && !currentQuestion.status ? '#6b7280' : isCorrect ? '#16a34a' : '#dc2626';

  const userAnswerValue = currentQuestion.fill_in_answer || currentQuestion.user_answer;
  const userAnswerText = resolveAnswerText(userAnswerValue, currentQuestion);
  const correctAnswerText = resolveAnswerText(currentQuestion.correct_answer, currentQuestion);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdropContainer} pointerEvents="box-none">
        {/* Backdrop - tappable to close */}
        <SoundTouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={{ flex: 1 }} />
        </SoundTouchableOpacity>

        {/* Card - centered */}
        <View
          style={[styles.card, { width: Math.min(width - scaleSize(32), scaleSize(400)) }]}
          pointerEvents="box-none"
        >
          <View pointerEvents="auto">
            <Text style={styles.title}>Free Mode Complete! 🎉</Text>
            <Text style={styles.subtitle}>Review Your Answers</Text>
            {!!scoreText && <Text style={styles.score}>Score: {scoreText}</Text>}

            {/* Current Question Display */}
            <View style={styles.questionContainer}>
              {/* Header with status */}
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  Question {currentIndex + 1} of {totalQuestions}
                </Text>
                <View style={[styles.pill, { backgroundColor: statusColor }]}>
                  <Text style={[styles.pillText, { color: '#ffffff' }]}>{statusLabel}</Text>
                </View>
              </View>

              {/* Question Text */}
              <Text style={styles.questionText}>{currentQuestion.question}</Text>

              {/* Answers Section */}
              <View style={styles.answersBox}>
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Your Answer:</Text>
                  <Text
                    style={[
                      styles.answerValue,
                      { color: isCorrect ? '#16a34a' : '#dc2626', fontWeight: 'bold' },
                    ]}
                  >
                    {userAnswerText}
                  </Text>
                </View>

                <View style={[styles.answerRow, { marginTop: scaleSize(8) }]}>
                  <Text style={styles.answerLabel}>Correct Answer:</Text>
                  <Text style={[styles.answerValue, { color: '#16a34a', fontWeight: 'bold' }]}>
                    {correctAnswerText}
                  </Text>
                </View>
              </View>

              {/* Navigation Arrows */}
              <View style={styles.navigation}>
                <SoundTouchableOpacity
                  onPress={handlePrev}
                  disabled={currentIndex === 0}
                  style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                >
                  <Icon
                    name="chevron-left"
                    size={scaleSize(28)}
                    color={currentIndex === 0 ? '#cbd5e1' : '#0a7aca'}
                  />
                </SoundTouchableOpacity>

                <Text style={styles.navText}>
                  {currentIndex + 1} / {totalQuestions}
                </Text>

                <SoundTouchableOpacity
                  onPress={handleNext}
                  disabled={currentIndex === totalQuestions - 1}
                  style={[
                    styles.navButton,
                    currentIndex === totalQuestions - 1 && styles.navButtonDisabled,
                  ]}
                >
                  <Icon
                    name="chevron-right"
                    size={scaleSize(28)}
                    color={currentIndex === totalQuestions - 1 ? '#cbd5e1' : '#0a7aca'}
                  />
                </SoundTouchableOpacity>
              </View>
            </View>

            {/* Close Button */}
            <SoundTouchableOpacity onPress={handleClose} activeOpacity={0.9} style={styles.cta}>
              <Text style={styles.ctaText}>Close</Text>
            </SoundTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  answerLabel: {
    color: '#64748b',
    flex: 0,
    fontFamily: 'Baloo2',
    fontSize: scaleSize(13),
    minWidth: scaleSize(100),
  },
  answerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: scaleSize(8),
  },
  answerValue: {
    flex: 1,
    flexWrap: 'wrap',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(13),
  },
  answersBox: {
    backgroundColor: '#f8fafc',
    borderRadius: scaleSize(12),
    marginBottom: scaleSize(16),
    padding: scaleSize(16),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    elevation: 1,
    zIndex: 1,
  },
  backdropContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: scaleSize(16),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: scaleSize(16),
    elevation: 2,
    maxHeight: '80%',
    padding: scaleSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: '100%',
    zIndex: 2,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: '#0a7aca',
    borderRadius: scaleSize(12),
    marginTop: scaleSize(16),
    paddingVertical: scaleSize(14),
  },
  ctaText: {
    color: '#ffffff',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(15),
    fontWeight: 'bold',
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSize(12),
  },
  itemTitle: {
    color: '#64748b',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(14),
  },
  navButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: scaleSize(8),
    padding: scaleSize(8),
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navText: {
    color: '#64748b',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(14),
    fontWeight: 'bold',
  },
  navigation: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(8),
  },
  pill: {
    borderRadius: scaleSize(12),
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(4),
  },
  pillText: {
    fontFamily: 'Baloo2',
    fontSize: scaleSize(12),
    fontWeight: 'bold',
  },
  questionContainer: {
    marginTop: scaleSize(16),
  },
  questionText: {
    color: '#0f172a',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(15),
    lineHeight: scaleSize(22),
    marginBottom: scaleSize(16),
  },
  score: {
    color: '#0a7aca',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(16),
    fontWeight: 'bold',
    marginTop: scaleSize(8),
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(14),
    marginTop: scaleSize(4),
    textAlign: 'center',
  },
  title: {
    color: '#0f172a',
    fontFamily: 'Baloo2',
    fontSize: scaleSize(22),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FreeModeCompletionModal;
