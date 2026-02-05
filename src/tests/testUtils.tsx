/**
 * Test Utilities
 * Comprehensive test helpers for React Native Testing Library
 */

import React, { ReactElement } from 'react';
import { render, renderHook, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackButtonHandler } from '../core/components/BackButtonHandler';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

/**
 * Create mock store for testing
 */
export function createMockStore(preloadedState?: any) {
  // Import actual reducers for accurate testing - using relative paths
  const authReducer = require('../store/authSlice').default;
  const triviaReducer = require('../store/slices/triviaSlice').default;
  const appReducer = require('../store/slices/appSlice').default;
  const userReducer = require('../store/slices/userSlice').default;
  const chatReducer = require('../store/chatSlice').default;
  const leaderboardReducer = require('../store/leaderboardSlice').default;
  const soundReducer = require('../store/slices/soundSlice').default;
  const cosmeticsReducer = require('../store/shopCosmeticsSlice').default;
  const gemPackagesReducer = require('../store/shopGemPackagesSlice').default;
  const shopReducer = require('../store/slices/shopSlice').default;
  const dailyRewardsReducer = require('../store/dailyRewardsSlice').default;
  const chatStoreReducer = require('../store/slices/chatStoreSlice').default;

  return configureStore({
    reducer: {
      auth: authReducer,
      trivia: triviaReducer,
      app: appReducer,
      user: userReducer,
      chat: chatReducer,
      leaderboard: leaderboardReducer,
      sound: soundReducer,
      cosmetics: cosmeticsReducer,
      gemPackages: gemPackagesReducer,
      shop: shopReducer,
      dailyRewards: dailyRewardsReducer,
      chatStore: chatStoreReducer,
    } as any,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
}

/**
 * Default mock state
 */
export const mockInitialState: any = {
  auth: {
    isAuthenticated: false,
    token: null,
    refreshToken: null,
    loading: false,
    error: null,
  },
  trivia: {
    sessionId: null,
    mode: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    correctAnswers: 0,
    timeRemaining: 30,
    lifelines: {
      fiftyFifty: true,
      skip: true,
      hint: true,
    },
    gameStatus: 'idle',
    playerAnswers: [],
    result: null,
    eliminatedOptions: [],
  },
  user: {
    profile: null,
    loading: false,
    error: null,
  },
  chat: {
    messages: [],
    loading: false,
    error: null,
  },
  leaderboard: {
    data: [],
    loading: false,
    error: null,
  },
  app: {
    isOnline: true,
    isLoading: false,
  },
  sound: {
    enabled: true,
    volume: 1.0,
  },
  cosmetics: {
    items: [],
    loading: false,
  },
  gemPackages: {
    packages: [],
    loading: false,
  },
  shop: {
    items: [],
    loading: false,
  },
  dailyRewards: {
    rewards: [],
    loading: false,
  },
  chatStore: {
    conversations: [],
    loading: false,
  },
};

/**
 * Custom render with all providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createMockStore>;
  navigationContainer?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = mockInitialState,
    store = createMockStore(preloadedState),
    navigationContainer = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const content = (
      <Provider store={store}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 }, // iPhone 13-ish dimensions
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <BackButtonHandler>{children}</BackButtonHandler>
        </SafeAreaProvider>
      </Provider>
    );

    if (navigationContainer) {
      return <NavigationContainer>{content}</NavigationContainer>;
    }

    return content;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/**
 * Custom renderHook with all providers
 */
export function renderHookWithProviders<TProps, TResult>(
  callback: (props: TProps) => TResult,
  {
    preloadedState = mockInitialState,
    store = createMockStore(preloadedState),
    navigationContainer = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const content = (
      <Provider store={store}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <BackButtonHandler>{children}</BackButtonHandler>
        </SafeAreaProvider>
      </Provider>
    );

    if (navigationContainer) {
      return <NavigationContainer>{content}</NavigationContainer>;
    }

    return content;
  }

  return renderHook(callback, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock navigation object
 */
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test-id'),
  getState: jest.fn(() => ({})),
  getParent: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
};

/**
 * Mock route object
 */
export const mockRoute = {
  key: 'test-route',
  name: 'TestScreen',
  params: {},
  path: undefined,
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  success: (data: any) => ({
    success: true,
    data,
  }),
  error: (message: string, code?: string) => ({
    success: false,
    error: {
      message,
      code,
    },
  }),
};

/**
 * Mock question data
 */
export const mockQuestion = {
  id: 'q1',
  question: 'What is 2+2?',
  options: ['1', '2', '3', '4'],
  correctAnswer: 3,
  category: 'Math',
  difficulty: 'easy' as const,
  timeLimit: 30,
  explanation: '2+2 equals 4',
};

/**
 * Mock game session
 */
export const mockGameSession = {
  id: 'session-1',
  mode: 'free' as const,
  questions: [mockQuestion],
  startedAt: '2026-01-01T15:00:00.000Z',
};

/**
 * Mock user data
 */
export const mockUser = {
  id: '1',
  email: 'test@test.com',
  username: 'test',
  coins: 0,
  gems: 0,
  experience: 0,
  level: 1,
  createdAt: '2026-01-01T15:00:00.000Z',
};

/**
 * Mock profile data
 */
export const mockProfileData = {
  id: 'user-1',
  username: 'testuser',
  total_gems: 100,
  total_trivia_coins: 50,
  level: 5,
  experience: 1250,
};

/**
 * Wait for async updates
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Mock timers helper
 */
export function setupMockTimers() {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
}

/**
 * Suppress console errors/warnings in tests
 */
export function suppressConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Create mock API client
 */
export const createMockApiClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  setAuthToken: jest.fn(),
});

/**
 * Create mock auth service
 */
export const createMockAuthService = () => ({
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  getAccessToken: jest.fn(),
  refreshToken: jest.fn(),
  isAuthenticated: jest.fn(() => false),
});

/**
 * Flush promises
 */
export const flushPromises = () => new Promise(setImmediate);

// Re-export testing library utilities
export * from '@testing-library/react-native';
export { renderWithProviders as render };
