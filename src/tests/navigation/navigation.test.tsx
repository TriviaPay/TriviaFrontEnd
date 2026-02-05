/**
 * Navigation Tests
 */

import React from 'react';
import { renderWithProviders, waitFor } from '../testUtils';
import { NavigationContainer } from '@react-navigation/native';
jest.mock('../../navigation/MainNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Main = () => <Text>Main</Text>;
  return { __esModule: true, default: Main };
});
import { RootNavigator } from '@app/RootNavigator';

describe('Navigation', () => {
  it('renders auth stack', async () => {
    const { toJSON } = renderWithProviders(<RootNavigator />);
    expect(toJSON()).toMatchSnapshot();
  });
});
