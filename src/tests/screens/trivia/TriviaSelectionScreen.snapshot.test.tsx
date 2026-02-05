import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import TriviaSelectionScreen from '../../../features/trivia/screens/TriviaSelectionScreen';

// Mock hooks and services
jest.mock('../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: { total_gems: 100, total_trivia_coins: 50 },
    loading: false,
  }),
}));

jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../hooks/useStandardResponsive', () => () => ({
  scale: (v: number) => v,
  verticalScale: (v: number) => v,
  moderateScale: (v: number) => v,
}));

jest.mock('../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
}));

jest.mock('../../../hooks/usePlatformOptimization', () => ({
  useAndroidBackButton: jest.fn(),
}));

jest.mock('../../../services/keychainStorage', () => ({
  keychainStorage: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  },
}));

jest.mock('../../../services/apiService', () => ({
  apiService: {
    get: jest.fn().mockResolvedValue({ success: true, data: null }),
  },
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({
    playSound: jest.fn(),
    isSoundEnabled: true,
  }),
}));

describe('TriviaSelectionScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<TriviaSelectionScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
