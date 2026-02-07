import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import ErrorScreen from '../../../app/screens/ErrorScreen';

jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('ErrorScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ErrorScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
