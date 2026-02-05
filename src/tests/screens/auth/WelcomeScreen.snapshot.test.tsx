import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import WelcomeScreen from '../../../features/auth/screens/WelcomeScreen';

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

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('WelcomeScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<WelcomeScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
