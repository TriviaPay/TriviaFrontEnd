import React from 'react';
import { renderWithProviders } from '@tests/testUtils';

const ChatDetailScreen = () => <></>;

describe('ChatDetailScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ChatDetailScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
