import React from 'react';
import { renderWithProviders } from '@tests/testUtils';

const GroupInfoScreen = () => <></>;

describe('GroupInfoScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<GroupInfoScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
