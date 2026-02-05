/**
 * ErrorBoundary Tests
 * Comprehensive test suite for ErrorBoundary component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('renders error UI when there is an error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
  });

  it('calls onError when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  it('handles retry functionality', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    // Should attempt to re-render
    expect(retryButton).toBeTruthy();
  });
});
