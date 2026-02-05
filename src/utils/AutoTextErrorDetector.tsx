import React, { Component, ErrorInfo } from 'react';
import { View, Text } from 'react-native';

// Error Boundary to catch render errors
class TextErrorDetectorBoundary extends Component<
  { componentName: string; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { componentName: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const message = String(error?.message || '');
    if (message.includes('Text strings must be rendered')) {
      console.log('🔥 RAW TEXT ERROR DETECTED');
      console.log('🔥 Component:', this.props.componentName);
      console.log('🔥 Error Message:', message);
      console.log('🔥 Full Error:', error);
      console.log('🔥 Error Info:', errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Return empty view to prevent crash, but error is already logged
      return <View />;
    }
    return this.props.children;
  }
}

export default function wrapWithDetector(Component: any, name: string) {
  return function DetectorWrapper(props: any) {
    return (
      <TextErrorDetectorBoundary componentName={name}>
        <Component {...props} />
      </TextErrorDetectorBoundary>
    );
  };
}
