import React from 'react';
import { renderWithProviders, mockNavigation } from '../../../../tests/testUtils';
import LeaderboardScreen from '../LeaderboardScreen';

// Mock hooks
jest.mock('../../../../hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    free: { data: [], loading: false, error: null },
    bronze: { data: [], loading: false, error: null },
    silver: { data: [], loading: false, error: null },
    daily: {
      data: [
        { id: 1, rank: 1, name: 'User1', amount: '100', image: 'img1', isCurrentUser: false },
        { id: 2, rank: 2, name: 'User2', amount: '50', image: 'img2', isCurrentUser: true },
      ],
      loading: false,
      error: null,
    },
    weekly: { data: [], loading: false, error: null },
    monthly: { data: [], loading: false, error: null },
    allTime: { data: [], loading: false, error: null },
    fetchData: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: { id: 123, username: 'TestUser' },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../../hooks/Home/useButtonAnimation', () => ({
  useButtonAnimation: () => ({
    animatedStyle: {},
    animatePress: jest.fn(),
    animateRelease: jest.fn(),
    isPressed: false,
  }),
}));

jest.mock('../../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({
    playSound: jest.fn(),
    isSoundEnabled: true,
  }),
}));

jest.mock('../../components/MemberItem', () => {
  const { View, Text } = require('react-native');
  return ({ item, onPress }: any) => (
    <View testID={`member-item-${item.id}`} onTouchEnd={() => onPress?.(item)}>
      <Text>{item.name}</Text>
      <Text>{item.amount}</Text>
    </View>
  );
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    key: 'leaderboard-key',
    name: 'Leaderboard',
    params: {},
  }),
  useIsFocused: () => true,
}));

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { UNSAFE_root } = renderWithProviders(<LeaderboardScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not freeze on mount', () => {
    const startTime = Date.now();
    renderWithProviders(<LeaderboardScreen />);
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(1000);
  });
});
