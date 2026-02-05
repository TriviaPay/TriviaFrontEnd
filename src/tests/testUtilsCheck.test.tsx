import { createMockStore, renderWithProviders } from './testUtils';
import { View } from 'react-native';
import React from 'react';

describe('testUtils direct check', () => {
  it('can create a mock store', () => {
    const store = createMockStore();
    expect(store).toBeDefined();
  });

  it('can render with providers', () => {
    const { toJSON } = renderWithProviders(<View />);
    expect(toJSON()).toBeDefined();
  });
});
