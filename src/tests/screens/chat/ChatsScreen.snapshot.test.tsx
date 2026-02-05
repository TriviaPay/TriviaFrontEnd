import React from 'react';
import { renderWithProviders } from '@tests/testUtils';

const ChatsScreen = () => <></>;

describe('ChatsScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ChatsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
