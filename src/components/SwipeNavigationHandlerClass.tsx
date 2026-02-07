/**
 * Swipe Navigation Handler - Class Component Version
 * Alternative implementation using class component for better gesture handler compatibility
 */

import React, { Component } from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Dimensions, View } from 'react-native';
import SwipeIndicator from './SwipeIndicator';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeNavigationHandlerProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
  swipeThreshold?: number;
  velocityThreshold?: number;
  showIndicator?: boolean;
  nextTabName?: string;
  prevTabName?: string;
}

interface SwipeNavigationHandlerState {
  indicatorVisible: boolean;
  indicatorDirection: 'left' | 'right';
  indicatorTabName: string;
}

class SwipeNavigationHandlerClass extends Component<
  SwipeNavigationHandlerProps,
  SwipeNavigationHandlerState
> {
  private lastGestureTime: number = 0;
  private gestureStartX: number = 0;

  constructor(props: SwipeNavigationHandlerProps) {
    super(props);
    this.state = {
      indicatorVisible: false,
      indicatorDirection: 'right',
      indicatorTabName: '',
    };
  }

  handleGestureEvent = (event: any) => {
    if (!this.props.enabled) return;

    const { translationX, velocityX, state, absoluteY } = event.nativeEvent;

    // Only capture swipes in the main content area, not on tab bar
    const screenHeight = Dimensions.get('window').height;
    const tabBarHeight = 80; // Approximate tab bar height

    // Skip if touch is in tab bar area
    if (absoluteY > screenHeight - tabBarHeight) {
      return;
    }

    if (state === State.BEGAN) {
      this.gestureStartX = translationX;
      this.lastGestureTime = Date.now();
    }

    if (state === State.END) {
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastGestureTime;

      // Prevent too frequent swipes (minimum 300ms between swipes)
      if (timeDiff < 300) return;

      const absTranslationX = Math.abs(translationX);
      const absVelocityX = Math.abs(velocityX);

      // Check if swipe meets threshold requirements
      if (
        absTranslationX > (this.props.swipeThreshold || 50) ||
        absVelocityX > (this.props.velocityThreshold || 0.3)
      ) {
        if (translationX > 0) {
          // Swipe right - go to previous tab
          if (this.props.showIndicator) {
            this.setState({
              indicatorDirection: 'right',
              indicatorTabName: this.props.prevTabName || 'Previous',
              indicatorVisible: true,
            });
          }
          this.props.onSwipeRight();
        } else {
          // Swipe left - go to next tab
          if (this.props.showIndicator) {
            this.setState({
              indicatorDirection: 'left',
              indicatorTabName: this.props.nextTabName || 'Next',
              indicatorVisible: true,
            });
          }
          this.props.onSwipeLeft();
        }
      }
    }
  };

  render() {
    const { children, enabled, showIndicator } = this.props;
    const { indicatorVisible, indicatorDirection, indicatorTabName } = this.state;

    if (!enabled) {
      return <View style={{ flex: 1 }}>{children}</View>;
    }

    return (
      <View style={{ flex: 1 }}>
        <PanGestureHandler
          onGestureEvent={this.handleGestureEvent}
          onHandlerStateChange={this.handleGestureEvent}
          minPointers={1}
          maxPointers={1}
          activeOffsetX={[-10, 10]}
          failOffsetY={[-20, 20]}
        >
          <View style={{ flex: 1 }}>{children}</View>
        </PanGestureHandler>
        {showIndicator && (
          <SwipeIndicator
            visible={indicatorVisible}
            direction={indicatorDirection}
            tabName={indicatorTabName}
          />
        )}
      </View>
    );
  }
}

export default SwipeNavigationHandlerClass;
