import React from 'react';
import { renderWithProviders } from '@tests/testUtils';
import { DailyBonusScreen } from '../../../features/dailybonus/screens/DailyBonusScreen';

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

describe('DailyBonusScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<DailyBonusScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
