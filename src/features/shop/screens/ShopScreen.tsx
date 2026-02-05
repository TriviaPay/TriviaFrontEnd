import React, { useState, useEffect, ErrorInfo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';
import ShopBalance from './ShopBalance';
import ShopTabs from './ShopTabs';
import ShopContent from './ShopContent';
import AdBanner from '../../../components/AdBanner';
import { useTheme, useShop } from '../../../hooks/useReduxHooks';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { scaleSize } from '../../../utils/scaleSize';

// Error Boundary Component to catch and handle crashes
class ShopErrorBoundary extends React.Component<
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) { }

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

const ShopScreen: React.FC = () => {
  const [activeShopTab, setActiveShopTab] = useState('gems');

  // Hooks must be called unconditionally - wrap in try-catch at usage level
  const theme = useTheme();
  // const shop = useShop(); // Unused
  const isFocused = useIsFocused();
  /* REMOVED: const insets = useSafeAreaInsets(); */
  const insets = useSafeAreaInsets();

  // Responsive dimensions - replaces hardcoded Dimensions.get()
  const { width: screenWidth, height: screenHeight } = useStandardResponsive();

  // Extract values with safe fallbacks
  const colors = theme?.colors || { background: '#FFFFFF', text: '#000000' };
  const isDarkMode = theme?.isDarkMode || false;
  const backgroundColor = colors?.background || '#FFFFFF';

  // Manual gem fetching removed - handled by ShopBalance using RTK Query

  // Safe wrapper for setActiveShopTab to prevent crashes
  const safeSetActiveShopTab = React.useCallback((tab: string) => {
    try {
      if (typeof tab === 'string' && ['gems', 'avatars'].includes(tab)) {
        setActiveShopTab(tab);
      }
    } catch (error) { }
  }, []);

  // If error state, show error UI
  // Error UI removed as error state locally is removed. Child components handle their own errors.

  return (
    <ShopErrorBoundary>
      <SafeScreenWrapper
        backgroundColor="#1E40AF"
        statusBarStyle="light-content"
        edges={['top', 'left', 'right']}
      >
        <View style={{ flex: 1 }}>
          {/* Shop Balance with Heading */}
          <ShopBalance />

          {/* Shop Tabs - Only shop tabs, no main tabs */}
          <ShopTabs
            activeMainTab="shop"
            setActiveMainTab={() => { }}
            activeShopTab={activeShopTab}
            setActiveShopTab={safeSetActiveShopTab}
          />

          {/* Content - Only shop content */}
          <ShopContent activeMainTab="shop" activeShopTab={activeShopTab} />
        </View>

        {/* Advertisement Space - Fixed at bottom */}
        <AdBanner />
      </SafeScreenWrapper>
    </ShopErrorBoundary>
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
  safeArea: {
    flex: 1,
    width: '100%',
  },
  safeAreaBottom: {
    width: '100%',
  },
});

export default ShopScreen;
