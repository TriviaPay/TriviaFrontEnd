import React from 'react';
import { renderWithProviders } from '@tests/testUtils';

const StoryViewerScreen = () => <></>;

describe('StoryViewerScreen Snapshot', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<StoryViewerScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
