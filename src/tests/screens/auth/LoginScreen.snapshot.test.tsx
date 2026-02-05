import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import LoginScreen from '../../../features/auth/screens/LoginScreen';

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

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('LoginScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<LoginScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
