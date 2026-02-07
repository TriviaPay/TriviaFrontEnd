import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import WalletScreen from '../../../features/wallet/screens/WalletScreen';

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

describe('WalletScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<WalletScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
