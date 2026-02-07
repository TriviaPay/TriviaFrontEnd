/**
 * App Navigator
 * Main navigation structure with authentication-aware routing
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, shallowEqual } from 'react-redux';
import { useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logger } from '../lib/utils/logger';
import { selectIsAuthenticated } from '../utils/selectors';

// Import screens
import WelcomeScreen from '@features/auth/screens/WelcomeScreen';
import { LoginScreen } from '@features/auth';
import { SignupScreen } from '@features/auth';
import MainNavigator from './MainNavigator';

import ProfileScreen from '../features/profile/screens/ProfileScreen';
import ShopScreen from '../features/shop/screens/ShopScreen';
// WinnersScreen removed
import ChatInitializer from '../components/ChatInitializer';
import OneSignalInitializer from '../components/OneSignalInitializer';
import GlobalLoader from '../components/GlobalLoader';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  // Use memoized selector with shallow equality
  const isAuthenticated = useSelector(selectIsAuthenticated, shallowEqual);
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized, shallowEqual);
  const dispatch = useDispatch();

  // CRITICAL: Immediately set isInitialized if false - don't wait
  React.useEffect(() => {
    if (!isInitialized) {
      logger.warn('AppNavigator: isInitialized is false, setting it immediately', 'API');
      import('../store/authSlice')
        .then(({ setInitialized }) => {
          dispatch(setInitialized(true));
        })
        .catch(e => {
          logger.error('Failed to set isInitialized', 'API', e);
        });
    }
  }, [isInitialized]);

  logger.debug(
    `AppNavigator render - isAuthenticated: ${isAuthenticated}, isInitialized: ${isInitialized}`,
    'API'
  );

  // CRITICAL: ALWAYS render the navigator - NEVER block navigation
  // Don't check isInitialized - just render immediately
  // If isInitialized is false, Welcome screen will show (which is correct)
  // This ensures navigation ALWAYS works, no matter what state Redux is in

  return (
    <>
      {/* Initialize SSE connection when authenticated */}
      {isAuthenticated && <ChatInitializer />}

      {/* Initialize OneSignal device registration when authenticated */}
      <OneSignalInitializer />

      {/* Global overlay for loading states */}
      <GlobalLoader />

      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Main' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          freezeOnBlur: false,
          contentStyle: {
            backgroundColor: 'transparent',
          },
          // CRITICAL: Force consistent status bar to prevent jumping
          statusBarStyle: 'dark', // Default to dark text (light background)
          statusBarColor: 'transparent',
          statusBarTranslucent: true,
        }}
      >
        {isAuthenticated ? (
          // Authenticated user screens
          <>
            <Stack.Screen name="Main" component={MainNavigator} />

            {/* Modal Screens */}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />

            {/* WinnersScreen removed */}

            <Stack.Screen
              name="Shop"
              component={ShopScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        ) : (
          // Unauthenticated user screens
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};

export default AppNavigator;
