import React, { useState, useRef, memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Modal } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useShop } from '../../../hooks/useReduxHooks';
import { useTheme } from '../../../hooks/useReduxHooks';
import { fetchCosmetics } from '../../../store/shopCosmeticsSlice';
import { RootState } from '../../store';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';
import { useThemeColors } from '../../../utils/themeColors';
import { LoadingIndicator } from '../../../components/LoadingComponents';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';
import { BREAKPOINTS } from '../../constants/uiConstants';
import { logger } from '../../../lib/utils/logger';

interface ShopItemProps {
  item: any;
}

// Global request deduplication and caching - shared across all ShopItem instances
// This prevents multiple fetches for the same URL across different components
const LOTTIE_FETCH_CACHE = new Map<string, Promise<any>>();
const LOTTIE_DATA_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

// Create styles function - must be defined before component to avoid hoisting issues
const createStyles = (
  themeColors: ReturnType<typeof useThemeColors>,
  screenWidth: number,
  screenHeight: number,
  isSmallDevice: boolean,
  horizontalPadding: number,
  scaleSize: (size: number) => number
) =>
  StyleSheet.create({
    badgeContainer: {
      alignSelf: 'center',
      backgroundColor: themeColors.errorDark,
      borderRadius: 6,
      marginBottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    badgeText: {
      color: 'white',
      fontSize: 9,
      fontWeight: 'bold',
    },
    buyButton: {
      paddingVertical: screenHeight < 600 ? scaleSize(8) : scaleSize(10),
      borderRadius: isSmallDevice ? scaleSize(6) : scaleSize(8),
      marginTop: screenHeight < 600 ? 8 : 10,
      height: screenHeight < 600 ? 36 : 40, // Fixed height for button
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      justifyContent: 'center', // Center button content
      alignItems: 'center', // Center button content
    },
    buyButtonDisabled: {
      opacity: 0.6,
    },
    buyButtonInner: {
      alignItems: 'center',
      width: '100%',
    },
    buyButtonText: {
      color: 'white',
      fontSize: isSmallDevice ? scaleSize(12) : scaleSize(14),
      fontWeight: 'bold',
      textAlign: 'center',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      minHeight: isSmallDevice ? scaleSize(90) : scaleSize(100), // Fixed minimum height for image area
      maxHeight: isSmallDevice ? scaleSize(90) : scaleSize(100), // Fixed maximum height for image area
    },
    discountBadge: {
      backgroundColor: themeColors.errorDark,
      borderRadius: 8,
      left: -4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      position: 'absolute',
      top: -4,
      transform: [{ rotate: '-30deg' }],
      zIndex: 10,
    },
    discountText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    gemIcon: {
      flexShrink: 0,
      height: isSmallDevice ? scaleSize(16) : scaleSize(18),
      marginRight: scaleSize(4),
      width: isSmallDevice ? scaleSize(16) : scaleSize(18),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      marginTop: 4,
      height: isSmallDevice ? scaleSize(40) : scaleSize(44), // Fixed height for title area
      maxWidth: '100%',
    },
    imageContainer: {
      width: isSmallDevice ? scaleSize(80) : scaleSize(90), // Fixed size for all image types
      height: isSmallDevice ? scaleSize(80) : scaleSize(90), // Fixed size for all image types
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden', // Changed to hidden to maintain size
      alignSelf: 'center', // Center the container
    },
    itemContainer: {
      width: '100%', // Take full width of parent wrapper (which is already calculated for 2 columns)
      borderRadius: isSmallDevice ? scaleSize(10) : scaleSize(14),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: screenHeight < 600 ? scaleSize(2) : scaleSize(4),
      },
      shadowOpacity: 0.3,
      shadowRadius: screenHeight < 600 ? scaleSize(4) : scaleSize(6),
      elevation: screenHeight < 600 ? 4 : 8,
      marginBottom: 0, // Margin handled by parent wrapper
      borderWidth: isSmallDevice ? 2 : 2.5,
      borderColor: themeColors.warning,
      alignSelf: 'flex-start', // Prevent stretching - keep all cards same size
    },
    itemGradient: {
      padding: isSmallDevice ? scaleSize(10) : scaleSize(12),
      position: 'relative',
      height: screenHeight < 600 ? scaleSize(280) : scaleSize(320), // Fixed height to keep all cards same size
      maxWidth: '100%',
      overflow: 'hidden',
      justifyContent: 'space-between', // Distribute content evenly
    },
    itemImage: {
      width: isSmallDevice ? scaleSize(80) : scaleSize(90), // Same size as container
      height: isSmallDevice ? scaleSize(80) : scaleSize(90), // Same size as container
      backgroundColor: 'transparent',
      resizeMode: 'contain', // Ensure image fits within bounds
    },
    itemName: {
      color: 'white',
      flexShrink: 1,
      fontSize: isSmallDevice ? scaleSize(13) : scaleSize(15),
      fontWeight: 'bold',
      maxWidth: '100%',
      textAlign: 'center',
    },
    lottieContainer: {
      width: screenWidth < 375 ? 80 : 90, // Same size as image container
      height: screenWidth < 375 ? 80 : 90, // Same size as image container
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    lottieImage: {
      height: isSmallDevice ? scaleSize(80) : scaleSize(90),
      width: isSmallDevice ? scaleSize(80) : scaleSize(90),
    },
    lottieLoaderOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 1,
    },
    priceContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginHorizontal: scaleSize(4),
    },
    priceIcon: {
      fontSize: isSmallDevice ? scaleSize(14) : scaleSize(16),
      marginRight: scaleSize(4),
    },
    priceRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleSize(8),
      justifyContent: 'center',
      marginTop: screenHeight < 600 ? scaleSize(6) : scaleSize(8),
    },
    priceText: {
      color: '#FFFFFF', // Changed to white as requested
      flexShrink: 1,
      fontSize: isSmallDevice ? scaleSize(13) : scaleSize(14),
      fontWeight: 'bold',
      maxWidth: isSmallDevice ? scaleSize(50) : scaleSize(60),
    },
    redTag: {
      backgroundColor: themeColors.error,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
      position: 'absolute',
      right: 6,
      top: 6,
      zIndex: 10,
    },
    redTagText: {
      color: 'white',
      fontSize: 9,
      fontWeight: 'bold',
    },
  });

const ShopItem: React.FC<ShopItemProps> = memo(
  ({ item }) => {
    // CRITICAL: Hooks must be called unconditionally BEFORE any early returns
    // This prevents "Rendered fewer hooks than expected" error
    const shop = useShop();
    const theme = useTheme();
    const themeColors = useThemeColors();
    const dispatch = useDispatch();
    const {
      width: screenWidth,
      height: screenHeight,
      isSmallDevice,
      horizontalPadding,
      scaleSize: scaleSizeFunc,
    } = useStandardResponsive();

    // Guard against null/undefined item - AFTER hooks are called
    // Comprehensive validation to prevent all crash scenarios
    if (
      !item ||
      typeof item !== 'object' ||
      !item.id ||
      typeof item.id !== 'string' ||
      item.id.trim() === '' ||
      !item.name ||
      typeof item.name !== 'string' ||
      item.name.trim() === ''
    ) {
      if (__DEV__) {
      }
      return null;
    }

    // Get cosmetics state to check if already loading
    const cosmeticsState = useSelector((state: RootState) => {
      try {
        return (state as any)?.cosmetics || { status: 'idle', items: [] };
      } catch {
        return { status: 'idle', items: [] };
      }
    });

    // Safely extract values with fallbacks
    const purchaseItem = shop?.purchaseItem;
    const fetchUserGems = shop?.fetchUserGems;
    const purchaseHistory = Array.isArray(shop?.purchaseHistory) ? shop.purchaseHistory : [];
    const isDarkMode = theme?.isDarkMode || false;
    const [isPurchasing, setIsPurchasing] = useState(false);
    const isProcessingRef = useRef(false);
    const [lottieLoading, setLottieLoading] = useState(false); // Start false - Lottie displays immediately with cache
    const [lottieRetryCount, setLottieRetryCount] = useState(0);
    const [lottieJsonData, setLottieJsonData] = useState<any>(null); // Store fetched JSON data for JSON Lottie files
    const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
    const lottieTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lottieLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lottieMountedRef = useRef(true);
    const lottieRef = useRef<any>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fetchJsonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFetchingRef = useRef(false); // Track if fetch is in progress for this item
    const fetchAbortControllerRef = useRef<AbortController | null>(null); // Track abort controller
    const maxRetries = 3; // Maximum retry attempts
    const maxLoadingTime = 2000; // 2 seconds max - hide loading quickly, Lottie displays with cache

    // Global refresh lock (shared across all ShopItem instances)
    // This prevents multiple items from triggering refreshes simultaneously
    const GLOBAL_REFRESH_LOCK = {
      isRefreshing: false,
      lastRefreshTime: 0,
      cooldownPeriod: 30000, // 30 seconds minimum between refreshes
    };

    // Check if item is already purchased - now safe because we checked item exists - memoized
    const isPurchased = useMemo(
      () => Array.isArray(purchaseHistory) && purchaseHistory.includes(item.id),
      [purchaseHistory, item.id]
    );

    // Check if image URL is a Lottie file (JSON or dotlottie) - improved detection - memoized callback
    const isLottieFile = useCallback((url: string): boolean => {
      if (!url || typeof url !== 'string') return false;

      const lowerUrl = url.toLowerCase();
      const cleanUrl = lowerUrl.split('?')[0]; // Remove query params

      // Check for both .json and .lottie (dotlottie) formats
      const isLottie =
        cleanUrl.endsWith('.json') ||
        cleanUrl.endsWith('.lottie') ||
        lowerUrl.includes('.json?') ||
        lowerUrl.includes('.json&') ||
        lowerUrl.includes('.lottie?') ||
        lowerUrl.includes('.lottie&') ||
        lowerUrl.includes('lottie') ||
        lowerUrl.includes('animation') ||
        lowerUrl.includes('lottiefiles.com');

      return isLottie;
    }, []);

    // Check if URL is a dotlottie file (.lottie format)
    const isDotLottieFile = useCallback((url: string): boolean => {
      if (!url || typeof url !== 'string') return false;

      const lowerUrl = url.toLowerCase();
      const cleanUrl = lowerUrl.split('?')[0]; // Remove query params

      return (
        cleanUrl.endsWith('.lottie') ||
        lowerUrl.includes('.lottie?') ||
        lowerUrl.includes('.lottie&')
      );
    }, []);

    // Check if URL is a JSON Lottie file (not dotlottie)
    const isJsonLottieFile = useCallback(
      (url: string): boolean => {
        if (!url || typeof url !== 'string') return false;

        const lowerUrl = url.toLowerCase();
        const cleanUrl = lowerUrl.split('?')[0]; // Remove query params

        // JSON Lottie files end with .json (but not .lottie)
        return (
          (cleanUrl.endsWith('.json') ||
            lowerUrl.includes('.json?') ||
            lowerUrl.includes('.json&')) &&
          !isDotLottieFile(url)
        );
      },
      [isDotLottieFile]
    );

    // Professional fetch method with request deduplication and caching
    const fetchLottieJson = useCallback(
      async (url: string, retryCount: number = 0): Promise<any> => {
        // Check cache first
        const cached = LOTTIE_DATA_CACHE.get(url);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          logger.debug(`[ShopItem] Using cached Lottie JSON for ${item.name || item.id}`, 'API');
          if (lottieMountedRef.current) {
            setLottieJsonData(cached.data);
            setLottieLoading(false);
          }
          return cached.data;
        }

        // Check if there's already an in-flight request for this URL
        const existingRequest = LOTTIE_FETCH_CACHE.get(url);
        if (existingRequest) {
          logger.debug(
            `[ShopItem] Reusing existing fetch request for ${item.name || item.id}`,
            'API'
          );
          try {
            const data = await existingRequest;
            if (lottieMountedRef.current) {
              setLottieJsonData(data);
              setLottieLoading(false);
            }
            return data;
          } catch (error) {
            // If existing request fails, continue with new request
            logger.debug(`[ShopItem] Existing request failed, continuing with new request`, 'API');
          }
        }

        // Prevent multiple simultaneous fetches for the same item
        if (isFetchingRef.current) {
          logger.debug(
            `[ShopItem] Fetch already in progress for ${item.name || item.id}, skipping`,
            'API'
          );
          return null;
        }

        // Abort any previous fetch for this item
        if (fetchAbortControllerRef.current) {
          fetchAbortControllerRef.current.abort();
          fetchAbortControllerRef.current = null;
        }

        isFetchingRef.current = true;
        let timeoutId: NodeJS.Timeout | null = null;

        // Create the fetch promise
        const fetchPromise = (async () => {
          try {
            setLottieLoading(true);

            // Create AbortController for timeout
            const controller = new AbortController();
            fetchAbortControllerRef.current = controller;
            timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, {
              headers: {
                Accept: 'application/json',
              },
              signal: controller.signal,
            });

            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }

            if (!response.ok) {
              // If 403 or 404, might be expired URL - don't retry
              if (response.status === 403 || response.status === 404) {
                throw new Error(
                  `Failed to fetch Lottie JSON: ${response.status} - URL may be expired`
                );
              }
              throw new Error(`Failed to fetch Lottie JSON: ${response.status}`);
            }

            const jsonData = await response.json();

            // Validate that it's actually JSON Lottie data
            if (!jsonData || typeof jsonData !== 'object' || !jsonData.v) {
              throw new Error('Invalid Lottie JSON format');
            }

            // Cache the result
            LOTTIE_DATA_CACHE.set(url, { data: jsonData, timestamp: Date.now() });

            if (lottieMountedRef.current) {
              setLottieJsonData(jsonData);
              setLottieLoading(false);
              logger.debug(
                `[ShopItem] Successfully loaded Lottie JSON for ${item.name || item.id}`,
                'API'
              );
            }

            // Remove from in-flight requests
            LOTTIE_FETCH_CACHE.delete(url);
            isFetchingRef.current = false;
            fetchAbortControllerRef.current = null;

            return jsonData;
          } catch (error: any) {
            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }

            // Remove from in-flight requests
            LOTTIE_FETCH_CACHE.delete(url);
            isFetchingRef.current = false;
            fetchAbortControllerRef.current = null;

            logger.warn(
              `[ShopItem] Error fetching Lottie JSON (attempt ${retryCount + 1})`,
              'API',
              error?.message || error
            );

            // Retry up to 2 times for network errors (not for abort/timeout/expired URLs)
            const isAbortError =
              error?.name === 'AbortError' || error?.message?.includes('aborted');
            const isExpiredError =
              error?.message?.includes('expired') ||
              error?.message?.includes('403') ||
              error?.message?.includes('404');

            if (retryCount < 2 && !isAbortError && !isExpiredError) {
              // Retry after a delay
              return new Promise(resolve => {
                setTimeout(
                  async () => {
                    if (lottieMountedRef.current) {
                      const result = await fetchLottieJson(url, retryCount + 1);
                      resolve(result);
                    } else {
                      resolve(null);
                    }
                  },
                  1000 * (retryCount + 1)
                );
              });
            }

            if (lottieMountedRef.current) {
              setLottieLoading(false);
              // Fallback to URI method if fetch fails - clear JSON data so it uses URI
              setLottieJsonData(null);
              logger.debug(
                `[ShopItem] Falling back to URI method for ${item.name || item.id}`,
                'API'
              );
            }

            throw error;
          }
        })();

        // Store the promise for deduplication
        LOTTIE_FETCH_CACHE.set(url, fetchPromise);

        return fetchPromise;
      },
      [item.name, item.id]
    );

    // Check if URL is expired (for AWS S3 signed URLs) - memoized callback
    const isUrlExpired = useCallback((url: string): boolean => {
      if (!url || !url.includes('X-Amz-Expires=') || !url.includes('X-Amz-Date=')) {
        return false; // Not an AWS signed URL or missing required params
      }

      try {
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        const expires = urlParams.get('X-Amz-Expires');
        const dateStr = urlParams.get('X-Amz-Date');

        if (!expires || !dateStr) {
          return false;
        }

        // Parse the date (format: YYYYMMDDTHHmmssZ)
        const expiresSeconds = parseInt(expires, 10);
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
        const day = parseInt(dateStr.substring(6, 8), 10);
        const hour = parseInt(dateStr.substring(9, 11), 10);
        const minute = parseInt(dateStr.substring(11, 13), 10);
        const second = parseInt(dateStr.substring(13, 15), 10);

        const urlDate = new Date(Date.UTC(year, month, day, hour, minute, second));
        const expiryTime = urlDate.getTime() + expiresSeconds * 1000;
        const now = Date.now();

        // Add 60 second buffer to refresh before actual expiry
        const isExpired = now >= expiryTime - 60000;

        if (isExpired && __DEV__) {
          const timeUntilExpiry = Math.floor((expiryTime - now) / 1000);
          // Debug logging can be added here if needed
        }

        return isExpired;
      } catch (error) {
        if (__DEV__) {
        }
        return false;
      }
    }, []);

    // Trigger shop data refresh when URLs expire
    const triggerShopRefresh = React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - GLOBAL_REFRESH_LOCK.lastRefreshTime;

      // Don't refresh if:
      // 1. Already refreshing
      // 2. Status is already 'loading'
      // 3. Within cooldown period (30 seconds)
      if (GLOBAL_REFRESH_LOCK.isRefreshing) {
        if (__DEV__) {
        }
        return;
      }

      if (cosmeticsState.status === 'loading') {
        if (__DEV__) {
        }
        return;
      }

      if (timeSinceLastRefresh < GLOBAL_REFRESH_LOCK.cooldownPeriod) {
        const remainingCooldown = Math.ceil(
          (GLOBAL_REFRESH_LOCK.cooldownPeriod - timeSinceLastRefresh) / 1000
        );
        if (__DEV__) {
          // Debug logging can be added here if needed
        }
        return;
      }

      // Set refresh lock
      GLOBAL_REFRESH_LOCK.isRefreshing = true;
      GLOBAL_REFRESH_LOCK.lastRefreshTime = now;

      if (__DEV__) {
      }

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Debounce refresh - wait 1 second to batch multiple expired URL detections
      refreshTimeoutRef.current = setTimeout(() => {
        try {
          dispatch(fetchCosmetics() as any);
          if (__DEV__) {
          }
        } catch (error) {
          if (__DEV__) {
          }
          // Reset lock on error
          GLOBAL_REFRESH_LOCK.isRefreshing = false;
        }

        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      }, 1000);
    }, [dispatch, cosmeticsState.status]);

    // Get image URI from different possible formats - prioritize API URL
    // CRITICAL: Extract URI instantly for immediate display - check ALL possible fields
    let imageUri: string | null = null;

    // First check direct URL field (from API) - this is the real S3 URL
    if (item.url && typeof item.url === 'string' && item.url.trim().length > 0) {
      imageUri = item.url.trim();
    }
    // Then check image_url (common API field)
    else if (
      item.image_url &&
      typeof item.image_url === 'string' &&
      item.image_url.trim().length > 0
    ) {
      imageUri = item.image_url.trim();
    }
    // Then check image.uri
    else if (
      item.image?.uri &&
      typeof item.image.uri === 'string' &&
      item.image.uri.trim().length > 0
    ) {
      imageUri = item.image.uri.trim();
    }
    // Then check if image is a string
    else if (typeof item.image === 'string' && item.image.trim().length > 0) {
      imageUri = item.image.trim();
    }

    // Debug logging to see what we're getting
    if (__DEV__ && item?.name) {
      if (imageUri) {
        const isLottieCheck = isLottieFile(imageUri);
        // Debug logging can be added here if needed
      }
    }

    const isLottie = useMemo(
      () => (imageUri ? isLottieFile(imageUri) : false),
      [imageUri, isLottieFile]
    );

    // Check if it's a dotlottie file
    const isDotLottie = useMemo(
      () => (imageUri ? isDotLottieFile(imageUri) : false),
      [imageUri, isDotLottieFile]
    );

    // Check if it's a JSON Lottie file (not dotlottie)
    const isJsonLottie = useMemo(
      () => (imageUri ? isJsonLottieFile(imageUri) : false),
      [imageUri, isJsonLottieFile]
    );

    // Removed debug logging for performance - instant display

    // Watch cosmetics status to release refresh lock when fetch completes
    React.useEffect(() => {
      if (GLOBAL_REFRESH_LOCK.isRefreshing && cosmeticsState.status !== 'loading') {
        // Fetch completed (succeeded or failed), release lock
        GLOBAL_REFRESH_LOCK.isRefreshing = false;
      }
    }, [cosmeticsState.status]);

    // Force Lottie to play after mount - ensure it renders on UI immediately
    // Special handling for dotlottie files which may need different approach
    React.useEffect(() => {
      if (isLottie && imageUri && lottieRef.current) {
        // Small delay to ensure LottieView is mounted, then force play
        const playTimeout = setTimeout(
          () => {
            if (lottieMountedRef.current && lottieRef.current) {
              try {
                // For dotlottie files, reset first then play to ensure proper rendering
                if (isDotLottie) {
                  lottieRef.current.reset();
                }
                // Force play animation to ensure it renders on UI
                lottieRef.current.play();
                // Hide loading after a brief moment - animation is rendering
                setTimeout(() => {
                  if (lottieMountedRef.current) {
                    setLottieLoading(false);
                  }
                }, 500);
              } catch (e) {
                // Silent fail - might already be playing
                if (lottieMountedRef.current) {
                  setLottieLoading(false);
                }
              }
            }
          },
          isDotLottie ? 300 : 100
        ); // Slightly longer delay for dotlottie files

        return () => {
          clearTimeout(playTimeout);
        };
      }
    }, [isLottie, isDotLottie, imageUri, item.id]);

    // When JSON data is successfully loaded, ensure LottieView plays
    React.useEffect(() => {
      if (isJsonLottie && lottieJsonData && lottieRef.current) {
        // JSON data loaded - ensure animation plays
        const playTimeout = setTimeout(() => {
          if (lottieMountedRef.current && lottieRef.current) {
            try {
              lottieRef.current.play();
              setLottieLoading(false);
              logger.debug(
                `[ShopItem] Playing Lottie with fetched JSON data for ${item.name || item.id}`,
                'API'
              );
            } catch (e) {
              // Silent fail
              if (lottieMountedRef.current) {
                setLottieLoading(false);
              }
            }
          }
        }, 100);

        return () => {
          clearTimeout(playTimeout);
        };
      }
    }, [isJsonLottie, lottieJsonData, item.name, item.id]);

    // Fixed: Cleanup and URL expiry check - always show Lottie, refresh URL if expired
    // Also fetch JSON data for JSON Lottie files with professional deduplication
    React.useEffect(() => {
      lottieMountedRef.current = true;

      // Reset state when imageUri changes - professional caching makes display instant
      if (isLottie && imageUri) {
        setLottieRetryCount(0);

        // For JSON Lottie files, fetch the JSON data first
        // But also show LottieView immediately with URI as fallback
        if (isJsonLottie) {
          // Clear any existing fetch timeout
          if (fetchJsonTimeoutRef.current) {
            clearTimeout(fetchJsonTimeoutRef.current);
            fetchJsonTimeoutRef.current = null;
          }

          // Abort any previous fetch
          if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
            fetchAbortControllerRef.current = null;
          }
          isFetchingRef.current = false;

          // Reset JSON data to allow URI fallback initially
          setLottieJsonData(null);

          // Show loading while fetching
          setLottieLoading(true);

          // Fetch JSON data with a small delay to allow LottieView to mount first
          // Use debounce to prevent multiple rapid calls
          fetchJsonTimeoutRef.current = setTimeout(() => {
            if (lottieMountedRef.current && !isFetchingRef.current) {
              fetchLottieJson(imageUri).catch(() => {
                // Error already handled in fetchLottieJson
              });
            }
          }, 150);
        } else {
          // For dotlottie or other formats, use URI directly
          setLottieJsonData(null);

          // Show loading very briefly - Lottie renders immediately with cache
          setLottieLoading(true);

          // Clear any existing loading timeout
          if (lottieLoadingTimeoutRef.current) {
            clearTimeout(lottieLoadingTimeoutRef.current);
            lottieLoadingTimeoutRef.current = null;
          }

          // Hide loading very quickly - Lottie displays instantly with professional cache
          // Don't block UI with long loading - cache makes it instant
          lottieLoadingTimeoutRef.current = setTimeout(() => {
            if (lottieMountedRef.current) {
              setLottieLoading(false); // Hide loader - Lottie is rendering on UI
            }
          }, 1000); // 1 second max - cache makes it instant
        }

        // Force play animation after short delay to ensure it renders
        // Dotlottie files may need slightly longer delay
        const forcePlayTimeout = setTimeout(
          () => {
            if (lottieMountedRef.current && lottieRef.current) {
              try {
                // For dotlottie, reset first to ensure proper initialization
                if (isDotLottie) {
                  lottieRef.current.reset();
                }
                lottieRef.current.play();
                setLottieLoading(false); // Hide loading when animation plays
              } catch (e) {
                // Silent fail
                if (lottieMountedRef.current) {
                  setLottieLoading(false);
                }
              }
            }
          },
          isDotLottie ? 400 : 200
        );

        // Check if URL is expired and trigger refresh if needed
        const isExpired = isUrlExpired(imageUri);
        if (isExpired) {
          // Trigger refresh if not already loading and not in cooldown
          if (cosmeticsState.status !== 'loading' && !GLOBAL_REFRESH_LOCK.isRefreshing) {
            triggerShopRefresh();
          }
        }

        return () => {
          clearTimeout(forcePlayTimeout);
        };
      } else {
        // Not a Lottie file, ensure loading is off and clear JSON data
        setLottieLoading(false);
        setLottieJsonData(null);
      }

      return () => {
        lottieMountedRef.current = false;

        // Abort any in-flight fetch
        if (fetchAbortControllerRef.current) {
          fetchAbortControllerRef.current.abort();
          fetchAbortControllerRef.current = null;
        }
        isFetchingRef.current = false;

        if (lottieTimeoutRef.current) {
          clearTimeout(lottieTimeoutRef.current);
          lottieTimeoutRef.current = null;
        }
        if (lottieLoadingTimeoutRef.current) {
          clearTimeout(lottieLoadingTimeoutRef.current);
          lottieLoadingTimeoutRef.current = null;
        }
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
        if (fetchJsonTimeoutRef.current) {
          clearTimeout(fetchJsonTimeoutRef.current);
          fetchJsonTimeoutRef.current = null;
        }
      };
    }, [
      isLottie,
      isJsonLottie,
      isDotLottie,
      imageUri,
      triggerShopRefresh,
      item.name,
      cosmeticsState.status,
      item.id,
      fetchLottieJson,
    ]);

    const handlePurchase = useCallback(async () => {
      // Guard against missing item data
      if (!item || !item.id || typeof item.id !== 'string') {
        return;
      }

      // Guard against missing purchaseItem function
      if (!purchaseItem || typeof purchaseItem !== 'function') {
        try {
          Alert.alert('Error', 'Purchase functionality is not available. Please try again later.', [
            { text: 'OK' },
          ]);
        } catch (alertError) { }
        return;
      }

      // Don't allow purchase if already purchased
      if (isPurchased) {
        try {
          Alert.alert('Already Purchased', `You already own ${item.name || 'this item'}`, [
            { text: 'OK' },
          ]);
        } catch (alertError) { }
        return;
      }

      // Prevent multiple simultaneous calls
      if (isPurchasing || isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setIsPurchasing(true);

      try {
        const payload = await purchaseItem({ itemId: item.id, itemType: item.type || 'avatar' });

        // Success - refresh gems after a short delay if fetchUserGems is available
        if (fetchUserGems && typeof fetchUserGems === 'function') {
          setTimeout(() => {
            try {
              fetchUserGems();
            } catch (refreshError) { }
          }, 500);
        }
      } catch (error: any) {
        // Handle rejected case with error handling
        try {
          const errorMessage =
            error?.message || error?.toString() || '';

          if (errorMessage.toLowerCase().includes('insufficient') || errorMessage.toLowerCase().includes('balance')) {
            setShowInsufficientBalanceModal(true);
          } else {
            Alert.alert('Purchase Failed', errorMessage || 'Unable to complete purchase. Please try again.', [{ text: 'OK' }]);
          }
        } catch (alertError) { }
      } finally {
        setIsPurchasing(false);
        // Use setTimeout to reset ref after a small delay to prevent rapid clicks
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 1000);
      }
    }, [item, purchaseItem, isPurchased, fetchUserGems]);

    const getGradientColors = useMemo(() => {
      // Same gradient for all cards
      return isDarkMode
        ? [themeColors.backgroundDarker, themeColors.backgroundDark]
        : [themeColors.secondaryDark, themeColors.secondary];
    }, [isDarkMode, themeColors]);

    const buttonGradient = useMemo(
      () =>
        isDarkMode
          ? [themeColors.warning, themeColors.warningDark]
          : [themeColors.success, themeColors.successDark],
      [isDarkMode, themeColors]
    );

    const styles = createStyles(
      themeColors,
      screenWidth,
      screenHeight,
      isSmallDevice,
      horizontalPadding,
      scaleSizeFunc
    );

    return (
      <SoundTouchableOpacity style={styles.itemContainer} activeOpacity={0.8}>
        <LinearGradient
          colors={getGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.itemGradient}
        >
          {item.discount != null && item.discount !== '' && String(item.discount).trim() !== '' && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{String(item.discount).trim()}</Text>
            </View>
          )}

          {/* Red tag at top right corner */}
          <View style={styles.redTag}>
            <Text style={styles.redTagText}>HOT</Text>
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">
              {String(item.name || '').trim() || 'Item'}
            </Text>
          </View>
          {item.badge != null && item.badge !== '' && String(item.badge).trim() !== '' && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{String(item.badge).trim()}</Text>
            </View>
          )}

          <View style={styles.contentRow}>
            <View style={styles.imageContainer}>
              {imageUri ? (
                isLottie ? (
                  <View style={styles.lottieContainer}>
                    {/* Always show Lottie - render immediately, professional caching makes it instant */}
                    {/* Handle dotlottie (.lottie) files differently from JSON files */}
                    {(() => {
                      // Determine the source - ensure it's always valid
                      // Always prefer URI method as it's more reliable
                      let lottieSource: any = null;

                      // For JSON Lottie files, try JSON data first if available and valid
                      if (
                        isJsonLottie &&
                        lottieJsonData &&
                        typeof lottieJsonData === 'object' &&
                        lottieJsonData.v
                      ) {
                        // Use fetched JSON data if valid
                        lottieSource = lottieJsonData;
                        logger.debug(
                          `[ShopItem] Using fetched JSON data for ${item.name || item.id}`,
                          'API'
                        );
                      }

                      // Always fallback to URI - this works for both JSON and dotlottie files
                      // URI method is more reliable and doesn't require fetching
                      if (!lottieSource && imageUri) {
                        lottieSource = { uri: imageUri };
                        if (isJsonLottie) {
                          logger.debug(
                            `[ShopItem] Using URI fallback for JSON Lottie: ${item.name || item.id}`,
                            'API'
                          );
                        }
                      }

                      // Only render if we have a valid source
                      if (!lottieSource) {
                        logger.debug(
                          `[ShopItem] No valid source for Lottie: ${item.name || item.id}`,
                          'API',
                          {
                            isJsonLottie,
                            hasJsonData: !!lottieJsonData,
                            hasImageUri: !!imageUri,
                          }
                        );
                        return null;
                      }

                      return (
                        <LottieView
                          ref={lottieRef}
                          key={`lottie-${item.id}-${isDotLottie ? 'dotlottie' : isJsonLottie ? 'json' : 'other'}-${imageUri ? imageUri.substring(imageUri.length - 30) : ''}`}
                          source={lottieSource}
                          autoPlay={true}
                          loop={true}
                          style={styles.lottieImage}
                          renderMode={isDotLottie ? 'HARDWARE' : 'SOFTWARE'}
                          resizeMode="contain"
                          speed={1}
                          useNativeLooping={false}
                          hardwareAccelerationAndroid={isDotLottie ? true : false}
                          cacheStrategy="strong"
                          cacheComposition={true}
                          enableMergePathsAndroidForKitKatAndAbove={true}
                          colorFilters={[]}
                          onLayout={() => {
                            // Force play when layout is ready - ensures rendering
                            if (lottieRef.current) {
                              try {
                                // For dotlottie, ensure it plays immediately
                                if (isDotLottie) {
                                  lottieRef.current.reset();
                                }
                                lottieRef.current.play();
                              } catch (e) {
                                // Silent fail
                              }
                            }
                          }}
                          onAnimationFailure={error => {
                            // Handle errors - log for debugging and retry if needed
                            logger.warn(
                              `[ShopItem] Lottie animation failure for ${item.name || item.id}`,
                              'API',
                              {
                                error: error?.toString(),
                                source: isJsonLottie && lottieJsonData ? 'JSON' : 'URI',
                                imageUri: imageUri?.substring(0, 50) + '...',
                                isJsonLottie,
                                hasJsonData: !!lottieJsonData,
                              }
                            );

                            try {
                              if (lottieTimeoutRef.current) {
                                clearTimeout(lottieTimeoutRef.current);
                                lottieTimeoutRef.current = null;
                              }
                              if (lottieLoadingTimeoutRef.current) {
                                clearTimeout(lottieLoadingTimeoutRef.current);
                                lottieLoadingTimeoutRef.current = null;
                              }

                              if (lottieMountedRef.current) {
                                const errorMsg = error?.toString() || '';
                                const errorString = JSON.stringify(error || {});
                                const isExpiredUrl =
                                  errorMsg.includes('403') ||
                                  errorMsg.includes('InvalidAccessKeyId') ||
                                  errorMsg.includes('SignatureDoesNotMatch') ||
                                  errorMsg.includes('Network') ||
                                  errorMsg.includes('timeout') ||
                                  errorString.includes('403') ||
                                  errorString.includes('expired');

                                // For JSON Lottie files, if URI method fails, try fetching JSON again
                                if (isJsonLottie && !lottieJsonData && !isExpiredUrl) {
                                  // Try fetching JSON data again
                                  if (!isFetchingRef.current) {
                                    fetchLottieJson(imageUri).catch(() => {
                                      // Error already handled in fetchLottieJson
                                    });
                                  }
                                }

                                // Trigger refresh if URL is expired (with guards) - professional caching handles this
                                if (
                                  isExpiredUrl &&
                                  cosmeticsState.status !== 'loading' &&
                                  !GLOBAL_REFRESH_LOCK.isRefreshing
                                ) {
                                  triggerShopRefresh();
                                }

                                // Retry silently if we haven't exceeded max retries - always keep showing Lottie
                                // Cached animations won't need retries
                                if (lottieRetryCount < maxRetries && !isExpiredUrl) {
                                  lottieTimeoutRef.current = setTimeout(
                                    () => {
                                      if (lottieMountedRef.current && lottieRef.current) {
                                        setLottieRetryCount(prev => prev + 1);
                                        setLottieLoading(true);

                                        // Try to play again
                                        try {
                                          lottieRef.current.reset();
                                          lottieRef.current.play();
                                        } catch (e) {
                                          // Silent fail
                                        }

                                        // Set loading timeout again for retry
                                        lottieLoadingTimeoutRef.current = setTimeout(() => {
                                          if (lottieMountedRef.current) {
                                            setLottieLoading(false);
                                          }
                                        }, maxLoadingTime);
                                      }
                                    },
                                    1000 * (lottieRetryCount + 1)
                                  ); // Exponential backoff
                                } else {
                                  // Max retries reached - still show Lottie, just stop loading indicator
                                  // Cached version might still work
                                  setLottieLoading(false);
                                }
                              }
                            } catch (err) {
                              // Prevent crash - always keep showing Lottie, rely on cache
                              if (lottieMountedRef.current) {
                                setLottieLoading(false);
                              }
                              logger.warn(`[ShopItem] Error handling Lottie failure`, 'API', err);
                            }
                          }}
                          onAnimationLoaded={() => {
                            try {
                              // Clear all timeouts immediately - animation loaded and rendering
                              if (lottieTimeoutRef.current) {
                                clearTimeout(lottieTimeoutRef.current);
                                lottieTimeoutRef.current = null;
                              }
                              if (lottieLoadingTimeoutRef.current) {
                                clearTimeout(lottieLoadingTimeoutRef.current);
                                lottieLoadingTimeoutRef.current = null;
                              }

                              if (lottieMountedRef.current) {
                                // Hide loading immediately - animation is loaded and rendering on UI
                                setLottieLoading(false);

                                // Ensure animation plays - force render on UI
                                // For dotlottie files, reset first then play to ensure proper rendering
                                if (lottieRef.current) {
                                  try {
                                    if (isDotLottie) {
                                      // Dotlottie files may need reset before play
                                      lottieRef.current.reset();
                                    }
                                    // Play animation to ensure it renders on UI
                                    lottieRef.current.play();
                                    logger.debug(
                                      `[ShopItem] Lottie animation loaded and playing for ${item.name || item.id}`,
                                      'API'
                                    );
                                  } catch (playError) {
                                    // Animation might already be playing - that's fine, it's rendering
                                  }
                                }
                              }
                            } catch (err) {
                              // Prevent crash - always hide loading, animation still renders
                              if (lottieMountedRef.current) {
                                setLottieLoading(false);
                              }
                            }
                          }}
                          onAnimationFinish={isCancelled => {
                            // Animation finished - no action needed
                          }}
                        />
                      );
                    })()}

                    {/* Show minimal loading indicator overlay - very subtle, doesn't block Lottie */}
                    {lottieLoading && (
                      <View style={styles.lottieLoaderOverlay} pointerEvents="none">
                        <LoadingIndicator size="small" color={themeColors.white} />
                      </View>
                    )}
                  </View>
                ) : (
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.itemImage, { width: '100%', height: '100%' }]}
                    resizeMode="contain"
                    cache="force-cache"
                    onError={error => {
                      if (__DEV__) {
                      }
                    }}
                    onLoad={() => {
                      if (__DEV__) {
                      }
                    }}
                  />
                )
              ) : null}
            </View>
          </View>

          <View style={styles.priceRow}>
            {item.gems != null && item.gems !== '' && String(item.gems).trim() !== '' && (
              <View style={styles.priceContainer}>
                <Image
                  source={require('../../../../assets/shop/shopGem.png')}
                  style={styles.gemIcon}
                  resizeMode="contain"
                  onError={error => { }}
                />
                <Text style={styles.priceText} numberOfLines={1} ellipsizeMode="tail">
                  {String(item.gems).trim()}
                </Text>
              </View>
            )}
            {item.price != null && item.price !== '' && String(item.price).trim() !== '' && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceIcon}>💰</Text>
                <Text style={styles.priceText} numberOfLines={1} ellipsizeMode="tail">
                  ${String(item.price).trim()}
                </Text>
              </View>
            )}
          </View>

          <LinearGradient
            colors={
              isPurchased
                ? isDarkMode
                  ? [themeColors.success, themeColors.successDark]
                  : [themeColors.success, themeColors.successDark]
                : buttonGradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButton}
          >
            <SoundTouchableOpacity
              style={[
                styles.buyButtonInner,
                (isPurchasing || isPurchased) && styles.buyButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={isPurchasing || isPurchased}
              activeOpacity={isPurchasing || isPurchased ? 1 : 0.7}
            >
              {isPurchasing ? (
                <LoadingIndicator size="small" color={themeColors.white} />
              ) : isPurchased ? (
                <Text style={styles.buyButtonText}>✓ Purchased</Text>
              ) : (
                <Text style={styles.buyButtonText}>Buy</Text>
              )}
            </SoundTouchableOpacity>
          </LinearGradient>
        </LinearGradient>

        {/* Insufficient Balance Modal */}
        <Modal
          visible={showInsufficientBalanceModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowInsufficientBalanceModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: isDarkMode ? '#1F2937' : 'white',
                borderRadius: 20,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#F59E0B',
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#FEF3C7',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 40 }}>⚠️</Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: isDarkMode ? 'white' : '#1F2937',
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                Insufficient Balance
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: isDarkMode ? '#D1D5DB' : '#4B5563',
                  textAlign: 'center',
                  marginBottom: 24,
                  lineHeight: 22,
                }}
              >
                You have {shop?.userBalance?.gems || 0} gems, but this {item?.type || 'item'} costs {item?.gems || item?.price || 0} gems.
              </Text>

              <TouchableOpacity
                onPress={() => setShowInsufficientBalanceModal(false)}
                style={{
                  backgroundColor: '#F59E0B',
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}
                >
                  Got it
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowInsufficientBalanceModal(false);
                  // navigation.navigate('Shop') or similar if needed
                }}
                style={{
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    color: '#F59E0B',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Earn more gems
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SoundTouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    if (!prevProps.item || !nextProps.item) {
      return prevProps.item === nextProps.item;
    }
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.url === nextProps.item.url &&
      prevProps.item.image_url === nextProps.item.image_url &&
      prevProps.item.gems === nextProps.item.gems &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.type === nextProps.item.type
    );
  }
);

export default ShopItem;
