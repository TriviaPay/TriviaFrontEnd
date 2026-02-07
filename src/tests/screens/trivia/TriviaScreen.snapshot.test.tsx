import React from 'react';
import { renderWithProviders, mockNavigation, mockRoute } from '@tests/testUtils';
import TriviaScreen from '../../../features/trivia/screens/TriviaScreen';

// Mock hooks
jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../hooks/useStandardResponsive', () => ({
  useStandardResponsive: () => ({
    scale: (v: number) => v,
    verticalScale: (v: number) => v,
    moderateScale: (v: number) => v,
    width: 390,
    height: 844,
  }),
}));

jest.mock('../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
}));

jest.mock('../../../hooks/usePlatformOptimization', () => ({
  useAndroidBackButton: jest.fn(),
  useHapticFeedback: () => ({
    triggerHaptic: jest.fn(),
  }),
  usePlatformOptimization: jest.fn(),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    ...mockRoute,
    params: { mode: 'free' },
  }),
  useIsFocused: () => true,
}));

describe('TriviaScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<TriviaScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
