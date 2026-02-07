import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import LeaderboardScreen from '../../../features/leaderboard/screens/LeaderboardScreen';

jest.mock('../../../hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    daily: { data: [], loading: false, error: null },
    weekly: { data: [], loading: false, error: null },
    monthly: { data: [], loading: false, error: null },
    fetchData: jest.fn(),
  }),
}));

jest.mock('../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({ profileData: { id: 1, username: 'TestUser' } }),
}));

jest.mock('../../../hooks/Home/useButtonAnimation', () => ({
  useButtonAnimation: () => ({
    animatedStyle: {},
    animatePress: jest.fn(),
    animateRelease: jest.fn(),
  }),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

jest.mock('../../components/MemberItem', () => {
  const { View } = require('react-native');
  return () => <View />;
});

describe('LeaderboardScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<LeaderboardScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
