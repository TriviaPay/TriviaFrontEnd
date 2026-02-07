import React from 'react';
import { renderWithProviders, mockNavigation } from '../../../../tests/testUtils';
// Import the actual component to verify it loads
import ProfileScreen from '../ProfileScreen';

// Mock everything needed for ProfileScreen
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
  useFocusEffect: (cb: any) => cb(),
}));

jest.mock('@descope/react-native-sdk', () => ({
  useDescope: () => ({
    logout: jest.fn(),
    session: { token: 'mock-token' },
  }),
  useSession: () => ({
    session: { token: 'mock-token' },
    clearSession: jest.fn(),
    isAuthenticated: true,
    isSessionLoading: false,
  }),
}));

// Mock child components to isolate screen logic
jest.mock('../../../../components/profile/ProfileHeader', () => 'ProfileHeader');
jest.mock('../../../../components/profile/ProfilePicture', () => 'ProfilePicture');
jest.mock('../../../../components/profile/ProfileInfo', () => 'ProfileInfo');
jest.mock('../../../../components/profile/AccountInfo', () => 'AccountInfo');
jest.mock('../../../../components/profile/PersonalDetails', () => 'PersonalDetails');
jest.mock('../../../../components/modals/profile/PasswordModal', () => 'PasswordModal');
jest.mock('../../../../components/modals/commonModals/CalendarModal', () => 'CalendarModal');
jest.mock('../../../../components/modals/profile/ProfilePictureModal', () => 'ProfilePictureModal');
jest.mock('../../../../components/modals/profile/AvatarsModal', () => 'AvatarsModal');
jest.mock('../../../../components/profile/ProfileModals', () => 'ProfileModals');

jest.mock('../../../../core/components/SoundTouchableOpacity', () => 'SoundTouchableOpacity');

// Mock specific hooks
jest.mock('../../../../hooks/profile/useProfileData', () => ({
  useProfileData: () => ({
    profileData: {
      id: 123,
      username: 'TestUser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      level: 5,
      level_progress: '50%',
      total_gems: 100,
      total_trivia_coins: 50,
      stats: {
        games_played: 10,
        wins: 5,
      },
    },
    avatars: [],
    frames: [],
    isLoading: false,
    isUpdating: false,
    error: null,
    fetchProfileSummary: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../../hooks/useStandardResponsive', () => ({
  useStandardResponsive: () => ({
    scale: (v: number) => v,
    verticalScale: (v: number) => v,
    moderateScale: (v: number) => v,
    getSpacing: (v: number) => v * 8,
    getVerticalSpacing: (v: number) => v * 8,
    getHorizontalSpacing: (v: number) => v * 8,
    scaleFont: (v: number) => v,
    scaleSize: (v: number) => v,
  }),
}));

jest.mock('../../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../../hooks/usePlatformOptimization', () => ({
  useAndroidBackButton: jest.fn(),
  usePlatformOptimization: jest.fn(),
  useHapticFeedback: () => ({ triggerHaptic: jest.fn() }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = renderWithProviders(<ProfileScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
