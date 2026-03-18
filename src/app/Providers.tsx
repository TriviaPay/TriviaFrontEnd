/**
 * App Providers
 * Wraps app with all necessary providers
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { AuthProvider } from '@descope/react-native-sdk';
import { BackButtonHandler } from '@core/components/BackButtonHandler';
import { store, persistor } from '@store';
import { navigationRef } from '@navigation';
import { ErrorBoundary } from './ErrorBoundary';
import { DESCOPE_CONFIG } from '@config/descope';

// Custom Navigation Theme
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF', // Ensure white background globally
  },
};

// Query client configuration with proper error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // CRITICAL: Don't retry on 401 errors (authentication failures)
        if (error?.status === 401 || error?.message?.includes('401')) {
          return false;
        }
        // Retry other errors max 2 times
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Prevent refetch on window focus to reduce API calls
      refetchOnMount: false, // Use cached data on mount if available
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Never retry mutations on 401
        if (error?.status === 401 || error?.message?.includes('401')) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider
        projectId={DESCOPE_CONFIG.projectId}
        baseUrl={DESCOPE_CONFIG.baseUrl}
        persistTokens={DESCOPE_CONFIG.persistTokens}
        autoRefresh={DESCOPE_CONFIG.autoRefresh}
      >
        <GestureHandlerRootView style={styles.root}>
          <ReduxProvider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <QueryClientProvider client={queryClient}>
                <SafeAreaProvider>
                  <NavigationContainer
                    ref={navigationRef}
                    theme={AppTheme}
                  >
                    <BackButtonHandler>{children}</BackButtonHandler>
                  </NavigationContainer>
                </SafeAreaProvider>
              </QueryClientProvider>
            </PersistGate>
          </ReduxProvider>
        </GestureHandlerRootView>
      </AuthProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
