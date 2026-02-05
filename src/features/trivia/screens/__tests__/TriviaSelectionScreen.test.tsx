import React from 'react';
import { renderWithProviders, mockNavigation } from '../../../../tests/testUtils';
import TriviaSelectionScreen from '../TriviaSelectionScreen';

// Mock additional hooks and services
jest.mock('../../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: {
      id: 123,
      username: 'TestUser',
      total_gems: 100,
      total_trivia_coins: 50,
    },
    loading: false,
    error: null,
  }),
}));

jest.mock('../../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../../hooks/useStandardResponsive', () => () => ({
  scale: (v: number) => v,
  verticalScale: (v: number) => v,
  moderateScale: (v: number) => v,
}));

jest.mock('../../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
}));

jest.mock('../../../../hooks/usePlatformOptimization', () => ({
  useAndroidBackButton: jest.fn(),
}));

jest.mock('../../../../services/apiService', () => ({
  apiService: {
    get: jest.fn().mockResolvedValue({
      data: {
        free_mode: { has_access: true },
        bronze_mode: { has_access: false },
        silver_mode: { has_access: false },
      },
    }),
  },
}));

jest.mock('../../../../services/keychainStorage', () => ({
  keychainStorage: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({
    playSound: jest.fn(),
    isSoundEnabled: true,
  }),
  playSound: jest.fn(),
  isSoundEnabled: true,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
}));

describe('TriviaSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId, UNSAFE_root } = renderWithProviders(<TriviaSelectionScreen />);

    // Screen should render
    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not freeze on mount', async () => {
    const startTime = Date.now();

    renderWithProviders(<TriviaSelectionScreen />);

    const renderTime = Date.now() - startTime;

    // Screen should render in less than 1 second
    expect(renderTime).toBeLessThan(1000);
  });
});
