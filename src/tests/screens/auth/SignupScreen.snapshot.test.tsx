import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import SignupScreen from '../../../features/auth/screens/SignupScreen';

jest.mock('../../../hooks/useStatusBar', () => ({
  useStatusBar: jest.fn(),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('SignupScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<SignupScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
