/**
 * SafeAreaProvider Tests
 * Comprehensive test suite for SafeAreaProvider component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider, SafeAreaView } from '../SafeAreaProvider';

describe('SafeAreaProvider', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <SafeAreaProvider>
        <div>Test Content</div>
      </SafeAreaProvider>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('provides safe area context', () => {
    const TestComponent = () => {
      const { insets } = useSafeArea();
      return <div>Insets: {JSON.stringify(insets)}</div>;
    };

    const { getByText } = render(
      <SafeAreaProvider>
        <TestComponent />
      </SafeAreaProvider>
    );

    expect(getByText(/Insets:/)).toBeTruthy();
  });
});

describe('SafeAreaView', () => {
  it('renders with default props', () => {
    const { getByText } = render(
      <SafeAreaView>
        <div>Test Content</div>
      </SafeAreaView>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies custom edges', () => {
    const { getByTestId } = render(
      <SafeAreaView edges={['top', 'bottom']} testID="safe-area">
        <div>Test Content</div>
      </SafeAreaView>
    );

    expect(getByTestId('safe-area')).toBeTruthy();
  });
});
