import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import HomeScreen from '../../../features/home/screens/HomeScreen';

jest.mock('../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: { id: 1, username: 'TestUser', total_gems: 100 },
    isLoading: false,
  }),
}));

jest.mock('../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { UNSAFE_root } = renderWithProviders(<HomeScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not freeze on mount', () => {
    const startTime = Date.now();
    renderWithProviders(<HomeScreen />);
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(1000);
  });
});
