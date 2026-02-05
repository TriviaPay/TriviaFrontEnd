import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import { useIsFocused } from '@react-navigation/native';
import SettingsHeader from './SettingsHeader';
import SettingsContent from '../../shop/screens/SettingsContent';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

// Error Boundary Component to catch and handle crashes
class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error logging can be added here if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, styles.errorContainer]}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorSubText}>Please try again later</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const SettingsScreen: React.FC = () => {
  const [hasError, setHasError] = React.useState(false);

  // Hooks must be called unconditionally - wrap in try-catch at usage level
  const theme = useTheme();
  const isFocused = useIsFocused();

  // Responsive dimensions - replaces hardcoded Dimensions.get()
  const { width: screenWidth, height: screenHeight } = useStandardResponsive();

  // Extract values with safe fallbacks
  const colors = theme?.colors || { background: '#FFFFFF', text: '#000000' };
  const isDarkMode = theme?.isDarkMode || false;
  const backgroundColor = colors?.background || '#FFFFFF';

  // If error state, show error UI
  if (hasError) {
    return (
      <SafeScreenWrapper
        statusBarStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <View style={[styles.errorContainer, { backgroundColor }]}>
          <Text style={[styles.errorText, { color: colors?.text || '#000000' }]}>
            Unable to load settings
          </Text>
          <Text style={[styles.errorSubText, { color: colors?.textSecondary || '#666666' }]}>
            Please try again later
          </Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SettingsErrorBoundary>
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="#1e90ff"
        edges={['top', 'bottom', 'left', 'right']}
      >
        <SettingsHeader />
        <SettingsContent />
      </SafeScreenWrapper>
    </SettingsErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorSubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default SettingsScreen;
