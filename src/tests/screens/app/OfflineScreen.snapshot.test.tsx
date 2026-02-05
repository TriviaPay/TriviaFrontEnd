import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import { OfflineScreen } from '../../../app/screens/OfflineScreen';

jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../../lib/audio/sound-manager', () => ({
  getInstance: () => ({ playSound: jest.fn(), isSoundEnabled: true }),
}));

describe('OfflineScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<OfflineScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
