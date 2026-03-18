import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import {
  View,
  Platform,
  Image,
  ImageBackground,
  StatusBar,
  Text,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { DIMENSIONS } from '../constants/uiConstants';
import LinearGradient from 'react-native-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens, enableFreeze } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../store';
import scaleSize from '../utils/scaleSize';

// CRITICAL: Enable screens for better navigation performance
enableScreens(true);
enableFreeze(false);

import { useNavigation } from '@react-navigation/native';
import type { CompositeMainNavigationProp } from './types';
// Regular imports for screens
import UpdatesScreen from '../features/home/screens/UpdatesScreen';
import LeaderboardScreen from '../features/leaderboard/screens/LeaderboardScreen';
import WalletScreen from '../features/wallet/screens/WalletScreen';
import FreeTriviaScreen from '../features/trivia/screens/FreeTriviaScreen';
// Regular imports for smaller screens (load immediately)
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import ChatsScreen from '../features/chat/screens/ChatsScreen';
import ChatScreen from '../features/chat/screens/ChatScreen'; // Keep for other uses if any
import ChatDetailScreen from '../features/chat/screens/ChatDetailScreen';
import GroupInfoScreen from '../features/chat/screens/GroupInfoScreen';
import StoryViewerScreen from '../features/chat/screens/StoryViewerScreen';
import TriviaScreen from '../features/trivia/screens/TriviaScreen';
import BronzeTriviaScreen from '../features/trivia/screens/BronzeTriviaScreen';
import SilverTriviaScreen from '../features/trivia/screens/SilverTriviaScreen';
import { KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import TriviaSelectionScreen from '../features/trivia/screens/TriviaSelectionScreen';
// WinnersScreen removed
import ShopScreen from '../features/shop/screens/ShopScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import { useDailyRewards, useTheme } from '../hooks/useReduxHooks';
import { typography } from '../theme/typography';
import DailyBonusPopup from '../components/daily-bonus/daily-bonus-popup';
import { selectIsAuthenticated } from '../utils/selectors';
import { logger } from '../lib/utils/logger';
import audioManager from '../lib/audio/AudioManagerSafe';
import { interstitialAdService } from '../ads/InterstitialAdService';

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();
const UpdatesStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// Fixed constants
export const TAB_BAR_HEIGHT = DIMENSIONS.TAB_BAR_HEIGHT;

// Memoized stack navigators
const UpdatesStackNavigator = React.memo(() => {
  return (
    <UpdatesStack.Navigator
      screenOptions={{
        headerShown: false,
        statusBarHidden: true,
        animation: 'fade_from_bottom', // Changed from 'none' for smoother UX
        animationDuration: 200, // Fast animation
        freezeOnBlur: false,
      }}
    >
      <UpdatesStack.Screen
        name="UpdatesScreen"
        component={UpdatesScreen}
        options={{
          lazy: false, // Preload this screen
        }}
      />
    </UpdatesStack.Navigator>
  );
});

const ChatStackNavigator = React.memo(() => {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // Re-enabled for better UX
        animationDuration: 250, // Fast animation
        freezeOnBlur: false,
      }}
    >
      <ChatStack.Screen
        name="ChatsList"
        component={ChatsScreen}
        options={{ lazy: false }} // Preload
      />
    </ChatStack.Navigator>
  );
});

// Optimized swipe handler
const SwipeableScreen = React.memo(
  ({
    children,
    onSwipeLeft,
    onSwipeRight,
    enabled = true,
  }: {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enabled?: boolean;
  }) => {
    const isHorizontalSwipe = useRef(false);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (evt, gestureState) => {
            if (!enabled) return false;
            const { dx, dy } = gestureState;
            if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 2) {
              isHorizontalSwipe.current = true;
              return true;
            }
            return false;
          },
          onPanResponderRelease: (
            evt: GestureResponderEvent,
            gestureState: PanResponderGestureState
          ) => {
            if (!enabled || !isHorizontalSwipe.current) {
              isHorizontalSwipe.current = false;
              return;
            }

            const { dx, vx } = gestureState;
            if (dx < -60 || vx < -0.4) {
              onSwipeLeft?.();
            } else if (dx > 60 || vx > 0.4) {
              onSwipeRight?.();
            }

            isHorizontalSwipe.current = false;
          },
          onPanResponderTerminationRequest: () => true,
        }),
      [enabled, onSwipeLeft, onSwipeRight]
    );

    return (
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {children}
      </View>
    );
  }
);

// Animated Tab Item Component
const TabItem = React.memo(({ isActive, icon, label, onPress, onPressIn, chatCount }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isActive ? 1 : 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -scaleSize(6)],
  });

  const labelOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const iconScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      onPressIn={onPressIn}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: TAB_BAR_HEIGHT,
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY }, { scale: iconScale }],
        }}
      >
        <View style={{ alignItems: 'center' }}>
          {icon}
          <Animated.Text
            style={[
              typography.bodySmall,
              {
                color: '#FFFFFF',
                fontSize: scaleSize(10),
                fontWeight: '700',
                marginTop: scaleSize(1),
                opacity: labelOpacity,
                transform: [{ translateY: labelTranslateY }],
                textAlign: 'center',
                position: isActive ? 'relative' : 'absolute',
                top: isActive ? 0 : 20,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
          {label === 'Chats' && chatCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -scaleSize(4),
                right: -scaleSize(10),
                backgroundColor: '#22C55E',
                borderRadius: scaleSize(10),
                minWidth: scaleSize(20),
                height: scaleSize(20),
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: scaleSize(4),
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: scaleSize(11),
                  fontWeight: 'bold',
                }}
              >
                {chatCount > 99 ? '99+' : chatCount}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Main Tab Navigator
const TabNavigator = (): React.JSX.Element => {
  const theme = useTheme();
  const { isDarkMode } = theme;
  const navigation = useNavigation<CompositeMainNavigationProp>();
  const { onlineCount, unreadMessagesCount, friendRequestsCount } = useSelector(
    (state: RootState) => state.chat,
    shallowEqual
  );
  const chatTotalCount = onlineCount + unreadMessagesCount + friendRequestsCount;

  // CRITICAL: Get actual device safe area insets
  const insets = useSafeAreaInsets();
  const SAFE_AREA_BOTTOM = insets.bottom;
  const TOTAL_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT + SAFE_AREA_BOTTOM;

  // CRITICAL: Tab bar visibility is managed by navigation options
  // No manual keyboard listeners needed for tab bar stability


  // Sync with navigation state - but don't reset lock immediately
  const [activeTab, setActiveTab] = useState<string>('Home');
  const isNavigatingRef = useRef(false);
  const lastNavigationTimeRef = useRef(0);
  const lastStatusBarStateRef = useRef<boolean | null>(null);
  const isInitializedRef = useRef(false);
  const tabBarVisibilityRef = useRef(true); // Track tab bar visibility state

  // Sync with navigation state - but don't reset lock immediately
  // Stabilize tab navigation to prevent jumping
  // CRITICAL: Use immediate synchronous updates to prevent delays
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup function to clear all navigation timeouts
  const clearNavigationTimeouts = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearNavigationTimeouts();
      isNavigatingRef.current = false;
    };
  }, [clearNavigationTimeouts]);

  useEffect(() => {
    let listenerCallCount = 0;
    let lastCallTime = 0;

    const unsubscribe = navigation.addListener('state', () => {
      const listenerStartTime = performance.now();
      listenerCallCount++;
      const timeSinceLastCall = listenerStartTime - lastCallTime;
      lastCallTime = listenerStartTime;

      // Clear previous timeouts if exist
      clearNavigationTimeouts();

      // Prevent excessive listener calls (potential loop)
      if (listenerCallCount > 10) {
        if (__DEV__) {
          logger.warn(
            `Navigation state listener called ${listenerCallCount} times - possible loop!`,
            'NAVIGATION'
          );
        }
        return;
      }

      // Warn if listener is being called too frequently
      if (timeSinceLastCall < 50 && listenerCallCount > 1 && __DEV__) {
        logger.warn(
          `State listener called too frequently (${timeSinceLastCall.toFixed(2)}ms since last call)`,
          'NAVIGATION'
        );
      }

      const getStateStartTime = performance.now();
      const state = navigation.getState();
      const getStateDuration = performance.now() - getStateStartTime;

      if (getStateDuration > 10 && __DEV__) {
        logger.warn(`getState() took ${getStateDuration.toFixed(2)}ms (slow!)`, 'NAVIGATION');
      }

      const tabRoute = state?.routes?.find(route => route.name === 'TabNavigator');
      const tabState = tabRoute?.state as any;
      if (tabState?.routes && tabState.index !== undefined) {
        const currentTabRoute = tabState.routes[tabState.index];
        if (currentTabRoute?.name && currentTabRoute.name !== activeTab) {
          const setStateStartTime = performance.now();
          // CRITICAL: Update immediately and synchronously - no delays
          setActiveTab(currentTabRoute.name);
          const setStateDuration = performance.now() - setStateStartTime;

          if (__DEV__) {
            const listenerDuration = performance.now() - listenerStartTime;
            logger.debug(
              `State listener: tab changed to ${currentTabRoute.name} (${listenerDuration.toFixed(2)}ms)`,
              'NAVIGATION'
            );

            if (setStateDuration > 10) {
              logger.warn(
                `setActiveTab in listener took ${setStateDuration.toFixed(2)}ms (slow!)`,
                'NAVIGATION'
              );
            }
          }

          // CRITICAL: Tab bar is always visible - no conditional hiding
          // State update triggers re-render to ensure tab bar is always displayed
        }
      }

      // Reset lock after navigation completes - use single timeout for efficiency
      // CRITICAL: Release lock immediately after state update completes
      lockTimeoutRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
        listenerCallCount = 0; // Reset counter after navigation completes
        lockTimeoutRef.current = null;
        if (__DEV__) {
          logger.debug('Navigation lock released (listener)', 'NAVIGATION');
        }
      }, 50); // Reduced to 50ms for faster response
    });

    return () => {
      unsubscribe();
      // Clear any pending timeouts
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
    };
  }, [navigation, activeTab]); // Include activeTab to properly track changes

  // Status bar - DEFERRED to useEffect to prevent blocking initial render
  // CRITICAL: Show status bar ONLY on Wallet/Payment screen, hide for all other tabs including Shop
  // Centralized status bar management to prevent conflicts with individual screens
  const hideStatusBarTabs = useMemo(() => ['Home', 'Leaderboard', 'Shop', 'Chats'], []); // Shop added - status bar hidden. Wallet not in list = status bar visible
  useEffect(() => {
    const shouldHide = hideStatusBarTabs.includes(activeTab);
    // Prevent status bar changes during rapid navigation
    if (isNavigatingRef.current) {
      return;
    }

    // CRITICAL: Only update if state actually changed - prevents unnecessary native calls
    if (lastStatusBarStateRef.current !== shouldHide) {
      lastStatusBarStateRef.current = shouldHide;
      // Use requestAnimationFrame to batch with next frame - prevents blocking
      requestAnimationFrame(() => {
        StatusBar.setHidden(shouldHide, 'none');
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent');
        }
      });
    }
  }, [activeTab, hideStatusBarTabs]);

  // Swipe navigation - reliable and smooth
  const handleSwipeNavigation = useCallback(
    (direction: 'left' | 'right') => {
      const now = Date.now();
      // Debounce rapid swipes
      if (now - lastNavigationTimeRef.current < 300) return;
      if (isNavigatingRef.current) return;

      // Exclude screens that shouldn't have swipe navigation
      const excludedScreens = ['Chats', 'Trivia'];
      if (excludedScreens.includes(activeTab)) return;

      const tabOrder = ['Leaderboard', 'Chats', 'Home', 'Shop', 'Wallet'];
      const currentIndex = tabOrder.indexOf(activeTab);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      if (direction === 'left' && currentIndex < tabOrder.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (direction === 'right' && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }

      // Skip excluded screens
      while (targetIndex !== currentIndex && excludedScreens.includes(tabOrder[targetIndex])) {
        if (direction === 'left') {
          targetIndex++;
        } else {
          targetIndex--;
        }
        if (targetIndex < 0 || targetIndex >= tabOrder.length) return;
      }

      if (targetIndex !== currentIndex) {
        const targetTab = tabOrder[targetIndex];
        // CRITICAL: Clear any existing timeouts before starting new navigation
        clearNavigationTimeouts();

        lastNavigationTimeRef.current = now;
        isNavigatingRef.current = true;
        // CRITICAL: Update activeTab and navigate immediately - no delays
        // This ensures tab bar visibility is updated immediately
        setActiveTab(targetTab);

        const performNavigation = () => {
          try {
            navigation.navigate(targetTab as never);

            // IMPROVED: Increased timeout to 500ms for slow devices (was 200ms)
            lockTimeoutRef.current = setTimeout(() => {
              isNavigatingRef.current = false;
              lockTimeoutRef.current = null;
            }, 500);
          } catch (error) {
            // CRITICAL: If navigation fails, immediately release lock
            logger.error('Swipe navigation error', 'NAVIGATION', error);
            clearNavigationTimeouts();
            isNavigatingRef.current = false;
          }
        };

        // Attempt to show ad before navigation
        const adShown = interstitialAdService.showInterstitialAd(() => {
          // Navigate after ad closes (or if it fails to show)
          performNavigation();
        });

        // If ad wasn't shown (not ready), navigate immediately
        if (!adShown) {
          performNavigation();
        }
      }
    },
    [activeTab, navigation]
  );

  // CRITICAL: Initialize tab bar on mount - use useEffect to not block initial render
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      // Set initial status bar state after first paint
      lastStatusBarStateRef.current = true;
      // Use requestAnimationFrame to defer StatusBar calls until after render
      requestAnimationFrame(() => {
        StatusBar.setHidden(true, 'none');
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent');
        }
      });
    }
  }, []);

  // Memoized styles - use actual safe area insets
  // CRITICAL: Properly positioned with dynamic safe area insets
  const tabBarContainerStyle = useMemo(
    () => ({
      position: 'relative' as const, // Changed from absolute to participate in layout flow
      width: '100%',
      height: TOTAL_TAB_BAR_HEIGHT,
      backgroundColor: 'transparent',
      pointerEvents: 'box-none' as const,
      paddingBottom: SAFE_AREA_BOTTOM,
      zIndex: 1000,
    }),
    [TOTAL_TAB_BAR_HEIGHT, SAFE_AREA_BOTTOM]
  );

  const tabBarContentStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      height: TAB_BAR_HEIGHT,
      alignItems: 'center' as const,
    }),
    []
  );

  const gradientColors = useMemo(
    () => (isDarkMode ? ['#0F172A', '#1E293B', '#1E3A8A'] : ['#1E3A8A', '#1E40AF', '#2563EB']),
    [isDarkMode]
  );

  // CRITICAL: Scene container style - always include bottom padding for tab bar.
  // Do NOT conditionally remove paddingBottom on keyboard open — that causes a JS-driven
  // layout animation (the visible upward jump). adjustResize handles window resizing natively.
  const sceneContainerStyle = useMemo(
    () => ({
      paddingBottom: 0, // Removed to prevent double inset application/gap when keyboard opens
      backgroundColor: 'transparent',
      flex: 1,
    }),
    []
  );

  // Memoized screen options with dynamic safe area
  const tabScreenOptions = useMemo(
    () => ({
      headerShown: false,
      freezeOnBlur: false,
      lazy: false, // keep tabs mounted to avoid re-inits/freezes
      tabBarHideOnKeyboard: true,
      // Prevent tab bar from jumping during navigation
      // CRITICAL: Fixed style to prevent recalculation
    }),
    [TOTAL_TAB_BAR_HEIGHT, SAFE_AREA_BOTTOM]
  );


  // Memoized tab bar to prevent re-renders - STABILIZED to prevent jumping
  const renderTabBar = useCallback(
    (props: any) => {
      // Tab bar should always be visible regardless of navigation method (swipe or tap)
      return (
        <View style={tabBarContainerStyle} pointerEvents="box-none" collapsable={false}>
          <LinearGradient
            colors={['#004d99', '#0066cc', '#1e90ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />

          <View style={tabBarContentStyle} collapsable={false}>
            {props.state.routes
              .filter((route: any) => route.name !== 'Trivia') // Hide Trivia from navbar
              .map((route: any, filteredIndex: number) => {
                const { options } = props.descriptors[route.key];
                const label = (options.tabBarLabel || options.title || route.name) as string;
                // Find original index for isFocused check
                const originalIndex = props.state.routes.findIndex((r: any) => r.key === route.key);
                const isFocused = props.state.index === originalIndex;
                const isActive = route.name === activeTab;

                const onPress = () => {
                  const navigationStartTime = performance.now();
                  const now = Date.now();

                  if (__DEV__) {
                    logger.debug(`Tab pressed: ${route.name}`, 'NAVIGATION', {
                      activeTab,
                      isFocused,
                      isNavigating: isNavigatingRef.current,
                      timeSinceLastNav: now - lastNavigationTimeRef.current,
                    });
                  }

                  // ADJUSTED: Reduced debounce for faster taps (TriviaPay standard)
                  const DEBOUNCE_MS = 250;
                  if (now - lastNavigationTimeRef.current < DEBOUNCE_MS) {
                    if (__DEV__) {
                      logger.debug('Navigation debounced (too fast)', 'NAVIGATION');
                    }
                    return;
                  }

                  // Don't block if already on this tab
                  if (route.name === activeTab && isFocused) {
                    if (__DEV__) {
                      logger.debug('Already on this tab, skipping', 'NAVIGATION');
                    }
                    return;
                  }

                  // CRITICAL: If lock is stuck (older than 1.5 seconds), force release it
                  const STUCK_LOCK_THRESHOLD_MS = 1500;
                  if (
                    isNavigatingRef.current &&
                    now - lastNavigationTimeRef.current > STUCK_LOCK_THRESHOLD_MS
                  ) {
                    if (__DEV__) {
                      logger.warn('Navigation lock stuck, forcing release', 'NAVIGATION');
                    }
                    clearNavigationTimeouts();
                    isNavigatingRef.current = false;
                  }

                  // ADJUSTED: Reduced threshold for faster navigation
                  const NAVIGATION_IN_PROGRESS_THRESHOLD_MS = 400;
                  if (
                    isNavigatingRef.current &&
                    now - lastNavigationTimeRef.current < NAVIGATION_IN_PROGRESS_THRESHOLD_MS
                  ) {
                    if (__DEV__) {
                      logger.debug('Navigation in progress, skipping', 'NAVIGATION');
                    }
                    return;
                  }

                  const emitStartTime = performance.now();
                  const event = props.navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  const emitDuration = performance.now() - emitStartTime;

                  if (emitDuration > 10 && __DEV__) {
                    logger.warn(`emit() took ${emitDuration.toFixed(2)}ms (slow!)`, 'NAVIGATION');
                  }

                  if (!event.defaultPrevented) {
                    // CRITICAL: Clear any existing timeouts before starting new navigation
                    clearNavigationTimeouts();

                    lastNavigationTimeRef.current = now;
                    isNavigatingRef.current = true;

                    const setStateStartTime = performance.now();

                    // Sound moved to onPressIn for instant feedback

                    // CRITICAL: Update activeTab and navigate immediately - no delays
                    setActiveTab(route.name);
                    const setStateDuration = performance.now() - setStateStartTime;

                    if (setStateDuration > 10) {
                      console.warn(
                        `⚠️ [NAVIGATION] setActiveTab() took ${setStateDuration.toFixed(2)}ms (slow!)`
                      );
                    }

                    // Navigation success flag
                    let navigationSucceeded = false;

                    if (!isFocused) {
                      const navStartTime = performance.now();
                      if (__DEV__) {
                        logger.debug(`Calling navigate(${route.name})...`, 'NAVIGATION');
                      }

                      try {
                        props.navigation.navigate(route.name);
                        navigationSucceeded = true;
                        const navDuration = performance.now() - navStartTime;
                        const totalDuration = performance.now() - navigationStartTime;

                        if (__DEV__) {
                          logger.debug(
                            `navigate() completed in ${navDuration.toFixed(2)}ms (total: ${totalDuration.toFixed(2)}ms)`,
                            'NAVIGATION'
                          );

                          if (navDuration > 100) {
                            logger.warn(
                              `Navigation took ${navDuration.toFixed(2)}ms (SLOW!)`,
                              'NAVIGATION'
                            );
                          }
                        }
                      } catch (error) {
                        // CRITICAL: If navigation fails, immediately release lock and clear timeouts
                        logger.error('Navigation error', 'NAVIGATION', error);
                        clearNavigationTimeouts();
                        isNavigatingRef.current = false;
                        return; // Exit early on error
                      }
                    } else {
                      // Already focused, navigation succeeded
                      navigationSucceeded = true;
                    }

                    // Only set timeouts if navigation succeeded
                    if (navigationSucceeded) {
                      // ADJUSTED: Reduced to 300ms for faster response (TriviaPay standard)
                      const LOCK_RELEASE_TIMEOUT_MS = 300;
                      lockTimeoutRef.current = setTimeout(() => {
                        if (isNavigatingRef.current) {
                          isNavigatingRef.current = false;
                          lockTimeoutRef.current = null;
                          if (__DEV__) {
                            logger.debug('Navigation lock released (timeout)', 'NAVIGATION');
                          }
                        }
                      }, LOCK_RELEASE_TIMEOUT_MS);

                      // Safety: Force release after 3 seconds to prevent stuck locks (increased from 2s)
                      const SAFETY_TIMEOUT_MS = 3000;
                      safetyTimeoutRef.current = setTimeout(() => {
                        if (isNavigatingRef.current) {
                          isNavigatingRef.current = false;
                          if (__DEV__) {
                            logger.warn(
                              'Navigation lock force released (safety timeout)',
                              'NAVIGATION'
                            );
                          }
                        }
                        clearNavigationTimeouts();
                      }, SAFETY_TIMEOUT_MS);
                    }
                  } else {
                    if (__DEV__) {
                      logger.debug('Navigation prevented by event handler', 'NAVIGATION');
                    }
                  }
                };

                // Regular tabs using Animated TabItem
                return (
                  <TabItem
                    key={route.key}
                    isActive={isActive}
                    icon={options.tabBarIcon?.({
                      focused: isActive,
                      color: '#FFFFFF',
                      size: 40, // Restored original size
                    })}
                    label={label}
                    onPress={onPress}
                    onPressIn={() => {
                      // PROFESSIONAL: Play sound on PRESS IN for instant feedback
                      const now = Date.now();
                      if (now - lastNavigationTimeRef.current > 300) {
                        if (audioManager && audioManager.isSoundEnabled) {
                          try {
                            audioManager.playSound('button').catch(() => { });
                          } catch (e) { }
                        }
                      }
                    }}
                    chatCount={route.name === 'Chats' ? chatTotalCount : 0}
                  />
                );
              })}
          </View>
        </View>
      );
    },
    [
      activeTab,
      gradientColors,
      tabBarContainerStyle,
      tabBarContentStyle,
      TOTAL_TAB_BAR_HEIGHT,
      SAFE_AREA_BOTTOM,
    ]
  );

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Home"
        tabBar={renderTabBar}
        screenOptions={tabScreenOptions}
        sceneContainerStyle={sceneContainerStyle}
      >
        <Tab.Screen
          name="Leaderboard"
          options={{
            tabBarIcon: ({ size }) => (
              <Image
                source={require('../../assets/navigation/Leaderboard.png')}
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            ),
          }}
        >
          {() => (
            <SwipeableScreen
              onSwipeLeft={() => handleSwipeNavigation('left')}
              onSwipeRight={() => handleSwipeNavigation('right')}
              enabled={true}
            >
              <LeaderboardScreen />
            </SwipeableScreen>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Chats"
          options={{
            tabBarIcon: ({ size }) => (
              <View>
                <Image
                  source={require('../../assets/navigation/Chat.png')}
                  style={{ width: size, height: size }}
                  resizeMode="contain"
                />
                {chatTotalCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -scaleSize(6),
                      top: -scaleSize(4),
                      backgroundColor: '#EF4444',
                      borderRadius: scaleSize(8),
                      minWidth: scaleSize(16),
                      height: scaleSize(16),
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: scaleSize(4),
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontSize: scaleSize(10),
                        fontWeight: 'bold',
                      }}
                    >
                      {chatTotalCount > 99 ? '99+' : chatTotalCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        >
          {() => (
            <SwipeableScreen
              onSwipeLeft={() => { }}
              onSwipeRight={() => { }}
              enabled={false}
            >
              <ChatStackNavigator />
            </SwipeableScreen>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Home"
          options={{
            tabBarIcon: ({ size }) => (
              <Image
                source={require('../../assets/navigation/Home.png')}
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            ),
          }}
        >
          {() => (
            <SwipeableScreen
              onSwipeLeft={() => handleSwipeNavigation('left')}
              onSwipeRight={() => handleSwipeNavigation('right')}
              enabled={true}
            >
              <UpdatesStackNavigator />
            </SwipeableScreen>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Shop"
          options={{
            tabBarIcon: ({ size }) => (
              <Image
                source={require('../../assets/navigation/shop.png')}
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            ),
            // CRITICAL: Always show tab bar for Shop screen
            tabBarStyle: {
              display: 'flex',
            },
          }}
        >
          {() => (
            <SwipeableScreen
              onSwipeLeft={() => handleSwipeNavigation('left')}
              onSwipeRight={() => handleSwipeNavigation('right')}
              enabled={true}
            >
              <ShopScreen />
            </SwipeableScreen>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Wallet"
          options={{
            tabBarIcon: ({ size }) => (
              <Image
                source={require('../../assets/navigation/wallet.png')}
                style={{ width: size, height: size }}
                resizeMode="contain"
              />
            ),
          }}
        >
          {() => (
            <SwipeableScreen
              onSwipeLeft={() => handleSwipeNavigation('left')}
              onSwipeRight={() => handleSwipeNavigation('right')}
              enabled={true}
            >
              <WalletScreen />
            </SwipeableScreen>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View >
  );
};

// Main Navigator
const MainNavigator = (): React.JSX.Element => {
  const isAuthenticated = useSelector(selectIsAuthenticated, shallowEqual);
  const {
    showPopupOnAppOpen,
    isLoadingPopup,
    handleClosePopup,
    updateRewards,
    fetchWeeklyStatus,
    claimDailyReward,
  } = useDailyRewards();

  const dailyRewardsInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Defer StatusBar calls to not block initial render
    requestAnimationFrame(() => {
      StatusBar.setHidden(true, 'none');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    });
  }, []);

  useEffect(() => {
    // Only initialize Daily Rewards if authenticated
    if (!isAuthenticated) {
      if (dailyRewardsInitializedRef.current) {
        // Reset if somehow it was set but now we are not authenticated (e.g. logout)
        dailyRewardsInitializedRef.current = false;
      }
      return;
    }

    if (dailyRewardsInitializedRef.current) return;
    dailyRewardsInitializedRef.current = true;

    const initializeDailyRewards = async () => {
      try {
        logger.log('🚀 Initializing Daily Rewards after authentication...', 'APP');
        // 1. Fetch current status
        await fetchWeeklyStatus();
      } catch (error: any) {
        logger.error('Error initializing daily rewards:', 'APP', error?.message);
        // Reset ref on failure to allow retry on next mount or auth change
        dailyRewardsInitializedRef.current = false;
      }
    };

    initializeDailyRewards();
  }, [fetchWeeklyStatus, isAuthenticated]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <MainStack.Navigator
        screenOptions={{
          headerShown: false,
          freezeOnBlur: false,
          animation: 'simple_push', // Instant, native feel
          animationDuration: 150, // Super fast
          statusBarHidden: true,
          statusBarTranslucent: true,
        }}
      >
        <MainStack.Screen
          name="TabNavigator"
          component={TabNavigator}
          options={{
            freezeOnBlur: false,
            animation: 'none',
          }}
        />

        <MainStack.Screen
          name="Shop"
          component={ShopScreen}
          options={{
            freezeOnBlur: false,
            animation: 'none',
            presentation: 'card',
            statusBarHidden: true, // CRITICAL: Hide status bar for Shop screen
            statusBarTranslucent: true,
          }}
        />

        <MainStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            freezeOnBlur: false,
            animation: 'none',
            presentation: 'card',
          }}
        />

        <MainStack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            freezeOnBlur: false,
            animation: 'simple_push', // Instant native animation
            animationDuration: 150, // Super fast
            presentation: 'card',
          }}
        />

        {/* Chat detail screens moved from ChatStack to MainStack for professional appearance */}
        <MainStack.Screen
          name="ChatDetail"
          component={ChatDetailScreen}
          options={{
            freezeOnBlur: false,
            animation: 'slide_from_right',
            presentation: 'card',
          }}
        />
        <MainStack.Screen
          name="GroupInfo"
          component={GroupInfoScreen}
          options={{
            freezeOnBlur: false,
            animation: 'slide_from_right',
            presentation: 'card',
          }}
        />
        <MainStack.Screen
          name="StoryViewer"
          component={StoryViewerScreen}
          options={{
            freezeOnBlur: false,
            animation: 'fade',
            presentation: 'fullScreenModal',
          }}
        />

        {/* WinnersScreen removed */}
        {/* <MainStack.Screen
          name="WinnersScreen"
          component={WinnersScreen}
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "none",
            contentStyle: {
              paddingTop: 0,
              paddingBottom: 0,
              margin: 0,
              backgroundColor: "black",
            },
            statusBarStyle: "light",
            statusBarTranslucent: true,
          }}
        /> */}

        <MainStack.Screen
          name="TriviaScreen"
          component={TriviaScreen}
          initialParams={{ mode: 'free' }}
          options={{
            headerShown: false,
            freezeOnBlur: false,
            animation: 'slide_from_right',
            statusBarHidden: true,
            statusBarTranslucent: true,
          }}
        />

        <MainStack.Screen
          name="FreeTriviaScreen"
          component={FreeTriviaScreen}
          options={{
            headerShown: false,
            freezeOnBlur: false,
            animation: 'slide_from_right',
            statusBarHidden: true,
            statusBarTranslucent: true,
          }}
        />

        <MainStack.Screen
          name="BronzeTriviaScreen"
          component={BronzeTriviaScreen}
          options={{
            headerShown: false,
            freezeOnBlur: false,
            animation: 'slide_from_right',
            statusBarHidden: true,
            statusBarTranslucent: true,
          }}
        />

        <MainStack.Screen
          name="SilverTriviaScreen"
          component={SilverTriviaScreen}
          options={{
            headerShown: false,
            freezeOnBlur: false,
            animation: 'slide_from_right',
            statusBarHidden: true,
            statusBarTranslucent: true,
          }}
        />

        <MainStack.Screen
          name="TriviaSelectionScreen"
          component={TriviaSelectionScreen}
          options={{
            headerShown: false,
            freezeOnBlur: false,
            animation: 'simple_push', // Instant native animation
            animationDuration: 150, // Super fast
            statusBarHidden: true,
            statusBarTranslucent: true,
          }}
        />
      </MainStack.Navigator>

      {__DEV__ && logger.debug('DailyBonusPopup State', 'APP', {
        showPopupOnAppOpen,
        isLoadingPopup,
        visible: showPopupOnAppOpen && !isLoadingPopup
      })}
      <DailyBonusPopup
        visible={showPopupOnAppOpen && !isLoadingPopup}
        onClose={handleClosePopup}
      />
    </View>
  );
};

export default MainNavigator;
