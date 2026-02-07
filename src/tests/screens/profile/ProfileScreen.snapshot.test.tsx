import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import ProfileScreen from '../../../features/profile/screens/ProfileScreen';

jest.mock('../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: { id: 1, username: 'TestUser', level: 5 },
    isLoading: false,
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

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

jest.mock('../../../components/ProfileFrame', () => 'ProfileFrame');
jest.mock('../../../components/Avatar', () => 'Avatar');

describe('ProfileScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ProfileScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
