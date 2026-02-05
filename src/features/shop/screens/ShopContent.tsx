import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useDispatch, useSelector } from 'react-redux';
import ShopItemList from './ShopItemList';
import { useTheme } from '../../../hooks/useReduxHooks';
import { updateShopItems } from '../../../store/slices/shopSlice';
import {
  useGetCosmeticsQuery,
  useGetGemPackagesQuery,
  ShopItem,
  GemPackageItem,
} from '../../../store/api/shopApi';
import authService from '../../../services/authService';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { logger } from '../../../lib/utils/logger';

interface ShopContentProps {
  activeMainTab: string;
  activeShopTab: string;
}

const ShopContent: React.FC<ShopContentProps> = ({ activeMainTab, activeShopTab }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    width: screenWidth,
    height: screenHeight,
    isSmallDevice,
    scaleSize,
  } = useStandardResponsive();

  // Validate screenWidth - ensure it's a valid number (defensive programming)
  const validScreenWidth = React.useMemo(() => {
    if (
      typeof screenWidth === 'number' &&
      !isNaN(screenWidth) &&
      isFinite(screenWidth) &&
      screenWidth > 0
    ) {
      return screenWidth;
    }
    // Fallback to a reasonable default (iPhone standard width)
    return 375;
  }, [screenWidth]);

  // Validate screenHeight - ensure it's a valid number
  const validScreenHeight = React.useMemo(() => {
    if (
      typeof screenHeight === 'number' &&
      !isNaN(screenHeight) &&
      isFinite(screenHeight) &&
      screenHeight > 0
    ) {
      return screenHeight;
    }
    // Fallback to a reasonable default (iPhone standard height)
    return 667;
  }, [screenHeight]);

  // Safely extract colors with fallbacks
  const colors = theme?.colors || {
    background: '#FFFFFF',
    text: '#000000',
    accent: '#2563EB',
    cardBackground: '#FFFFFF',
    textSecondary: '#666666',
    border: '#E0E0E0',
  };

  // RTK Query hooks
  const {
    data: cosmeticsItems = [],
    isLoading: isCosmeticsLoading,
    error: cosmeticsError,
    refetch: refetchCosmetics,
  } = useGetCosmeticsQuery(undefined, {
    refetchOnMountOrArgChange: 30, // Refetch if cache is older than 30s
  });

  const {
    data: gemPackagesItems = [],
    isLoading: isGemPackagesLoading,
    error: gemPackagesError,
    refetch: refetchGemPackages,
  } = useGetGemPackagesQuery(undefined, {
    refetchOnMountOrArgChange: 30, // Refetch if cache is older than 30s
  });

  // Create responsive styles
  const styles = createStyles(validScreenHeight, isSmallDevice, scaleSize);

  // Sync items to shopSlice for purchase thunk lookup
  React.useEffect(() => {
    if (cosmeticsItems.length > 0 || gemPackagesItems.length > 0) {
      dispatch(updateShopItems([...cosmeticsItems, ...gemPackagesItems]));
    }
  }, [cosmeticsItems, gemPackagesItems, dispatch]);

  // Combine items based on selection
  const rawCosmeticsItems = cosmeticsItems;
  const rawGemPackagesItems = gemPackagesItems;

  const items = React.useMemo(() => {
    // Combine cosmetics and gem packages items
    const allRawItems = [...rawCosmeticsItems, ...rawGemPackagesItems];

    if (!Array.isArray(allRawItems)) {
      return [];
    }

    // items are already transformed/validated by RTK Query transformResponse
    const validItems = allRawItems;

    // Filter by active shop tab - ensure all matching items are returned
    if (activeMainTab === 'shop') {
      if (activeShopTab === 'avatars') {
        return validItems.filter(item => item.type === 'avatar');
      } else if (activeShopTab === 'gems') {
        return validItems.filter(item => item.type === 'gem');
      }
    }

    // For settings tab or default, return all items
    return validItems;
  }, [rawCosmeticsItems, rawGemPackagesItems, activeMainTab, activeShopTab]);

  // Determine status
  const isLoading = activeShopTab === 'gems' ? isGemPackagesLoading : isCosmeticsLoading;
  const error = activeShopTab === 'gems' ? gemPackagesError : cosmeticsError;
  const hasError = !!error;
  const status = isLoading ? 'loading' : hasError ? 'failed' : 'succeeded';

  // Refetch function
  const refetch = React.useCallback(() => {
    if (activeShopTab === 'gems') {
      refetchGemPackages();
    } else {
      refetchCosmetics();
    }
  }, [activeShopTab, refetchGemPackages, refetchCosmetics]);



  // Settings is now a separate screen, so we only show shop content
  // Show loading state only when actively loading AND no items exist AND haven't waited too long
  // Don't show loading forever - show items if we have them even if status is loading
  const showLoading = status === 'loading' && items.length === 0;

  // Don't block UI - always show items if available, even during loading
  if (showLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: '#FFFFFF' }]}>
        <LottieView
          source={require('../../../../assets/signup/DogParachute.json')}
          autoPlay
          loop
          style={{ width: scaleSize(150), height: scaleSize(150) }}
        />
        <Text style={[styles.loadingText, { color: '#333333' }]}>Loading shop items...</Text>
      </View>
    );
  }
  // Show error state if fetch failed AND no items exist
  if (status === 'failed' && items.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors?.background || '#FFFFFF' },
        ]}
      >
        <Text style={[styles.errorText, { color: colors?.text || '#000000' }]}>
          Failed to load shop items
        </Text>
        {hasError && error && (
          <Text style={[styles.errorSubText, { color: colors?.textSecondary || '#666666' }]}>
            {String(error || '').trim() || 'An error occurred'}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors?.accent || '#2563EB' }]}
          onPress={() => {
            refetch();
          }}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render items - show items even if status is loading (optimistic UI)
  // This ensures items display even if status hasn't updated yet
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors?.background || '#FFFFFF' }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      bounces={true}
      decelerationRate="normal"
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      refreshControl={
        <RefreshControl
          refreshing={status === 'loading' && items.length === 0}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors?.accent || '#2563EB'}
        />
      }
    >
      {items.length > 0 ? (
        <ShopItemList items={items} />
      ) : (
        <View style={styles.centerContent}>
          {activeMainTab === 'shop' && (activeShopTab === 'gems' || activeShopTab === 'combo') ? (
            <Text style={[styles.loadingText, { color: colors?.textSecondary || '#666666' }]}>
              Coming soon
            </Text>
          ) : (
            <Text style={[styles.loadingText, { color: colors?.textSecondary || '#666666' }]}>
              No avatars available
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (
  screenHeight: number,
  isSmallDevice: boolean,
  scaleSize: (size: number) => number
) =>
  StyleSheet.create({
    centerContent: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: scaleSize(20),
    },
    container: {
      flex: 1,
    },
    errorSubText: {
      fontSize: scaleSize(14),
      textAlign: 'center',
    },
    errorText: {
      fontSize: scaleSize(18),
      fontWeight: 'bold',
      marginBottom: scaleSize(8),
    },
    loadingText: {
      fontSize: scaleSize(18),
      textAlign: 'center',
    },
    retryButton: {
      alignItems: 'center',
      borderRadius: scaleSize(8),
      justifyContent: 'center',
      marginTop: scaleSize(16),
      paddingHorizontal: scaleSize(24),
      paddingVertical: scaleSize(12),
    },
    retryButtonText: {
      fontSize: scaleSize(16),
      fontWeight: 'bold',
    },
    scrollContent: {
      padding: isSmallDevice ? scaleSize(12) : scaleSize(16),
      paddingBottom: isSmallDevice ? scaleSize(80) : scaleSize(90), // Add bottom padding for navigation bar
      flexGrow: 1,
      alignItems: 'center',
    },
  });

export default ShopContent;
