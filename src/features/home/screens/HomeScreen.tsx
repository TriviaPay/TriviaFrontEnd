import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { spacing } from '../../../theme/spacing';
import { usePlatformOptimization, useHapticFeedback } from '../../../hooks/usePlatformOptimization';
import { ScreenBackButtonHandler } from '../../../core/components/BackButtonHandler';
import { ScreenErrorBoundary } from '../../../core/error/ScreenErrorBoundary';
import { logger } from '../../../lib/utils/logger';
import { useThemeColors } from '../../../utils/themeColors';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useGetProfileQuery } from '../../../store/api/profileApi';
import { useAppDispatch } from '../../../store/hooks';
import GlobalLoader from '../../../components/GlobalLoader';

const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();

  // Platform-specific optimizations
  const { triggerHaptic } = useHapticFeedback();
  usePlatformOptimization();

  const { scaleFont, getHorizontalSpacing, getVerticalSpacing } = useStandardResponsive();

  // Fetch profile data and track loading state
  const { isLoading: isProfileLoading, isFetching: isProfileFetching } = useGetProfileQuery();
  const [error, setError] = useState<string | null>(null);

  // Error handling wrapper
  const handleError = (error: Error | string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    logger.error('HomeScreen error', 'HOME', errorMessage);
    setError(errorMessage);
  };

  const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
    StyleSheet.create({
      container: {
        alignItems: 'center',
        backgroundColor: '#1e90ff',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: getHorizontalSpacing(2.5),
      },
      errorText: {
        color: colors.error,
        fontSize: scaleFont(14),
        marginTop: getVerticalSpacing(1),
        textAlign: 'center',
      },
      loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      subtitle: {
        color: colors.textSecondary,
        fontSize: scaleFont(16),
        textAlign: 'center',
      },
      title: {
        color: colors.primary,
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        marginBottom: getVerticalSpacing(1.25),
      },
    });

  const styles = createStyles(colors);

  // Render error state
  if (error) {
    return (
      <ScreenErrorBoundary screenName="HomeScreen">
        <SafeScreenWrapper
          statusBarStyle="light-content"
          backgroundColor={colors.black}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <ScreenBackButtonHandler action="navigate" />
          <View style={styles.container}>
            <Text style={styles.title}>Welcome to TriviaPay!</Text>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Text style={styles.subtitle}>Please try again later</Text>
          </View>
        </SafeScreenWrapper>
      </ScreenErrorBoundary>
    );
  }

  // Render main content
  return (
    <ScreenErrorBoundary screenName="HomeScreen">
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScreenBackButtonHandler action="navigate" />
        {isProfileLoading ? (
          <GlobalLoader forceShow={true} />
        ) : (
          <View style={styles.container}>
            <Text style={styles.title}>Welcome to TriviaPay!</Text>
            <Text style={styles.subtitle}>Your trivia adventure starts here</Text>
          </View>
        )}
      </SafeScreenWrapper>
    </ScreenErrorBoundary>
  );
};

export default HomeScreen;
