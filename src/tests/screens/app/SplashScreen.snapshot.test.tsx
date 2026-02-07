import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import SplashScreen from '../../../app/screens/SplashScreen';

jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('SplashScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<SplashScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
