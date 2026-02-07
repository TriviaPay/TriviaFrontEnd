import React from 'react';
import { renderWithProviders } from '../testUtils';
import { RootNavigator } from '../../app/RootNavigator';

// Mock MainNavigator to simplify the test
jest.mock('../../navigation/MainNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => <Text>Main Content</Text>,
  };
});

// Mock feature modules if needed
jest.mock('../../features/auth', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    LoginScreen: () => <Text>Login Screen</Text>,
    WelcomeScreen: () => <Text>Welcome Screen</Text>,
    SignupScreen: () => <Text>Signup Screen</Text>,
    useAuth: () => ({ isAuthenticated: false }),
  };
});

describe('RootNavigator (App Flow)', () => {
  it('shows auth flow when not authenticated', async () => {
    const { findByText } = renderWithProviders(<RootNavigator />, {
      preloadedState: {
        auth: { isAuthenticated: false, isInitialized: true },
      },
    });
    expect(await findByText('Welcome Screen')).toBeTruthy();
  });

  it('shows main flow when authenticated', async () => {
    const { findByText } = renderWithProviders(<RootNavigator />, {
      preloadedState: {
        auth: { isAuthenticated: true, isInitialized: true },
      },
    });
    expect(await findByText('Main Content')).toBeTruthy();
  });
});
