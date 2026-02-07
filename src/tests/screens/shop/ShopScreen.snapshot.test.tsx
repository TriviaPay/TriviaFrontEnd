import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import ShopScreen from '../../../features/shop/screens/ShopScreen';

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

describe('ShopScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ShopScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
