import React from 'react';
import { renderWithProviders } from '@tests/testUtils';

const ConversationListScreen = () => <></>;

describe('ConversationListScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<ConversationListScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
